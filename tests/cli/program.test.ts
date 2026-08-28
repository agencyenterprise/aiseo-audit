import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from "vitest";

vi.mock("../../src/modules/analyzer/service.js", () => ({
  analyzeUrl: vi.fn(),
}));
vi.mock("../../src/modules/sitemap/service.js", () => ({
  analyzeSitemap: vi.fn(),
}));
vi.mock("../../src/modules/diff/orchestrate.js", () => ({
  orchestrateDiff: vi.fn(),
}));
vi.mock("../../src/modules/config/service.js", () => ({
  loadConfigWithPath: vi.fn(),
}));
vi.mock("../../src/utils/fs.js", () => ({
  assertWritableOutputPath: vi.fn(),
  writeOutputFile: vi.fn(),
}));

import { runCli } from "../../src/cli/program.js";
import { analyzeUrl } from "../../src/modules/analyzer/service.js";
import { loadConfigWithPath } from "../../src/modules/config/service.js";
import { orchestrateDiff } from "../../src/modules/diff/orchestrate.js";
import { analyzeSitemap } from "../../src/modules/sitemap/service.js";
import { writeOutputFile } from "../../src/utils/fs.js";

const mockedAnalyzeUrl = analyzeUrl as Mock;
const mockedAnalyzeSitemap = analyzeSitemap as Mock;
const mockedOrchestrateDiff = orchestrateDiff as Mock;
const mockedLoadConfig = loadConfigWithPath as Mock;
const mockedWriteOutputFile = writeOutputFile as Mock;

function argv(...args: string[]): string[] {
  return ["node", "aiseo-audit", ...args];
}

function makeConfig(overrides: Record<string, unknown> = {}) {
  return {
    config: {
      timeout: 45000,
      userAgent: "Test/1.0",
      format: "pretty" as const,
      weights: {
        contentExtractability: 1,
        contentStructure: 1,
        answerability: 1,
        entityClarity: 1,
        groundingSignals: 1,
        authorityContext: 1,
        readabilityForCompression: 1,
      },
      historyDir: "./audits",
      ...overrides,
    },
    path: null,
  };
}

function makeResult(score: number) {
  return {
    url: "https://example.com",
    signalsBase: "https://example.com",
    analyzedAt: "2026-02-11T12:00:00.000Z",
    overallScore: score,
    grade: "B",
    totalPoints: 300,
    maxPoints: 420,
    categories: {},
    recommendations: [],
    rawData: { title: "t", metaDescription: "", wordCount: 10 },
    meta: { version: "0.0.0", analysisDurationMs: 5 },
  };
}

let logSpy: ReturnType<typeof vi.spyOn>;
let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockedLoadConfig.mockResolvedValue(makeConfig());
  mockedAnalyzeUrl.mockResolvedValue(makeResult(80));
  logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  logSpy.mockRestore();
  errorSpy.mockRestore();
});

function stderrText(): string {
  return errorSpy.mock.calls.map((c) => c.join(" ")).join("\n");
}

describe("runCli exit codes", () => {
  it("returns 0 on a successful audit", async () => {
    expect(await runCli(argv("https://example.com"))).toBe(0);
  });

  it("returns 1 when the score is below --fail-under", async () => {
    mockedAnalyzeUrl.mockResolvedValue(makeResult(50));
    expect(
      await runCli(argv("https://example.com", "--fail-under", "70")),
    ).toBe(1);
    expect(stderrText()).toContain("below threshold");
  });

  it("returns 0 when the score meets --fail-under", async () => {
    mockedAnalyzeUrl.mockResolvedValue(makeResult(70));
    expect(
      await runCli(argv("https://example.com", "--fail-under", "70")),
    ).toBe(0);
  });

  it("uses failUnder from config when the flag is absent", async () => {
    mockedLoadConfig.mockResolvedValue(makeConfig({ failUnder: 90 }));
    expect(await runCli(argv("https://example.com"))).toBe(1);
  });

  it("returns 2 for a typo'd flag instead of 1", async () => {
    expect(
      await runCli(argv("https://example.com", "--fial-under", "70")),
    ).toBe(2);
  });

  it("returns 0 for --version", async () => {
    const stdoutSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    expect(await runCli(argv("--version"))).toBe(0);
    stdoutSpy.mockRestore();
  });

  it("returns 2 when analyzeUrl throws a runtime error", async () => {
    mockedAnalyzeUrl.mockRejectedValue(new Error("DNS lookup failed"));
    expect(await runCli(argv("https://example.com"))).toBe(2);
    expect(stderrText()).toContain("Audit failed");
    expect(stderrText()).toContain("DNS lookup failed");
  });

  it("returns 2 for an invalid URL", async () => {
    expect(await runCli(argv("not a url"))).toBe(2);
  });

  it("returns 2 when no URL, --sitemap, or --diff --all is given", async () => {
    expect(await runCli(argv())).toBe(2);
  });
});

describe("flag interaction validation", () => {
  it.each([
    [["https://example.com", "--sitemap", "https://example.com/sitemap.xml"]],
    [["--sitemap", "https://x.com/s.xml", "--diff"]],
    [["--sitemap", "https://x.com/s.xml", "--baseline", "b.json"]],
    [["--sitemap", "https://x.com/s.xml", "--tldr"]],
    [["https://example.com", "--json", "--md"]],
    [["https://example.com", "--all"]],
    [["https://example.com", "--diff", "--all"]],
    [["https://example.com", "--signals-base", "not a url"]],
  ])("rejects %j with exit code 2", async (args) => {
    expect(await runCli(argv(...(args as string[])))).toBe(2);
    expect(mockedAnalyzeUrl).not.toHaveBeenCalled();
    expect(mockedAnalyzeSitemap).not.toHaveBeenCalled();
  });
});

describe("format resolution", () => {
  it("infers the format from the --out extension", async () => {
    expect(
      await runCli(argv("https://example.com", "--out", "report.html")),
    ).toBe(0);
    const [, written] = mockedWriteOutputFile.mock.calls[0];
    expect(written).toContain("<!DOCTYPE html>");
  });

  it("lets an explicit format flag beat the extension", async () => {
    expect(
      await runCli(
        argv("https://example.com", "--json", "--out", "report.html"),
      ),
    ).toBe(0);
    const [, written] = mockedWriteOutputFile.mock.calls[0];
    expect(() => JSON.parse(written as string)).not.toThrow();
  });

  it("falls back to the config format", async () => {
    mockedLoadConfig.mockResolvedValue(makeConfig({ format: "md" }));
    expect(await runCli(argv("https://example.com"))).toBe(0);
    const printed = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(printed).toContain("# AI SEO Audit");
  });
});

describe("diff mode", () => {
  it("renders the timeline for --diff --all without auditing", async () => {
    mockedLoadConfig.mockResolvedValue(makeConfig({ diff: {} }));
    expect(await runCli(argv("--diff", "--all"))).toBe(0);
    expect(mockedAnalyzeUrl).not.toHaveBeenCalled();
  });

  it("passes the discovered config path to orchestrateDiff", async () => {
    mockedLoadConfig.mockResolvedValue({
      ...makeConfig(),
      path: "/somewhere/.aiseo.config.json",
    });
    mockedOrchestrateDiff.mockResolvedValue({
      diff: null,
      writtenPath: "/somewhere/audits/x.json",
      notifications: [],
    });

    expect(await runCli(argv("https://example.com", "--diff"))).toBe(0);
    expect(mockedOrchestrateDiff).toHaveBeenCalledWith(
      expect.objectContaining({ configPath: "/somewhere/.aiseo.config.json" }),
    );
  });
});

describe("sitemap mode", () => {
  it("prints sitemap warnings to stderr and returns 0", async () => {
    mockedAnalyzeSitemap.mockResolvedValue({
      sitemapUrl: "https://example.com/sitemap.xml",
      signalsBase: "https://example.com",
      analyzedAt: "2026-02-11T12:00:00.000Z",
      totalUrls: 1,
      succeededCount: 1,
      failedCount: 0,
      averageScore: 80,
      averageGrade: "B-",
      categoryAverages: {},
      urlResults: [{ status: "success", result: makeResult(80) }],
      warnings: ["Skipped child sitemap https://example.com/a.xml: boom"],
      meta: { version: "0.0.0", analysisDurationMs: 5 },
    });

    expect(
      await runCli(argv("--sitemap", "https://example.com/sitemap.xml")),
    ).toBe(0);
    expect(stderrText()).toContain("Skipped child sitemap");
  });
});
