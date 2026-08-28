import { runCli } from "./cli/program.js";

runCli(process.argv).then((code) => {
  process.exitCode = code;
});
