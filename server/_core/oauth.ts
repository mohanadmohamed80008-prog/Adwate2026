import { COOKIE_NAME, ONE_YEAR_MS, OAUTH_STATE_COOKIE, decodeOAuthState } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import { randomBytes } from "node:crypto";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { ENV } from "./env";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

type Provider = "google" | "github" | "facebook";
type Profile = { id: string; name: string; email?: string | null };

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

function callbackUrl(provider: Provider) {
  return `https://adawati.onrender.com/api/auth/${provider}/callback`;
}

function configured(provider: Provider) {
  if (provider === "google") return Boolean(ENV.googleClientId && ENV.googleClientSecret);
  if (provider === "github") return Boolean(ENV.githubClientId && ENV.githubClientSecret);
  return Boolean(ENV.facebookAppId && ENV.facebookAppSecret);
}

function providerLabel(provider: Provider) {
  return provider === "google" ? "Google" : provider === "github" ? "GitHub" : "Facebook";
}

async function exchange(provider: Provider, code: string): Promise<Profile> {
  if (provider === "google") {
    const body = new URLSearchParams({ code, client_id: ENV.googleClientId, client_secret: ENV.googleClientSecret, redirect_uri: callbackUrl(provider), grant_type: "authorization_code" });
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
    if (!tokenRes.ok) throw new Error("google token exchange failed");
    const token = await tokenRes.json() as { access_token?: string };
    if (!token.access_token) throw new Error("google access token missing");
    const userRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { authorization: `Bearer ${token.access_token}` } });
    if (!userRes.ok) throw new Error("google user info failed");
    const user = await userRes.json() as { sub?: string; name?: string; email?: string };
    if (!user.sub) throw new Error("google user id missing");
    return { id: user.sub, name: user.name || user.email || "مستخدم Google", email: user.email };
  }
  if (provider === "github") {
    const body = new URLSearchParams({ client_id: ENV.githubClientId, client_secret: ENV.githubClientSecret, code, redirect_uri: callbackUrl(provider) });
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", { method: "POST", headers: { accept: "application/json", "content-type": "application/x-www-form-urlencoded" }, body });
    if (!tokenRes.ok) throw new Error("github token exchange failed");
    const token = await tokenRes.json() as { access_token?: string };
    if (!token.access_token) throw new Error("github access token missing");
    const headers = { authorization: `Bearer ${token.access_token}`, accept: "application/vnd.github+json", "user-agent": "Adawati" };
    const userRes = await fetch("https://api.github.com/user", { headers });
    if (!userRes.ok) throw new Error("github user info failed");
    const user = await userRes.json() as { id?: number; name?: string; login?: string; email?: string | null };
    if (!user.id) throw new Error("github user id missing");
    let email = user.email;
    if (!email) {
      const emailsRes = await fetch("https://api.github.com/user/emails", { headers });
      if (emailsRes.ok) {
        const emails = await emailsRes.json() as Array<{ email: string; primary?: boolean; verified?: boolean }>;
        email = emails.find((item) => item.primary && item.verified)?.email || emails.find((item) => item.verified)?.email || null;
      }
    }
    return { id: String(user.id), name: user.name || user.login || "مستخدم GitHub", email };
  }
  const tokenUrl = new URL("https://graph.facebook.com/v20.0/oauth/access_token");
  tokenUrl.search = new URLSearchParams({ client_id: ENV.facebookAppId, client_secret: ENV.facebookAppSecret, redirect_uri: callbackUrl(provider), code }).toString();
  const tokenRes = await fetch(tokenUrl);
  if (!tokenRes.ok) throw new Error("facebook token exchange failed");
  const token = await tokenRes.json() as { access_token?: string };
  if (!token.access_token) throw new Error("facebook access token missing");
  const userUrl = new URL("https://graph.facebook.com/me");
  userUrl.search = new URLSearchParams({ fields: "id,name,email", access_token: token.access_token }).toString();
  const userRes = await fetch(userUrl);
  if (!userRes.ok) throw new Error("facebook user info failed");
  const user = await userRes.json() as { id?: string; name?: string; email?: string };
  if (!user.id) throw new Error("facebook user id missing");
  return { id: user.id, name: user.name || "مستخدم Facebook", email: user.email };
}

async function finishLogin(provider: Provider, profile: Profile, res: Response, req: Request) {
  const openId = `${provider}:${profile.id}`;
  await db.upsertUser({ openId, name: profile.name || null, email: profile.email ?? null, loginMethod: provider, lastSignedIn: new Date() });
  const sessionToken = await sdk.createSessionToken(openId, { name: profile.name || "", expiresInMs: ONE_YEAR_MS });
  res.cookie(COOKIE_NAME, sessionToken, { ...getSessionCookieOptions(req), maxAge: ONE_YEAR_MS });
  res.redirect(302, "/");
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/auth/:provider", (req: Request, res: Response) => {
    const provider = req.params.provider as Provider;
    if (!["google", "github", "facebook"].includes(provider) || !configured(provider)) {
      res.status(503).json({ error: `${providerLabel(provider)} OAuth غير مفعّل بعد` });
      return;
    }
    const nonce = randomBytes(24).toString("hex");
    const state = Buffer.from(JSON.stringify({ nonce, provider })).toString("base64url");
    res.cookie(OAUTH_STATE_COOKIE, nonce, { httpOnly: true, secure: true, sameSite: "none", path: "/", maxAge: 10 * 60 * 1000 });
    const url = provider === "google" ? new URL("https://accounts.google.com/o/oauth2/v2/auth") : provider === "github" ? new URL("https://github.com/login/oauth/authorize") : new URL("https://www.facebook.com/v20.0/dialog/oauth");
    url.search = new URLSearchParams(provider === "google" ? { client_id: ENV.googleClientId, redirect_uri: callbackUrl(provider), response_type: "code", scope: "openid email profile", state } : provider === "github" ? { client_id: ENV.githubClientId, redirect_uri: callbackUrl(provider), scope: "read:user user:email", state } : { client_id: ENV.facebookAppId, redirect_uri: callbackUrl(provider), scope: "public_profile,email", state }).toString();
    res.redirect(302, url.toString());
  });

  app.get("/api/auth/:provider/callback", async (req: Request, res: Response) => {
    const provider = req.params.provider as Provider;
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    const error = getQueryParam(req, "error");
    if (error) { res.redirect(302, `/?auth=login&oauth_error=${encodeURIComponent(error)}`); return; }
    if (!["google", "github", "facebook"].includes(provider) || !code || !state) { res.status(400).json({ error: "بيانات OAuth غير مكتملة" }); return; }
    try {
      const decoded = JSON.parse(Buffer.from(state, "base64url").toString("utf8")) as { nonce?: string; provider?: string };
      const expectedNonce = parseCookieHeader(req.headers.cookie ?? "")[OAUTH_STATE_COOKIE];
      if (!decoded.nonce || decoded.nonce !== expectedNonce || decoded.provider !== provider) { res.status(403).json({ error: "حالة OAuth غير صالحة" }); return; }
      res.clearCookie(OAUTH_STATE_COOKIE, { path: "/", secure: true, sameSite: "none" });
      await finishLogin(provider, await exchange(provider, code), res, req);
    } catch (error) {
      console.error(`[OAuth:${provider}] Callback failed`, error instanceof Error ? error.message : "unknown error");
      res.redirect(302, `/?auth=login&oauth_error=${encodeURIComponent("تعذر إكمال تسجيل الدخول")}`);
    }
  });

  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) { res.status(400).json({ error: "code and state are required" }); return; }
    const { nonce } = decodeOAuthState(state);
    const expectedNonce = parseCookieHeader(req.headers.cookie ?? "")[OAUTH_STATE_COOKIE];
    if (!nonce || nonce !== expectedNonce) { res.status(403).json({ error: "invalid oauth state" }); return; }
    res.clearCookie(OAUTH_STATE_COOKIE, { path: "/", secure: true, sameSite: "none" });
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) { res.status(400).json({ error: "openId missing from user info" }); return; }
      await db.upsertUser({ openId: userInfo.openId, name: userInfo.name || null, email: userInfo.email ?? null, loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null, lastSignedIn: new Date() });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, { name: userInfo.name || "", expiresInMs: ONE_YEAR_MS });
      res.cookie(COOKIE_NAME, sessionToken, { ...getSessionCookieOptions(req), maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) { console.error("[OAuth] Callback failed", error instanceof Error ? error.message : "unknown error"); res.status(500).json({ error: "OAuth callback failed" }); }
  });
}
