import axios, { type AxiosResponse } from "axios";
import {
  DEFAULT_HEADERS,
  MAX_RESPONSE_SIZE,
} from "../modules/fetcher/constants.js";

interface HttpRequestOptions {
  url: string;
  timeout: number;
  userAgent: string;
}

export async function httpGet(
  options: HttpRequestOptions,
): Promise<AxiosResponse> {
  return axios.get(options.url, {
    headers: {
      "User-Agent": options.userAgent,
      ...DEFAULT_HEADERS,
    },
    timeout: options.timeout,
    maxRedirects: 5,
    responseType: "text",
    maxContentLength: MAX_RESPONSE_SIZE,
    validateStatus: () => true,
  });
}

export async function httpHead(
  options: HttpRequestOptions,
): Promise<AxiosResponse> {
  return axios.head(options.url, {
    headers: {
      "User-Agent": options.userAgent,
      ...DEFAULT_HEADERS,
    },
    timeout: options.timeout,
    validateStatus: () => true,
  });
}
