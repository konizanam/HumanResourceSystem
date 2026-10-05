import * as XLSX from "xlsx-js-style";

// Shared look & feel for spreadsheet exports — mirrors the candidate export on
// the job applications page: dark title bar, label/value summary block, italic
// description, blue header row and zebra-striped bordered data rows.

type CellValue = string | number;

export type StyledSheetOptions = {
  title: string;
  summary?: [string, CellValue][];
  description?: string;
  rows: Record<string, unknown>[];
  headers?: string[];
};

const titleStyle = {
  font: { name: "Calibri", sz: 18, bold: true, color: { rgb: "FFFFFFFF" } },
  fill: { patternType: "solid", fgColor: { rgb: "FF1F2937" } },
  alignment: { horizontal: "center", vertical: "center" },
};
const labelStyle = {
  font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "FF374151" } },
  fill: { patternType: "solid", fgColor: { rgb: "FFF3F4F6" } },
  alignment: { vertical: "center" },
};
const valueStyle = {
  font: { name: "Calibri", sz: 11, color: { rgb: "FF111827" } },
  alignment: { horizontal: "left", vertical: "center" },
};
const descriptionStyle = {
  font: { name: "Calibri", sz: 11, italic: true, color: { rgb: "FF4B5563" } },
  alignment: { horizontal: "left", vertical: "center", wrapText: true },
};
const headerStyle = {
  font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "FFFFFFFF" } },
  fill: { patternType: "solid", fgColor: { rgb: "FF2563EB" } },
  alignment: { horizontal: "left", vertical: "center", wrapText: true },
  border: {
    top: { style: "thin", color: { rgb: "FF1E40AF" } },
    bottom: { style: "thin", color: { rgb: "FF1E40AF" } },
    left: { style: "thin", color: { rgb: "FF1E40AF" } },
    right: { style: "thin", color: { rgb: "FF1E40AF" } },
  },
};
const dataCellStyle = {
  font: { name: "Calibri", sz: 11, color: { rgb: "FF111827" } },
  alignment: { horizontal: "left", vertical: "top", wrapText: true },
  border: {
    top: { style: "thin", color: { rgb: "FFE5E7EB" } },
    bottom: { style: "thin", color: { rgb: "FFE5E7EB" } },
    left: { style: "thin", color: { rgb: "FFE5E7EB" } },
    right: { style: "thin", color: { rgb: "FFE5E7EB" } },
  },
};
const altDataCellStyle = {
  ...dataCellStyle,
  fill: { patternType: "solid", fgColor: { rgb: "FFF9FAFB" } },
};

function toCell(value: unknown): CellValue {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return value;
  return String(value);
}

export function buildStyledSheet({ title, summary = [], description, rows, headers }: StyledSheetOptions) {
  const columns = headers ?? (rows.length > 0 ? Object.keys(rows[0]) : []);
  const colCount = Math.max(columns.length, 2);

  const aoa: CellValue[][] = [[title], []];
  const summaryStart = aoa.length;
  summary.forEach(([label, value]) => aoa.push([label, value]));
  if (summary.length > 0) aoa.push([]);
  const descriptionRow = description ? aoa.length : -1;
  if (description) aoa.push([description], []);
  const headerRow = aoa.length;
  aoa.push(columns);
  rows.forEach((row) => aoa.push(columns.map((column) => toCell(row[column]))));

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Size each column to its widest header/value, within sensible bounds.
  ws["!cols"] = Array.from({ length: colCount }, (_, c) => {
    let width = c === 0 ? 22 : 12;
    if (c < columns.length) {
      width = Math.max(width, columns[c].length + 2);
      rows.forEach((row) => {
        width = Math.max(width, String(toCell(row[columns[c]])).length + 2);
      });
    }
    if (c < 2) {
      summary.forEach((entry) => {
        width = Math.max(width, String(entry[c]).length + 2);
      });
    }
    return { wch: Math.min(width, 50) };
  });

  const merges = [{ s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } }];
  if (descriptionRow >= 0) merges.push({ s: { r: descriptionRow, c: 0 }, e: { r: descriptionRow, c: colCount - 1 } });
  ws["!merges"] = merges;

  const rowHeights: { hpt?: number }[] = [{ hpt: 32 }];
  if (descriptionRow >= 0) rowHeights[descriptionRow] = { hpt: 36 };
  ws["!rows"] = Array.from({ length: rowHeights.length }, (_, i) => rowHeights[i] ?? {});

  function setCellStyle(r: number, c: number, style: Record<string, unknown>) {
    const cell = ws[XLSX.utils.encode_cell({ r, c })];
    if (!cell) return;
    (cell as { s?: unknown }).s = style;
  }

  setCellStyle(0, 0, titleStyle);
  summary.forEach((_, i) => {
    setCellStyle(summaryStart + i, 0, labelStyle);
    setCellStyle(summaryStart + i, 1, valueStyle);
  });
  if (descriptionRow >= 0) setCellStyle(descriptionRow, 0, descriptionStyle);
  for (let c = 0; c < columns.length; c++) setCellStyle(headerRow, c, headerStyle);
  rows.forEach((_, i) => {
    const style = i % 2 === 0 ? dataCellStyle : altDataCellStyle;
    for (let c = 0; c < columns.length; c++) setCellStyle(headerRow + 1 + i, c, style);
  });

  return ws;
}

export function appendStyledSheet(workbook: XLSX.WorkBook, sheetName: string, options: StyledSheetOptions) {
  XLSX.utils.book_append_sheet(workbook, buildStyledSheet(options), sheetName.slice(0, 31));
}

export function writeStyledWorkbook(fileName: string, sheets: { name: string; options: StyledSheetOptions }[]) {
  const workbook = XLSX.utils.book_new();
  sheets.forEach(({ name, options }) => appendStyledSheet(workbook, name, options));
  XLSX.writeFile(workbook, fileName);
}
