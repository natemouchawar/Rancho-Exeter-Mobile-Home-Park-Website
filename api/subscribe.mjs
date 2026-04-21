// Vercel serverless function: POST /api/subscribe
// Adds a resident to the MailerLite audience and assigns them to the configured group.
// The MailerLite /api/subscribers endpoint upserts by email — duplicate signups are
// treated as updates rather than errors.

const MAILERLITE_ENDPOINT = 'https://connect.mailerlite.com/api/subscribers';

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return null; }
  }
  return await new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch { resolve(null); }
    });
    req.on('error', () => resolve(null));
  });
}

function isValidEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// Accept any US-style input ("555-123-4567", "(555) 123-4567", "5551234567",
// "+1 555 123 4567") and return a normalized "+1XXXXXXXXXX" string.
// Returns null when the input can't be parsed as a 10-digit US number.
function normalizeUsPhone(value) {
  const digits = String(value).replace(/\D+/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { ok: false, error: 'Method not allowed.' });
  }

  const apiKey  = process.env.MAILERLITE_API_KEY;
  const groupId = process.env.MAILERLITE_GROUP_ID;
  if (!apiKey || !groupId) {
    return sendJson(res, 500, { ok: false, error: 'Subscription service is not configured.' });
  }

  const body = await readJsonBody(req);
  if (!body || typeof body !== 'object') {
    return sendJson(res, 400, { ok: false, error: 'Invalid request body.' });
  }

  const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
  const lastName  = typeof body.lastName  === 'string' ? body.lastName.trim()  : '';
  const lotNumber = typeof body.lotNumber === 'string' ? body.lotNumber.trim() : '';
  const email     = typeof body.email     === 'string' ? body.email.trim()     : '';
  const phoneRaw  = typeof body.phone     === 'string' ? body.phone.trim()     : '';

  if (!firstName || !lastName || !lotNumber || !email) {
    return sendJson(res, 400, { ok: false, error: 'All fields are required.' });
  }
  if (!isValidEmail(email)) {
    return sendJson(res, 400, { ok: false, error: 'Please enter a valid email address.' });
  }

  // Phone is optional. If the user typed anything, it must parse as a US number.
  let phoneNormalized = null;
  if (phoneRaw) {
    phoneNormalized = normalizeUsPhone(phoneRaw);
    if (!phoneNormalized) {
      return sendJson(res, 400, { ok: false, error: 'Please enter a valid US phone number, or leave it blank.' });
    }
  }

  const fields = { name: firstName, last_name: lastName };
  if (phoneNormalized) fields.phone = phoneNormalized;
  fields.lot_number = lotNumber;

  const payload = {
    email,
    fields,
    groups: [String(groupId)],
  };

  let mlRes;
  try {
    mlRes = await fetch(MAILERLITE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
        'Accept':        'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    return sendJson(res, 502, { ok: false, error: 'Could not reach the mailing service. Please try again shortly.' });
  }

  let mlBody = null;
  try { mlBody = await mlRes.json(); } catch { /* body may be empty */ }

  // MailerLite returns 200/201 on success. The /subscribers endpoint upserts by email,
  // so a repeat signup with the same address updates the existing subscriber and still
  // returns a success status — duplicates are handled implicitly.
  if (mlRes.ok) {
    return sendJson(res, 200, { ok: true });
  }

  // Surface validation problems (422) with a friendly message; log everything else.
  if (mlRes.status === 422 && mlBody && mlBody.errors) {
    return sendJson(res, 400, { ok: false, error: 'Please double-check your information and try again.' });
  }

  console.error('MailerLite error', { status: mlRes.status, body: mlBody });
  return sendJson(res, 502, { ok: false, error: 'We could not add you to the list right now. Please try again later.' });
}
