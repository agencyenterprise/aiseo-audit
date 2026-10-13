export function readPackedFilename(output) {
  const result = JSON.parse(output);
  const packages =
    result && typeof result === "object" ? Object.values(result) : [];
  const filename = packages[0]?.filename;
  if (
    packages.length !== 1 ||
    typeof filename !== "string" ||
    filename.length === 0
  ) {
    throw new Error(
      "npm pack did not return exactly one package with a filename.",
    );
  }
  return filename;
}
