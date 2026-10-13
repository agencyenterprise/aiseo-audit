import { createReadStream } from "node:fs";
import {
  analyzeHtml,
  analyzeSnapshot,
  analyzeUrl,
  captureUrl,
} from "../modules/analyzer/service.js";
import type {
  AnalyzerResultType,
  AuditSnapshotType,
} from "../modules/analyzer/schema.js";
import type { AiseoConfigType } from "../modules/config/schema.js";
import { writeOutputFile } from "../utils/fs.js";

export type AuditInputOptionsType = {
  file?: string;
  stdin?: boolean;
  replay?: string;
  snapshotOut?: string;
  evaluationDate?: string;
  signalsBase?: string;
  timeout: number;
  userAgent: string;
  signal?: AbortSignal;
};

export async function analyzeInput(
  url: string | undefined,
  options: AuditInputOptionsType,
  config: AiseoConfigType,
): Promise<AnalyzerResultType> {
  if (options.replay) {
    const text = await readInputText(
      createReadStream(options.replay),
      32 * 1024 * 1024,
    );
    return analyzeSnapshot(JSON.parse(text) as AuditSnapshotType);
  }
  if (options.file || options.stdin) {
    const html = await readInputText(
      options.file ? createReadStream(options.file) : process.stdin,
    );
    return analyzeHtml(
      { html, url: url!, evaluationDate: options.evaluationDate },
      config,
    );
  }
  const analyzerOptions = {
    url: url!,
    signalsBase: options.signalsBase,
    timeout: options.timeout,
    userAgent: options.userAgent,
    evaluationDate: options.evaluationDate,
    signal: options.signal,
  };
  if (options.snapshotOut) {
    const snapshot = await captureUrl(analyzerOptions, config);
    await writeOutputFile(
      options.snapshotOut,
      JSON.stringify(snapshot, null, 2),
    );
    return analyzeSnapshot(snapshot);
  }
  return analyzeUrl(analyzerOptions, config);
}

export async function readInputText(
  stream: AsyncIterable<Buffer | string>,
  maxBytes = 10 * 1024 * 1024,
): Promise<string> {
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of stream) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buffer.byteLength;
    if (bytes > maxBytes)
      throw new Error(
        `Input exceeds the ${maxBytes / 1024 / 1024}MB size limit.`,
      );
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}
