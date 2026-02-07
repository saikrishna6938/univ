import { Router } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../config/database';
import { env } from '../config/env';

const router = Router();

type ProgramRow = RowDataPacket & {
  id: number;
  program_name: string;
  university_name: string;
  degree_15yr_accepted: string | null;
  portal_or_direct: string | null;
  concentration: string | null;
  level_of_study: string | null;
  duration_in_months: number | null;
  duration_in_years: number | null;
  pace_of_study: string | null;
  teaching_form: string | null;
  language_of_study: string | null;
  private_or_public: string | null;
  location: string | null;
  campus: string | null;
  currency: string | null;
  application_fee: number | null;
  admission_fee: number | null;
  initial_deposit: number | null;
  scholarship: string | null;
  tuition_fee_per_semester: number | null;
  tuition_fee_per_year: number | null;
  tuition_fee_per_course: number | null;
  credits: number | null;
  per_credit_rate: number | null;
  gre_score: string | null;
  gmat_score: string | null;
  sat_score: string | null;
  act_score: string | null;
  ielts: string | null;
  ielts_nblt: string | null;
  toefl: string | null;
  toefl_nblt: string | null;
  duolingo: string | null;
  duolingo_nblt: string | null;
  pte: string | null;
  pte_nblt: string | null;
  backlogs: string | null;
  moi_accepted: string | null;
  wes_required: string | null;
  aps_required: string | null;
  inter_english_first_year: string | null;
  inter_english_second_year: string | null;
  intakes: string | null;
  deadlines: string | null;
  gap_accepted: string | null;
  without_maths: string | null;
  stateboard_accepted: string | null;
  entry_requirement_out_of4: number | null;
  entry_requirement_out_of5: number | null;
  entry_requirement_out_of10: number | null;
  entry_requirement_out_of100: number | null;
  english_requirement_icse: string | null;
  english_requirement_cbse: string | null;
  english_requirement_ib: string | null;
  english_requirement_others: string | null;
  age_gap_upto: string | null;
  noticeable_academic_gap: string | null;
  country_id: number | null;
  countryName?: string;
  countryIsoCode?: string;
  data?: string | null;
  created_at: string;
  updated_at: string;
};

function toProgram(row: ProgramRow) {
  const data = row.data ? JSON.parse(row.data) : {};
  return {
    ...data,
    id: row.id,
    programName: row.program_name,
    universityName: row.university_name,
    degree15yrAccepted: row.degree_15yr_accepted,
    portalOrDirect: row.portal_or_direct,
    concentration: row.concentration,
    levelOfStudy: row.level_of_study,
    durationInMonths: row.duration_in_months,
    durationInYears: row.duration_in_years,
    paceOfStudy: row.pace_of_study,
    teachingForm: row.teaching_form,
    languageOfStudy: row.language_of_study,
    privateOrPublic: row.private_or_public,
    location: row.location,
    campus: row.campus,
    currency: row.currency,
    applicationFee: row.application_fee,
    admissionFee: row.admission_fee,
    initialDeposit: row.initial_deposit,
    scholarship: row.scholarship,
    tuitionFeePerSemester: row.tuition_fee_per_semester,
    tuitionFeePerYear: row.tuition_fee_per_year,
    tuitionFeePerCourse: row.tuition_fee_per_course,
    credits: row.credits,
    perCreditRate: row.per_credit_rate,
    greScore: row.gre_score,
    gmatScore: row.gmat_score,
    satScore: row.sat_score,
    actScore: row.act_score,
    ielts: row.ielts,
    ieltsNblt: row.ielts_nblt,
    toefl: row.toefl,
    toeflNblt: row.toefl_nblt,
    duolingo: row.duolingo,
    duolingoNblt: row.duolingo_nblt,
    pte: row.pte,
    pteNblt: row.pte_nblt,
    backlogs: row.backlogs,
    moiAccepted: row.moi_accepted,
    wesRequired: row.wes_required,
    apsRequired: row.aps_required,
    interEnglishFirstYear: row.inter_english_first_year,
    interEnglishSecondYear: row.inter_english_second_year,
    intakes: row.intakes,
    deadlines: row.deadlines,
    gapAccepted: row.gap_accepted,
    withoutMaths: row.without_maths,
    stateboardAccepted: row.stateboard_accepted,
    entryRequirementOutOf4: row.entry_requirement_out_of4,
    entryRequirementOutOf5: row.entry_requirement_out_of5,
    entryRequirementOutOf10: row.entry_requirement_out_of10,
    entryRequirementOutOf100: row.entry_requirement_out_of100,
    englishRequirementICSE: row.english_requirement_icse,
    englishRequirementCBSE: row.english_requirement_cbse,
    englishRequirementIB: row.english_requirement_ib,
    englishRequirementOthers: row.english_requirement_others,
    ageGapUpto: row.age_gap_upto,
    noticeableAcademicGap: row.noticeable_academic_gap,
    country: row.country_id
      ? { id: row.country_id, name: row.countryName, isoCode: row.countryIsoCode }
      : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function findCountryId(iso?: string, name?: string): Promise<number | null> {
  if (!iso && !name) return null;
  const isoNorm = iso?.toUpperCase().trim();
  const [rows] = await pool.query<RowDataPacket[]>('SELECT id FROM countries WHERE iso_code = ? OR name = ? LIMIT 1', [
    isoNorm || null,
    name || null
  ]);
  if (rows.length > 0) return Number(rows[0].id);
  return null;
}

async function upsertCountry(input: any): Promise<number | null> {
  const iso = input?.isoCode || input?.countryIso || input?.country?.isoCode || null;
  const name = input?.countryName || input?.name || input?.country?.name || null;
  const existingId = await findCountryId(iso, name);
  if (existingId) return existingId;

  if (!iso && !name) return null;

  const [result] = await pool.query<ResultSetHeader>(
    'INSERT INTO countries (name, iso_code) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)',
    [name || iso || 'Unknown', iso || name || 'UNK']
  );
  if ((result as ResultSetHeader).insertId) return (result as ResultSetHeader).insertId;
  return findCountryId(iso, name);
}

async function findProgramId(programName: string, universityName: string): Promise<number | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id FROM programs WHERE program_name = ? AND university_name = ? LIMIT 1',
    [programName, universityName]
  );
  if (rows.length > 0) return Number(rows[0].id);
  return null;
}

// GET /api/programs?search=&country=&level=
router.get('/', async (req, res) => {
  const { search, country, level } = req.query;
  const filters: string[] = [];
  const params: any[] = [];

  if (country) {
    if (!Number.isNaN(Number(country))) {
      filters.push('p.country_id = ?');
      params.push(Number(country));
    } else {
      filters.push('c.iso_code = ?');
      params.push(String(country));
    }
  }

  if (level) {
    filters.push('p.level_of_study = ?');
    params.push(level);
  }

  if (search && typeof search === 'string') {
    filters.push('(p.program_name LIKE ? OR p.university_name LIKE ? OR p.concentration LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  let sql =
    'SELECT p.*, c.name AS countryName, c.iso_code AS countryIsoCode FROM programs p ' +
    'LEFT JOIN countries c ON p.country_id = c.id';

  if (filters.length) {
    sql += ' WHERE ' + filters.join(' AND ');
  }

  sql += ' ORDER BY p.created_at DESC LIMIT 50';

  const [rows] = await pool.query<ProgramRow[]>(sql, params);
  res.json(rows.map(toProgram));
});

// GET /api/programs/paginated?offset=0&limit=10&countryId=&search=&current_url_token_request=
router.get('/paginated', async (req, res) => {
  const { offset = '0', limit = '10', countryId, search, current_url_token_request } = req.query;

  if (env.requestToken && current_url_token_request !== env.requestToken) {
    return res.status(401).json({ error: 'Invalid request token' });
  }

  const off = Number(offset) || 0;
  const lim = Math.min(Number(limit) || 10, 50); // cap to avoid abuse

  const filters: string[] = [];
  const params: any[] = [];

  if (countryId) {
    if (!Number.isNaN(Number(countryId))) {
      filters.push('p.country_id = ?');
      params.push(Number(countryId));
    } else {
      filters.push('c.iso_code = ?');
      params.push(String(countryId));
    }
  }

  if (search && typeof search === 'string') {
    filters.push('(p.program_name LIKE ? OR p.university_name LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like);
  }

  let sql =
    'SELECT p.*, c.name AS countryName, c.iso_code AS countryIsoCode FROM programs p ' +
    'LEFT JOIN countries c ON p.country_id = c.id';

  if (filters.length) {
    sql += ' WHERE ' + filters.join(' AND ');
  }

  sql += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
  params.push(lim, off);

  const [rows] = await pool.query<ProgramRow[]>(sql, params);
  res.json(rows.map(toProgram));
});

// POST /api/programs (admin seeding)
router.post('/', async (req, res) => {
  const body = req.body || {};
  if (!body.programName || !body.universityName) {
    return res.status(400).json({ error: 'programName and universityName are required' });
  }

  const countryId = await upsertCountry(body.country || body);
  const num = (v: any) => (v === '' || v === undefined ? null : Number(v));
  const values = [
    body.programName,
    body.universityName,
    body.degree15yrAccepted ?? null,
    body.portalOrDirect ?? null,
    body.levelOfStudy ?? null,
    num(body.durationInMonths ?? body.duration),
    num(body.durationInYears),
    body.paceOfStudy ?? null,
    body.teachingForm ?? null,
    body.languageOfStudy ?? null,
    body.privateOrPublic ?? null,
    body.location ?? null,
    body.campus ?? null,
    body.currency ?? null,
    num(body.applicationFee),
    num(body.admissionFee),
    num(body.initialDeposit),
    body.scholarship ?? null,
    body.concentration ?? null,
    num(body.tuitionFeePerSemester),
    num(body.tuitionFeePerYear),
    num(body.tuitionFeePerCourse),
    num(body.credits),
    num(body.perCreditRate),
    body.greScore ?? null,
    body.gmatScore ?? null,
    body.satScore ?? null,
    body.actScore ?? null,
    body.ielts ?? null,
    body.ieltsNblt ?? null,
    body.toefl ?? null,
    body.toeflNblt ?? null,
    body.duolingo ?? null,
    body.duolingoNblt ?? null,
    body.pte ?? null,
    body.pteNblt ?? null,
    body.backlogs ?? null,
    body.moiAccepted ?? null,
    body.wesRequired ?? null,
    body.apsRequired ?? null,
    body.interEnglishFirstYear ?? null,
    body.interEnglishSecondYear ?? null,
    body.intakes ?? null,
    body.deadlines ?? null,
    body.gapAccepted ?? null,
    body.withoutMaths ?? null,
    body.stateboardAccepted ?? null,
    num(body.entryRequirementOutOf4),
    num(body.entryRequirementOutOf5),
    num(body.entryRequirementOutOf10),
    num(body.entryRequirementOutOf100),
    body.englishRequirementICSE ?? null,
    body.englishRequirementCBSE ?? null,
    body.englishRequirementIB ?? null,
    body.englishRequirementOthers ?? null,
    body.ageGapUpto ?? null,
    body.noticeableAcademicGap ?? null,
    countryId,
    JSON.stringify(body)
  ];

  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO programs (
        program_name, university_name, degree_15yr_accepted, portal_or_direct, level_of_study,
        duration_in_months, duration_in_years, pace_of_study, teaching_form, language_of_study,
        private_or_public, location, campus, currency, application_fee, admission_fee, initial_deposit,
        scholarship, concentration, tuition_fee_per_semester, tuition_fee_per_year, tuition_fee_per_course,
        credits, per_credit_rate, gre_score, gmat_score, sat_score, act_score, ielts, ielts_nblt, toefl,
        toefl_nblt, duolingo, duolingo_nblt, pte, pte_nblt, backlogs, moi_accepted, wes_required, aps_required,
        inter_english_first_year, inter_english_second_year, intakes, deadlines, gap_accepted, without_maths,
        stateboard_accepted, entry_requirement_out_of4, entry_requirement_out_of5, entry_requirement_out_of10,
        entry_requirement_out_of100, english_requirement_icse, english_requirement_cbse, english_requirement_ib,
        english_requirement_others, age_gap_upto, noticeable_academic_gap, country_id, data
     ) VALUES (${Array(58).fill('?').join(', ')})
     ON DUPLICATE KEY UPDATE
        degree_15yr_accepted = VALUES(degree_15yr_accepted),
        portal_or_direct = VALUES(portal_or_direct),
        level_of_study = VALUES(level_of_study),
        duration_in_months = VALUES(duration_in_months),
        duration_in_years = VALUES(duration_in_years),
        pace_of_study = VALUES(pace_of_study),
        teaching_form = VALUES(teaching_form),
        language_of_study = VALUES(language_of_study),
        private_or_public = VALUES(private_or_public),
        location = VALUES(location),
        campus = VALUES(campus),
        currency = VALUES(currency),
        application_fee = VALUES(application_fee),
        admission_fee = VALUES(admission_fee),
        initial_deposit = VALUES(initial_deposit),
        scholarship = VALUES(scholarship),
        concentration = VALUES(concentration),
        tuition_fee_per_semester = VALUES(tuition_fee_per_semester),
        tuition_fee_per_year = VALUES(tuition_fee_per_year),
        tuition_fee_per_course = VALUES(tuition_fee_per_course),
        credits = VALUES(credits),
        per_credit_rate = VALUES(per_credit_rate),
        gre_score = VALUES(gre_score),
        gmat_score = VALUES(gmat_score),
        sat_score = VALUES(sat_score),
        act_score = VALUES(act_score),
        ielts = VALUES(ielts),
        ielts_nblt = VALUES(ielts_nblt),
        toefl = VALUES(toefl),
        toefl_nblt = VALUES(toefl_nblt),
        duolingo = VALUES(duolingo),
        duolingo_nblt = VALUES(duolingo_nblt),
        pte = VALUES(pte),
        pte_nblt = VALUES(pte_nblt),
        backlogs = VALUES(backlogs),
        moi_accepted = VALUES(moi_accepted),
        wes_required = VALUES(wes_required),
        aps_required = VALUES(aps_required),
        inter_english_first_year = VALUES(inter_english_first_year),
        inter_english_second_year = VALUES(inter_english_second_year),
        intakes = VALUES(intakes),
        deadlines = VALUES(deadlines),
        gap_accepted = VALUES(gap_accepted),
        without_maths = VALUES(without_maths),
        stateboard_accepted = VALUES(stateboard_accepted),
        entry_requirement_out_of4 = VALUES(entry_requirement_out_of4),
        entry_requirement_out_of5 = VALUES(entry_requirement_out_of5),
        entry_requirement_out_of10 = VALUES(entry_requirement_out_of10),
        entry_requirement_out_of100 = VALUES(entry_requirement_out_of100),
        english_requirement_icse = VALUES(english_requirement_icse),
        english_requirement_cbse = VALUES(english_requirement_cbse),
        english_requirement_ib = VALUES(english_requirement_ib),
        english_requirement_others = VALUES(english_requirement_others),
        age_gap_upto = VALUES(age_gap_upto),
        noticeable_academic_gap = VALUES(noticeable_academic_gap),
        country_id = VALUES(country_id),
        data = VALUES(data),
        updated_at = CURRENT_TIMESTAMP`,
    values
  );

  const id =
    (result as ResultSetHeader).insertId ||
    (await findProgramId(body.programName as string, body.universityName as string));

  const [rows] = await pool.query<ProgramRow[]>(
    'SELECT p.*, c.name AS countryName, c.iso_code AS countryIsoCode FROM programs p ' +
      'LEFT JOIN countries c ON p.country_id = c.id WHERE p.id = ? LIMIT 1',
    [id]
  );
  res.status(201).json(rows.length ? toProgram(rows[0]) : { id });
});

export default router;
