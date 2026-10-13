import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  analyzeHtml,
  analyzeSnapshot,
  captureUrl,
} from "../../../src/modules/analyzer/service.js";
import { makeConfig } from "../../helpers/config.js";

const html = readFileSync(
  new URL("../../fixtures/pages/well-structured.html", import.meta.url),
  "utf8",
);
afterEach(() => vi.restoreAllMocks());

describe("offline and reproducible analysis", () => {
  it("analyzes supplied HTML without fetching or claiming network access was verified", () => {
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("No network permitted"));
    const result = analyzeHtml({
      html,
      url: "https://example.com/guide",
      evaluationDate: "2026-01-01",
    });
    expect(fetch).not.toHaveBeenCalled();
    expect(result.meta.source).toBe("html");
    expect(
      result.categories.contentExtractability.factors.find(
        (f) => f.name === "Fetch Success",
      )?.status,
    ).toBe("neutral");
    expect(result.warnings?.join(" ")).toContain("Offline");
  });

  it("keeps freshness and scores stable when a supplied evaluation date is replayed later", () => {
    const datedHtml = html.replace(
      "</head>",
      '<meta property="article:modified_time" content="2025-01-01"></head>',
    );
    const options = {
      html: datedHtml,
      url: "https://example.com/blog/guide",
      evaluationDate: "2026-01-01",
    };
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-01-01"));
      const baseline = analyzeHtml(options);
      vi.setSystemTime(new Date("2030-01-01"));
      const replay = analyzeHtml(options);
      expect(replay.overallScore).toBe(baseline.overallScore);
      expect(replay.rawData.freshness?.ageInMonths).toBe(12);
      expect(replay.meta.inputFingerprint).toBe(baseline.meta.inputFingerprint);
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects invalid evaluation dates", () => {
    for (const evaluationDate of [
      "2026-02-30",
      "yesterday",
      "2026-01-01T00:00:00Z",
    ]) {
      expect(() =>
        analyzeHtml({ html, url: "https://example.com", evaluationDate }),
      ).toThrow("YYYY-MM-DD");
    }
  });

  it("captures and replays fetched inputs without further requests", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      const response = new Response(
        url.endsWith("robots.txt") ? "User-agent: *\nAllow: /" : html,
        {
          status: 200,
          headers: {
            "content-type": url.endsWith("robots.txt")
              ? "text/plain"
              : "text/html",
          },
        },
      );
      Object.defineProperty(response, "url", { value: url });
      return response;
    });
    const snapshot = await captureUrl(
      { url: "https://example.com/guide", evaluationDate: "2026-01-01" },
      makeConfig(),
    );
    const first = analyzeSnapshot(snapshot);
    vi.mocked(globalThis.fetch).mockRejectedValue(new Error("offline"));
    const replay = analyzeSnapshot(JSON.parse(JSON.stringify(snapshot)));
    expect(replay.overallScore).toBe(first.overallScore);
    expect(replay.meta.inputFingerprint).toBe(first.meta.inputFingerprint);
    expect(() =>
      analyzeSnapshot({ ...snapshot, scoringVersion: "unknown" }),
    ).toThrow("scoring version");
  });
});
