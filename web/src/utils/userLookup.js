/**
 * Shared helpers for locating tbl_Users accounts and verifying passwords.
 *
 * Handles known data-quality problems in tbl_Users:
 *  - people_id stored truncated to 12 digits (or with a trailing space / dash)
 *  - the same people_id shared by more than one row
 */
import { cleanThaiId } from './thaiId.js';
import {
  encryptLegacyPassword,
  encryptLegacyPasswordPHP,
  decryptLegacyPassword,
} from './legacyCrypto.js';

/**
 * Find all tbl_Users rows for a typed national ID.
 * 1) exact match on the cleaned 13 digits
 * 2) fallback: rows whose stored ID is the first 12 digits (truncated records)
 * Always returns an array (may contain more than one row for duplicate IDs).
 */
export const findUsersByPeopleId = async (supabase, rawId, columns = '*') => {
  const id = cleanThaiId(rawId);
  if (!id) return { data: [], error: null };

  const exact = await supabase.from('tbl_Users').select(columns).eq('people_id', id);
  if (exact.error) return { data: [], error: exact.error };
  if (exact.data && exact.data.length > 0) return { data: exact.data, error: null };

  if (id.length === 13) {
    const prefix = id.slice(0, 12);
    const fuzzy = await supabase.from('tbl_Users').select(columns).like('people_id', `${prefix}%`);
    if (fuzzy.error) return { data: [], error: fuzzy.error };
    // Accept only records whose digits are exactly the 12-digit prefix (truncated ID).
    // A different complete 13-digit ID is a different person and must not match.
    const rows = (fuzzy.data || []).filter((r) => {
      const digits = String(r.people_id || '').replace(/\D/g, '');
      return digits === prefix;
    });
    return { data: rows, error: null };
  }

  return { data: [], error: null };
};

/** All accepted ways of typing a birthday (YYYY-MM-DD in DB) as a password, digits only. */
export const birthdayPasswordForms = (birthday) => {
  const forms = new Set();
  const parts = String(birthday || '').split('-');
  if (parts.length !== 3) return forms;
  const [yyyy, mm, dd] = parts;
  const m = String(parseInt(mm, 10));
  const d = String(parseInt(dd, 10));
  const be = String(parseInt(yyyy, 10) + 543);
  [
    `${yyyy}${mm}${dd}`, // 19760201 (ค.ศ. YYYYMMDD — system default)
    `${be}${mm}${dd}`, // 25190201
    `${dd}${mm}${be}`, // 01022519
    `${dd}${mm}${yyyy}`, // 01021976
    `${d}${mm}${be}`, `${d}${m}${be}`, `${dd}${m}${be}`,
    `${d}${mm}${yyyy}`, `${d}${m}${yyyy}`, `${dd}${m}${yyyy}`,
  ].forEach((f) => forms.add(f));
  return forms;
};

/**
 * Check a typed password against a tbl_Users row.
 * Returns 'exact' | 'birthday' | null.
 *  - 'exact'    : matches the stored password (JS or PHP encryption format)
 *  - 'birthday' : the stored password is still the default birthday, and the user typed
 *                 their birthday in another format (e.g. พ.ศ., with slashes).
 * Users who changed their password must use that password — no fallbacks.
 */
export const matchUserPassword = (row, password) => {
  const pw = String(password || '').trim();
  if (!row || !row.passwd || !pw) return null;

  if (row.passwd === encryptLegacyPassword(pw) || row.passwd === encryptLegacyPasswordPHP(pw)) {
    return 'exact';
  }

  if (!row.birthday) return null;
  const forms = birthdayPasswordForms(row.birthday);
  let stored = null;
  try {
    stored = decryptLegacyPassword(row.passwd);
  } catch {
    stored = null;
  }
  const storedIsDefault = stored && forms.has(String(stored).replace(/\D/g, ''));
  if (storedIsDefault && forms.has(pw.replace(/\D/g, ''))) return 'birthday';

  return null;
};

/**
 * When several rows share an ID and the password matches more than one,
 * prefer: row whose own birthday matches the password > active (status '1') > lowest id.
 */
export const pickBestMatch = (rows, password) => {
  if (!rows || rows.length === 0) return null;
  if (rows.length === 1) return rows[0];
  const digits = String(password || '').replace(/\D/g, '');
  const score = (r) =>
    (birthdayPasswordForms(r.birthday).has(digits) ? 2 : 0) + (String(r.status) === '1' ? 1 : 0);
  return [...rows].sort((a, b) => score(b) - score(a) || a.id - b.id)[0];
};
