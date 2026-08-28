declare const __PACKAGE_VERSION__: string;

const VERSION_WHEN_RUNNING_UNBUILT_SOURCE = "0.0.0";

export const VERSION: string =
  typeof __PACKAGE_VERSION__ !== "undefined"
    ? __PACKAGE_VERSION__
    : VERSION_WHEN_RUNNING_UNBUILT_SOURCE;
