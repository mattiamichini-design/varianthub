import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const distDir = path.resolve("dist");
const jsFiles = (await readdir(distDir)).filter((file) => file.endsWith(".js"));

const specifierPattern =
  /(from\s+["'])(\.\/[^"'.]+|\.\/[^"']+?)(["'])|(export\s+\*\s+from\s+["'])(\.\/[^"'.]+|\.\/[^"']+?)(["'])/g;

await Promise.all(
  jsFiles.map(async (file) => {
    const filePath = path.join(distDir, file);
    const source = await readFile(filePath, "utf8");
    const updated = source.replace(
      specifierPattern,
      (match, fromPrefix, fromPath, fromQuote, exportPrefix, exportPath, exportQuote) => {
        if (fromPath) {
          return `${fromPrefix}${fromPath}.js${fromQuote}`;
        }

        if (exportPath) {
          return `${exportPrefix}${exportPath}.js${exportQuote}`;
        }

        return match;
      },
    );

    if (updated !== source) {
      await writeFile(filePath, updated, "utf8");
    }
  }),
);
