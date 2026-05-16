import { describe, expect, it } from "vitest";
import { buildErrorReportUrl } from "@/lib/feedback";

const decode = (url: string): string => decodeURIComponent(url.replace(/\+/g, "%20"));

describe("buildErrorReportUrl", () => {
  it("builds a url with default values when no metadata is provided", () => {
    const url = buildErrorReportUrl();
    expect(url).toContain("/issues/new");
    expect(decode(url)).toContain("(não informado)");
  });

  it("includes all metadata fields when provided", () => {
    const url = decode(
      buildErrorReportUrl({
        stackLabel: "My Stack",
        scenarioId: "scenario-1",
        scoreLabVersion: "1.0.0",
        ptaxRate: 5.12,
        ptaxSource: "awesomeapi",
        ptaxFetchedAt: "2026-05-09T00:00:00.000Z",
      }),
    );
    expect(url).toContain("My Stack");
    expect(url).toContain("5.12");
    expect(url).toContain("awesomeapi");
    expect(url).toContain("2026-05-09");
  });

  it("handles number ptaxRate correctly", () => {
    const url = decode(buildErrorReportUrl({ ptaxRate: 0 }));
    expect(url).toContain("0");
  });

  it("omits ptaxFetchedAt suffix when not provided", () => {
    const url = decode(buildErrorReportUrl({ ptaxRate: 5, ptaxSource: "manual" }));
    expect(url).toContain("5 (manual)");
    expect(url).not.toContain("FetchedAt");
  });
});
