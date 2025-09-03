// types/pdfjs.d.ts

// ESM builds (we call these from server code)
declare module 'pdfjs-dist/legacy/build/pdf.mjs' {
  export const GlobalWorkerOptions: any;
  export function getDocument(src: any): { promise: Promise<any> };
}
declare module 'pdfjs-dist/build/pdf.mjs' {
  export const GlobalWorkerOptions: any;
  export function getDocument(src: any): { promise: Promise<any> };
}

// Worker modules (we pre-import so Next bundles them; no types needed)
declare module 'pdfjs-dist/legacy/build/pdf.worker.mjs';
declare module 'pdfjs-dist/build/pdf.worker.mjs';
