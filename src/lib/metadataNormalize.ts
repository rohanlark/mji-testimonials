import {
  METADATA_FIELD_TO_TOGGLE,
  type MetadataFieldKey,
  type MetadataToggles,
  type Testimonial,
} from '../types/testimonial';

/**
 * Removes balanced (...) segments (nested supported). Stray `)` when depth is 0 is dropped.
 */
function stripBalancedParentheses(input: string): string {
  let depth = 0;
  let out = '';
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (c === '(') {
      depth++;
    } else if (c === ')') {
      if (depth > 0) depth--;
    } else if (depth === 0) {
      out += c;
    }
  }
  return out;
}

/**
 * Occupation strings in source data often append long qualifiers in parentheses, e.g.
 * `Hospitality (waiter/food server/...)`. Full text stays in storage; this is for review UI/export.
 * Comma-separated roles are split, empty segments (from removed parens) are dropped, then rejoined.
 */
export function formatOccupationForDisplay(raw: string): string {
  const stripped = stripBalancedParentheses(raw);
  const collapsed = stripped.replace(/\s+/g, ' ').trim();
  if (!collapsed) return '';
  const parts = collapsed.split(',').map((p) => p.trim()).filter(Boolean);
  return parts.join(', ');
}

/**
 * Metadata fields that are toggled on and non-empty (after trim), in sidebar order.
 * Used for rendering and export so bullets appear only between real values.
 */
export function getDisplayedMetadataEntries(
  testimonial: Testimonial,
  toggles: MetadataToggles,
  order: MetadataFieldKey[]
): { key: MetadataFieldKey; value: string }[] {
  const out: { key: MetadataFieldKey; value: string }[] = [];
  for (const key of order) {
    if (!toggles[METADATA_FIELD_TO_TOGGLE[key]]) continue;
    let value = String(testimonial[key] ?? '').trim();
    if (key === 'occupation') {
      value = formatOccupationForDisplay(value);
    }
    if (value === '') continue;
    out.push({ key, value });
  }
  return out;
}

/**
 * Canonical stored form for age: digits only. Source data often includes phrases like
 * "22 years old"; we strip a case-insensitive optional "years old" suffix after the
 * leading integer and trim whitespace.
 */
export function normalizeAgeValue(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const m = trimmed.match(/^(\d+)\s*(?:years?\s*old)?$/i);
  if (m) return m[1];
  return trimmed;
}
