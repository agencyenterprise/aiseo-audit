import { Command } from 'commander';
import { loadConfig } from './modules/config/service.js';
import { analyzeUrl } from './modules/analyzer/service.js';
import { renderReport } from './modules/report/service.js';
import { normalizeUrl, isValidUrl } from './utils/url.js';
import { writeOutputFile } from './utils/fs.js';
import type { ReportFormat } from './modules/report/schema.js';

const program = new Command();

program
  .name('geoaudit')
  .description('Audit web pages for generative engine readiness')
  .version('0.1.0')
  .argument('<url>', 'URL to audit')
  .option('--json', 'Output as JSON (shorthand for --format json)')
  .option('--format <format>', 'Output format: pretty, json, md', 'pretty')
  .option('--out <path>', 'Write JSON output to a file')
  .option('--fail-under <score>', 'Exit with code 1 if score is below threshold', parseFloat)
  .option('--timeout <ms>', 'Request timeout in milliseconds', parseInt)
  .option('--user-agent <ua>', 'Custom User-Agent string')
  .option('--config <path>', 'Path to geo.json config file')
  .action(async (url: string, opts: {
    json?: boolean;
    format?: string;
    out?: string;
    failUnder?: number;
    timeout?: number;
    userAgent?: string;
    config?: string;
  }) => {
    try {
      if (!isValidUrl(url)) {
        console.error(`Error: Invalid URL "${url}"`);
        process.exit(2);
      }

      // 1. Load config
      const config = await loadConfig(opts.config);

      // 2. Merge CLI options over config
      const format: ReportFormat = opts.json
        ? 'json'
        : (opts.format as ReportFormat) || config.format;

      const timeout = opts.timeout ?? config.timeout;
      const userAgent = opts.userAgent ?? config.userAgent;

      // 3. Run analysis
      const result = await analyzeUrl(
        { url: normalizeUrl(url), timeout, userAgent },
        config
      );

      // 4. Write to file if requested
      if (opts.out) {
        await writeOutputFile(opts.out, JSON.stringify(result, null, 2));
        console.error(`Results written to ${opts.out}`);
      }

      // 5. Render and output
      const output = renderReport(result, { format });
      console.log(output);

      // 6. Check fail-under threshold
      if (opts.failUnder !== undefined && result.overallScore < opts.failUnder) {
        console.error(
          `\nScore ${result.overallScore} is below threshold ${opts.failUnder}`
        );
        process.exit(1);
      }
    } catch (error) {
      console.error(
        'Audit failed:',
        error instanceof Error ? error.message : String(error)
      );
      process.exit(2);
    }
  });

program.parse();
