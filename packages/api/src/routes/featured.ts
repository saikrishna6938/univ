import { Router } from 'express';
import { pool } from '../config/database';
import { RowDataPacket } from 'mysql2';

const router = Router();

router.get('/', async (_req, res) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT fu.id,
            fu.university_image AS universityImage,
            fu.discount_on_application_fees AS discount,
            p.id AS programId,
            p.program_name AS programName,
            p.university_name AS universityName,
            p.application_fee AS applicationFee,
            c.id AS countryId,
            c.name AS countryName,
            c.iso_code AS countryIso
     FROM featured_universities fu
     JOIN programs p ON fu.program_id = p.id
     JOIN countries c ON fu.country_id = c.id
     ORDER BY fu.created_at DESC
     LIMIT 50`
  );
  res.json(rows);
});

export default router;
