import type { Mock } from "vitest";
import {
  httpGet,
  httpProbe,
  type HttpResponseType,
} from "../../src/utils/http.js";

const mockedGet = httpGet as Mock;
const mockedProbe = httpProbe as Mock;

export function mockResponse(
  overrides: Partial<HttpResponseType>,
): HttpResponseType {
  return {
    status: 200,
    data: "",
    headers: {},
    finalUrl: "",
    ...overrides,
  };
}

export function setupHttpMocks(options: {
  pageHtml?: string;
  pageStatus?: number;
  robotsTxt?: string;
  llmsTxtStatus?: number;
}): void {
  const {
    pageHtml = "",
    pageStatus = 200,
    robotsTxt = "User-agent: *\nAllow: /",
    llmsTxtStatus = 404,
  } = options;

  mockedGet.mockImplementation(async (opts: { url: string }) => {
    if (opts.url.includes("robots.txt")) {
      return mockResponse({ status: 200, data: robotsTxt, finalUrl: opts.url });
    }
    return mockResponse({
      status: pageStatus,
      data: pageHtml,
      headers: { "content-type": "text/html" },
      finalUrl: opts.url,
    });
  });

  mockedProbe.mockImplementation(async (opts: { url: string }) => {
    return mockResponse({
      status: llmsTxtStatus,
      data: llmsTxtStatus === 200 ? "# Example llms.txt\n" : "",
      headers: { "content-type": "text/plain" },
      finalUrl: opts.url,
    });
  });
}
