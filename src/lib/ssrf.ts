import dns from "dns/promises";
import ipaddr from "ipaddr.js";

export interface SSRFValidationResult {
  isValid: boolean;
  reason?: string;
  resolvedIp?: string;
  sanitizedUrl?: string;
}

/**
 * Validates a user-supplied URL to prevent Server-Side Request Forgery (SSRF).
 * Blocks localhost, private ranges (RFC 1918), link-local / cloud metadata (169.254.169.254),
 * IPv6 loopback and unique local addresses.
 */
export async function validateUrlForSSRF(
  inputUrl: string,
  allowLocalMock = false
): Promise<SSRFValidationResult> {
  if (!inputUrl || typeof inputUrl !== "string") {
    return { isValid: false, reason: "URL is required" };
  }

  let parsed: URL;
  try {
    parsed = new URL(inputUrl.trim());
  } catch {
    return { isValid: false, reason: "Invalid URL format" };
  }

  // Only allow http and https protocols
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      isValid: false,
      reason: `Disallowed protocol: ${parsed.protocol}. Only http: and https: are permitted.`,
    };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Explicit check for cloud metadata and localhost names
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname === "metadata.google.internal" ||
    hostname === "instance-data"
  ) {
    if (allowLocalMock && hostname === "localhost") {
      return { isValid: true, sanitizedUrl: parsed.toString() };
    }
    return {
      isValid: false,
      reason: "Access to localhost or internal network names is forbidden (SSRF protection).",
    };
  }

  // Check if hostname is directly an IP address
  if (ipaddr.isValid(hostname)) {
    const isPrivate = isPrivateOrBlockedIp(hostname);
    if (isPrivate) {
      if (allowLocalMock && (hostname === "127.0.0.1" || hostname === "::1")) {
        return { isValid: true, resolvedIp: hostname, sanitizedUrl: parsed.toString() };
      }
      return {
        isValid: false,
        reason: `Target IP address ${hostname} is private or reserved (SSRF protection).`,
      };
    }
    return { isValid: true, resolvedIp: hostname, sanitizedUrl: parsed.toString() };
  }

  // Resolve hostname via DNS to prevent DNS rebinding to private IPs
  try {
    const addresses = await dns.lookup(hostname, { all: true });
    if (!addresses || addresses.length === 0) {
      return { isValid: false, reason: "Failed to resolve hostname via DNS" };
    }

    for (const entry of addresses) {
      if (isPrivateOrBlockedIp(entry.address)) {
        if (allowLocalMock && (entry.address === "127.0.0.1" || entry.address === "::1")) {
          continue;
        }
        return {
          isValid: false,
          reason: `Resolved IP address ${entry.address} for host ${hostname} is private or restricted (SSRF protection).`,
        };
      }
    }

    return {
      isValid: true,
      resolvedIp: addresses[0].address,
      sanitizedUrl: parsed.toString(),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "DNS resolution failed";
    return {
      isValid: false,
      reason: `Could not resolve hostname ${hostname}: ${message}`,
    };
  }
}

/**
 * Checks if an IP is private, loopback, link-local, carrier-grade NAT, or cloud metadata.
 */
export function isPrivateOrBlockedIp(ipString: string): boolean {
  try {
    const addr = ipaddr.parse(ipString);
    const range = addr.range();

    // Standard blocked ranges:
    // loopback, private, linkLocal, carrierGradeNat, uniqueLocal, unspecified
    const blockedRanges = [
      "loopback",
      "private",
      "linkLocal",
      "carrierGradeNat",
      "uniqueLocal",
      "unspecified",
      "broadcast",
      "multicast",
    ];

    if (blockedRanges.includes(range)) {
      return true;
    }

    // Specific check for AWS / GCP / Azure metadata endpoint: 169.254.169.254
    if (ipString === "169.254.169.254") {
      return true;
    }

    // IPv4-mapped IPv6 address check
    if (addr.kind() === "ipv6" && (addr as ipaddr.IPv6).isIPv4MappedAddress()) {
      const v4 = (addr as ipaddr.IPv6).toIPv4Address();
      return isPrivateOrBlockedIp(v4.toString());
    }

    return false;
  } catch {
    // If not a valid parseable IP, block by default
    return true;
  }
}
