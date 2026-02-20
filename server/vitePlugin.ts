/**
 * Vite plugin: API proxy middleware.
 * Intercepts /api/* requests at dev time and handles them server-side.
 * For production, use a separate Express server or deploy as Edge Function.
 */
import type { Plugin, ViteDevServer } from "vite";
import { handleSearchSongs, handleAnalyze, handleRefine } from "./api";

function parseBody(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk: string) => (data += chunk));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
  });
}

function getClientIp(req: any): string {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

export default function apiProxy(): Plugin {
  return {
    name: "api-proxy",
    configureServer(server: ViteDevServer) {
      // Security headers for all responses
      server.middlewares.use((_req, res, next) => {
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("X-Frame-Options", "DENY");
        res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
        next();
      });

      // API routes
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/")) return next();

        res.setHeader("Content-Type", "application/json");

        try {
          const body = req.method === "POST" ? await parseBody(req) : {};
          const ip = getClientIp(req);
          let result: any;

          if (req.url === "/api/search" && req.method === "POST") {
            result = await handleSearchSongs(body, ip);
          } else if (req.url === "/api/analyze" && req.method === "POST") {
            result = await handleAnalyze(body, ip);
          } else if (req.url === "/api/refine" && req.method === "POST") {
            result = await handleRefine(body, ip);
          } else {
            res.statusCode = 404;
            res.end(JSON.stringify({ error: "Not found" }));
            return;
          }

          res.statusCode = 200;
          res.end(JSON.stringify(result));
        } catch (err: any) {
          const status = err.status || 500;
          const message =
            err.message || "Internal server error";
          console.error(`[API] ${req.url} error:`, message);
          res.statusCode = status;
          res.end(JSON.stringify({ error: message }));
        }
      });
    },
  };
}
