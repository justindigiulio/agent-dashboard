// types/shims.d.ts
declare module 'pdf-parse' {
  type PDFBuffer = Buffer | Uint8Array | ArrayBuffer;
  interface PDFResult {
    text: string;
    numpages?: number;
    numrender?: number;
    info?: Record<string, any>;
    metadata?: any;
    version?: string;
  }
  function pdfParse(data: PDFBuffer, options?: any): Promise<PDFResult>;
  export default pdfParse;
}

declare module 'mammoth' {
  interface MammothResult { value: string; messages?: any[] }
  export function extractRawText(input: { buffer: Buffer | Uint8Array | ArrayBuffer }, options?: any): Promise<MammothResult>;
}
