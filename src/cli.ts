import { resolve } from "node:path";
import { Command } from "commander";
import { z } from "zod";
import { VERSION } from "./modules/analyzer/constants.js";
import { analyzeUrl } from "./modules/analyzer/service.js";
import { loadConfig } from "./modules/config/service.js";
import { orchestrateDiff } from "./modules/diff/orchestrate.js";
import type { ReportFormatType } from "./modules/report/schema.js";
import {
  renderDiffReport,
  renderHistoryTimeline,
  renderReport,
  renderSitemapReport,
} from "./modules/report/service.js";
import { analyzeSitemap } from "./modules/sitemap/service.js";
import { writeOutputFile } from "./utils/fs.js";
import { isValidUrl } from "./utils/url.js";

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
});

const program = new Command();

program
  .name("aiseo-audit")
  .description("Audit web pages for AI search readiness")
  .version(VERSION)
  .argument("[url]", "URL to audit")
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
    try {
      const optsResult = CliOptionsSchema.safeParse(rawOpts);
      if (!optsResult.success) {
        console.error(
          "Error:",
          optsResult.error.issues.map((i) => i.message).join(", "),
        );
        process.exit(2);
      }
      const opts = optsResult.data;

      if (!url && !opts.sitemap && !(opts.diff && opts.all)) {
        console.error(
          "Error: Provide a URL to audit, use --sitemap <url>, or use --diff --all",
        );
        process.exit(2);
      }

      if (url && opts.sitemap) {
        console.error(
          "Error: Cannot use both a URL argument and --sitemap together",
        );
        process.exit(2);
      }

      const config = await loadConfig(opts.config);
      const configPath = resolve(opts.config ?? "aiseo.config.json");

      const inferredFormat: ReportFormatType | undefined = opts.out?.endsWith(
        ".html",
      )
        ? "html"
        : opts.out?.endsWith(".md")
          ? "md"
          : opts.out?.endsWith(".json")
            ? "json"
            : undefined;

      const format: ReportFormatType = opts.json
        ? "json"
        : opts.md
          ? "md"
          : opts.html
            ? "html"
            : (inferredFormat ?? config.format);

      const timeout = opts.timeout ?? config.timeout;
      const userAgent = opts.userAgent ?? config.userAgent;

      if (opts.diff && opts.all && !url && !opts.sitemap) {
        const diffMap = config.diff ?? {};
        const timeline = renderHistoryTimeline(diffMap, { format });
        if (opts.out) {
          await writeOutputFile(opts.out, timeline);
          console.error(`Results written to ${opts.out}`);
        } else {
          console.log(timeline);
        }
        return;
      }

      if (opts.sitemap) {
        if (!isValidUrl(opts.sitemap)) {
          console.error(`Error: Invalid sitemap URL "${opts.sitemap}"`);
          process.exit(2);
        }

        const sitemapResult = await analyzeSitemap(
          {
            sitemapUrl: opts.sitemap,
            signalsBase: opts.signalsBase,
            timeout,
            userAgent,
          },
          config,
        );

        const output = renderSitemapReport(sitemapResult, { format });

        if (opts.out) {
          await writeOutputFile(opts.out, output);
          console.error(`Results written to ${opts.out}`);
        } else {
          console.log(output);
        }

        const failUnder = opts.failUnder ?? config.failUnder;
        if (failUnder !== undefined && sitemapResult.averageScore < failUnder) {
          const belowCount = sitemapResult.urlResults.filter(
            (r) => r.status === "success" && r.result.overallScore < failUnder,
          ).length;
          console.error(
            `\nAverage score ${sitemapResult.averageScore} is below threshold ${failUnder} (${belowCount} URLs individually below threshold)`,
          );
          process.exit(1);
        }

        return;
      }

      if (!isValidUrl(url!)) {
        console.error(`Error: Invalid URL "${url}"`);
        process.exit(2);
      }

      const result = await analyzeUrl(
        { url: url!, signalsBase: opts.signalsBase, timeout, userAgent },
        config,
      );

      const useDiff = opts.diff || Boolean(opts.baseline);
      let output: string;

      if (useDiff) {
        const outcome = await orchestrateDiff({
          result,
          config,
          configPath,
          baselinePath: opts.baseline,
          explicitOutPath: opts.out,
        });

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

      if (opts.out && !useDiff) {
        await writeOutputFile(opts.out, output);
        console.error(`Results written to ${opts.out}`);
      } else if (!useDiff) {
        console.log(output);
      } else {
        console.log(output);
      }

      const failUnder = opts.failUnder ?? config.failUnder;
      if (failUnder !== undefined && result.overallScore < failUnder) {
        console.error(
          `\nScore ${result.overallScore} is below threshold ${failUnder}`,
        );
        process.exit(1);
      }
    } catch (error) {
      console.error(
        "Audit failed:",
        error instanceof Error ? error.message : String(error),
      );
      process.exit(2);
    }
  });

program.parse();
