import { describe, expect, it } from "vitest";
import { formatBankLabel, formatLoungeProvider, formatPointsProgram } from "@/lib/labels";

describe("formatPointsProgram", () => {
  it("returns the label for a known program", () => {
    expect(formatPointsProgram("smiles")).toBe("Smiles");
  });

  it("returns the id for an unknown program", () => {
    expect(formatPointsProgram("unknown-program")).toBe("unknown-program");
  });
});

describe("formatLoungeProvider", () => {
  it("returns the label for a known provider", () => {
    expect(formatLoungeProvider("priority-pass")).toBe("Priority Pass");
  });

  it("returns the id for an unknown provider", () => {
    expect(formatLoungeProvider("unknown")).toBe("unknown");
  });
});

describe("formatBankLabel", () => {
  it("returns the canonical label for a known bank", () => {
    expect(formatBankLabel("nubank")).toBe("Nubank");
    expect(formatBankLabel("itau")).toBe("Itaú");
  });

  it("returns empty string for bank other without cardId", () => {
    expect(formatBankLabel("other")).toBe("Outro");
  });

  it("returns the matched prefix label when cardId starts with a known prefix", () => {
    expect(formatBankLabel("other", "btg-super-card")).toBe("BTG");
    expect(formatBankLabel("other", "picpay-card")).toBe("PicPay");
  });

  it("returns Outro when cardId does not match any prefix", () => {
    expect(formatBankLabel("other", "unknown-bank-card")).toBe("Outro");
  });
});
