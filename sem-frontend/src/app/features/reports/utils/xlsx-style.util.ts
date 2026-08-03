export const BRAND_PURPLE = '5B21B6';
export const BRAND_INDIGO = '4F46E5';
export const BRAND_DARK_INDIGO = '1E1B4B';
export const BRAND_EMERALD = '059669';

export interface CellStyleOpts {
  fillColor?: string;
  fontColor?: string;
  fontSize?: number;
  bold?: boolean;
}

export function autosizeColumns(ws: any, XLSX: any): void {
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
  const cols: Array<{ wch: number }> = [];
  for (let C = range.s.c; C <= range.e.c; ++C) {
    let maxLen = 12;
    for (let R = range.s.r; R <= range.e.r; ++R) {
      const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
      if (cell && cell.v !== undefined && cell.v !== null) {
        maxLen = Math.max(maxLen, cell.v.toString().length);
      }
    }
    cols.push({ wch: maxLen + 2 });
  }
  ws['!cols'] = cols;
}

export function headerCellStyle(opts: CellStyleOpts = {}) {
  return {
    fill: { fgColor: { rgb: opts.fillColor ?? BRAND_PURPLE } },
    font: {
      bold: opts.bold ?? true,
      color: { rgb: opts.fontColor ?? 'FFFFFF' },
      name: 'Segoe UI',
      size: opts.fontSize ?? 10,
    },
    alignment: { horizontal: 'left', vertical: 'center' },
  };
}

export function bodyCellStyle() {
  return {
    font: { name: 'Segoe UI', size: 10 },
    alignment: { vertical: 'center' },
  };
}

export function styleHeaderRow(ws: any, XLSX: any, opts: CellStyleOpts = {}): void {
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const address = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!ws[address]) continue;
    ws[address].s = headerCellStyle(opts);
  }
  for (let R = 1; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[address]) continue;
      ws[address].s = bodyCellStyle();
    }
  }
}

export function applyBrandedSheet(ws: any, XLSX: any, opts: CellStyleOpts = {}): void {
  autosizeColumns(ws, XLSX);
  styleHeaderRow(ws, XLSX, opts);
}

export function applyAoaLabeledSheet(ws: any, XLSX: any, opts: CellStyleOpts = {}): void {
  autosizeColumns(ws, XLSX);
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[address]) continue;
      if (R === 0 || C === 0) {
        ws[address].s = headerCellStyle(opts);
      } else {
        ws[address].s = bodyCellStyle();
      }
    }
  }
}

export type HeaderPredicate = (val: string, row: number, col: number) => boolean;

export function applyCustomStyledSheet(
  ws: any,
  XLSX: any,
  isHeader: HeaderPredicate,
  headerOpts: CellStyleOpts = {},
  altHeaderOpts?: CellStyleOpts,
  altHeaderPredicate?: HeaderPredicate,
  opts: { skipAutosize?: boolean } = {},
): void {
  if (!opts.skipAutosize) autosizeColumns(ws, XLSX);
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[address];
      if (!cell) continue;
      const val = cell.v != null ? cell.v.toString() : '';
      if (altHeaderPredicate && altHeaderPredicate(val, R, C)) {
        cell.s = headerCellStyle(altHeaderOpts ?? headerOpts);
      } else if (isHeader(val, R, C)) {
        cell.s = headerCellStyle(headerOpts);
      } else {
        cell.s = bodyCellStyle();
      }
    }
  }
}
