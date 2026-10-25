import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, "src");

const CHECKS = [
  {
    name: "Raw white backgrounds",
    regex: /\bbg-white(?:\/\d+)?\b/g,
    allow: [/card-modal/, /dark-glass-panel/, /bg-white\/15/, /bg-white\/10/],
    allowFiles: [/src[\\/](components[\\/]appointments[\\/]AiBookingCard\.jsx|components[\\/]layout[\\/]Topbar\.jsx)$/],
  },
  { name: "Light focus override", regex: /focus:bg-white/g, allow: [] },
  { name: "Light gradient endpoint", regex: /\bto-white\b/g, allow: [], allowFiles: [] },
  {
    name: "Raw hex in className",
    regex: /\b(?:bg|text|border)-\[#(?:[0-9a-fA-F]{3,8})\]/g,
    allow: [],
    allowFiles: [/src[\\/]components[\\/]layout[\\/]Sidebar\.jsx$/, /src[\\/]components[\\/]layout[\\/]AppLayout\.jsx$/],
  },
];

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) return walk(fullPath);
      return fullPath;
    })
  );
  return files.flat();
}

function shouldScan(filePath) {
  return [".js", ".jsx", ".ts", ".tsx"].includes(path.extname(filePath));
}

function lineAt(content, index) {
  return content.slice(0, index).split("\n").length;
}

async function run() {
  const files = (await walk(SRC_DIR)).filter(shouldScan);
  const findings = [];

  for (const file of files) {
    const content = await fs.readFile(file, "utf8");
    for (const check of CHECKS) {
      check.regex.lastIndex = 0;
      let match;
      while ((match = check.regex.exec(content)) !== null) {
        const line = lineAt(content, match.index);
        const lineText = content.split("\n")[line - 1] || "";
        const fileAllowed = (check.allowFiles || []).some((rule) => rule.test(file));
        const allowed = check.allow.some((rule) => rule.test(lineText));
        if (!allowed && !fileAllowed) {
          findings.push({
            file: path.relative(ROOT, file),
            line,
            check: check.name,
            token: match[0],
          });
        }
      }
    }
  }

  if (!findings.length) {
    console.log("Dark mode audit passed: no forbidden light-only patterns found.");
    return;
  }

  console.error("Dark mode audit failed. Fix these patterns:");
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line} [${finding.check}] -> ${finding.token}`);
  }
  process.exitCode = 1;
}

run().catch((error) => {
  console.error("Dark mode audit crashed:", error);
  process.exitCode = 1;
});
