// Tactus deployment proxy — serves the built dist/ and stands between the
// browser and Home Assistant so the real long-lived access token never
// reaches client JS. Two jobs:
//
//   1. REST: proxy an ALLOWLISTED set of /api/* calls to HA, adding
//      Authorization server-side. Tactus only ever calls GET /api/states —
//      everything else HA's REST API exposes (service calls, template
//      rendering, ...) is fully-credentialed and must not be reachable just
//      because a path happens to start with /api/.
//   2. WebSocket: proxy the /api/websocket upgrade to HA, forwarding every
//      frame in both directions unchanged EXCEPT the client's outbound
//      `{"type":"auth", access_token}` frame, whose token gets substituted
//      with the real one before forwarding upstream. HA authenticates
//      in-band over the socket, not via a header, which is why a plain
//      reverse proxy (nginx/Caddy) can't do this job.
//
// Deliberately no framework — Node's http + the `ws` package is enough for
// what this does.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer, WebSocket } from "ws";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(__dirname, "..", "dist");

const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;
const HA_URL = process.env.HA_URL;
const HA_TOKEN = process.env.HA_TOKEN;

if (!HA_URL || !HA_TOKEN) {
  console.error("HA_URL and HA_TOKEN must be set — see .env.example");
  process.exit(1);
}

const HA_REST_BASE = HA_URL.replace(/\/$/, "");
const HA_WS_URL = HA_REST_BASE.replace(/^http/, "ws") + "/api/websocket";

// ─── REST proxy ─────────────────────────────────────────────────────────────

// Add to this deliberately, one entry at a time, not by loosening the match.
const REST_ALLOWLIST = [{ method: "GET", path: "/api/states" }];

function isAllowed(method, pathname) {
  return REST_ALLOWLIST.some((r) => r.method === method && r.path === pathname);
}

async function proxyRest(req, res, pathname) {
  if (!isAllowed(req.method, pathname)) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    res.end("Forbidden");
    return;
  }

  try {
    const upstream = await fetch(`${HA_REST_BASE}${pathname}`, {
      method: req.method,
      headers: {
        Authorization: `Bearer ${HA_TOKEN}`,
        "Content-Type": "application/json",
      },
    });
    const body = Buffer.from(await upstream.arrayBuffer());
    res.writeHead(upstream.status, {
      "Content-Type": upstream.headers.get("content-type") || "application/json",
    });
    res.end(body);
  } catch (err) {
    // err.message only — never anything that could carry the Authorization
    // header or a response body.
    console.error("[rest] proxy error:", err.message);
    res.writeHead(502, { "Content-Type": "text/plain" });
    res.end("Bad Gateway");
  }
}

// ─── Static file serving ────────────────────────────────────────────────────

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function serveStatic(req, res, pathname) {
  // Resolve against DIST_DIR and verify the result is still inside it before
  // touching the filesystem — rejects any ../ (or encoded equivalent) path
  // traversal attempt. Falls back to index.html for anything that isn't a
  // real file, so client-side routes and unknown paths still load the app.
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    res.writeHead(400);
    res.end("Bad Request");
    return;
  }
  const requested = path.normalize(path.join(DIST_DIR, decoded));
  if (requested !== DIST_DIR && !requested.startsWith(DIST_DIR + path.sep)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.stat(requested, (err, stats) => {
    const target = !err && stats.isFile() ? requested : path.join(DIST_DIR, "index.html");
    fs.readFile(target, (readErr, data) => {
      if (readErr) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      const ext = path.extname(target);
      res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
      res.end(data);
    });
  });
}

// ─── HTTP server ─────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  if (pathname.startsWith("/api/")) {
    proxyRest(req, res, pathname);
    return;
  }
  serveStatic(req, res, pathname);
});

// ─── WebSocket proxy ─────────────────────────────────────────────────────────

const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (req, socket, head) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  if (pathname !== "/api/websocket") {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (client) => handleClientSocket(client));
});

function handleClientSocket(client) {
  const upstream = new WebSocket(HA_WS_URL);

  // Frames from the browser before the upstream socket is open shouldn't
  // vanish. In practice the browser won't speak before auth_required
  // arrives (which itself requires upstream to be open), but queue rather
  // than assume.
  let upstreamOpen = false;
  const pendingToUpstream = [];

  function forwardToUpstream(frame) {
    if (upstreamOpen) upstream.send(frame);
    else pendingToUpstream.push(frame);
  }

  upstream.on("open", () => {
    upstreamOpen = true;
    for (const frame of pendingToUpstream) upstream.send(frame);
    pendingToUpstream.length = 0;
  });

  client.on("message", (data, isBinary) => {
    if (isBinary) {
      forwardToUpstream(data);
      return;
    }
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      // Not JSON — forward unchanged rather than guess or drop it.
      forwardToUpstream(data);
      return;
    }
    if (msg.type === "auth") {
      // Always substituted, regardless of what the client sent (or didn't) —
      // the browser no longer holds a real token, so its value here is
      // irrelevant. Never log `msg` itself past this point, only the type.
      msg.access_token = HA_TOKEN;
      forwardToUpstream(JSON.stringify(msg));
      console.log("[ws] auth frame forwarded (token substituted)");
      return;
    }
    forwardToUpstream(data);
  });

  upstream.on("message", (data) => {
    if (client.readyState === WebSocket.OPEN) client.send(data);
  });

  const closeBoth = () => {
    if (client.readyState === WebSocket.OPEN || client.readyState === WebSocket.CONNECTING) client.close();
    if (upstream.readyState === WebSocket.OPEN || upstream.readyState === WebSocket.CONNECTING) upstream.close();
  };

  // Covers both a mid-session drop and HA being unreachable when this
  // connection was opened (the upstream constructor fails async — 'error'
  // then 'close' fire, never 'open'). Either way the client socket gets
  // closed so the browser's own reconnect timer takes over; no retry logic
  // duplicated here.
  upstream.on("close", closeBoth);
  upstream.on("error", (err) => {
    console.error("[ws] upstream error:", err.message);
    closeBoth();
  });
  client.on("close", closeBoth);
  client.on("error", (err) => {
    console.error("[ws] client error:", err.message);
    closeBoth();
  });
}

server.listen(PORT, () => {
  console.log(`Tactus proxy listening on :${PORT} -> ${HA_REST_BASE}`);
});
