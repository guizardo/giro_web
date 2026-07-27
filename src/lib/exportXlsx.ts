import * as XLSX from 'xlsx';

type Cell = string | number | null | undefined;

export function downloadXlsx(filename: string, headers: string[], rows: Cell[][], sheetName = 'Dados') {
  const data = [headers, ...rows.map(r => r.map(v => (v === null || v === undefined ? '' : v)))];
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Largura de coluna proporcional ao maior conteúdo, pra não abrir tudo cortado.
  ws['!cols'] = headers.map((h, i) => {
    const maxLen = Math.max(h.length, ...rows.map(r => String(r[i] ?? '').length));
    return { wch: Math.min(Math.max(maxLen + 2, 8), 40) };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
}
