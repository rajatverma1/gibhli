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
    id TEXT PRIMARY KEY, application_ref TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT', current_step INTEGER NOT NULL DEFAULT 1,
    company_id TEXT NOT NULL, created_by TEXT NOT NULL,
    step1_data TEXT, step2_data TEXT, step3_data TEXT, step4_data TEXT,
    swift_mt700 TEXT, submitted_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY, lc_id TEXT NOT NULL, action TEXT NOT NULL, actor TEXT NOT NULL,
    field_path TEXT, old_value TEXT, new_value TEXT, ip_address TEXT, created_at TEXT NOT NULL,
    FOREIGN KEY(lc_id) REFERENCES lc_applications(id)
  );
  CREATE TABLE IF NOT EXISTS beneficiary_book (
    id TEXT PRIMARY KEY, company_id TEXT NOT NULL, name TEXT NOT NULL,
    address1 TEXT, address2 TEXT, city TEXT, country TEXT,
    bank_account TEXT, bank_bic TEXT, bank_name TEXT, bank_country TEXT, created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS bic_directory (
    bic TEXT PRIMARY KEY, bank_name TEXT NOT NULL, country TEXT NOT NULL, city TEXT, address TEXT
  );
`);

const bicCount = db.prepare('SELECT COUNT(*) as c FROM bic_directory').get() as { c: number };
if (bicCount.c === 0) {
  const ins = db.prepare('INSERT OR IGNORE INTO bic_directory (bic,bank_name,country,city) VALUES (?,?,?,?)');
  const bics = [
    ['DEUTDEBB','Deutsche Bank AG','Germany','Berlin'],
    ['DEUTDEDB','Deutsche Bank AG (Frankfurt)','Germany','Frankfurt'],
    ['DEUTDEDBFRA','Deutsche Bank AG Frankfurt','Germany','Frankfurt'],
    ['DEUTNL2AXXX','Deutsche Bank Nederland N.V.','Netherlands','Amsterdam'],
    ['BARCGB22','Barclays Bank PLC','United Kingdom','London'],
    ['BARCGB22XXX','Barclays Bank PLC London','United Kingdom','London'],
    ['CITIUS33','Citibank N.A.','United States','New York'],
    ['CITIGB2L','Citibank N.A. London','United Kingdom','London'],
    ['HSBCHKHH','HSBC Hong Kong','Hong Kong','Hong Kong'],
    ['HSBCGB2L','HSBC Bank PLC London','United Kingdom','London'],
    ['HSBCUS33','HSBC Bank USA N.A.','United States','New York'],
    ['DBSSSGSG','DBS Bank Ltd','Singapore','Singapore'],
    ['DBSSINBB','DBS Bank India','India','Mumbai'],
    ['SCBLSGSG','Standard Chartered Singapore','Singapore','Singapore'],
    ['SCBLINBB','Standard Chartered India','India','Mumbai'],
    ['SCBLGB2L','Standard Chartered Bank UK','United Kingdom','London'],
    ['ICICINBB','ICICI Bank Ltd','India','Mumbai'],
    ['HDFCINBB','HDFC Bank Ltd','India','Mumbai'],
    ['SBININBB','State Bank of India','India','Mumbai'],
    ['AXISBINBB','Axis Bank Ltd','India','Mumbai'],
    ['KOTAKINBB','Kotak Mahindra Bank','India','Mumbai'],
    ['NBADAEAA','First Abu Dhabi Bank','United Arab Emirates','Abu Dhabi'],
    ['EBILAEAD','Emirates NBD','United Arab Emirates','Dubai'],
    ['ARABAEAA','Arab Bank PLC Dubai','United Arab Emirates','Dubai'],
    ['BNPAFRPP','BNP Paribas','France','Paris'],
    ['BNPAGB22','BNP Paribas London','United Kingdom','London'],
    ['SOGEFRPP','Société Générale','France','Paris'],
    ['CHASGB2L','JPMorgan Chase Bank London','United Kingdom','London'],
    ['CHASUS33','JPMorgan Chase Bank N.A.','United States','New York'],
    ['BOFAUS3N','Bank of America N.A.','United States','Charlotte'],
    ['RBOSGB2L','Royal Bank of Scotland','United Kingdom','Edinburgh'],
    ['NWBKGB2L','NatWest Bank PLC','United Kingdom','London'],
    ['ABNANH2A','ABN AMRO Bank N.V.','Netherlands','Amsterdam'],
    ['INGBNL2A','ING Bank N.V.','Netherlands','Amsterdam'],
    ['RABONL2U','Rabobank','Netherlands','Utrecht'],
  ];
  db.transaction(() => bics.forEach(([b,n,c,ci]) => ins.run(b,n,c,ci)))();
}

const benCount = db.prepare('SELECT COUNT(*) as c FROM beneficiary_book').get() as { c: number };
if (benCount.c === 0) {
  const ins = db.prepare(`INSERT INTO beneficiary_book (id,company_id,name,address1,address2,city,country,bank_bic,bank_name,bank_country,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
  const now = new Date().toISOString();
  ins.run('ben-1','HUL','EuroChem Trading GmbH','Mainzer Landstrasse 41','','Frankfurt','Germany','DEUTDEDB','Deutsche Bank AG','Germany',now);
  ins.run('ben-2','HUL','Pacific Electronics Pte Ltd','8 Marina Boulevard','Marina Bay Financial Centre','Singapore','Singapore','DBSSSGSG','DBS Bank Ltd','Singapore',now);
  ins.run('ben-3','HUL','Atlas Machinery FZE','Jebel Ali Free Zone','','Dubai','United Arab Emirates','EBILAEAD','Emirates NBD','United Arab Emirates',now);
  ins.run('ben-4','HUL','Delta Metals B.V.','Westhavenweg 60','','Rotterdam','Netherlands','DEUTNL2AXXX','Deutsche Bank Nederland N.V.','Netherlands',now);
}

export default db;
