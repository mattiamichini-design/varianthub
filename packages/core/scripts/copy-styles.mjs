import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";

const sourcePath = path.resolve("src/styles/varianthub.css");
const distDir = path.resolve("dist");
const targetPath = path.join(distDir, "styles.css");
const themeSourcePath = path.resolve("src/styles/theme.css");
const themeTargetPath = path.join(distDir, "theme.css");

await mkdir(distDir, { recursive: true });
await copyFile(sourcePath, targetPath);
await copyFile(themeSourcePath, themeTargetPath);
