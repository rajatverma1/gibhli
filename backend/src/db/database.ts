import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(__dirname, '../../data/citrade.db');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS lc_applications (
    id TEXT PRIMARY KEY,
    application_ref TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT',
    current_step INTEGER NOT NULL DEFAULT 1,
    company_id TEXT NOT NULL,
    created_by TEXT NOT NULL,
    step1_data TEXT,
    step2_data TEXT,
    step3_data TEXT,
    step4_data TEXT,
    swift_mt700 TEXT,
    submitted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    lc_id TEXT NOT NULL,
    action TEXT NOT NULL,
    actor TEXT NOT NULL,
    field_path TEXT,
    old_value TEXT,
    new_value TEXT,
    ip_address TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(lc_id) REFERENCES lc_applications(id)
  );

  CREATE TABLE IF NOT EXISTS beneficiary_book (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    name TEXT NOT NULL,
    address1 TEXT,
    address2 TEXT,
    address3 TEXT,
    city TEXT,
    country TEXT,
    bank_account TEXT,
    bank_bic TEXT,
    bank_name TEXT,
    bank_country TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS bic_directory (
    bic TEXT PRIMARY KEY,
    bank_name TEXT NOT NULL,
    country TEXT NOT NULL,
    city TEXT,
    address TEXT
  );

  CREATE TABLE IF NOT EXISTS dropdown_values (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dropdown_key TEXT NOT NULL,
    value_code TEXT NOT NULL,
    display_name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    UNIQUE(dropdown_key, value_code)
  );

  CREATE TABLE IF NOT EXISTS customer_accounts (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    account_number TEXT NOT NULL,
    account_name TEXT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    available_limit REAL NOT NULL DEFAULT 0,
    account_type TEXT NOT NULL DEFAULT 'CURRENT',
    status TEXT NOT NULL DEFAULT 'ACTIVE'
  );
`);

// Seed BIC directory
const bicCount = db.prepare('SELECT COUNT(*) as c FROM bic_directory').get() as { c: number };
if (bicCount.c === 0) {
  const insertBIC = db.prepare(
    'INSERT OR IGNORE INTO bic_directory (bic, bank_name, country, city) VALUES (?, ?, ?, ?)'
  );
  const bics = [
    ['DEUTDEBB', 'Deutsche Bank AG', 'Germany', 'Berlin'],
    ['DEUTDEDB', 'Deutsche Bank AG (Frankfurt)', 'Germany', 'Frankfurt'],
    ['DEUTDEDBFRA', 'Deutsche Bank AG Frankfurt', 'Germany', 'Frankfurt'],
    ['DEUTNL2AXXX', 'Deutsche Bank Nederland N.V.', 'Netherlands', 'Amsterdam'],
    ['BARCGB22', 'Barclays Bank PLC', 'United Kingdom', 'London'],
    ['BARCGB22XXX', 'Barclays Bank PLC London', 'United Kingdom', 'London'],
    ['CITIUS33', 'Citibank N.A.', 'United States', 'New York'],
    ['CITIGB2L', 'Citibank N.A. London', 'United Kingdom', 'London'],
    ['HSBCHKHH', 'HSBC Hong Kong', 'Hong Kong', 'Hong Kong'],
    ['HSBCGB2L', 'HSBC Bank PLC London', 'United Kingdom', 'London'],
    ['HSBCUS33', 'HSBC Bank USA N.A.', 'United States', 'New York'],
    ['DBSSSGSG', 'DBS Bank Ltd', 'Singapore', 'Singapore'],
    ['DBSSINBB', 'DBS Bank India', 'India', 'Mumbai'],
    ['SCBLSGSG', 'Standard Chartered Singapore', 'Singapore', 'Singapore'],
    ['SCBLINBB', 'Standard Chartered India', 'India', 'Mumbai'],
    ['SCBLGB2L', 'Standard Chartered Bank UK', 'United Kingdom', 'London'],
    ['ICICINBB', 'ICICI Bank Ltd', 'India', 'Mumbai'],
    ['HDFCINBB', 'HDFC Bank Ltd', 'India', 'Mumbai'],
    ['SBININBB', 'State Bank of India', 'India', 'Mumbai'],
    ['AXISBINBB', 'Axis Bank Ltd', 'India', 'Mumbai'],
    ['KOTAKINBB', 'Kotak Mahindra Bank', 'India', 'Mumbai'],
    ['NBADAEAA', 'First Abu Dhabi Bank', 'United Arab Emirates', 'Abu Dhabi'],
    ['EBILAEAD', 'Emirates NBD', 'United Arab Emirates', 'Dubai'],
    ['ARABAEAA', 'Arab Bank PLC Dubai', 'United Arab Emirates', 'Dubai'],
    ['BNPAFRPP', 'BNP Paribas', 'France', 'Paris'],
    ['BNPAGB22', 'BNP Paribas London', 'United Kingdom', 'London'],
    ['SOGEFRPP', 'Société Générale', 'France', 'Paris'],
    ['CHASGB2L', 'JPMorgan Chase Bank London', 'United Kingdom', 'London'],
    ['CHASUS33', 'JPMorgan Chase Bank N.A.', 'United States', 'New York'],
    ['BOFAUS3N', 'Bank of America N.A.', 'United States', 'Charlotte'],
    ['RBOSGB2L', 'Royal Bank of Scotland', 'United Kingdom', 'Edinburgh'],
    ['NWBKGB2L', 'NatWest Bank PLC', 'United Kingdom', 'London'],
    ['ABNANH2A', 'ABN AMRO Bank N.V.', 'Netherlands', 'Amsterdam'],
    ['INGBNL2A', 'ING Bank N.V.', 'Netherlands', 'Amsterdam'],
    ['RABONL2U', 'Rabobank', 'Netherlands', 'Utrecht'],
  ];
  const insertMany = db.transaction(() => {
    for (const [bic, name, country, city] of bics) {
      insertBIC.run(bic, name, country, city);
    }
  });
  insertMany();
}

// Seed beneficiary book
const benCount = db.prepare('SELECT COUNT(*) as c FROM beneficiary_book').get() as { c: number };
if (benCount.c === 0) {
  const insertBen = db.prepare(
    `INSERT INTO beneficiary_book (id, company_id, name, address1, address2, city, country, bank_bic, bank_name, bank_country, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const now = new Date().toISOString();
  insertBen.run('ben-1', 'HUL', 'EuroChem Trading GmbH', 'Mainzer Landstrasse 41', '', 'Frankfurt', 'Germany', 'DEUTDEDB', 'Deutsche Bank AG', 'Germany', now);
  insertBen.run('ben-2', 'HUL', 'Pacific Electronics Pte Ltd', '8 Marina Boulevard', 'Marina Bay Financial Centre', 'Singapore', 'Singapore', 'DBSSSGSG', 'DBS Bank Ltd', 'Singapore', now);
  insertBen.run('ben-3', 'HUL', 'Atlas Machinery FZE', 'Jebel Ali Free Zone', '', 'Dubai', 'United Arab Emirates', 'EBILAEAD', 'Emirates NBD', 'United Arab Emirates', now);
  insertBen.run('ben-4', 'HUL', 'Delta Metals B.V.', 'Westhavenweg 60', '', 'Rotterdam', 'Netherlands', 'DEUTNL2AXXX', 'Deutsche Bank Nederland N.V.', 'Netherlands', now);
}

// Seed dropdown values
const ddCount = db.prepare('SELECT COUNT(*) as c FROM dropdown_values').get() as { c: number };
if (ddCount.c === 0) {
  const ins = db.prepare(
    `INSERT OR IGNORE INTO dropdown_values (dropdown_key, value_code, display_name, sort_order) VALUES (?, ?, ?, ?)`
  );
  const seedDropdowns = db.transaction(() => {
    // Purpose of Import
    const purposes = [
      ['CAPITAL_GOODS', 'Capital Goods', 1],
      ['RAW_MATERIALS', 'Raw Materials', 2],
      ['CONSUMABLES', 'Consumables & Spares', 3],
      ['TRADING_GOODS', 'Trading Goods', 4],
      ['MACHINERY', 'Machinery & Equipment', 5],
      ['CHEMICALS', 'Chemicals & Intermediates', 6],
      ['FOOD_AGRI', 'Food & Agricultural Products', 7],
      ['TEXTILES', 'Textiles & Garments', 8],
      ['IT_EQUIPMENT', 'IT Equipment & Software', 9],
      ['PHARMA', 'Pharmaceutical & Medical', 10],
      ['CONSTRUCTION', 'Construction Materials', 11],
      ['ENERGY', 'Energy & Petroleum Products', 12],
      ['OTHER', 'Other', 99],
    ];
    for (const [code, name, order] of purposes) {
      ins.run('PURPOSE_OF_IMPORT', code, name, order);
    }

    // Bank Charges By
    ins.run('BANK_CHARGES_BY', 'OUR', 'OUR — All charges by Applicant', 1);
    ins.run('BANK_CHARGES_BY', 'SHA', 'SHA — Shared', 2);
    ins.run('BANK_CHARGES_BY', 'BEN', 'BEN — All charges by Beneficiary', 3);
    ins.run('BANK_CHARGES_BY', 'OTH', 'OTH — Other arrangement', 4);

    // LC Category
    ins.run('LC_CATEGORY', 'IMPORT', 'Import LC', 1);
    ins.run('LC_CATEGORY', 'INLAND', 'Inland LC', 2);

    // Confirmation Instruction
    ins.run('CONFIRMATION_INSTRUCTION', 'WITHOUT', 'Without', 1);
    ins.run('CONFIRMATION_INSTRUCTION', 'MAY_ADD', 'May Add', 2);
    ins.run('CONFIRMATION_INSTRUCTION', 'CONFIRM', 'Confirm', 3);

    // Payment Method
    ins.run('PAYMENT_METHOD', 'SIGHT', 'Sight', 1);
    ins.run('PAYMENT_METHOD', 'USANCE', 'Usance', 2);
    ins.run('PAYMENT_METHOD', 'DEFERRED', 'Deferred Payment', 3);
    ins.run('PAYMENT_METHOD', 'NEGOTIATION', 'Negotiation', 4);
    ins.run('PAYMENT_METHOD', 'MIXED', 'Mixed Payment', 5);

    // Partial Shipment / Transhipment
    ins.run('SHIPMENT_OPTION', 'ALLOWED', 'Allowed', 1);
    ins.run('SHIPMENT_OPTION', 'NOT_ALLOWED', 'Not Allowed', 2);
    ins.run('SHIPMENT_OPTION', 'CONDITIONAL', 'Conditional', 3);

    // Applicable Rules
    ins.run('APPLICABLE_RULES', 'UCP LATEST VERSION', 'UCP Latest Version', 1);
    ins.run('APPLICABLE_RULES', 'UCP 600', 'UCP 600', 2);
    ins.run('APPLICABLE_RULES', 'EUCP LATEST VERSION', 'eUCP Latest Version', 3);
    ins.run('APPLICABLE_RULES', 'EUCPURR LATEST VERSION', 'eUCPURR Latest Version', 4);
    ins.run('APPLICABLE_RULES', 'URR LATEST VERSION', 'URR Latest Version', 5);
    ins.run('APPLICABLE_RULES', 'OTHR', 'Other', 6);

    // Method of Issue
    ins.run('METHOD_OF_ISSUE', 'SWIFT', 'SWIFT', 1);
    ins.run('METHOD_OF_ISSUE', 'COURIER', 'Courier', 2);
    ins.run('METHOD_OF_ISSUE', 'PREADVICE', 'Pre-Advice', 3);
  });
  seedDropdowns();
}

// Seed customer accounts
const accCount = db.prepare('SELECT COUNT(*) as c FROM customer_accounts').get() as { c: number };
if (accCount.c === 0) {
  const insAcc = db.prepare(
    `INSERT INTO customer_accounts (id, company_id, account_number, account_name, currency, available_limit, account_type)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const seedAccounts = db.transaction(() => {
    insAcc.run('acc-1', 'HUL', '0123456789', 'HUL Current Account — HDFC Bank', 'INR', 500000000, 'CURRENT');
    insAcc.run('acc-2', 'HUL', '9876543210', 'HUL Trade Finance Account — Citibank', 'USD', 10000000, 'TRADE');
    insAcc.run('acc-3', 'HUL', '1122334455', 'HUL Forex Settlement — SBI', 'USD', 5000000, 'FOREX');
    insAcc.run('acc-4', 'HUL', '5566778899', 'HUL Euro Account — Deutsche Bank', 'EUR', 3000000, 'FOREX');
    insAcc.run('acc-5', 'HUL', '6677889900', 'HUL Operations Account — Axis Bank', 'INR', 150000000, 'CURRENT');
  });
  seedAccounts();
}

export default db;
