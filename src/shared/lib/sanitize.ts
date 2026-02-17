/**
 * Input sanitization utilities for XSS prevention.
 *
 * These functions escape HTML entities and strip tags from user-controlled
 * strings. They are designed to be used as Zod `.transform()` helpers so
 * that sanitization happens automatically at validation time.
 */

const HTML_ENTITY_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
};

const HTML_ENTITY_RE = /[&<>"']/g;

/**
 * Escape HTML entities and strip any remaining HTML tags from a string.
 *
 * 1. Replaces &, <, >, ", ' with their HTML entity equivalents.
 * 2. Strips any residual HTML tags as a secondary defense (after escaping,
 *    angle brackets are already entities, but this guards against edge cases
 *    such as pre-escaped input being double-decoded downstream).
 */
export function sanitizeString(input: string): string {
  // Step 1 – escape HTML entities
  const escaped = input.replace(HTML_ENTITY_RE, (char) => HTML_ENTITY_MAP[char]);

  // Step 2 – strip any HTML tags as secondary defense
  const stripped = escaped.replace(/<[^>]*>/g, "");

  return stripped;
}

/**
 * Recursively sanitize every string value inside an object (or array).
 * Non-string primitives and non-plain-object values are returned as-is.
 */
export function sanitizeObject<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "string") {
    return sanitizeString(obj) as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item)) as unknown as T;
  }

  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = sanitizeObject(value);
    }
    return result as T;
  }

  // Numbers, booleans, etc. – pass through unchanged
  return obj;
}
