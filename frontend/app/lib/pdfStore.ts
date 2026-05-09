// Module-level store untuk PDF File saat navigasi client-side (audit → create)
let _pdfFile: File | null = null;

export const pdfStore = {
  set: (f: File | null) => { _pdfFile = f; },
  get: () => _pdfFile,
  clear: () => { _pdfFile = null; },
};
