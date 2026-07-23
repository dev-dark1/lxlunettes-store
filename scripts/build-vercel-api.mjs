import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const rootRequire = createRequire(import.meta.url);
const apiRequire = createRequire(
  new URL("../artifacts/api-server/package.json", import.meta.url),
);
let esbuild;
try {
  esbuild = rootRequire("esbuild");
} catch {
  esbuild = apiRequire("esbuild");
}
const pinoPluginModule = apiRequire("esbuild-plugin-pino");
const esbuildPluginPino =
  pinoPluginModule.default ?? pinoPluginModule;
const workspaceDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const apiDir = path.join(workspaceDir, "api");
if (path.dirname(apiDir) !== workspaceDir) {
  throw new Error(`Refusing to replace API directory outside workspace: ${apiDir}`);
}


await rm(apiDir, { recursive: true, force: true });
await mkdir(apiDir, { recursive: true });

await esbuild.build({
  entryPoints: {
    index: path.join(workspaceDir, "vercel", "api-entry.ts"),
  },
  outdir: apiDir,
  outExtension: { ".js": ".mjs" },
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  sourcemap: false,
  plugins: [esbuildPluginPino({ transports: ["pino-pretty"] })],
  banner: {
    js: `import { createRequire as __createRequire } from "node:module";
import __bannerPath from "node:path";
import __bannerUrl from "node:url";
globalThis.require = __createRequire(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);`,
  },
  logLevel: "info",
});
