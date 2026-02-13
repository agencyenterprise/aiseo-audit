import { Command } from "commander";
import { VERSION } from "./modules/analyzer/constants.js";
import { analyzeUrl } from "./modules/analyzer/service.js";
import { loadConfig } from "./modules/config/service.js";
import type { ReportFormatType } from "./modules/report/schema.js";
import { renderReport } from "./modules/report/service.js";
import { writeOutputFile } from "./utils/fs.js";
import { isValidUrl } from "./utils/url.js";

const program = new Command();

program
  .name("aiseo-audit")
  .description("Audit web pages for AI search readiness")
  .version(VERSION)
  .argument("<url>", "URL to audit")
  .option("--json", "Output as JSON")
  .option("--md", "Output as Markdown")
  .option("--html", "Output as HTML")
  .option("--out <path>", "Write rendered output to a file")
  .option(
    "--fail-under <score>",
    "Exit with code 1 if score is below threshold",
    parseFloat,
  )
  .option("--timeout <ms>", "Request timeout in milliseconds", parseInt)
  .option("--user-agent <ua>", "Custom User-Agent string")
  .option("--config <path>", "Path to aiseo.config.json config file")
  .action(
    async (
      url: string,
      opts: {
        json?: boolean;
        md?: boolean;
        html?: boolean;
        out?: string;
        failUnder?: number;
        timeout?: number;
        userAgent?: string;
        config?: string;
      },
    ) => {
      try {
        if (!isValidUrl(url)) {
          console.error(`Error: Invalid URL "${url}"`);
          process.exit(2);
        }

        const config = await loadConfig(opts.config);

        const format: ReportFormatType = opts.json
          ? "json"
          : opts.md
            ? "md"
            : opts.html
              ? "html"
              : config.format;

        const timeout = opts.timeout ?? config.timeout;
        const userAgent = opts.userAgent ?? config.userAgent;

        const result = await analyzeUrl({ url, timeout, userAgent }, config);

        const output = renderReport(result, { format });

        if (opts.out) {
          await writeOutputFile(opts.out, output);
          console.error(`Results written to ${opts.out}`);
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
    },
  );

program.parse();
