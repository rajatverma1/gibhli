import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';

const router = Router();

// GET /api/lookup/bic?q=DEUT
router.get('/bic', (req: Request, res: Response) => {
  const q = String(req.query.q || '').toUpperCase();
  if (q.length < 2) return res.json({ data: [] });

  const rows = db.prepare(
    `SELECT bic, bank_name, country, city FROM bic_directory
     WHERE bic LIKE ? OR UPPER(bank_name) LIKE ?
     LIMIT 10`
  ).all(`${q}%`, `%${q}%`);

  return res.json({ data: rows });
});

// GET /api/lookup/beneficiaries?q=euro
router.get('/beneficiaries', (req: Request, res: Response) => {
  const q = String(req.query.q || '').toLowerCase();
  if (q.length < 1) return res.json({ data: [] });

  const rows = db.prepare(
    `SELECT * FROM beneficiary_book
     WHERE company_id = 'HUL'
       AND (LOWER(name) LIKE ? OR LOWER(city) LIKE ? OR LOWER(country) LIKE ?)
     ORDER BY name ASC
     LIMIT 8`
  ).all(`%${q}%`, `%${q}%`, `%${q}%`);

  return res.json({ data: rows });
});

// GET /api/lookup/dropdowns?key=PURPOSE_OF_IMPORT
router.get('/dropdowns', (req: Request, res: Response) => {
  const key = String(req.query.key || '').toUpperCase();
  if (!key) return res.status(400).json({ error: 'key parameter required' });

  const rows = db.prepare(
    `SELECT value_code, display_name FROM dropdown_values
     WHERE dropdown_key = ? AND status = 'ACTIVE'
     ORDER BY sort_order ASC, display_name ASC`
  ).all(key);

  return res.json({ data: rows });
});

// GET /api/lookup/accounts — customer accounts for company
router.get('/accounts', (req: Request, res: Response) => {
  const companyId = String(req.query.company_id || 'HUL');

  const rows = db.prepare(
    `SELECT id, account_number, account_name, currency, available_limit, account_type
     FROM customer_accounts
     WHERE company_id = ? AND status = 'ACTIVE'
     ORDER BY account_type ASC, account_name ASC`
  ).all(companyId);

  return res.json({ data: rows });
});

// POST /api/lookup/beneficiaries — upsert beneficiary from LC step1
router.post('/beneficiaries', (req: Request, res: Response) => {
  const { companyId, beneficiary } = req.body as {
    companyId: string;
    beneficiary: {
      name: string;
      address1?: string;
      address2?: string;
      address3?: string;
      city: string;
      country: string;
      bankAccountNumber?: string;
      bankBIC?: string;
      bankName?: string;
      bankCountry?: string;
    };
  };

  if (!companyId || !beneficiary?.name) {
    return res.status(400).json({ error: 'companyId and beneficiary.name required' });
  }

  // Check if beneficiary already exists by name + company
  const existing = db.prepare(
    `SELECT id FROM beneficiary_book WHERE company_id = ? AND LOWER(name) = LOWER(?)`
  ).get(companyId, beneficiary.name) as { id: string } | undefined;

  const now = new Date().toISOString();

  if (existing) {
    // Update existing record with latest details
    db.prepare(
      `UPDATE beneficiary_book SET
        address1 = ?, address2 = ?, address3 = ?, city = ?, country = ?,
        bank_account = ?, bank_bic = ?, bank_name = ?, bank_country = ?
       WHERE id = ?`
    ).run(
      beneficiary.address1 ?? null,
      beneficiary.address2 ?? null,
      beneficiary.address3 ?? null,
      beneficiary.city,
      beneficiary.country,
      beneficiary.bankAccountNumber ?? null,
      beneficiary.bankBIC ?? null,
      beneficiary.bankName ?? null,
      beneficiary.bankCountry ?? null,
      existing.id
    );
    return res.json({ data: { id: existing.id, updated: true } });
  } else {
    const id = uuidv4();
    db.prepare(
      `INSERT INTO beneficiary_book
        (id, company_id, name, address1, address2, address3, city, country, bank_account, bank_bic, bank_name, bank_country, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id, companyId, beneficiary.name,
      beneficiary.address1 ?? null,
      beneficiary.address2 ?? null,
      beneficiary.address3 ?? null,
      beneficiary.city,
      beneficiary.country,
      beneficiary.bankAccountNumber ?? null,
      beneficiary.bankBIC ?? null,
      beneficiary.bankName ?? null,
      beneficiary.bankCountry ?? null,
      now
    );
    return res.status(201).json({ data: { id, updated: false } });
  }
});

export default router;
