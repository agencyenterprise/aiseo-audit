import { Command, CommanderError } from "commander";
import { resolve } from "node:path";
import { z } from "zod";
import { analyzeInput } from "./input.js";
import { checkRegressionGate, checkSitemapGate } from "./quality-gates.js";
import type { DiffResultType } from "../modules/diff/schema.js";
import {
  DomainOptionSchema,
  EngineProfileSchema,
  MAX_TARGET_QUERIES,
  type AiseoConfigType,
} from "../modules/config/schema.js";
import { loadConfigWithPath } from "../modules/config/service.js";
import { orchestrateDiff } from "../modules/diff/orchestrate.js";
import type { ReportFormatType } from "../modules/report/schema.js";
import {
  renderDiffReport,
  renderHistoryTimeline,
  renderReport,
  renderSitemapReport,
} from "../modules/report/service.js";
import { analyzeSitemap } from "../modules/sitemap/service.js";
import { assertWritableOutputPath, writeOutputFile } from "../utils/fs.js";
import { isValidUrl } from "../utils/url.js";
import { VERSION } from "../version.js";

const CliOptionsSchema = z.object({
  sitemap: z.string().optional(),
  signalsBase: z.string().optional(),
  json: z.boolean().optional(),
  md: z.boolean().optional(),
  html: z.boolean().optional(),
  out: z.string().optional(),
  failUnder: z.coerce.number().min(0).max(100).optional(),
  timeout: z.coerce.number().int().positive().optional(),
  userAgent: z.string().optional(),
  config: z.string().optional(),
  tldr: z.boolean().optional(),
  diff: z.boolean().optional(),
  all: z.boolean().optional(),
  baseline: z.string().optional(),
  query: z.array(z.string().min(1)).optional(),
  domain: DomainOptionSchema.optional(),
  engine: EngineProfileSchema.optional(),
  file: z.string().optional(),
  stdin: z.boolean().optional(),
  url: z.string().optional(),
  replay: z.string().optional(),
  snapshotOut: z.string().optional(),
  evaluationDate: z.string().optional(),
  failOnRegression: z.boolean().optional(),
  failOnNewBlocker: z.boolean().optional(),
  failedPages: z.enum(["error", "ignore"]).optional(),
  maxUrls: z.coerce.number().int().positive().optional(),
  concurrency: z.coerce.number().int().min(1).max(16).optional(),
  progress: z.boolean().optional(),
});

type CliOptionsType = z.infer<typeof CliOptionsSchema>;

export async function runCli(argv: string[]): Promise<number> {
  let exitCode = 0;
  const controller = new AbortController();
  const cancel = () => controller.abort();
  process.once("SIGINT", cancel);
  const program = buildProgram((code) => {
    exitCode = code;
  }, controller.signal);

  try {
    await program.parseAsync(argv);
    return exitCode;
  } catch (error) {
    if (controller.signal.aborted) return 130;
    if (error instanceof CliExit) {
      return error.exitCode;
    }
    if (error instanceof CommanderError) {
      return exitCodeForCommanderError(error);
    }
    console.error(
      "Audit failed:",
      error instanceof Error ? error.message : String(error),
    );
    return 2;
  } finally {
    process.removeListener("SIGINT", cancel);
  }
}

function buildProgram(
  onExit: (code: number) => void,
  signal: AbortSignal,
): Command {
  const program = new Command();

  program
    .name("aiseo-audit")
    .description("Audit web pages for AI search readiness")
    .version(VERSION)
    .argument("[url]", "URL to audit")
    .option("--file <path>", "Analyze a local HTML file without network access")
    .option("--stdin", "Analyze HTML read from standard input")
    .option("--url <url>", "Page URL for supplied HTML")
    .option(
      "--replay <path>",
      "Replay a saved audit snapshot without network access",
    )
    .option(
      "--snapshot-out <path>",
      "Save fetched inputs, configuration, and evaluation date for replay",
    )
    .option(
      "--evaluation-date <date>",
      "UTC date for freshness scoring (YYYY-MM-DD)",
    )
    .option(
      "--fail-on-regression",
      "Fail on score, query, or eligibility regression against a comparable baseline",
    )
    .option(
      "--fail-on-new-blocker",
      "Fail on a new eligibility blocker against a comparable baseline",
    )
    .option(
      "--failed-pages <policy>",
      "Sitemap fetch failure policy: error (default) or ignore",
    )
    .option("--max-urls <count>", "Maximum number of sitemap pages to audit")
    .option(
      "--concurrency <count>",
      "Concurrent sitemap page requests (1-16, default 1)",
    )
    .option("--progress", "Write sitemap progress to stderr")
    .option("--sitemap <url>", "Audit all URLs in a sitemap.xml")
    .option(
      "--signals-base <url>",
      "Base URL to fetch domain signals from (robots.txt, llms.txt, llms-full.txt)",
    )
    .option("--json", "Output as JSON")
    .option("--md", "Output as Markdown")
    .option("--html", "Output as HTML")
    .option("--out <path>", "Write rendered output to a file")
    .option(
      "--fail-under <score>",
      "Exit with code 1 if score is below threshold (0-100)",
    )
    .option("--timeout <ms>", "Request timeout in milliseconds")
    .option("--user-agent <ua>", "Custom User-Agent string")
    .option(
      "--query <query>",
      "Target query to measure coverage against (repeatable; supply about 5 queries for stable coverage measurement)",
      collectRepeatable,
      [] as string[],
    )
    .option(
      "--domain <auto|product|informational>",
      "Page domain profile; product pages get product-fit checks (default: auto)",
    )
    .option(
      "--engine <generic|gemini|gpt|perplexity>",
      "Experimental engine preset that reweights categories (default: generic)",
    )
    .option("--config <path>", "Path to aiseo.config.json config file")
    .option("--tldr", "Emit only the TL;DR summary (no detailed breakdown)")
    .option(
      "--diff",
      "Track score over time: records this run, compares against the previous recorded run",
    )
    .option(
      "--all",
      "With --diff and no URL, render the audit history across every tracked URL",
    )
    .option(
      "--baseline <path>",
      "Diff against a specific prior JSON result (bypasses history tracking)",
    )
    .action(async (url: string | undefined, rawOpts: unknown) => {
      onExit(await execute(url, rawOpts, signal));
    });

  program.exitOverride();
  return program;
}

async function execute(
  url: string | undefined,
  rawOpts: unknown,
  signal: AbortSignal,
): Promise<number> {
  const opts = parseOptions(rawOpts);
  if (url && opts.url) fail("Pass a positional URL or --url, not both");
  url = url ?? opts.url;

  if (!url && !opts.sitemap && !opts.replay && !(opts.diff && opts.all)) {
    fail("Provide a URL to audit, use --sitemap <url>, or use --diff --all");
  }
  if (url && opts.sitemap) {
    fail("Cannot use both a URL argument and --sitemap together");
  }
  assertFlagsAreCompatible(url, opts);

  if (opts.signalsBase && !isValidUrl(opts.signalsBase)) {
    fail(`Invalid --signals-base URL "${opts.signalsBase}"`);
  }
  if (opts.out) {
    await assertWritableOutputPath(opts.out);
  }
  if (opts.snapshotOut) await assertWritableOutputPath(opts.snapshotOut);

  const { config: loadedConfig, path: discoveredConfigPath } =
    await loadConfigWithPath(opts.config);
  const config = applyAuditTargetOverrides(loadedConfig, opts);
  const configPath = discoveredConfigPath ?? pathForFreshConfig();

  const format = resolveFormat(opts, config.format);
  const timeout = opts.timeout ?? config.timeout;
  const userAgent = opts.userAgent ?? config.userAgent;
  const failUnder = opts.failUnder ?? config.failUnder;

  if (opts.diff && opts.all) {
    const timeline = renderHistoryTimeline(config.diff ?? {}, { format });
    await emit(timeline, opts.out);
    return 0;
  }

  if (opts.sitemap) {
    if (!isValidUrl(opts.sitemap)) {
      fail(`Invalid sitemap URL "${opts.sitemap}"`);
    }

    const sitemapResult = await analyzeSitemap(
      {
        sitemapUrl: opts.sitemap,
        signalsBase: opts.signalsBase,
        timeout,
        userAgent,
        signal,
        evaluationDate: opts.evaluationDate,
        maxUrls: opts.maxUrls,
        concurrency: opts.concurrency,
        onProgress: opts.progress
          ? ({ completed, total }) =>
              console.error(`Audited ${completed}/${total} pages`)
          : undefined,
      },
      config,
    );

    for (const warning of sitemapResult.warnings) {
      console.error(`⚠ ${warning}`);
    }

    await emit(renderSitemapReport(sitemapResult, { format }), opts.out);

    const gate = checkSitemapGate(sitemapResult, {
      failUnder,
      failedPages: opts.failedPages,
    });
    if (gate.message) console.error(gate.message);
    return gate.code;
  }

  if (!opts.replay && !isValidUrl(url!)) {
    fail(`Invalid URL "${url}"`);
  }

  const result = await analyzeInput(
    url,
    { ...opts, timeout, userAgent, signal },
    config,
  );

  let output: string;
  let comparison: DiffResultType | null = null;
  if (opts.diff || opts.baseline) {
    const outcome = await orchestrateDiff({
      result,
      config,
      configPath,
      baselinePath: opts.baseline,
    });
    comparison = outcome.diff;

    for (const note of outcome.notifications) {
      console.error(`💡 ${note}`);
    }

    output = outcome.diff
      ? renderDiffReport(result, outcome.diff, {
          format,
          tldrOnly: opts.tldr,
        })
      : renderReport(result, { format, tldrOnly: opts.tldr });
  } else {
    output = renderReport(result, { format, tldrOnly: opts.tldr });
  }

  await emit(output, opts.out);
  const regressionGate = checkRegressionGate(comparison, opts);
  if (regressionGate.message) console.error(regressionGate.message);
  if (regressionGate.code !== 0) return regressionGate.code;

  if (failUnder !== undefined && result.overallScore < failUnder) {
    console.error(
      `\nScore ${result.overallScore} is below threshold ${failUnder}`,
    );
    return 1;
  }
  return 0;
}

function collectRepeatable(value: string, previous: string[]): string[] {
  return [...previous, value];
}

function applyAuditTargetOverrides(
  config: AiseoConfigType,
  opts: CliOptionsType,
): AiseoConfigType {
  const queries = [...config.queries, ...(opts.query ?? [])];
  if (queries.length > MAX_TARGET_QUERIES) {
    fail(
      `Too many target queries: ${queries.length} supplied between --query flags and config, maximum is ${MAX_TARGET_QUERIES}`,
    );
  }
  return {
    ...config,
    queries,
    domain: opts.domain ?? config.domain,
    engine: opts.engine ?? config.engine,
  };
}

function parseOptions(rawOpts: unknown): CliOptionsType {
  const optsResult = CliOptionsSchema.safeParse(rawOpts);
  if (!optsResult.success) {
    fail(
      optsResult.error.issues
        .map((i) => `${i.path.join(".") || "option"}: ${i.message}`)
        .join(", "),
    );
  }
  return optsResult.data;
}

function assertFlagsAreCompatible(
  url: string | undefined,
  opts: CliOptionsType,
): void {
  if (
    [opts.file, opts.stdin, opts.replay, opts.sitemap].filter(Boolean).length >
    1
  )
    fail("Choose one input mode: --file, --stdin, --replay, or --sitemap");
  if ((opts.file || opts.stdin) && !url) fail("Supplied HTML requires --url");
  if (
    opts.replay &&
    (url ||
      opts.config ||
      opts.query?.length ||
      opts.domain ||
      opts.engine ||
      opts.evaluationDate ||
      opts.signalsBase ||
      opts.snapshotOut)
  )
    fail(
      "--replay uses the URL, configuration, signals, and date stored in the snapshot",
    );
  if ((opts.file || opts.stdin) && (opts.signalsBase || opts.snapshotOut))
    fail("--signals-base and --snapshot-out require a fetched URL");
  if (
    opts.snapshotOut &&
    opts.out &&
    resolve(opts.snapshotOut) === resolve(opts.out)
  )
    fail("Snapshot and report output paths must differ");
  if (
    [opts.file, opts.replay, opts.baseline, opts.config].some(
      (path) =>
        path &&
        [opts.out, opts.snapshotOut].some(
          (output) => output && resolve(path) === resolve(output),
        ),
    )
  )
    fail(
      "Output paths must not overwrite an input, baseline, or configuration file",
    );
  if (
    (opts.failOnRegression || opts.failOnNewBlocker) &&
    !(opts.diff || opts.baseline)
  )
    fail("Regression gates require --diff or --baseline");
  if (
    !opts.sitemap &&
    (opts.maxUrls || opts.concurrency || opts.progress || opts.failedPages)
  )
    fail("Sitemap controls require --sitemap");
  const formatFlags = [opts.json, opts.md, opts.html].filter(Boolean).length;
  if (formatFlags > 1) {
    fail("Pass at most one of --json, --md, --html");
  }
  if (opts.sitemap) {
    if (opts.snapshotOut)
      fail("--snapshot-out is not supported with --sitemap");
    if (opts.diff) fail("--diff is not supported with --sitemap");
    if (opts.baseline) fail("--baseline is not supported with --sitemap");
    if (opts.tldr) fail("--tldr is not supported with --sitemap");
  }
  if (opts.all) {
    if (
      opts.replay ||
      opts.file ||
      opts.stdin ||
      opts.sitemap ||
      opts.failOnRegression ||
      opts.failOnNewBlocker
    )
      fail("--all only renders tracked history");
    if (!opts.diff) fail("--all requires --diff");
    if (url) fail("--diff --all renders all tracked URLs; omit the URL");
  }
}

function resolveFormat(
  opts: CliOptionsType,
  configFormat: ReportFormatType,
): ReportFormatType {
  if (opts.json) return "json";
  if (opts.md) return "md";
  if (opts.html) return "html";
  if (opts.out?.endsWith(".html")) return "html";
  if (opts.out?.endsWith(".md")) return "md";
  if (opts.out?.endsWith(".json")) return "json";
  return configFormat;
}

async function emit(output: string, outPath?: string): Promise<void> {
  if (outPath) {
    await writeOutputFile(outPath, output);
    console.error(`Results written to ${outPath}`);
  } else {
    console.log(output);
  }
}

function fail(message: string): never {
  console.error(`Error: ${message}`);
  throw new CliExit(2);
}

class CliExit extends Error {
  constructor(readonly exitCode: number) {
    super(`exit ${exitCode}`);
  }
}

function pathForFreshConfig(): string {
  return resolve("aiseo.config.json");
}

const COMMANDER_CODES_THAT_ARE_SUCCESSFUL_EXITS = [
  "commander.helpDisplayed",
  "commander.help",
  "commander.version",
];
const USAGE_ERROR_EXIT_CODE = 2;

function exitCodeForCommanderError(error: CommanderError): number {
  return COMMANDER_CODES_THAT_ARE_SUCCESSFUL_EXITS.includes(error.code)
    ? 0
    : USAGE_ERROR_EXIT_CODE;
}
