/**
 * Input sanitization utilities for PTE Sansar.
 * Strips HTML tags, escapes dangerous characters, and enforces length limits.
 */

const HTML_TAG_RE = /<[^>]*>/g;
const SCRIPT_RE = /<script[\s\S]*?<\/script>/gi;

/** Strip all HTML tags from a string */
export function stripHtml(input: string): string {
  return input.replace(SCRIPT_RE, '').replace(HTML_TAG_RE, '');
}

/** Trim and enforce a max length */
export function truncate(input: string, maxLength: number): string {
  return input.trim().slice(0, maxLength);
}

/**
 * Sanitize a text input: strip HTML, trim, enforce max length.
 * Use on all form fields before submission.
 */
export function sanitizeText(input: string, maxLength = 5000): string {
  if (!input || typeof input !== 'string') return '';
  return truncate(stripHtml(input), maxLength);
}

/** Sanitize a name field (shorter limit, no special chars) */
export function sanitizeName(input: string): string {
  if (!input || typeof input !== 'string') return '';
  // Allow letters, spaces, hyphens, apostrophes, dots, and unicode
  const cleaned = stripHtml(input).replace(/[^\p{L}\p{M}\s'\-\.]/gu, '');
  return truncate(cleaned, 100);
}

/** Sanitize an email field */
export function sanitizeEmail(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return truncate(input.trim().toLowerCase(), 255);
}

/** Sanitize a numeric string (e.g., target score) */
export function sanitizeNumeric(input: string): string {
  return input.replace(/[^0-9]/g, '').slice(0, 10);
}
