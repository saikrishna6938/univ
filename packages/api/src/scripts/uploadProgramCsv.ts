import fs from 'fs';
import path from 'path';
import { RowDataPacket } from 'mysql2';
import { connectToDatabase, pool } from '../config/database';

type CsvRow = Record<string, string>;

type ProgramColumn = {
  columnName: string;
  dataType: string;
  isNullable: 'YES' | 'NO';
  columnDefault: string | null;
  maxLength: number | null;
};

function normalizeHeader(header: string): string {
  return header
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/[^\w]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function parseCsv(content: string): CsvRow[] {
  const rows: string[][] = [];
  let currentField = '';
  let currentRow: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    const next = content[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        currentField += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      currentRow.push(currentField);
      currentField = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1;
      currentRow.push(currentField);
      rows.push(currentRow);
      currentField = '';
      currentRow = [];
      continue;
    }

    currentField += char;
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  if (rows.length === 0) return [];

  const headers = rows[0].map(normalizeHeader);
  return rows
    .slice(1)
    .filter((r) => r.some((v) => v.trim() !== ''))
    .map((r) => {
      const record: CsvRow = {};
      headers.forEach((header, idx) => {
        record[header] = (r[idx] ?? '').trim();
      });
      return record;
    });
}

async function getProgramColumns(): Promise<ProgramColumn[]> {
  const [columns] = await pool.query<RowDataPacket[]>(
    `SELECT
        COLUMN_NAME AS columnName,
        DATA_TYPE AS dataType,
        IS_NULLABLE AS isNullable,
        COLUMN_DEFAULT AS columnDefault,
        CHARACTER_MAXIMUM_LENGTH AS maxLength
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'programs'
     ORDER BY ORDINAL_POSITION`
  );
  return columns as ProgramColumn[];
}

function toDbValue(raw: string): string | number | null {
  const value = raw.trim();
  if (!value) return null;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return value;
}

function coerceByType(raw: string, column: ProgramColumn): string | number | null {
  const dataType = column.dataType.toLowerCase();
  const value = raw.trim();
  const numericTypes = new Set(['tinyint', 'smallint', 'mediumint', 'int', 'bigint', 'decimal', 'float', 'double']);

  if (!value) {
    if (column.isNullable === 'YES') return null;
    if (column.columnDefault !== null) return column.columnDefault;
    if (dataType === 'json') return '{}';
    if (numericTypes.has(dataType)) return 0;
    return '';
  }

  if (numericTypes.has(dataType)) {
    const normalized = value.replace(/,/g, '');
    const numericPart = normalized.match(/-?\d+(\.\d+)?/);
    if (!numericPart) {
      if (column.isNullable === 'YES') return null;
      if (column.columnDefault !== null) return column.columnDefault;
      return 0;
    }
    return Number(numericPart[0]);
  }

  if (dataType === 'json') {
    try {
      JSON.parse(value);
      return value;
    } catch {
      return JSON.stringify(value);
    }
  }

  const normalized = toDbValue(value);
  if (typeof normalized === 'string' && column.maxLength && normalized.length > column.maxLength) {
    return normalized.slice(0, column.maxLength);
  }
  return normalized;
}

async function upload(csvPath: string) {
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parseCsv(csvContent);
  if (!records.length) {
    console.log('No CSV records found.');
    return;
  }

  const dbColumns = await getProgramColumns();
  const dbSet = new Set(dbColumns.map((c) => c.columnName));
  const columnByName = new Map(dbColumns.map((c) => [c.columnName, c]));
  const systemColumns = new Set(['id', 'created_at', 'updated_at']);

  const csvHeaders = Object.keys(records[0]);
  const insertColumns = csvHeaders.filter((header) => dbSet.has(header) && !systemColumns.has(header));

  if (!insertColumns.length) {
    throw new Error('No CSV headers match columns in programs table.');
  }

  if (!insertColumns.includes('program_name') || !insertColumns.includes('university_name')) {
    throw new Error('CSV must include program_name and university_name columns.');
  }

  const ignoredHeaders = csvHeaders.filter((h) => !insertColumns.includes(h));
  if (ignoredHeaders.length) {
    console.log(`Ignoring ${ignoredHeaders.length} unmatched CSV column(s): ${ignoredHeaders.join(', ')}`);
  }

  const updatableColumns = insertColumns.filter((c) => !['program_name', 'university_name', 'created_at'].includes(c));
  const updateClause = updatableColumns.length
    ? `${updatableColumns.map((c) => `${c} = VALUES(${c})`).join(', ')}, updated_at = CURRENT_TIMESTAMP`
    : 'updated_at = CURRENT_TIMESTAMP';

  const batchSize = 200;
  let insertedOrUpdated = 0;
  let skipped = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const validRows = batch.filter((row) => row.program_name?.trim() && row.university_name?.trim());
    skipped += batch.length - validRows.length;

    if (!validRows.length) continue;

    const placeholders = validRows.map(() => `(${insertColumns.map(() => '?').join(', ')})`).join(', ');
    const values = validRows.flatMap((row) =>
      insertColumns.map((column) => coerceByType(row[column] ?? '', columnByName.get(column)!))
    );

    await pool.query(
      `INSERT INTO programs (${insertColumns.join(', ')})
       VALUES ${placeholders}
       ON DUPLICATE KEY UPDATE ${updateClause}`,
      values
    );

    insertedOrUpdated += validRows.length;
  }

  console.log(`Processed ${records.length} row(s). Inserted/updated: ${insertedOrUpdated}. Skipped: ${skipped}.`);
}

async function main() {
  await connectToDatabase();
  const csvPath = path.resolve(process.cwd(), 'data/programs/data.csv');
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found at: ${csvPath}`);
  }

  await upload(csvPath);
  await pool.end();
}

main().catch(async (error) => {
  console.error(error);
  try {
    await pool.end();
  } catch {
    // ignore close errors
  }
  process.exit(1);
});
