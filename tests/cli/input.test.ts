import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCli } from "../../src/cli/program.js";
import { analyzeHtml } from "../../src/modules/analyzer/service.js";
import { readInputText } from "../../src/cli/input.js";
import { Readable } from "node:stream";

let dir: string;
let log: ReturnType<typeof vi.spyOn>;
let error: ReturnType<typeof vi.spyOn>;
let fetch: ReturnType<typeof vi.spyOn>;
const html =
  '<html lang="en"><head><title>Backup guide</title></head><body><p>The system stores a copy of each file. Open the settings to restore a copy.</p></body></html>';
const argv = (...args: string[]) => ["node", "aiseo-audit", ...args];

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "aiseo-cli-input-"));
  await writeFile(join(dir, "page.html"), html);
  log = vi.spyOn(console, "log").mockImplementation(() => {});
  error = vi.spyOn(console, "error").mockImplementation(() => {});
  fetch = vi
    .spyOn(globalThis, "fetch")
    .mockRejectedValue(new Error("Unexpected network access"));
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(dir, { recursive: true, force: true });
});

describe("CLI supplied HTML", () => {
  it("writes an offline JSON report with an explicit date", async () => {
    const output = join(dir, "report.json");
    const code = await runCli(
      argv(
        "--file",
        join(dir, "page.html"),
        "--url",
        "https://example.com/guide",
        "--evaluation-date",
        "2026-01-01",
        "--out",
        output,
      ),
    );
    expect(code).toBe(0);
    expect(fetch).not.toHaveBeenCalled();
    expect(JSON.parse(await readFile(output, "utf8")).meta.evaluationDate).toBe(
      "2026-01-01",
    );
  });
  it("requires page identity and rejects conflicting input modes", async () => {
    expect(await runCli(argv("--file", join(dir, "page.html")))).toBe(2);
    expect(
      await runCli(
        argv(
          "--file",
          join(dir, "page.html"),
          "--stdin",
          "--url",
          "https://example.com",
        ),
      ),
    ).toBe(2);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("enforces a comparable baseline without writing a new one", async () => {
    const baseline = join(dir, "baseline.json");
    await writeFile(
      baseline,
      JSON.stringify(
        analyzeHtml({
          html,
          url: "https://example.com/guide",
          evaluationDate: "2026-01-01",
        }),
      ),
    );
    expect(
      await runCli(
        argv(
          "--file",
          join(dir, "page.html"),
          "--url",
          "https://example.com/guide",
          "--evaluation-date",
          "2026-01-01",
          "--baseline",
          baseline,
          "--fail-on-regression",
          "--json",
        ),
      ),
    ).toBe(0);
    expect(
      await runCli(
        argv(
          "--file",
          join(dir, "page.html"),
          "--url",
          "https://example.com/guide",
          "--baseline",
          baseline,
          "--query",
          "unrelated question",
          "--fail-on-regression",
        ),
      ),
    ).toBe(2);
    expect(error.mock.calls.flat().join(" ")).toContain(
      "configuration changed",
    );
  });
  it("does not overwrite a source file with its report", async () => {
    const path = join(dir, "page.html");
    expect(
      await runCli(
        argv("--file", path, "--url", "https://example.com", "--out", path),
      ),
    ).toBe(2);
    expect(await readFile(path, "utf8")).toBe(html);
  });
  it("reads streamed text in order and rejects oversized input", async () => {
    expect(await readInputText(Readable.from(["one", "two"]))).toBe("onetwo");
    await expect(
      readInputText(Readable.from(["too large"]), 2),
    ).rejects.toThrow("size limit");
  });
  it("captures and replays a URL through the CLI", async () => {
    fetch.mockImplementation(async (input) => {
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
    const snapshot = join(dir, "snapshot.json");
    expect(
      await runCli(
        argv("https://example.com/guide", "--snapshot-out", snapshot, "--json"),
      ),
    ).toBe(0);
    const first = JSON.parse(log.mock.calls.at(-1)![0] as string);
    fetch.mockClear().mockRejectedValue(new Error("offline"));
    expect(await runCli(argv("--replay", snapshot, "--json"))).toBe(0);
    const replay = JSON.parse(log.mock.calls.at(-1)![0] as string);
    expect(replay.overallScore).toBe(first.overallScore);
    expect(replay.meta.inputFingerprint).toBe(first.meta.inputFingerprint);
    expect(fetch).not.toHaveBeenCalled();
    expect(
      await runCli(argv("--replay", snapshot, "--query", "override")),
    ).toBe(2);
  });
});
