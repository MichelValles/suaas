import { promises as dns } from "node:dns";
import { isIP } from "node:net";

/**
 * Anti-SSRF: valida que una URL es segura para hacer fetch server-side
 * con el host del usuario. Acepta sólo http/https públicos y rechaza
 * loopback, RFC1918, link-local, metadata cloud (169.254.169.254),
 * multicast y direcciones IPv6 equivalentes. Resuelve DNS y revalida
 * todas las IPs devueltas para impedir hostnames que apunten a redes
 * privadas o ataques de DNS rebinding triviales.
 *
 * Lanza `Error` con un mensaje genérico si la URL no es segura.
 */
export async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("URL inválida.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Sólo se aceptan URLs http(s).");
  }
  if (url.username || url.password) {
    throw new Error("URLs con credenciales en línea no permitidas.");
  }

  const host = url.hostname;
  if (!host) throw new Error("URL sin host.");

  // 1) Rechazar hostnames especiales antes de DNS.
  const lowered = host.toLowerCase();
  if (
    lowered === "localhost" ||
    lowered.endsWith(".localhost") ||
    lowered.endsWith(".local") ||
    lowered.endsWith(".internal")
  ) {
    throw new Error("Host no público.");
  }

  // 2) Si el host es ya una IP literal, validar directamente.
  const literalKind = isIP(host);
  if (literalKind === 4 || literalKind === 6) {
    if (!isPublicIp(host, literalKind)) {
      throw new Error("Host no público.");
    }
    return url;
  }

  // 3) Resolver DNS y rechazar si CUALQUIER IP devuelta es privada.
  let records: { address: string; family: number }[] = [];
  try {
    records = await dns.lookup(host, { all: true });
  } catch {
    throw new Error("No se pudo resolver el host.");
  }
  if (records.length === 0) {
    throw new Error("No se pudo resolver el host.");
  }
  for (const r of records) {
    if (!isPublicIp(r.address, r.family)) {
      throw new Error("Host no público.");
    }
  }

  return url;
}

function isPublicIp(ip: string, family: number): boolean {
  if (family === 4) return isPublicIPv4(ip);
  if (family === 6) return isPublicIPv6(ip);
  return false;
}

function isPublicIPv4(ip: string): boolean {
  const parts = ip.split(".").map((s) => parseInt(s, 10));
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) {
    return false;
  }
  const [a, b] = parts;
  if (a === 0) return false;                       // 0.0.0.0/8
  if (a === 10) return false;                      // 10.0.0.0/8
  if (a === 127) return false;                     // loopback
  if (a === 169 && b === 254) return false;        // link-local / cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return false; // 172.16.0.0/12
  if (a === 192 && b === 168) return false;        // 192.168.0.0/16
  if (a === 192 && b === 0 && parts[2] === 2) return false; // TEST-NET-1
  if (a === 198 && (b === 18 || b === 19)) return false;    // benchmark
  if (a === 198 && b === 51 && parts[2] === 100) return false; // TEST-NET-2
  if (a === 203 && b === 0 && parts[2] === 113) return false;  // TEST-NET-3
  if (a >= 224) return false;                      // multicast + reserved
  if (a === 100 && b >= 64 && b <= 127) return false; // CGNAT 100.64.0.0/10
  return true;
}

function isPublicIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::" || lower === "::1") return false;
  // IPv4-mapped en IPv6: ::ffff:a.b.c.d → revalidar IPv4.
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPublicIPv4(mapped[1]);
  if (lower.startsWith("fe80:")) return false;     // link-local
  if (lower.startsWith("fc") || lower.startsWith("fd")) return false; // unique-local fc00::/7
  if (lower.startsWith("ff")) return false;        // multicast ff00::/8
  if (lower.startsWith("2001:db8")) return false;  // doc / reserved
  return true;
}
