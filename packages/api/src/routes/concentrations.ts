import { Router } from 'express';
import { pool } from '../config/database';
import { RowDataPacket } from 'mysql2';

const router = Router();
const MENU_CACHE_CONTROL = 'public, max-age=300, s-maxage=300, stale-while-revalidate=600';

router.use((req, res, next) => {
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', MENU_CACHE_CONTROL);
  }
  next();
});

// GET /api/concentrations?country=<id or isoCode>
router.get('/', async (req, res) => {
  const { country } = req.query;
  const params: any[] = [];
  let where = 'WHERE p.concentration IS NOT NULL AND p.concentration <> ""';

  if (country) {
    // allow country id or ISO code
    where += ' AND (p.country_id = ? OR c.iso_code = ?)';
    params.push(country, typeof country === 'string' ? country.toString().toUpperCase() : country);
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT
        p.concentration AS concentration,
        p.concentration AS concentrationName,
        COUNT(p.id) AS programsCount
     FROM programs p
     LEFT JOIN countries c ON p.country_id = c.id
     ${where}
     GROUP BY p.concentration
     ORDER BY programsCount DESC, p.concentration ASC`,
    params
  );

  res.json(rows);
});

export default router;
