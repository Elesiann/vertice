import { describe, expect, it } from "vitest";
import { categorize, categorizeBatch } from "@/lib/categorizer";
import { makeRaw } from "@/lib/__tests__/factories";

describe("categorize", () => {
  describe("rule 1: payment markers", () => {
    it.each(["Pagamento em 08 ABR", "pagamento recebido", "PAGAMENTO via PIX"])(
      "classifies %s as payment",
      (description) => {
        expect(categorize(makeRaw({ description }))).toBe("payment");
      },
    );

    it("ignores 'pagamento' when not at the start of the description", () => {
      expect(categorize(makeRaw({ description: "Antecipação pagamento" }))).toBe("domestic");
    });
  });

  describe("rule 2: refund markers", () => {
    it.each([
      "Estorno parcial de R$ 50,00",
      "Crédito de pagamento",
      "Credito de pagamento",
      "Saldo restante da fatura anterior",
    ])("classifies %s as refund", (description) => {
      expect(categorize(makeRaw({ description }))).toBe("refund");
    });
  });

  describe("rule 3: IOF markers", () => {
    it("classifies a line containing IOF as iof", () => {
      expect(categorize(makeRaw({ description: "IOF Compra USD 10.00" }))).toBe("iof");
    });

    it("does not match IOF as a substring of an unrelated word", () => {
      expect(categorize(makeRaw({ description: "Bioforte mercado" }))).toBe("domestic");
    });
  });

  describe("rule 4: fees markers", () => {
    it.each(["Anuidade do cartão", "Tarifa mensal", "Juros do rotativo"])(
      "classifies %s as fees",
      (description) => {
        expect(categorize(makeRaw({ description }))).toBe("fees");
      },
    );
  });

  describe("rule 5: parser-supplied original currency", () => {
    it("classifies a transaction with originalCurrency=USD as international", () => {
      expect(
        categorize(
          makeRaw({
            description: "Some merchant",
            originalCurrency: "USD",
            originalAmount: 12.5,
          }),
        ),
      ).toBe("international");
    });

    it("does not classify a BRL originalCurrency as international", () => {
      expect(categorize(makeRaw({ description: "Loja", originalCurrency: "BRL" }))).toBe(
        "domestic",
      );
    });
  });

  describe("rule 6: currency tokens in the description", () => {
    it.each(["AWS USD billing", "Spotify EUR", "Some shop GBP", "US$ 12.00"])(
      "classifies %s as international",
      (description) => {
        expect(categorize(makeRaw({ description }))).toBe("international");
      },
    );

    it("does not false-positive on USB or BR substrings", () => {
      expect(categorize(makeRaw({ description: "USB-C Cable mercado" }))).toBe("domestic");
      expect(categorize(makeRaw({ description: "Amazon BR" }))).toBe("domestic");
    });
  });

  describe("rule 7: foreign country suffix", () => {
    it.each(["AMAZON US", "Netflix NL", "Stripe IE", "Apple JP", "Booking CA"])(
      "classifies %s as international",
      (description) => {
        expect(categorize(makeRaw({ description }))).toBe("international");
      },
    );

    it("does not match a country code mid-description", () => {
      expect(categorize(makeRaw({ description: "AMERICANAS US OPEN" }))).toBe("domestic");
    });
  });

  describe("rule 8: IOF proximity fallback", () => {
    it("classifies a transaction with an IOF sibling within 2 days as international", () => {
      const purchase = makeRaw({
        description: "Foreign merchant",
        date: "2026-04-15",
      });
      const iofSibling = makeRaw({
        description: "IOF Compra Internacional",
        date: "2026-04-16",
      });

      expect(categorize(purchase, [purchase, iofSibling])).toBe("international");
    });

    it("does not classify when the IOF sibling is more than 2 days away", () => {
      const purchase = makeRaw({
        description: "Foreign merchant",
        date: "2026-04-15",
      });
      const iofFar = makeRaw({
        description: "IOF Compra anterior",
        date: "2026-04-25",
      });

      expect(categorize(purchase, [purchase, iofFar])).toBe("domestic");
    });

    it("does not classify when no IOF sibling exists", () => {
      const purchase = makeRaw({ description: "Foreign merchant" });

      expect(categorize(purchase, [purchase])).toBe("domestic");
    });
  });

  describe("default", () => {
    it("classifies plain Brazilian merchants as domestic", () => {
      expect(categorize(makeRaw({ description: "Padaria do Bairro Ltda" }))).toBe("domestic");
    });

    it("classifies an empty description as domestic", () => {
      expect(categorize(makeRaw({ description: "" }))).toBe("domestic");
    });
  });

  describe("priority chain", () => {
    it("prefers payment over IOF when both could match", () => {
      expect(categorize(makeRaw({ description: "Pagamento IOF estornado" }))).toBe("payment");
    });

    it("prefers refund over IOF when both could match", () => {
      expect(categorize(makeRaw({ description: "Estorno IOF" }))).toBe("refund");
    });

    it("prefers IOF over fees when both could match", () => {
      expect(categorize(makeRaw({ description: "IOF + tarifa internacional" }))).toBe("iof");
    });

    it("prefers parser-supplied currency over description tokens", () => {
      expect(
        categorize(
          makeRaw({
            description: "no foreign markers here",
            originalCurrency: "USD",
          }),
        ),
      ).toBe("international");
    });
  });
});

describe("categorizeBatch", () => {
  it("returns Transaction[] with categories filled in", () => {
    const raws = [
      makeRaw({ description: "Pagamento em 08 ABR", amountBrl: -100 }),
      makeRaw({ description: "Padaria", amountBrl: 25.5 }),
      makeRaw({ description: "AMAZON US", amountBrl: 200 }),
    ];

    const result = categorizeBatch(raws);

    expect(result.map((tx) => tx.category)).toEqual(["payment", "domestic", "international"]);
  });

  it("preserves all input fields verbatim", () => {
    const raw = makeRaw({
      id: "abc",
      date: "2026-03-01",
      description: "Loja X",
      amountBrl: 42,
      sourceFile: "fatura.pdf",
      bank: "itau",
    });

    const [result] = categorizeBatch([raw]);

    expect(result).toEqual({ ...raw, category: "domestic" });
  });

  it("uses cross-tx context for the IOF proximity rule", () => {
    const raws = [
      makeRaw({
        id: "purchase",
        description: "Some shop",
        date: "2026-04-15",
      }),
      makeRaw({
        id: "iof",
        description: "IOF compra externa",
        date: "2026-04-16",
      }),
    ];

    const result = categorizeBatch(raws);

    expect(result[0]?.category).toBe("international");
    expect(result[1]?.category).toBe("iof");
  });
});
