import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const distDir = path.join(rootDir, "dist");
const nextStaticDir = path.join(rootDir, ".next", "static");
const nextAppDir = path.join(rootDir, ".next", "server", "app");

console.log("🚀 Packaging Full-Stack Next.js for Cloudflare Pages...");

// Clean up old dist directory
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

// 1. Copy all static files (_next/static)
const targetStatic = path.join(distDir, "_next", "static");
fs.mkdirSync(targetStatic, { recursive: true });

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (fs.existsSync(nextStaticDir)) {
  copyDir(nextStaticDir, targetStatic);
  console.log("✓ Copied _next/static assets");
}

// 1.5 Copy all public static files (robots.txt, llms.txt, etc.) to dist/
const publicDir = path.join(rootDir, "public");
if (fs.existsSync(publicDir)) {
  copyDir(publicDir, distDir);
  console.log("✓ Copied public assets (robots.txt, llms.txt, ai-catalog.json, sitemap.xml)");
}

// 2. Copy all generated HTML files from .next/server/app to dist/
function copyHtmlFiles(src, dest) {
  if (!fs.existsSync(src)) return;
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      if (!fs.existsSync(destPath)) fs.mkdirSync(destPath, { recursive: true });
      copyHtmlFiles(srcPath, destPath);
    } else if (entry.name.endsWith(".html")) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

copyHtmlFiles(nextAppDir, distDir);

// Verify index.html exists
const indexHtml = path.join(nextAppDir, "index.html");
if (fs.existsSync(indexHtml)) {
  fs.copyFileSync(indexHtml, path.join(distDir, "index.html"));
  console.log("✓ Successfully copied Homepage index.html to dist/index.html");
} else {
  console.error("⚠ Warning: index.html was not found in", nextAppDir);
}

// 3. Write _routes.json
const routesJson = {
  version: 1,
  include: ["/*"],
  exclude: ["/_next/static/*", "/favicon.ico"]
};
fs.writeFileSync(path.join(distDir, "_routes.json"), JSON.stringify(routesJson, null, 2));

// 4. Copy standalone Cloudflare Edge Worker (scripts/worker.js -> dist/_worker.js)
const workerSrc = path.join(rootDir, "scripts", "worker.js");
const workerDest = path.join(distDir, "_worker.js");
if (fs.existsSync(workerSrc)) {
  fs.copyFileSync(workerSrc, workerDest);
  console.log("✓ Copied standalone Cloudflare Edge Worker (scripts/worker.js -> dist/_worker.js)");
} else {
  console.error("❌ Error: scripts/worker.js not found!");
  process.exit(1);
}

console.log("🎉 Complete Full-Stack Bundle ready in dist/!");
