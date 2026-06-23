import { Router, Request, Response } from 'express';
import db from '../db/database';

const router = Router();

router.get('/bic', (req: Request, res: Response) => {
  const q = String(req.query.q || '').toUpperCase();
  if (q.length < 2) return res.json({ data: [] });
  const rows = db.prepare(`SELECT bic,bank_name,country,city FROM bic_directory WHERE bic LIKE ? OR UPPER(bank_name) LIKE ? LIMIT 10`).all(`${q}%`, `%${q}%`);
  return res.json({ data: rows });
});

router.get('/beneficiaries', (req: Request, res: Response) => {
  const q = String(req.query.q || '').toLowerCase();
  if (q.length < 1) return res.json({ data: [] });
  const rows = db.prepare(`SELECT * FROM beneficiary_book WHERE company_id='HUL' AND (LOWER(name) LIKE ? OR LOWER(city) LIKE ? OR LOWER(country) LIKE ?) LIMIT 8`).all(`%${q}%`,`%${q}%`,`%${q}%`);
  return res.json({ data: rows });
});

export default router;
