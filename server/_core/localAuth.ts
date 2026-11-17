import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { parse as parseCookieHeader } from "cookie";
import type { Request, Response } from "express";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";

export const LOCAL_COOKIE_NAME = "adawati_session";
export const ADMIN_USERNAME = "mohanad";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

type LocalSession = { userId: number; username: string; role: "user" | "editor" | "admin"; exp: number };

function adminPassword() {
  return process.env.ADMIN_PASSWORD ?? "";
}

export function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [salt, expectedHex] = storedHash.split(":");
  if (!salt || !expectedHex) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  return expected.length === actual.length && timingSafeEqual(actual, expected);
}

function sessionSecret() {
  return process.env.ADMIN_PASSWORD || process.env.MANUS_JWT_SECRET || "adawati-local-session";
}

function sign(value: string) {
  return createHmac("sha256", sessionSecret()).update(value).digest("base64url");
}

export function createLocalSession(user: User) {
  const session: LocalSession = { userId: user.id, username: user.username ?? "", role: user.role, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS };
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readLocalSession(token: string | undefined): LocalSession | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature || sign(payload) !== signature) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as LocalSession;
    if (!session.userId || session.exp < Math.floor(Date.now() / 1000)) return null;
    return session;
  } catch {
    return null;
  }
}

export async function authenticateLocalRequest(req: Request): Promise<User | null> {
  const cookies = parseCookieHeader(req.headers.cookie ?? "");
  const session = readLocalSession(cookies[LOCAL_COOKIE_NAME]);
  if (!session) return null;
  const user = await db.getUserById(session.userId);
  return user ?? null;
}

export function setLocalSession(res: Response, req: Request, user: User) {
  res.cookie(LOCAL_COOKIE_NAME, createLocalSession(user), { ...getSessionCookieOptions(req), maxAge: SESSION_TTL_SECONDS * 1000 });
}

export function clearLocalSession(res: Response, req: Request) {
  res.clearCookie(LOCAL_COOKIE_NAME, { ...getSessionCookieOptions(req), maxAge: -1 });
}

export function isAdminLogin(username: string, password: string) {
  const configured = adminPassword();
  const provided = Buffer.from(password);
  const expected = Buffer.from(configured);
  return username === ADMIN_USERNAME && Boolean(configured) && provided.length === expected.length && timingSafeEqual(provided, expected);
}

export async function ensureAdminUser(password: string) {
  const existing = await db.getUserByUsername(ADMIN_USERNAME);
  if (existing) return existing;
  return db.createLocalUser({ username: ADMIN_USERNAME, passwordHash: hashPassword(password), name: "Mohanad", role: "admin" });
}
