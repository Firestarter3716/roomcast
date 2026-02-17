/**
 * Utility for IP address matching with CIDR range support.
 */

/**
 * Convert a dotted-decimal IPv4 address to a 32-bit number.
 * Returns null if the address is not a valid IPv4 address.
 */
function ipToNumber(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;

  let result = 0;
  for (const part of parts) {
    const num = Number(part);
    if (!Number.isInteger(num) || num < 0 || num > 255) return null;
    result = (result << 8) | num;
  }

  // Convert to unsigned 32-bit integer
  return result >>> 0;
}

/**
 * Check whether an IP address matches a CIDR range (e.g. "192.168.1.0/24").
 */
function matchesCidr(ip: string, cidr: string): boolean {
  const [network, prefixStr] = cidr.split("/");
  if (!network || !prefixStr) return false;

  const prefix = Number(prefixStr);
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) return false;

  const ipNum = ipToNumber(ip);
  const networkNum = ipToNumber(network);
  if (ipNum === null || networkNum === null) return false;

  // Create mask: e.g. prefix=24 -> 0xFFFFFF00
  // Special case: prefix 0 means match everything
  if (prefix === 0) return true;
  const mask = (~0 << (32 - prefix)) >>> 0;

  return (ipNum & mask) === (networkNum & mask);
}

/**
 * Check if an IP address matches any entry in a whitelist.
 *
 * Supports:
 * - Exact IP matches (e.g. "192.168.1.100")
 * - CIDR range matches (e.g. "192.168.1.0/24", "10.0.0.0/8")
 *
 * Returns true if the whitelist is empty (no restriction).
 */
export function isIpInWhitelist(ip: string, whitelist: string[]): boolean {
  if (whitelist.length === 0) return true;

  for (const entry of whitelist) {
    const trimmed = entry.trim();
    if (trimmed.includes("/")) {
      // CIDR range
      if (matchesCidr(ip, trimmed)) return true;
    } else {
      // Exact match
      if (ip === trimmed) return true;
    }
  }

  return false;
}
