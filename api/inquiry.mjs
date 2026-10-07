import { createHash } from "node:crypto";

const RECIPIENT = "office@ranchoexetermhp.com";
const MAX_BODY_BYTES = 16_384;
const WINDOW_MS = 10 * 60_000;
const attempts = new Map();
const interests = {
  "available-home": "Space 97",
  "available-lot": "an available mobile home space",
  general: "Rancho Exeter",
};

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function configured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.INQUIRY_FROM);
}

async function readBody(req) {
  if (req.body !== undefined) {
    const raw =
      typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    if (Buffer.byteLength(raw) > MAX_BODY_BYTES) throw new Error("too-large");
    return JSON.parse(raw);
  }
  let raw = "";
  let size = 0;
  for await (const chunk of req) {
    size += Buffer.byteLength(chunk);
    if (size > MAX_BODY_BYTES) throw new Error("too-large");
    raw += chunk;
  }
  return JSON.parse(raw);
}

function allowedOrigin(req) {
  const allowed = new Set([
    "https://ranchoexetermhp.com",
    "https://www.ranchoexetermhp.com",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    ...(process.env.INQUIRY_ALLOWED_ORIGINS || "")
      .split(",")
      .map((s) => s.trim()),
  ]);
  return Boolean(req.headers.origin && allowed.has(req.headers.origin));
}

// A small, bounded per-instance limit supplements the honeypot. For a public
// launch, Vercel's edge rate limit should also protect /api/inquiry across instances.
function rateLimited(req) {
  const now = Date.now();
  for (const [key, entry] of attempts) {
    if (entry.expires <= now) attempts.delete(key);
  }
  const ip = String(
    req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown",
  )
    .split(",")[0]
    .trim();
  const key = createHash("sha256").update(ip).digest("hex");
  const entry = attempts.get(key) || { count: 0, expires: now + WINDOW_MS };
  if (entry.count >= 5 || (!attempts.has(key) && attempts.size >= 10_000))
    return true;
  entry.count += 1;
  attempts.set(key, entry);
  return false;
}

export default async function handler(req, res) {
  if (req.method === "GET") return json(res, 200, { ready: configured() });
  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return json(res, 405, { ok: false, error: "Method not allowed." });
  }
  if (!allowedOrigin(req))
    return json(res, 403, {
      ok: false,
      error: "Please send your inquiry from the Rancho Exeter website.",
    });
  if (!/^application\/json(?:;|$)/i.test(req.headers["content-type"] || "")) {
    return json(res, 415, { ok: false, error: "Invalid request format." });
  }
  let body;
  try {
    body = await readBody(req);
  } catch (error) {
    return json(res, error.message === "too-large" ? 413 : 400, {
      ok: false,
      error: "Please check your inquiry and try again.",
    });
  }
  if (!body || typeof body !== "object" || Array.isArray(body))
    return json(res, 400, { ok: false, error: "Invalid inquiry." });
  if (body.website)
    return json(res, 400, {
      ok: false,
      error: "We could not send this inquiry. Please call the office.",
    });

  const fields = {};
  for (const [key, max] of Object.entries({
    fullName: 120,
    phone: 30,
    email: 254,
    message: 2000,
    interest: 30,
    requestId: 36,
  })) {
    if (typeof body[key] !== "string" || body[key].length > max)
      return json(res, 400, {
        ok: false,
        error: "Please check your contact information.",
      });
    fields[key] = body[key].trim();
  }
  const { fullName, email, message, interest, requestId } = fields;
  const phone = fields.phone.replace(/\D/g, "");
  if (!fullName || /[\r\n\x00]/.test(fullName) || !/^(?:1)?\d{10}$/.test(phone))
    return json(res, 400, {
      ok: false,
      error: "Please enter your name and a valid phone number with area code.",
    });
  if (
    email &&
    (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || /[\r\n\x00]/.test(email))
  )
    return json(res, 400, {
      ok: false,
      error: "Please enter a valid email address, or leave it blank.",
    });
  if (
    !Object.hasOwn(interests, interest) ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      requestId,
    )
  )
    return json(res, 400, {
      ok: false,
      error: "Please reload this page and try again.",
    });
  if (!configured())
    return json(res, 503, {
      ok: false,
      error:
        "Online inquiries are temporarily unavailable. Please call (949) 463-1167 or email office@ranchoexetermhp.com.",
    });
  if (rateLimited(req)) {
    res.setHeader("Retry-After", "600");
    return json(res, 429, {
      ok: false,
      error:
        "Please wait a few minutes before sending another inquiry, or call the office.",
    });
  }

  const payload = {
    from: process.env.INQUIRY_FROM,
    to: [RECIPIENT],
    ...(email ? { reply_to: email } : {}),
    subject: `Website inquiry about ${interests[interest]}`,
    text: `New Rancho Exeter website inquiry\n\nName: ${fullName}\nPhone: +${phone.length === 10 ? "1" : ""}${phone}\nEmail: ${email || "Not provided"}\nInterested in: ${interests[interest]}\n\nMessage:\n${message || "No additional message."}\n\nThis is an inquiry, not a confirmed tour booking.`,
  };
  const fingerprint = createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex")
    .slice(0, 24);
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `inquiry-${requestId}-${fingerprint}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12_000),
    });
    const result = await response.json();
    if (!response.ok || !result.id) throw new Error("delivery-failed");
    return json(res, 200, { ok: true });
  } catch {
    // Do not log visitor details or provider credentials.
    return json(res, 502, {
      ok: false,
      error:
        "We couldn’t confirm your inquiry was sent. Please try again, or call (949) 463-1167.",
    });
  }
}
