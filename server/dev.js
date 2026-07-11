import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const viteBin = fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url));

const commands = [
  { name: "rag", command: process.execPath, args: ["server/index.js"] },
  { name: "web", command: process.execPath, args: [viteBin, "--host", "0.0.0.0"] },
];

const children = commands.map(({ name, command, args }) => {
  const child = spawn(command, args, { cwd: rootDir, shell: false, stdio: ["ignore", "pipe", "pipe"] });
  child.stdout.on("data", (data) => process.stdout.write(`[${name}] ${data}`));
  child.stderr.on("data", (data) => process.stderr.write(`[${name}] ${data}`));
  child.on("error", (error) => {
    if (!shuttingDown) {
      console.error(`[${name}] failed to start: ${error.message}`);
      shutdown(1);
    }
  });
  child.on("exit", (code) => {
    if (code && !shuttingDown) {
      console.error(`[${name}] exited with code ${code}`);
      shutdown(code);
    }
  });
  return child;
});

let shuttingDown = false;
function shutdown(code = 0) {
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill();
  }
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
