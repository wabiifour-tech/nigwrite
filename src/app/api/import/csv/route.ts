/**
 * NigWrite - CSV Import API
 * POST /api/import/csv
 *
 * Import a student roster from CSV.
 * Expected columns: name, email, student_id (student_id is optional)
 * Creates User records with role "student" and hashed default password.
 * Returns import results with success count and errors.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

const MAX_CSV_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_ROWS = 500;
const DEFAULT_PASSWORD = 'ChangeMe123!';
const SALT_ROUNDS = 12;

interface CsvRow {
  name: string;
  email: string;
  student_id?: string;
}

interface ImportError {
  row: number;
  email: string;
  error: string;
}

/** Parse CSV string into array of objects. */
function parseCSV(csvText: string): { rows: CsvRow[]; errors: ImportError[] } {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) {
    return { rows: [], errors: [{ row: 0, email: '', error: 'CSV must have a header row and at least one data row' }] };
  }

  // Parse header
  const headerLine = lines[0];
  const headers = headerLine.split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));

  const nameIdx = headers.findIndex(h => h === 'name' || h === 'full_name' || h === 'fullname');
  const emailIdx = headers.findIndex(h => h === 'email' || h === 'e-mail' || h === 'email_address');
  const studentIdIdx = headers.findIndex(h => h === 'student_id' || h === 'studentid' || h === 'id' || h === 'matric_no');

  if (nameIdx === -1) {
    return { rows: [], errors: [{ row: 1, email: '', error: 'Missing "name" column in CSV header' }] };
  }
  if (emailIdx === -1) {
    return { rows: [], errors: [{ row: 1, email: '', error: 'Missing "email" column in CSV header' }] };
  }

  const rows: CsvRow[] = [];
  const errors: ImportError[] = [];

  for (let i = 1; i < lines.length && rows.length + errors.length < MAX_ROWS; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV parsing (handles quoted fields)
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current.trim());

    const name = fields[nameIdx] || '';
    const email = (fields[emailIdx] || '').toLowerCase().trim();
    const studentId = studentIdIdx !== -1 ? fields[studentIdIdx] || undefined : undefined;

    // Validate
    if (!name || name.length < 2) {
      errors.push({ row: i + 1, email, error: 'Name must be at least 2 characters' });
      continue;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push({ row: i + 1, email, error: 'Invalid email format' });
      continue;
    }

    rows.push({ name, email, student_id: studentId });
  }

  return { rows, errors };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded. Send a CSV file as "file" field.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_CSV_SIZE) {
      return NextResponse.json(
        { success: false, error: `CSV file too large. Maximum size is ${MAX_CSV_SIZE / (1024 * 1024)}MB.` },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json(
        { success: false, error: 'Only .csv files are accepted' },
        { status: 400 }
      );
    }

    const csvText = await file.text();
    const { rows, errors: parseErrors } = parseCSV(csvText);

    if (rows.length === 0 && parseErrors.length > 0) {
      return NextResponse.json(
        { success: false, error: 'No valid rows found in CSV', details: parseErrors },
        { status: 400 }
      );
    }

    // Hash the default password once (used for all new users)
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);

    let successCount = 0;
    let skipCount = 0;
    const importErrors: ImportError[] = [...parseErrors];

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      try {
        // Check if user with this email already exists
        const existing = await db.user.findUnique({
          where: { email: row.email },
        });

        if (existing) {
          skipCount++;
          continue;
        }

        // Create new user
        await db.user.create({
          data: {
            name: row.name,
            email: row.email,
            password: hashedPassword,
            role: 'student',
            isActive: true,
          },
        });

        successCount++;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to create user';
        importErrors.push({ row: i + 2, email: row.email, error: message });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        totalRows: rows.length + parseErrors.length,
        successfulImports: successCount,
        skippedExisting: skipCount,
        errors: importErrors,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'CSV import failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
