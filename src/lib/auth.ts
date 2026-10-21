import { User } from "./types";

export const USER_COOKIE_NAME = "toolshub_user_session";
const SESSION_SECRET = "toolshub_jwt_edge_secret_salt_2026_x9";

/**
 * Edge-compatible password hashing using Web Crypto API
 */
export async function hashPassword(password: string): Promise<string> {
  const salted = `${SESSION_SECRET}:${password}:salt`;
  const msgUint8 = new TextEncoder().encode(salted);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Verifies a plaintext password against a stored SHA-256 hash
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const computedHash = await hashPassword(password);
  return computedHash === storedHash;
}

/**
 * Creates a signed base64 session token
 */
export async function createSessionToken(user: {
  id: string;
  name: string;
  email: string;
  role: string;
}): Promise<string> {
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 30; // 30 days
  const payload = JSON.stringify({
    id: user.id,
    name: user.name,
    email: user.email.toLowerCase().trim(),
    role: user.role || "customer",
    exp: expiresAt
  });

  const payloadB64 = btoa(unescape(encodeURIComponent(payload)));
  // Signature
  const sigInput = `${payloadB64}:${SESSION_SECRET}`;
  const sigBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(sigInput));
  const sigHex = Array.from(new Uint8Array(sigBuffer))
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return `${payloadB64}.${sigHex}`;
}

/**
 * Validates a session token and returns the user payload
 */
export async function verifySessionToken(token?: string): Promise<{
  id: string;
  name: string;
  email: string;
  role: string;
} | null> {
  if (!token || !token.includes(".")) return null;

  try {
    const [payloadB64, sig] = token.split(".");
    const sigInput = `${payloadB64}:${SESSION_SECRET}`;
    const sigBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(sigInput));
    const expectedSig = Array.from(new Uint8Array(sigBuffer))
      .slice(0, 16)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (sig !== expectedSig) {
      return null;
    }

    const jsonStr = decodeURIComponent(escape(atob(payloadB64)));
    const data = JSON.parse(jsonStr);

    if (data.exp && Date.now() > data.exp) {
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role || "customer"
    };
  } catch (e) {
    return null;
  }
}
