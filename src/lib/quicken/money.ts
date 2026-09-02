export function parseAmount(raw: string | undefined | null): number | null {
  if (raw == null) return null;
  let text = String(raw).trim();
  if (!text || text === "-" || text === "—") return null;

  const negative =
    /^\(.*\)$/.test(text) ||
    text.startsWith("-") ||
    /^(dr|debit)\b/i.test(text);
  const credit = /^(cr|credit)\b/i.test(text);
  text = text
    .replace(/^\((.*)\)$/, "$1")
    .replace(/^(dr|cr|debit|credit)\s*/i, "")
    .replace(/[$£€]/g, "")
    .replace(/,/g, "")
    .replace(/\s/g, "");
  if (!text) return null;
  const value = Number(text);
  if (!Number.isFinite(value)) return null;
  if (credit) return Math.abs(value);
  if (negative) return -Math.abs(value);
  return value;
}

export function parseDate(raw: string | undefined | null): string | null {
  if (raw == null) return null;
  const text = String(raw).trim();
  if (!text) return null;

  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return toIso(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const us = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (us) {
    const month = Number(us[1]);
    const day = Number(us[2]);
    let year = Number(us[3]);
    if (year < 100) year += year >= 70 ? 1900 : 2000;
    if (month > 12 && day <= 12) return toIso(year, day, month);
    return toIso(year, month, day);
  }

  const apostrophe = text.match(
    /^(\d{1,2})[/-](\d{1,2})\s*['\u2019]\s*(\d{2,4})$/
  );
  if (apostrophe) {
    const month = Number(apostrophe[1]);
    const day = Number(apostrophe[2]);
    let year = Number(apostrophe[3]);
    if (year < 100) year += year >= 70 ? 1900 : 2000;
    return toIso(year, month, day);
  }

  const dotted = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (dotted) {
    const first = Number(dotted[1]);
    const second = Number(dotted[2]);
    let year = Number(dotted[3]);
    if (year < 100) year += year >= 70 ? 1900 : 2000;
    if (first > 12) return toIso(year, second, first);
    return toIso(year, first, second);
  }

  return null;
}

export function looksLikeDate(raw: string): boolean {
  return parseDate(raw) !== null;
}

function toIso(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1970) {
    return null;
  }
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

export function monthsBetween(startIso: string, endIso: string): number {
  const start = startIso.split("-").map(Number);
  const end = endIso.split("-").map(Number);
  const startMonths = (start[0] ?? 0) * 12 + (start[1] ?? 1);
  const endMonths = (end[0] ?? 0) * 12 + (end[1] ?? 1);
  return Math.max(1, endMonths - startMonths + 1);
}

export function addMonthsIso(iso: string, delta: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, (month ?? 1) - 1 + delta, day ?? 1);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mm}-${dd}`;
}
