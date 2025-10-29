import Papa from 'papaparse';

export interface ExpenseCSVRow {
  project_name?: string;
  phase_name?: string;
  category: string;
  amount: number | string;
  date: string;
  payment_method: string;
  type: 'expense' | 'income' | string;
  gst_amount?: number | string;
  source?: string;
  reference_id: string;
  description: string;
  tags: string;
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
  value?: any;
}

const VALID_CATEGORIES = [
  'Labour',
  'Materials',
  'Machinery',
  'Vendor Payment',
  'Consultancy Fees',
  'Government Fees',
  'Electrical',
  'Plumbing',
  'Painting',
  'Tiles & Flooring',
  'Carpentry & Woodwork',
  'Site Expenses',
  'Transport',
  'Miscellaneous',
  'Client Payment',
  'Advance Payment',
  'Milestone Payment',
  'Final Payment',
  'Additional Work Payment',
  'Material Refund',
  'Insurance Claim',
  'Government Subsidy',
  'Loan Disbursement',
  'Other Income',
];

const VALID_PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Cheque', 'UPI', 'Card'];
const VALID_TYPES = ['expense', 'income'];

export function generateCSVTemplate(): string {
  const template = {
    project_name: 'My Project',
    phase_name: 'Foundation',
    category: 'Materials',
    amount: '5000',
    date: '07-10-2025', // DD-MM-YYYY format
    payment_method: 'Cash',
    type: 'expense',
    gst_amount: '900',
    source: 'Hardware Store',
    reference_id: 'REF-001',
    description: 'Cement and sand for foundation work',
    tags: 'construction,foundation,materials',
  };

  const headers = Object.keys(template).join(',');
  const exampleRow = Object.values(template).join(',');
  return `${headers}\n${exampleRow}`;
}

export function downloadCSVTemplate(): void {
  const template = generateCSVTemplate();
  const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', 'expense_upload_template.csv');
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function parseCSVFile(file: File): Promise<ExpenseCSVRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        resolve(results.data as ExpenseCSVRow[]);
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}

export function validateCSVData(
  rows: ExpenseCSVRow[],
  projects: Array<{ id: string; name: string }>,
  phases: Array<{ id: string; name: string; project_id: string; project_name: string }>
): { isValid: boolean; errors: ValidationError[]; validRows: number } {
  const errors: ValidationError[] = [];
  let validRows = 0;

  if (rows.length === 0) {
    errors.push({
      row: 0,
      field: 'file',
      message: 'CSV file is empty or has no valid data rows',
    });
    return { isValid: false, errors, validRows };
  }

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    let rowHasErrors = false;

    if (!row.category || row.category.trim() === '') {
      errors.push({
        row: rowNumber,
        field: 'category',
        message: 'Category is required',
        value: row.category,
      });
      rowHasErrors = true;
    } else if (!VALID_CATEGORIES.includes(row.category.trim())) {
      errors.push({
        row: rowNumber,
        field: 'category',
        message: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`,
        value: row.category,
      });
      rowHasErrors = true;
    }

    if (!row.amount || isNaN(Number(row.amount)) || Number(row.amount) <= 0) {
      errors.push({
        row: rowNumber,
        field: 'amount',
        message: 'Amount must be a positive number',
        value: row.amount,
      });
      rowHasErrors = true;
    }

    if (!row.date || !isValidDate(row.date)) {
      errors.push({
        row: rowNumber,
        field: 'date',
        message: 'Date must be in DD-MM-YYYY format',
        value: row.date,
      });
      rowHasErrors = true;
    }

    if (!row.payment_method || !VALID_PAYMENT_METHODS.includes(row.payment_method.trim())) {
      errors.push({
        row: rowNumber,
        field: 'payment_method',
        message: `Payment method must be one of: ${VALID_PAYMENT_METHODS.join(', ')}`,
        value: row.payment_method,
      });
      rowHasErrors = true;
    }

    if (!row.type || !VALID_TYPES.includes(row.type.toLowerCase().trim())) {
      errors.push({
        row: rowNumber,
        field: 'type',
        message: `Type must be either 'expense' or 'income'`,
        value: row.type,
      });
      rowHasErrors = true;
    }

    if (!row.reference_id || row.reference_id.trim() === '') {
      errors.push({
        row: rowNumber,
        field: 'reference_id',
        message: 'Reference ID is required',
        value: row.reference_id,
      });
      rowHasErrors = true;
    }

    if (!row.description || row.description.trim() === '') {
      errors.push({
        row: rowNumber,
        field: 'description',
        message: 'Description is required',
        value: row.description,
      });
      rowHasErrors = true;
    }

    if (!row.tags || row.tags.trim() === '') {
      errors.push({
        row: rowNumber,
        field: 'tags',
        message: 'Tags are required',
        value: row.tags,
      });
      rowHasErrors = true;
    }

    if (row.gst_amount && (isNaN(Number(row.gst_amount)) || Number(row.gst_amount) < 0)) {
      errors.push({
        row: rowNumber,
        field: 'gst_amount',
        message: 'GST amount must be a non-negative number',
        value: row.gst_amount,
      });
      rowHasErrors = true;
    }

    if (row.project_name) {
      const project = projects.find(
        (p) => p.name.toLowerCase() === row.project_name?.toLowerCase().trim()
      );
      if (!project) {
        errors.push({
          row: rowNumber,
          field: 'project_name',
          message: 'Project not found. Must match an existing project name exactly',
          value: row.project_name,
        });
        rowHasErrors = true;
      }
    }

    if (row.phase_name) {
      const phase = phases.find(
        (ph) => ph.name.toLowerCase() === row.phase_name?.toLowerCase().trim()
      );
      if (!phase) {
        errors.push({
          row: rowNumber,
          field: 'phase_name',
          message: 'Phase not found. Must match an existing phase name exactly',
          value: row.phase_name,
        });
        rowHasErrors = true;
      } else if (row.project_name) {
        const project = projects.find(
          (p) => p.name.toLowerCase() === row.project_name?.toLowerCase().trim()
        );
        if (project && phase.project_id !== project.id) {
          errors.push({
            row: rowNumber,
            field: 'phase_name',
            message: `Phase '${row.phase_name}' does not belong to project '${row.project_name}'`,
            value: row.phase_name,
          });
          rowHasErrors = true;
        }
      }
    }

    if (!rowHasErrors) {
      validRows++;
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    validRows,
  };
}

// ✅ Helper: Convert DD-MM-YYYY → YYYY-MM-DD before saving
function convertToISO(dateString: string): string {
  const [day, month, year] = dateString.split('-');
  return `${year}-${month}-${day}`;
}

export function mapCSVRowsToExpenses(
  rows: ExpenseCSVRow[],
  projects: Array<{ id: string; name: string }>,
  phases: Array<{ id: string; name: string; project_id: string; project_name: string }>,
  userId: string
): Array<any> {
  return rows
    .map((row) => {
      const project = projects.find(
        (p) => p.name.toLowerCase() === row.project_name?.toLowerCase().trim()
      );
      const phase = phases.find(
        (ph) => ph.name.toLowerCase() === row.phase_name?.toLowerCase().trim()
      );

      if (!phase || !project) {
        return null;
      }

      return {
        phase_id: phase.id,
        project_id: project.id,
        category: row.category.trim(),
        amount: parseFloat(String(row.amount)),
        date: convertToISO(row.date), // ✅ Fix: Convert before saving
        payment_method: row.payment_method.trim(),
        type: row.type.toLowerCase().trim() as 'expense' | 'income',
        gst_amount: row.gst_amount ? parseFloat(String(row.gst_amount)) : 0,
        source: row.source?.trim() || null,
        reference_id: row.reference_id.trim(),
        description: row.description.trim(),
        tags: row.tags.trim(),
        created_by: userId,
      };
    })
    .filter((item) => item !== null);
}

function isValidDate(dateString: string): boolean {
  // Match DD-MM-YYYY
  const regex = /^(\d{2})-(\d{2})-(\d{4})$/;
  const match = dateString.match(regex);
  if (!match) return false;

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1; // months are 0-indexed
  const year = parseInt(match[3], 10);
  const date = new Date(year, month, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month &&
    date.getDate() === day
  );
}
