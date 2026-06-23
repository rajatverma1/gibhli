import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';
import { LCApplication } from '../types/lc';
import { runMismatchCheck } from '../services/mismatch';
import { generateMT700 } from '../swift/mt700';

const router = Router();

function genRef(): string {
  const yr = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 99999)).padStart(5, '0');
  return `LCAPP-${yr}-${seq}`;
}

function rowToLC(row: Record<string, unknown>): LCApplication {
  return {
    id: row.id as string,
    applicationRef: row.application_ref as string,
    status: row.status as LCApplication['status'],
    currentStep: row.current_step as number,
    companyId: row.company_id as string,
    createdBy: row.created_by as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    step1: row.step1_data ? JSON.parse(row.step1_data as string) : undefined,
    step2: row.step2_data ? JSON.parse(row.step2_data as string) : undefined,
    step3: row.step3_data ? JSON.parse(row.step3_data as string) : undefined,
    step4: row.step4_data ? JSON.parse(row.step4_data as string) : undefined,
    swiftMT700: row.swift_mt700 as string | undefined,
    submittedAt: row.submitted_at as string | undefined,
  };
}

// GET /api/lc — list applications
router.get('/', (req: Request, res: Response) => {
  const rows = db.prepare(
    `SELECT * FROM lc_applications WHERE company_id = ? ORDER BY created_at DESC LIMIT 50`
  ).all('HUL') as Record<string, unknown>[];
  res.json({ data: rows.map(rowToLC) });
});

// POST /api/lc — create new draft
router.post('/', (req: Request, res: Response) => {
  const id = uuidv4();
  const ref = genRef();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO lc_applications (id, application_ref, status, current_step, company_id, created_by, created_at, updated_at)
     VALUES (?, ?, 'DRAFT', 1, ?, ?, ?, ?)`
  ).run(id, ref, 'HUL', 'Raajat Verma', now, now);

  const row = db.prepare('SELECT * FROM lc_applications WHERE id = ?').get(id) as Record<string, unknown>;
  res.status(201).json({ data: rowToLC(row) });
});

// GET /api/lc/:id
router.get('/:id', (req: Request, res: Response) => {
  const row = db.prepare('SELECT * FROM lc_applications WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;
  if (!row) return res.status(404).json({ error: 'Not found' });
  return res.json({ data: rowToLC(row) });
});

// PATCH /api/lc/:id/step/:step — save step data
router.patch('/:id/step/:step', (req: Request, res: Response) => {
  const step = Number(req.params.step);
  if (![1, 2, 3].includes(step)) return res.status(400).json({ error: 'Invalid step' });

  const lcRow = db.prepare('SELECT company_id FROM lc_applications WHERE id = ?').get(req.params.id) as { company_id: string } | undefined;
  if (!lcRow) return res.status(404).json({ error: 'Not found' });

  const col = `step${step}_data`;
  const now = new Date().toISOString();

  db.prepare(
    `UPDATE lc_applications SET ${col} = ?, current_step = MAX(current_step, ?), updated_at = ? WHERE id = ?`
  ).run(JSON.stringify(req.body), step, now, req.params.id);

  // Auto-save beneficiary to book when step 1 is saved
  if (step === 1 && req.body.beneficiary?.name) {
    const b = req.body.beneficiary;
    const companyId = lcRow.company_id;
    const existing = db.prepare(
      `SELECT id FROM beneficiary_book WHERE company_id = ? AND LOWER(name) = LOWER(?)`
    ).get(companyId, b.name) as { id: string } | undefined;

    if (existing) {
      db.prepare(
        `UPDATE beneficiary_book SET address1=?, address2=?, address3=?, city=?, country=?,
          bank_account=?, bank_bic=?, bank_name=?, bank_country=? WHERE id=?`
      ).run(b.address1 ?? null, b.address2 ?? null, b.address3 ?? null,
        b.city ?? null, b.country ?? null, b.bankAccountNumber ?? null,
        b.bankBIC ?? null, b.bankName ?? null, b.bankCountry ?? null, existing.id);
    } else {
      db.prepare(
        `INSERT INTO beneficiary_book
          (id, company_id, name, address1, address2, address3, city, country, bank_account, bank_bic, bank_name, bank_country, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(uuidv4(), companyId, b.name,
        b.address1 ?? null, b.address2 ?? null, b.address3 ?? null,
        b.city ?? null, b.country ?? null, b.bankAccountNumber ?? null,
        b.bankBIC ?? null, b.bankName ?? null, b.bankCountry ?? null, now);
    }
  }

  const row = db.prepare('SELECT * FROM lc_applications WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;
  if (!row) return res.status(404).json({ error: 'Not found' });
  return res.json({ data: rowToLC(row) });
});

// POST /api/lc/:id/run-mismatch — run Step 4 mismatch engine
router.post('/:id/run-mismatch', (req: Request, res: Response) => {
  const row = db.prepare('SELECT * FROM lc_applications WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;
  if (!row) return res.status(404).json({ error: 'Not found' });

  const lc = rowToLC(row);
  if (!lc.step1 || !lc.step2) {
    return res.status(422).json({ error: 'Steps 1 and 2 must be completed before mismatch check' });
  }

  const mismatches = runMismatchCheck(lc);
  const step4Data = { mismatches, runAt: new Date().toISOString() };
  const now = new Date().toISOString();

  db.prepare(
    `UPDATE lc_applications SET step4_data = ?, current_step = MAX(current_step, 4), updated_at = ? WHERE id = ?`
  ).run(JSON.stringify(step4Data), now, req.params.id);

  return res.json({ data: step4Data });
});

// PATCH /api/lc/:id/mismatch/:index — resolve a single mismatch
router.patch('/:id/mismatch/:index', (req: Request, res: Response) => {
  const row = db.prepare('SELECT * FROM lc_applications WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;
  if (!row) return res.status(404).json({ error: 'Not found' });

  const lc = rowToLC(row);
  const step4 = lc.step4;
  if (!step4) return res.status(422).json({ error: 'Run mismatch check first' });

  const idx = Number(req.params.index);
  if (idx < 0 || idx >= step4.mismatches.length) {
    return res.status(400).json({ error: 'Invalid mismatch index' });
  }

  step4.mismatches[idx].resolution = {
    ...req.body,
    resolvedAt: new Date().toISOString(),
  };

  // If using doc value, update the status to ok / warn based on remaining doc conflict
  if (req.body.action === 'USE_DOCUMENT_VALUE' || req.body.action === 'KEEP_WITH_EXPLANATION') {
    step4.mismatches[idx].status = 'ok';
    if (req.body.resolvedValue) {
      step4.mismatches[idx].formValue = req.body.resolvedValue;
    }
  }

  const now = new Date().toISOString();
  db.prepare('UPDATE lc_applications SET step4_data = ?, updated_at = ? WHERE id = ?')
    .run(JSON.stringify(step4), now, req.params.id);

  return res.json({ data: step4 });
});

// POST /api/lc/:id/submit — final submit → generate MT700
router.post('/:id/submit', (req: Request, res: Response) => {
  const row = db.prepare('SELECT * FROM lc_applications WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;
  if (!row) return res.status(404).json({ error: 'Not found' });

  const lc = rowToLC(row);
  if (!lc.step1 || !lc.step2 || !lc.step3) {
    return res.status(422).json({ error: 'All steps must be completed before submission' });
  }

  // Block submission if blocking mismatches remain unresolved
  const mismatches = lc.step4?.mismatches || [];
  const blockingUnresolved = mismatches.filter(
    m => m.status === 'err' && !m.resolution
  );
  if (blockingUnresolved.length > 0) {
    return res.status(422).json({
      error: 'Resolve all blocking mismatches before submission',
      blocking: blockingUnresolved.map(m => m.field),
    });
  }

  let mt700 = '';
  try {
    mt700 = generateMT700(lc);
  } catch (e) {
    return res.status(422).json({ error: (e as Error).message });
  }

  const now = new Date().toISOString();
  db.prepare(
    `UPDATE lc_applications SET status = 'SUBMITTED_TO_BANK', swift_mt700 = ?, submitted_at = ?, current_step = 5, updated_at = ? WHERE id = ?`
  ).run(mt700, now, now, req.params.id);

  // Audit
  db.prepare(
    `INSERT INTO audit_log (id, lc_id, action, actor, created_at) VALUES (?, ?, 'SUBMITTED', ?, ?)`
  ).run(uuidv4(), lc.id, lc.createdBy, now);

  const updatedRow = db.prepare('SELECT * FROM lc_applications WHERE id = ?').get(req.params.id) as Record<string, unknown>;
  return res.json({ data: rowToLC(updatedRow) });
});

// GET /api/lc/:id/mt700 — raw SWIFT MT700 text
router.get('/:id/mt700', (req: Request, res: Response) => {
  const row = db.prepare('SELECT swift_mt700 FROM lc_applications WHERE id = ?').get(req.params.id) as { swift_mt700: string | null } | undefined;
  if (!row) return res.status(404).json({ error: 'Not found' });
  if (!row.swift_mt700) return res.status(422).json({ error: 'LC not yet submitted' });
  res.type('text/plain').send(row.swift_mt700);
});

export default router;
