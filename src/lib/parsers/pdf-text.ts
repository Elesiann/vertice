import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export interface PdfTextItem {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
}

export interface ExtractedPdf {
  rawText: string;
  items: PdfTextItem[];
  pageCount: number;
}

interface NormalizedPdfjsItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  hasEOL: boolean;
}

const isUnknownArray = (value: unknown): value is readonly unknown[] => Array.isArray(value);

const toNormalizedItem = (value: unknown): NormalizedPdfjsItem | null => {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.str !== "string") return null;
  if (!isUnknownArray(v.transform) || v.transform.length < 6) return null;
  const x = v.transform[4];
  const y = v.transform[5];
  if (typeof x !== "number" || typeof y !== "number") return null;
  if (typeof v.width !== "number") return null;
  if (typeof v.height !== "number") return null;
  if (typeof v.hasEOL !== "boolean") return null;
  return {
    str: v.str,
    x,
    y,
    width: v.width,
    height: v.height,
    hasEOL: v.hasEOL,
  };
};

export const extractText = async (bytes: ArrayBuffer): Promise<ExtractedPdf> => {
  const document = await pdfjs.getDocument({ data: bytes }).promise;
  const items: PdfTextItem[] = [];
  const pageTexts: string[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const lineFragments: string[] = [];

    for (const rawItem of content.items) {
      const item = toNormalizedItem(rawItem);
      if (!item) continue;
      items.push({
        text: item.str,
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height,
        page: pageNumber,
      });
      if (item.str.length > 0) lineFragments.push(item.str);
      if (item.hasEOL) lineFragments.push("\n");
    }

    pageTexts.push(lineFragments.join(""));
  }

  return {
    rawText: pageTexts.join("\n"),
    items,
    pageCount: document.numPages,
  };
};
