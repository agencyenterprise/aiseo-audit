declare const __PACKAGE_VERSION__: string;
export const DOMAIN_SIGNAL_TIMEOUT_CAP = 5000;

export const VERSION: string =
  typeof __PACKAGE_VERSION__ !== "undefined" ? __PACKAGE_VERSION__ : "0.0.0";
