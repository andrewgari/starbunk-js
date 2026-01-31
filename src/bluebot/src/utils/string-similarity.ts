import { distance } from 'fastest-levenshtein';

/**
 * Check if two strings are similar enough using multiple fuzzy matching strategies
 *
 * Strategies used:
 * 1. Exact match (case-insensitive)
 * 2. Partial match (one string contains the other)
 * 3. Levenshtein distance with adaptive threshold
 *
 * @param str1 - First string to compare
 * @param str2 - Second string to compare
 * @param options - Optional configuration for similarity matching
 * @returns true if strings are considered similar
 *
 * @example
 * isSimilarString('John', 'john') // true - exact match
 * isSimilarString('Johnny', 'John') // true - partial match
 * isSimilarString('Jon', 'John') // true - 1 character difference
 * isSimilarString('Andrew', 'Bob') // false - too different
 */
export function isSimilarString(
  str1: string | null | undefined,
  str2: string | null | undefined,
  options: {
    /** Maximum allowed Levenshtein distance as a percentage of the longer string (0-1). Default: 0.3 (30%) */
    maxDistancePercent?: number;
    /** Minimum allowed Levenshtein distance. Default: 2 */
    minDistance?: number;
  } = {},
): boolean {
  const { maxDistancePercent = 0.3, minDistance = 2 } = options;

  // Handle null/undefined
  if (!str1 || !str2) {
    return false;
  }

  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  // Strategy 1: Exact match (case-insensitive)
  if (s1 === s2) {
    return true;
  }

  // Strategy 2: Partial match (one contains the other)
  if (s1.includes(s2) || s2.includes(s1)) {
    return true;
  }

  // Strategy 3: Levenshtein distance with adaptive threshold
  // Allow more differences for longer strings
  const maxLength = Math.max(s1.length, s2.length);
  const maxAllowedDistance = Math.max(minDistance, Math.floor(maxLength * maxDistancePercent));
  const levenshteinDistance = distance(s1, s2);

  return levenshteinDistance <= maxAllowedDistance;
}

/**
 * Check if a subject name matches any of the target names
 *
 * @param subject - The name to check
 * @param targets - Array of target names to match against
 * @param options - Optional configuration for similarity matching
 * @returns true if subject matches any target
 *
 * @example
 * matchesAnyName('Jon', ['John', 'Jonathan']) // true
 * matchesAnyName('Bob', ['John', 'Jonathan']) // false
 */
export function matchesAnyName(
  subject: string | null | undefined,
  targets: (string | null | undefined)[],
  options?: Parameters<typeof isSimilarString>[2],
): boolean {
  if (!subject) {
    return false;
  }

  return targets.some(target => isSimilarString(subject, target, options));
}
