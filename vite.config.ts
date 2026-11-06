import { defineConfig, type Plugin } from "vitest/config";
import react from "@vitejs/plugin-react";
import type { IncomingMessage, ServerResponse } from "node:http";
import { DEFAULT_AUTODARTS_BASE_URL, normalizeBaseUrl } from "./src/autodarts/baseUrl";

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > 2048) {
        reject(new Error("Request too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

type ProxyWithTarget = { options: { target?: string } };

/** Browser talks to this dev server; `/api` is forwarded to the configured Autodarts origin. */
function autodartsProxy(): Plugin {
  let target = DEFAULT_AUTODARTS_BASE_URL;
  const proxies: ProxyWithTarget[] = [];

  const applyTarget = (next: string) => {
    target = next;
    for (const proxy of proxies) proxy.options.target = next;
  };

  const handle = async (req: IncomingMessage, res: ServerResponse, next: (err?: unknown) => void) => {
    const path = req.url?.split("?")[0];
    if (path !== "/__madu/target") {
      next();
      return;
    }
    if (req.method === "GET") {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ baseUrl: target }));
      return;
    }
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.end();
      return;
    }
    try {
      const raw = await readBody(req);
      const body = JSON.parse(raw) as { baseUrl?: string };
      applyTarget(normalizeBaseUrl(body.baseUrl ?? ""));
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ baseUrl: target }));
    } catch (err) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: err instanceof Error ? err.message : "Invalid URL" }));
    }
  };

  const proxy = {
    target: DEFAULT_AUTODARTS_BASE_URL,
    changeOrigin: true,
    ws: true,
    configure(server: ProxyWithTarget) {
      proxies.push(server);
      server.options.target = target;
    },
  };

  return {
    name: "autodarts-proxy",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        void handle(req, res, next);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        void handle(req, res, next);
      });
    },
    config() {
      return {
        server: { proxy: { "/api": proxy } },
        preview: { proxy: { "/api": proxy } },
      };
    },
  };
}

export default defineConfig({
  plugins: [react(), autodartsProxy()],
  server: { port: 5173, strictPort: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
