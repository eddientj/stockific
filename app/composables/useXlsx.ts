/**
 * Thin wrapper around SheetJS (xlsx).
 * Import once, use everywhere — no inline `await import('xlsx')` in pages.
 */
export function useXlsx() {
  /** Export an array of flat objects to a .xlsx file. */
  async function exportSheet(
    rows: Record<string, unknown>[],
    filename: string,
    sheetName = 'Data',
  ) {
    const XLSX = await import('xlsx')
    const ws   = XLSX.utils.json_to_sheet(rows)
    const wb   = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
    XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`)
  }

  /** Read a .xlsx / .csv File object and return rows as plain objects. */
  async function importSheet<T = Record<string, unknown>>(file: File): Promise<T[]> {
    const XLSX = await import('xlsx')
    const buf  = await file.arrayBuffer()
    const wb   = XLSX.read(buf)
    const ws   = wb.Sheets[wb.SheetNames[0] ?? '']
    if (!ws) return []
    return XLSX.utils.sheet_to_json<T>(ws)
  }

  return { exportSheet, importSheet }
}
