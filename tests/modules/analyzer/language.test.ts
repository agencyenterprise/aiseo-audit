import { describe, expect, it } from "vitest";
import { analyzeHtml } from "../../../src/modules/analyzer/service.js";
import { renderReport } from "../../../src/modules/report/service.js";

const french =
  '<html lang="fr"><head><title>Sauvegarde</title></head><body><main><p>La sauvegarde protège les fichiers. Vous pouvez restaurer les données depuis les paramètres du système.</p></main></body></html>';

describe("language applicability", () => {
  it("excludes unsupported language checks, recommendations, and query gates", () => {
    const result = analyzeHtml(
      { html: french, url: "https://example.com" },
      { queries: ["sauvegarde des données"] },
    );
    expect(result.rawData.language).toEqual({
      code: "fr",
      source: "html",
      supported: false,
    });
    expect(result.categories.readabilityForCompression.maxScore).toBe(0);
    expect(result.categories.queryAlignment.maxScore).toBe(0);
    expect(
      result.recommendations.some(
        (entry) => entry.category === "Readability for Compression",
      ),
    ).toBe(false);
    expect(
      result.stages?.citationFitness.gates.find(
        (gate) => gate.id === "offTopicForQueries",
      )?.status,
    ).toBe("not_applicable");
    expect(result.warnings?.join(" ")).toContain("partial score");
  });
  it("uses a content-language header when the document has no declaration", () => {
    const result = analyzeHtml({
      html: french.replace(' lang="fr"', ""),
      url: "https://example.com",
      headers: { "Content-Language": "fr-FR" },
    });
    expect(result.rawData.language?.source).toBe("header");
    expect(result.rawData.language?.supported).toBe(false);
  });
  it("does not guess English for unrecognized short text", () => {
    const result = analyzeHtml({
      html: "<p>你好，世界</p>",
      url: "https://example.com",
    });
    expect(result.rawData.language?.source).toBe("unknown");
    expect(result.categories.readabilityForCompression.maxScore).toBe(0);
  });
  it("keeps partial-score warnings in every format, including JSON summaries", () => {
    const result = analyzeHtml({ html: french, url: "https://example.com" });
    for (const format of ["html", "md", "pretty", "json"] as const) {
      for (const tldrOnly of [true, false])
        expect(renderReport(result, { format, tldrOnly })).toContain(
          "partial score",
        );
    }
  });
});
