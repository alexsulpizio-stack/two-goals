import { createHmac, timingSafeEqual } from "node:crypto";

export const GUIDE_ACCESS_COOKIE = "two-goals-guide-access";
export const GUIDE_ACCESS_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const SESSION_PURPOSE = "two-goals-guide-access-v1";
const MIN_PASSWORD_LENGTH = 12;

function clean(value: string | undefined | null): string {
  return value?.trim() ?? "";
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function sessionToken(password: string): string {
  return createHmac("sha256", password).update(SESSION_PURPOSE).digest("hex");
}

export function guideAccessPassword(
  env: Record<string, string | undefined>
): string {
  return clean(env.GUIDE_ACCESS_PASSWORD);
}

export function isGuideAccessConfigured(
  env: Record<string, string | undefined>
): boolean {
  return guideAccessPassword(env).length >= MIN_PASSWORD_LENGTH;
}

export function shouldRequireGuideAccess(
  env: Record<string, string | undefined>
): boolean {
  return env.NODE_ENV === "production" || isGuideAccessConfigured(env);
}

export function verifyGuidePassword(
  suppliedPassword: string,
  env: Record<string, string | undefined>
): boolean {
  const configured = guideAccessPassword(env);
  if (configured.length < MIN_PASSWORD_LENGTH) return false;
  return safeEqual(suppliedPassword, configured);
}

export function createGuideSessionValue(
  env: Record<string, string | undefined>
): string | null {
  const configured = guideAccessPassword(env);
  if (configured.length < MIN_PASSWORD_LENGTH) return null;
  return sessionToken(configured);
}

function readCookie(request: Request, name: string): string {
  const header = request.headers.get("cookie") ?? "";
  for (const piece of header.split(";")) {
    const separator = piece.indexOf("=");
    if (separator < 0) continue;
    const key = piece.slice(0, separator).trim();
    if (key !== name) continue;
    return decodeURIComponent(piece.slice(separator + 1).trim());
  }
  return "";
}

export function isGuideRequestAuthorized(
  request: Request,
  env: Record<string, string | undefined>
): boolean {
  if (!shouldRequireGuideAccess(env)) return true;
  const expected = createGuideSessionValue(env);
  if (!expected) return false;
  const actual = readCookie(request, GUIDE_ACCESS_COOKIE);
  return Boolean(actual) && safeEqual(actual, expected);
}
