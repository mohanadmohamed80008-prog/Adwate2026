import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { publicPlatformScript } from "./publicConfig";
import { appRouter } from "../routers";
import { runWeeklyImprovementReview } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { ensureOptionalSchema, getSiteSettings } from "../db";
import { ENV } from "./env";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { retrieveDibsyPayment } from "./dibsy";

const githubOidcKeys = createRemoteJWKSet(new URL("https://token.actions.githubusercontent.com/.well-known/jwks"));

async function startServer() {
  await ensureOptionalSchema();
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.post("/api/payments/dibsy/webhook", async (req, res) => {
    const resource = typeof req.body?.resource === "string" ? req.body.resource : "";
    const id = typeof req.body?.id === "string" ? req.body.id : "";
    if (resource !== "payment" || !/^pt_[A-Za-z0-9]+$/.test(id)) return res.status(400).json({ ok: false, error: "invalid webhook payload" });
    try {
      const payment = await retrieveDibsyPayment(id);
      console.log(`[Dibsy Webhook] ${id}: ${payment.status ?? "unknown"}`);
      // Sandbox phase: acknowledge after server-side verification only.
      // Entitlement updates will be added with the subscription tables before live billing.
      return res.status(200).json({ ok: true, paymentId: id, status: payment.status ?? "unknown" });
    } catch (error) {
      console.error("[Dibsy Webhook] Verification failed:", error instanceof Error ? error.message : error);
      return res.status(503).json({ ok: false, error: "payment verification unavailable" });
    }
  });
  app.post("/api/internal/weekly-ai-review", async (req, res) => {
    const authorization = req.header("authorization") ?? "";
    const token = authorization.replace(/^Bearer\s+/i, "");
    try {
      const { payload } = await jwtVerify(token, githubOidcKeys, { issuer: "https://token.actions.githubusercontent.com", audience: "adawati-weekly-review" });
      if (payload.repository !== "mohanadmohamed80008-prog/Adwate2026" || payload.ref !== "refs/heads/main") return res.status(401).json({ error: "unauthorized" });
    } catch {
      return res.status(401).json({ error: "unauthorized" });
    }
    try {
      const report = await runWeeklyImprovementReview();
      return res.status(201).json({ ok: true, reportId: report?.id ?? null });
    } catch (error) {
      console.error("[Weekly AI Review] Failed:", error instanceof Error ? error.message : error);
      return res.status(500).json({ ok: false, error: "weekly review failed" });
    }
  });
  app.get("/api/platform/config.js", (_req, res) => {
    res.set("Cache-Control", "no-store").type("application/javascript").send(publicPlatformScript());
  });
  app.get("/ads.txt", async (_req, res) => {
    const settings = await getSiteSettings();
    res.type("text/plain").send(settings.adsensePublisherId ? `google.com, ${settings.adsensePublisherId}, DIRECT, f08c47fec0942fa0\n` : "# Add the AdSense publisher ID from the admin settings when ready.\n");
  });
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = Number(process.env.PORT || "3000");
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid PORT");
  server.on("error", error => { console.error("Server failed:", error.message); process.exit(1); });
  server.listen(port, "0.0.0.0", () => console.log(`Server listening on port ${port}`));
}

startServer().catch(error => { console.error(error); process.exit(1); });
