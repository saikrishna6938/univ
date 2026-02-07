import fs from 'fs';
import path from 'path';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { connectToDatabase, pool } from '../config/database';

async function runSqlFile(filePath: string) {
  const sql = fs.readFileSync(filePath, 'utf-8');
  const statements = sql
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await pool.query(statement);
  }
}

async function getCountryId(isoCode: string, name: string): Promise<number> {
  const [existing] = await pool.query<RowDataPacket[]>('SELECT id FROM countries WHERE iso_code = ? LIMIT 1', [
    isoCode
  ]);
  if (existing.length) return Number(existing[0].id);

  const [result] = await pool.query<ResultSetHeader>(
    'INSERT INTO countries (name, iso_code) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)',
    [name, isoCode]
  );
  if ((result as ResultSetHeader).insertId) return (result as ResultSetHeader).insertId;

  const [after] = await pool.query<RowDataPacket[]>('SELECT id FROM countries WHERE iso_code = ? LIMIT 1', [isoCode]);
  return after.length ? Number(after[0].id) : 0;
}

const programColumns = [
  'program_name',
  'university_name',
  'degree_15yr_accepted',
  'portal_or_direct',
  'level_of_study',
  'duration_in_months',
  'duration_in_years',
  'pace_of_study',
  'teaching_form',
  'language_of_study',
  'private_or_public',
  'location',
  'campus',
  'currency',
  'application_fee',
  'admission_fee',
  'initial_deposit',
  'scholarship',
  'concentration',
  'tuition_fee_per_semester',
  'tuition_fee_per_year',
  'tuition_fee_per_course',
  'credits',
  'per_credit_rate',
  'gre_score',
  'gmat_score',
  'sat_score',
  'act_score',
  'ielts',
  'ielts_nblt',
  'toefl',
  'toefl_nblt',
  'duolingo',
  'duolingo_nblt',
  'pte',
  'pte_nblt',
  'backlogs',
  'moi_accepted',
  'wes_required',
  'aps_required',
  'inter_english_first_year',
  'inter_english_second_year',
  'intakes',
  'deadlines',
  'gap_accepted',
  'without_maths',
  'stateboard_accepted',
  'entry_requirement_out_of4',
  'entry_requirement_out_of5',
  'entry_requirement_out_of10',
  'entry_requirement_out_of100',
  'english_requirement_icse',
  'english_requirement_cbse',
  'english_requirement_ib',
  'english_requirement_others',
  'age_gap_upto',
  'noticeable_academic_gap',
  'country_id',
  'data'
] as const;

function mapProgramValues(rec: any, countryId: number | null) {
  const num = (v: any) => (v === '' || v === undefined ? null : Number(v));
  return [
    rec.programName,
    rec.universityName,
    rec.degree15yrAccepted ?? null,
    rec.portalOrDirect ?? null,
    rec.levelOfStudy ?? null,
    num(rec.durationInMonths ?? rec.duration),
    num(rec.durationInYears),
    rec.paceOfStudy ?? null,
    rec.teachingForm ?? null,
    rec.languageOfStudy ?? null,
    rec.privateOrPublic ?? null,
    rec.location ?? null,
    rec.campus ?? null,
    rec.currency ?? null,
    num(rec.applicationFee),
    num(rec.admissionFee),
    num(rec.initialDeposit),
    rec.scholarship ?? null,
    rec.concentration ?? null,
    num(rec.tuitionFeePerSemester),
    num(rec.tuitionFeePerYear),
    num(rec.tuitionFeePerCourse),
    num(rec.credits),
    num(rec.perCreditRate),
    rec.greScore ?? null,
    rec.gmatScore ?? null,
    rec.satScore ?? null,
    rec.actScore ?? null,
    rec.ielts ?? null,
    rec.ieltsNblt ?? null,
    rec.toefl ?? null,
    rec.toeflNblt ?? null,
    rec.duolingo ?? null,
    rec.duolingoNblt ?? null,
    rec.pte ?? null,
    rec.pteNblt ?? null,
    rec.backlogs ?? null,
    rec.moiAccepted ?? null,
    rec.wesRequired ?? null,
    rec.apsRequired ?? null,
    rec.interEnglishFirstYear ?? null,
    rec.interEnglishSecondYear ?? null,
    rec.intakes ?? null,
    rec.deadlines ?? null,
    rec.gapAccepted ?? null,
    rec.withoutMaths ?? null,
    rec.stateboardAccepted ?? null,
    num(rec.entryRequirementOutOf4),
    num(rec.entryRequirementOutOf5),
    num(rec.entryRequirementOutOf10),
    num(rec.entryRequirementOutOf100),
    rec.englishRequirementICSE ?? null,
    rec.englishRequirementCBSE ?? null,
    rec.englishRequirementIB ?? null,
    rec.englishRequirementOthers ?? null,
    rec.ageGapUpto ?? null,
    rec.noticeableAcademicGap ?? null,
    countryId,
    JSON.stringify(rec)
  ];
}

async function upsertProgram(rec: any, countryId: number | null) {
  const placeholders = programColumns.map(() => '?').join(', ');
  const updates = programColumns
    .filter((c) => !['program_name', 'university_name'].includes(c))
    .map((c) => `${c} = VALUES(${c})`)
    .join(', ');

  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO programs (${programColumns.join(', ')})
     VALUES (${placeholders})
     ON DUPLICATE KEY UPDATE ${updates}, updated_at = CURRENT_TIMESTAMP`,
    mapProgramValues(rec, countryId)
  );
  return (result as ResultSetHeader).insertId;
}

async function main() {
  await connectToDatabase();

  const schemaPath = path.join(__dirname, '../../seed.sql');
  await runSqlFile(schemaPath);
  console.log('Schema applied');

  const seedPath = path.join(__dirname, '../../seed-programs.json');
  if (fs.existsSync(seedPath)) {
    const data = JSON.parse(fs.readFileSync(seedPath, 'utf-8')) as any[];
    let count = 0;
    for (const rec of data) {
      const iso = (rec.isoCode || 'UNK').toUpperCase();
      const countryId = await getCountryId(iso, rec.countryName || 'Unknown');
      await upsertProgram(rec, countryId);
      count += 1;
    }
    console.log(`Seeded ${count} programs`);
  } else {
    console.log('No seed-programs.json found, skipped program import');
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
