import "@testing-library/jest-dom/vitest";

// pdfjs-dist 5.x references DOMMatrix at module load (in canvas.js), even
// for code paths that only call getTextContent (no rendering). jsdom
// doesn't ship DOMMatrix, so loading pdf-text.ts in the test env explodes
// before any test runs. A minimal stub satisfies the import-time reference;
// the methods are no-ops because text extraction never reaches them.
class DomMatrixStub {
  a = 1;
  b = 0;
  c = 0;
  d = 1;
  e = 0;
  f = 0;
  m11 = 1;
  m12 = 0;
  m21 = 0;
  m22 = 1;
  m41 = 0;
  m42 = 0;
  multiply(): this {
    return this;
  }
  invertSelf(): this {
    return this;
  }
  translateSelf(): this {
    return this;
  }
  scaleSelf(): this {
    return this;
  }
}

if (typeof globalThis.DOMMatrix === "undefined") {
  Object.defineProperty(globalThis, "DOMMatrix", {
    value: DomMatrixStub,
    writable: true,
    configurable: true,
  });
}
