// Type declaration for pdf-parse v1.x
// No @types/pdf-parse exists on DefinitelyTyped so we declare only
// what we use. Extend this if more of the API is needed later.

declare module 'pdf-parse' {
  interface PDFData {
    // Total number of pages in the PDF
    numpages: number
    // Raw extracted text from all pages combined
    text: string
    // PDF metadata (author, title, creator, etc.)
    info: Record<string, unknown>
    // PDF.js version used internally
    version: string
  }

  function pdfParse(dataBuffer: Buffer, options?: Record<string, unknown>): Promise<PDFData>

  export = pdfParse
}
