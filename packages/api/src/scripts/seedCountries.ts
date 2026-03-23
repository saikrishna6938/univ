import { ResultSetHeader } from 'mysql2';
import { connectToDatabase, pool } from '../config/database';

const COUNTRIES = [
  { name: 'Australia', isoCode: 'AU', currencyType: 'AUD', currencySymbol: '$' },
  { name: 'Canada', isoCode: 'CA', currencyType: 'CAD', currencySymbol: '$' },
  { name: 'Switzerland', isoCode: 'CH', currencyType: 'CHF', currencySymbol: 'CHF' },
  { name: 'Germany', isoCode: 'DE', currencyType: 'EUR', currencySymbol: '€' },
  { name: 'Spain', isoCode: 'ES', currencyType: 'EUR', currencySymbol: '€' },
  { name: 'France', isoCode: 'FR', currencyType: 'EUR', currencySymbol: '€' },
  { name: 'United Kingdom', isoCode: 'GB', currencyType: 'GBP', currencySymbol: '£' },
  { name: 'Ireland', isoCode: 'IE', currencyType: 'EUR', currencySymbol: '€' },
  { name: 'Italy', isoCode: 'IT', currencyType: 'EUR', currencySymbol: '€' },
  { name: 'Netherlands', isoCode: 'NL', currencyType: 'EUR', currencySymbol: '€' },
  { name: 'New Zealand', isoCode: 'NZ', currencyType: 'NZD', currencySymbol: '$' },
  { name: 'Sweden', isoCode: 'SE', currencyType: 'SEK', currencySymbol: 'kr' },
  { name: 'Singapore', isoCode: 'SG', currencyType: 'SGD', currencySymbol: '$' },
  { name: 'United Arab Emirates', isoCode: 'AE', currencyType: 'AED', currencySymbol: 'AED' },
  { name: 'United States', isoCode: 'US', currencyType: 'USD', currencySymbol: '$' }
] as const;

async function ensureSchema() {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS countries (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      iso_code VARCHAR(10) NOT NULL UNIQUE,
      currency_type VARCHAR(80) NULL,
      currency_symbol VARCHAR(20) NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`
  );

  await pool.query(`ALTER TABLE countries ADD COLUMN IF NOT EXISTS currency_type VARCHAR(80) NULL AFTER iso_code`);
  await pool.query(`ALTER TABLE countries ADD COLUMN IF NOT EXISTS currency_symbol VARCHAR(20) NULL AFTER currency_type`);
}

async function main() {
  await connectToDatabase();
  await ensureSchema();

  let count = 0;
  for (const country of COUNTRIES) {
    await pool.query<ResultSetHeader>(
      `INSERT INTO countries (name, iso_code, currency_type, currency_symbol)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         currency_type = VALUES(currency_type),
         currency_symbol = VALUES(currency_symbol)`,
      [country.name, country.isoCode, country.currencyType, country.currencySymbol]
    );
    count += 1;
  }

  console.log(`Seeded ${count} countries`);
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
