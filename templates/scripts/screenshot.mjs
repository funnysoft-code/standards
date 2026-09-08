#!/usr/bin/env bun
// Capture a PNG at an exact CSS viewport via Chrome DevTools Protocol.
// Headless Chrome floors --window-size below 500 CSS px, so media queries never see 390.
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";

const targetArg = process.argv[2];
const outputArg = process.argv[3];
const sizeArg = process.argv[4] ?? "1440x900";

if (targetArg === undefined || outputArg === undefined || !/^[0-9]+x[0-9]+$/.test(sizeArg)) {
  console.error("usage: screenshot.sh <url-or-file> <output.png> [WIDTHxHEIGHT]");
  process.exit(2);
}

const width = Number(sizeArg.slice(0, sizeArg.indexOf("x")));
const height = Number(sizeArg.slice(sizeArg.indexOf("x") + 1));

let target = targetArg;
if (!/^https?:\/\//.test(target) && !target.startsWith("file://")) {
  target = `file://${resolve(target)}`;
}

const chromeCandidates = [
  "google-chrome-stable",
  "google-chrome",
  "chromium",
  "chromium-browser",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
];

const chrome = chromeCandidates.find((bin) =>
  bin.startsWith("/") ? Bun.file(bin).size > 0 : Bun.which(bin) !== null,
);

if (chrome === undefined) {
  console.error("screenshot: chromium or Google Chrome not found");
  process.exit(1);
}

const userDataDir = mkdtempSync(`${tmpdir()}/screenshot-`);
const chromeProcess = spawn(
  chrome,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--hide-scrollbars",
    "--ignore-certificate-errors",
    "--remote-debugging-port=0",
    `--user-data-dir=${userDataDir}`,
    "about:blank",
  ],
  { stdio: ["ignore", "ignore", "pipe"] },
);

const port = await new Promise((resolvePort, reject) => {
  const timer = setTimeout(() => reject(new Error("chrome debug port timeout")), 15000);
  let stderr = "";

  chromeProcess.stderr.on("data", (chunk) => {
    stderr += String(chunk);
    const match = stderr.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)/);
    if (match !== null) {
      clearTimeout(timer);
      resolvePort(match[1]);
    }
  });

  chromeProcess.on("error", reject);
});

function connect(url) {
  const socket = new WebSocket(url);

  return new Promise((resolveOpen, reject) => {
    socket.addEventListener("open", () => resolveOpen(socket));
    socket.addEventListener("error", reject);
  });
}

function rpc(socket) {
  let nextId = 1;
  const pending = new Map();

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    if (message.id === undefined) {
      return;
    }

    const job = pending.get(message.id);
    if (job === undefined) {
      return;
    }

    pending.delete(message.id);
    if (message.error !== undefined) {
      job.reject(new Error(message.error.message));
      return;
    }

    job.resolve(message.result);
  });

  return {
    call(method, params) {
      const id = nextId;
      nextId += 1;

      return new Promise((resolveResult, reject) => {
        pending.set(id, { resolve: resolveResult, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
    once(method) {
      return new Promise((resolveEvent) => {
        const onMessage = (event) => {
          const message = JSON.parse(String(event.data));
          if (message.method !== method) {
            return;
          }

          socket.removeEventListener("message", onMessage);
          resolveEvent(message.params);
        };

        socket.addEventListener("message", onMessage);
      });
    },
  };
}

try {
  const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) =>
    response.json(),
  );
  const page = targets.find((item) => item.type === "page");
  if (page === undefined) {
    throw new Error("chrome has no page target");
  }

  const socket = await connect(page.webSocketDebuggerUrl);
  const client = rpc(socket);

  await client.call("Page.enable");
  await client.call("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 600,
  });

  const loaded = Promise.race([
    client.once("Page.loadEventFired"),
    client.once("Page.domContentEventFired"),
    Bun.sleep(4000),
  ]);
  await client.call("Page.navigate", { url: target });
  await loaded;
  await Bun.sleep(400);

  const shot = await client.call("Page.captureScreenshot", { format: "png", fromSurface: true });
  mkdirSync(dirname(outputArg), { recursive: true });
  writeFileSync(outputArg, Buffer.from(shot.data, "base64"));
  socket.close();
} finally {
  chromeProcess.kill("SIGTERM");
}
