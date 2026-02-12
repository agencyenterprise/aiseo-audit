declare const __PACKAGE_VERSION__: string;

export const VERSION: string =
  typeof __PACKAGE_VERSION__ !== "undefined" ? __PACKAGE_VERSION__ : "0.0.0";
