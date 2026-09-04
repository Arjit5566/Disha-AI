// Client-side only PDF text extraction using pdfjs-dist.
// The .client.ts suffix tells Vite/TanStack Start to NEVER evaluate this file
// during SSR, which prevents the "DOMMatrix is not defined" crash.

export async function extractPdfText(file: File): Promise<string> {
  // Dynamically import pdfjs-dist so it is only loaded in the browser
  const pdfjsLib = await import("pdfjs-dist");
  const { default: pdfWorkerUrl } = await import(
    "pdfjs-dist/build/pdf.worker.min.mjs?url"
  );

  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  let out = "";
  const max = Math.min(pdf.numPages, 15);
  for (let i = 1; i <= max; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((it) => ("str" in it ? (it as { str: string }).str : ""))
      .join(" ");
    out += text + "\n\n";
  }
  return out.replace(/\s+\n/g, "\n").trim();
}
