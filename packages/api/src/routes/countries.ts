import { Router } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../config/database';

const router = Router();
const MENU_CACHE_CONTROL = 'public, max-age=300, s-maxage=300, stale-while-revalidate=600';
let ensureCountriesSchemaPromise: Promise<void> | null = null;
const COUNTRY_CURRENCY_MAP: Record<string, { currencyType: string; currencySymbol: string }> = {
  AU: { currencyType: 'AUD', currencySymbol: '$' },
  CA: { currencyType: 'CAD', currencySymbol: '$' },
  CH: { currencyType: 'CHF', currencySymbol: 'CHF' },
  DE: { currencyType: 'EUR', currencySymbol: '€' },
  ES: { currencyType: 'EUR', currencySymbol: '€' },
  FR: { currencyType: 'EUR', currencySymbol: '€' },
  GB: { currencyType: 'GBP', currencySymbol: '£' },
  IE: { currencyType: 'EUR', currencySymbol: '€' },
  IT: { currencyType: 'EUR', currencySymbol: '€' },
  NL: { currencyType: 'EUR', currencySymbol: '€' },
  NZ: { currencyType: 'NZD', currencySymbol: '$' },
  SE: { currencyType: 'SEK', currencySymbol: 'kr' },
  SG: { currencyType: 'SGD', currencySymbol: '$' },
  AE: { currencyType: 'AED', currencySymbol: 'AED' },
  US: { currencyType: 'USD', currencySymbol: '$' }
};

function getCountryCurrency(input: { isoCode?: string | null; name?: string | null }) {
  const isoCode = String(input.isoCode || '').trim().toUpperCase();
  if (isoCode && COUNTRY_CURRENCY_MAP[isoCode]) {
    return COUNTRY_CURRENCY_MAP[isoCode];
  }

  const name = String(input.name || '').trim().toLowerCase();
  if (name === 'australia') return COUNTRY_CURRENCY_MAP.AU;
  if (name === 'canada') return COUNTRY_CURRENCY_MAP.CA;
  if (name === 'switzerland') return COUNTRY_CURRENCY_MAP.CH;
  if (name === 'germany') return COUNTRY_CURRENCY_MAP.DE;
  if (name === 'spain') return COUNTRY_CURRENCY_MAP.ES;
  if (name === 'france') return COUNTRY_CURRENCY_MAP.FR;
  if (name === 'united kingdom' || name === 'uk' || name === 'great britain') return COUNTRY_CURRENCY_MAP.GB;
  if (name === 'ireland') return COUNTRY_CURRENCY_MAP.IE;
  if (name === 'italy') return COUNTRY_CURRENCY_MAP.IT;
  if (name === 'netherlands') return COUNTRY_CURRENCY_MAP.NL;
  if (name === 'new zealand') return COUNTRY_CURRENCY_MAP.NZ;
  if (name === 'sweden') return COUNTRY_CURRENCY_MAP.SE;
  if (name === 'singapore') return COUNTRY_CURRENCY_MAP.SG;
  if (name === 'united arab emirates' || name === 'uae') return COUNTRY_CURRENCY_MAP.AE;
  if (name === 'united states' || name === 'usa') return COUNTRY_CURRENCY_MAP.US;
  return { currencyType: null, currencySymbol: null };
}

async function ensureCountriesSchema() {
  if (!ensureCountriesSchemaPromise) {
    ensureCountriesSchemaPromise = (async () => {
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

      const [currencyTypeColumn] = await pool.query<RowDataPacket[]>(`SHOW COLUMNS FROM countries LIKE 'currency_type'`);
      if (!currencyTypeColumn.length) {
        await pool.query(`ALTER TABLE countries ADD COLUMN currency_type VARCHAR(80) NULL AFTER iso_code`);
      }

      const [currencySymbolColumn] = await pool.query<RowDataPacket[]>(`SHOW COLUMNS FROM countries LIKE 'currency_symbol'`);
      if (!currencySymbolColumn.length) {
        await pool.query(`ALTER TABLE countries ADD COLUMN currency_symbol VARCHAR(20) NULL AFTER currency_type`);
      }

      for (const [isoCode, currency] of Object.entries(COUNTRY_CURRENCY_MAP)) {
        await pool.query(
          `UPDATE countries
           SET currency_type = COALESCE(currency_type, ?),
               currency_symbol = COALESCE(currency_symbol, ?)
           WHERE iso_code = ?`,
          [currency.currencyType, currency.currencySymbol, isoCode]
        );
      }
    })().catch((error) => {
      ensureCountriesSchemaPromise = null;
      throw error;
    });
  }

  await ensureCountriesSchemaPromise;
}

router.use((req, res, next) => {
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', MENU_CACHE_CONTROL);
  }
  next();
});

router.get('/', async (_req, res) => {
  await ensureCountriesSchema();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, name, iso_code AS isoCode, currency_type AS currencyType, currency_symbol AS currencySymbol,
            created_at AS createdAt, updated_at AS updatedAt
     FROM countries
     ORDER BY name ASC`
  );
  res.json(rows);
});

router.post('/', async (req, res) => {
  await ensureCountriesSchema();
  const { name, isoCode, currencyType, currencySymbol } = req.body;
  const mappedCurrency = getCountryCurrency({ name, isoCode });
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO countries (name, iso_code, currency_type, currency_symbol)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       currency_type = VALUES(currency_type),
       currency_symbol = VALUES(currency_symbol)`,
    [
      name,
      isoCode?.toUpperCase(),
      currencyType || mappedCurrency.currencyType || null,
      currencySymbol || mappedCurrency.currencySymbol || null
    ]
  );
  const id = (result as ResultSetHeader).insertId || (await getCountryId(isoCode));
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, name, iso_code AS isoCode, currency_type AS currencyType, currency_symbol AS currencySymbol,
            created_at AS createdAt, updated_at AS updatedAt
     FROM countries
     WHERE id = ?`,
    [id]
  );
  res.status(201).json(rows[0]);
});

async function getCountryId(isoCode?: string) {
  if (!isoCode) return null;
  const [rows] = await pool.query<RowDataPacket[]>('SELECT id FROM countries WHERE iso_code = ? LIMIT 1', [
    isoCode.toUpperCase()
  ]);
  return rows.length ? rows[0].id : null;
}

export default router;
