import { describe, expect, it } from "vitest";
import { computeLayoutFingerprint } from "@/lib/parsers/fingerprint";

const NUBANK_LIKE = `
FATURA 08 MAI 2026
RESUMO DA FATURA ATUAL
Total a pagar R$ 100,00
Período vigente: 01 ABR a 01 MAI
TRANSAÇÕES DE 01 ABR A 01 MAI
04 ABR Loja R$ 50,00
05 ABR Loja R$ 50,00
`.trim();

describe("computeLayoutFingerprint", () => {
  it("produces a deterministic 8-character hex hash", () => {
    const fingerprint = computeLayoutFingerprint(NUBANK_LIKE);

    expect(fingerprint).toMatch(/^[0-9a-f]{8}$/);
    expect(computeLayoutFingerprint(NUBANK_LIKE)).toBe(fingerprint);
  });

  it("is independent of the order of structural markers in the text", () => {
    const reordered = `
TRANSAÇÕES DE 01 ABR A 01 MAI
RESUMO DA FATURA ATUAL
Período vigente: 01 ABR a 01 MAI
FATURA 08 MAI 2026
Total a pagar R$ 100,00
04 ABR Loja R$ 50,00
05 ABR Loja R$ 50,00
`.trim();

    expect(computeLayoutFingerprint(reordered)).toBe(computeLayoutFingerprint(NUBANK_LIKE));
  });

  it("differs when a structural marker disappears", () => {
    const withoutResumo = NUBANK_LIKE.replace("RESUMO DA FATURA ATUAL", "");

    expect(computeLayoutFingerprint(withoutResumo)).not.toBe(computeLayoutFingerprint(NUBANK_LIKE));
  });

  it("buckets transaction count so two statements with similar volume share a fingerprint", () => {
    const withFiveTxs = NUBANK_LIKE.concat(
      "\n06 ABR Loja R$ 10,00\n07 ABR Loja R$ 10,00\n08 ABR Loja R$ 10,00",
    );

    expect(computeLayoutFingerprint(withFiveTxs)).toBe(computeLayoutFingerprint(NUBANK_LIKE));
  });

  it("differs when the transaction-count bucket changes", () => {
    const noTxs = NUBANK_LIKE.replace(/\d{2} ABR Loja R\$ \d+,\d{2}/g, "");

    expect(computeLayoutFingerprint(noTxs)).not.toBe(computeLayoutFingerprint(NUBANK_LIKE));
  });

  it("returns a different fingerprint for a clearly different layout", () => {
    const itauLike = `
Demonstrativo de pagamentos
Vencimento 15/05/2026
Saldo total R$ 1.000,00
05/04/2026 Loja R$ 50,00
`.trim();

    expect(computeLayoutFingerprint(itauLike)).not.toBe(computeLayoutFingerprint(NUBANK_LIKE));
  });
});
