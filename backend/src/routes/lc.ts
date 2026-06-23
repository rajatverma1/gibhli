import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';
import { LCApplication } from '../types/lc';
import { runMismatchCheck } from '../services/mismatch';
import { generateMT700 } from '../swift/mt700';

const router = Router();

const genRef = () => `LCAPP-${new Date().getFullYear()}-${String(Math.floor(Math.random()*99999)).padStart(5,'0')}`;

function rowToLC(row: Record<string, unknown>): LCApplication {
  return {
    id: row.id as string, applicationRef: row.application_ref as string,
    status: row.status as LCApplication['status'], currentStep: row.current_step as number,
    companyId: row.company_id as string, createdBy: row.created_by as string,
    createdAt: row.created_at as string, updatedAt: row.updated_at as string,
    step1: row.step1_data ? JSON.parse(row.step1_data as string) : undefined,
    step2: row.step2_data ? JSON.parse(row.step2_data as string) : undefined,
    step3: row.step3_data ? JSON.parse(row.step3_data as string) : undefined,
    step4: row.step4_data ? JSON.parse(row.step4_data as string) : undefined,
    swiftMT700: row.swift_mt700 as string | undefined,
    submittedAt: row.submitted_at as string | undefined,
  };
}

router.get('/', (_req: Request, res: Response) => {
  const rows = db.prepare(`SELECT * FROM lc_applications WHERE company_id=? ORDER BY created_at DESC LIMIT 50`).all('HUL') as Record<string,unknown>[];
  res.json({ data: rows.map(rowToLC) });
});

router.post('/', (_req: Request, res: Response) => {
  const id = uuidv4(), ref = genRef(), now = new Date().toISOString();
  db.prepare(`INSERT INTO lc_applications (id,application_ref,status,current_step,company_id,created_by,created_at,updated_at) VALUES (?,?,'DRAFT',1,?,?,?,?)`).run(id,ref,'HUL','Raajat Verma',now,now);
  res.status(201).json({ data: rowToLC(db.prepare('SELECT * FROM lc_applications WHERE id=?').get(id) as Record<string,unknown>) });
});

router.get('/:id', (req: Request, res: Response) => {
  const row = db.prepare('SELECT * FROM lc_applications WHERE id=?').get(req.params.id) as Record<string,unknown>|undefined;
  if (!row) return res.status(404).json({ error: 'Not found' });
  return res.json({ data: rowToLC(row) });
});

router.patch('/:id/step/:step', (req: Request, res: Response) => {
  const step = Number(req.params.step);
  if (![1,2,3].includes(step)) return res.status(400).json({ error: 'Invalid step' });
  const now = new Date().toISOString();
  db.prepare(`UPDATE lc_applications SET step${step}_data=?,current_step=MAX(current_step,?),updated_at=? WHERE id=?`).run(JSON.stringify(req.body),step,now,req.params.id);
  const row = db.prepare('SELECT * FROM lc_applications WHERE id=?').get(req.params.id) as Record<string,unknown>|undefined;
  if (!row) return res.status(404).json({ error: 'Not found' });
  return res.json({ data: rowToLC(row) });
});

router.post('/:id/run-mismatch', (req: Request, res: Response) => {
  const row = db.prepare('SELECT * FROM lc_applications WHERE id=?').get(req.params.id) as Record<string,unknown>|undefined;
  if (!row) return res.status(404).json({ error: 'Not found' });
  const lc = rowToLC(row);
  if (!lc.step1 || !lc.step2) return res.status(422).json({ error: 'Steps 1 and 2 must be completed first' });
  const step4Data = { mismatches: runMismatchCheck(lc), runAt: new Date().toISOString() };
  db.prepare(`UPDATE lc_applications SET step4_data=?,current_step=MAX(current_step,4),updated_at=? WHERE id=?`).run(JSON.stringify(step4Data),new Date().toISOString(),req.params.id);
  return res.json({ data: step4Data });
});

router.patch('/:id/mismatch/:index', (req: Request, res: Response) => {
  const row = db.prepare('SELECT * FROM lc_applications WHERE id=?').get(req.params.id) as Record<string,unknown>|undefined;
  if (!row) return res.status(404).json({ error: 'Not found' });
  const lc = rowToLC(row);
  if (!lc.step4) return res.status(422).json({ error: 'Run mismatch check first' });
  const idx = Number(req.params.index);
  if (idx < 0 || idx >= lc.step4.mismatches.length) return res.status(400).json({ error: 'Invalid index' });
  lc.step4.mismatches[idx].resolution = { ...req.body, resolvedAt: new Date().toISOString() };
  if (['USE_DOCUMENT_VALUE','KEEP_WITH_EXPLANATION'].includes(req.body.action)) lc.step4.mismatches[idx].status = 'ok';
  db.prepare('UPDATE lc_applications SET step4_data=?,updated_at=? WHERE id=?').run(JSON.stringify(lc.step4),new Date().toISOString(),req.params.id);
  return res.json({ data: lc.step4 });
});

router.post('/:id/submit', (req: Request, res: Response) => {
  const row = db.prepare('SELECT * FROM lc_applications WHERE id=?').get(req.params.id) as Record<string,unknown>|undefined;
  if (!row) return res.status(404).json({ error: 'Not found' });
  const lc = rowToLC(row);
  if (!lc.step1||!lc.step2||!lc.step3) return res.status(422).json({ error: 'All steps must be completed' });
  const blocking = (lc.step4?.mismatches||[]).filter(m => m.status==='err' && !m.resolution);
  if (blocking.length) return res.status(422).json({ error: 'Resolve all blocking mismatches first', blocking: blocking.map(m=>m.field) });
  const mt700 = generateMT700(lc);
  const now = new Date().toISOString();
  db.prepare(`UPDATE lc_applications SET status='SUBMITTED_TO_BANK',swift_mt700=?,submitted_at=?,current_step=5,updated_at=? WHERE id=?`).run(mt700,now,now,req.params.id);
  db.prepare(`INSERT INTO audit_log (id,lc_id,action,actor,created_at) VALUES (?,?,'SUBMITTED',?,?)`).run(uuidv4(),lc.id,lc.createdBy,now);
  return res.json({ data: rowToLC(db.prepare('SELECT * FROM lc_applications WHERE id=?').get(req.params.id) as Record<string,unknown>) });
});

router.get('/:id/mt700', (req: Request, res: Response) => {
  const row = db.prepare('SELECT swift_mt700 FROM lc_applications WHERE id=?').get(req.params.id) as {swift_mt700:string|null}|undefined;
  if (!row) return res.status(404).json({ error: 'Not found' });
  if (!row.swift_mt700) return res.status(422).json({ error: 'LC not yet submitted' });
  res.type('text/plain').send(row.swift_mt700);
});

export default router;
