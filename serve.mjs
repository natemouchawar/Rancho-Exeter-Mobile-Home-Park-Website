import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);

// ─── Minimal .env loader (so local dev can read MAILERLITE_API_KEY etc) ───
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
  console.log("[serve] loaded .env");
}

const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".mp4": "video/mp4",
};

// Map URL paths (e.g. /api/subscribe) to handler modules (api/subscribe.mjs).
// Same handler file Vercel runs in production — no drift.
const API_ROUTES = {
  "/api/subscribe": path.join(__dirname, "api", "subscribe.mjs"),
  "/api/inquiry": path.join(__dirname, "api", "inquiry.mjs"),
};

async function invokeApiHandler(handlerPath, req, res) {
  try {
    const mod = await import(pathToFileURL(handlerPath).href);
    const handler = mod.default || mod.handler;
    if (typeof handler !== "function") {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "Handler export missing." }));
      return;
    }
    await handler(req, res);
  } catch (err) {
    console.error("[serve] api handler error", err);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
    }
    if (!res.writableEnded) {
      res.end(JSON.stringify({ ok: false, error: "Internal server error." }));
    }
  }
}

function tryServeStatic(urlPath, req, res) {
  const filePath = path.join(__dirname, urlPath);
  // Guard against path traversal escaping the project root.
  if (!filePath.startsWith(__dirname + path.sep)) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    res.end("Forbidden");
    return true;
  }
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return false;
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || "application/octet-stream";
  const size = fs.statSync(filePath).size;
  const headers = { "Content-Type": contentType, "Content-Length": size };
  let start = 0;
  let end = size - 1;
  let status = 200;
  // Native video controls request byte ranges when seeking through a walkthrough.
  if (ext === ".mp4") {
    headers["Accept-Ranges"] = "bytes";
    const range = req.method === "GET" && req.headers.range;
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (match && (match[1] || match[2])) {
        start = match[1]
          ? Number(match[1])
          : Math.max(0, size - Number(match[2]));
        end =
          match[1] && match[2]
            ? Math.min(Number(match[2]), size - 1)
            : size - 1;
      }
      if (
        !match ||
        (!match[1] && !match[2]) ||
        !Number.isSafeInteger(start) ||
        !Number.isSafeInteger(end) ||
        start > end ||
        start >= size
      ) {
        res.writeHead(416, {
          "Content-Range": `bytes */${size}`,
          "Content-Length": 0,
        });
        res.end();
        return true;
      }
      status = 206;
      headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
      headers["Content-Length"] = end - start + 1;
    }
  }
  res.writeHead(status, headers);
  if (req.method === "HEAD" || size === 0) res.end();
  else
    fs.createReadStream(filePath, { start, end })
      .on("error", () => res.destroy())
      .pipe(res);
  return true;
}

const server = http.createServer((req, res) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent(req.url.split("?")[0]);
  } catch {
    res.writeHead(400);
    res.end("Invalid URL");
    return;
  }
  // Never serve local credentials, Git metadata, or dependency files.
  if (
    urlPath
      .split("/")
      .some((part) => part.startsWith(".") || part === "node_modules")
  ) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  // API routes
  if (API_ROUTES[urlPath]) {
    invokeApiHandler(API_ROUTES[urlPath], req, res);
    return;
  }
  if (urlPath.startsWith("/api/")) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD" });
    res.end("Method not allowed");
    return;
  }

  // Root → index.html
  if (urlPath === "/") {
    tryServeStatic("/index.html", req, res);
    return;
  }

  // Direct static file hit
  if (tryServeStatic(urlPath, req, res)) return;

  // Clean-URL fallback: /join → /join.html (mirrors Vercel cleanUrls behavior)
  if (!path.extname(urlPath) && tryServeStatic(urlPath + ".html", req, res))
    return;

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
