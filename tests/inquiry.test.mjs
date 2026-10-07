import test, { after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import handler from "../api/inquiry.mjs";

const originalFetch = globalThis.fetch;
const originalKey = process.env.RESEND_API_KEY;
const originalFrom = process.env.INQUIRY_FROM;
after(() => {
  globalThis.fetch = originalFetch;
  for (const [key, value] of [
    ["RESEND_API_KEY", originalKey],
    ["INQUIRY_FROM", originalFrom],
  ]) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});
let sends = [];
let address = 0;
function configured() {
  process.env.RESEND_API_KEY = "test-only";
  process.env.INQUIRY_FROM = "Website <website@example.com>";
  sends = [];
  globalThis.fetch = async (url, options) => {
    sends.push({ url, options, payload: JSON.parse(options.body) });
    return { ok: true, json: async () => ({ id: "test-message" }) };
  };
}
const valid = () => ({
  fullName: "Test Visitor",
  phone: "(559) 555-0123",
  email: "visitor@example.com",
  message: "Interested in a space.",
  interest: "available-lot",
  website: "",
  requestId: randomUUID(),
});
async function invoke({
  method = "POST",
  body = valid(),
  headers = {},
  ip,
  stream = false,
} = {}) {
  const req = stream ? Readable.from([body]) : { body };
  req.method = method;
  req.headers = {
    origin: "http://localhost:3000",
    "content-type": "application/json",
    ...headers,
  };
  req.socket = { remoteAddress: ip || `test-${++address}` };
  const response = {
    headers: {},
    setHeader(k, v) {
      this.headers[k] = v;
    },
    end(raw) {
      this.body = JSON.parse(raw);
    },
  };
  await handler(req, response);
  return response;
}

test("readiness and missing credentials never claim an inquiry was sent", async () => {
  configured();
  delete process.env.RESEND_API_KEY;
  assert.equal((await invoke({ method: "GET" })).body.ready, false);
  assert.equal((await invoke()).statusCode, 503);
  assert.equal(sends.length, 0);
});
test("fixed recipient, normalized phone, reply-to, and plain text reach the provider", async () => {
  configured();
  const body = {
    ...valid(),
    to: "attacker@example.com",
    message: "<script>plain text</script>",
  };
  const result = await invoke({ body });
  assert.equal(result.statusCode, 200);
  assert.deepEqual(result.body, { ok: true });
  assert.equal(sends[0].url, "https://api.resend.com/emails");
  assert.deepEqual(sends[0].payload.to, ["office@ranchoexetermhp.com"]);
  assert.equal(sends[0].payload.reply_to, "visitor@example.com");
  assert.match(sends[0].payload.text, /\+15595550123/);
  assert.match(sends[0].payload.text, /<script>plain text<\/script>/);
  assert.equal(sends[0].payload.html, undefined);
});
test("email is optional; visitor data cannot set arbitrary mail headers", async () => {
  configured();
  await invoke({ body: { ...valid(), email: "" } });
  assert.equal(sends[0].payload.reply_to, undefined);
  assert.equal(
    (
      await invoke({
        body: { ...valid(), fullName: "Test\r\nBcc: attacker@example.com" },
      })
    ).statusCode,
    400,
  );
});
test("invalid inputs, honeypot, origin, and method are rejected before sending", async () => {
  configured();
  for (const patch of [
    { fullName: "  " },
    { phone: "123" },
    { phone: "123456789012" },
    { email: "invalid" },
    { interest: "unknown" },
    { message: "x".repeat(2001) },
    { website: "spam.example" },
    { requestId: "invalid" },
  ]) {
    assert.equal(
      (await invoke({ body: { ...valid(), ...patch } })).statusCode,
      400,
    );
  }
  assert.equal((await invoke({ method: "DELETE" })).statusCode, 405);
  assert.equal(
    (await invoke({ headers: { origin: "https://unrelated.example" } }))
      .statusCode,
    403,
  );
  assert.equal((await invoke({ headers: { origin: "" } })).statusCode, 403);
  assert.equal(
    (await invoke({ headers: { "content-type": "text/plain" } })).statusCode,
    415,
  );
  assert.equal((await invoke({ body: "[" })).statusCode, 400);
  assert.equal(
    (await invoke({ body: { ...valid(), message: "x".repeat(17_000) } }))
      .statusCode,
    413,
  );
  assert.equal(sends.length, 0);
});
test("local streamed JSON is parsed like the Vercel request body", async () => {
  configured();
  assert.equal(
    (await invoke({ body: JSON.stringify(valid()), stream: true })).statusCode,
    200,
  );
});
test("retrying the same request reuses the provider idempotency key", async () => {
  configured();
  const body = valid();
  await invoke({ body });
  await invoke({ body });
  assert.equal(
    sends[0].options.headers["Idempotency-Key"],
    sends[1].options.headers["Idempotency-Key"],
  );
});
test("provider failures and connection errors never return success", async () => {
  configured();
  globalThis.fetch = async () => ({
    ok: false,
    json: async () => ({ message: "provider error" }),
  });
  assert.equal((await invoke()).statusCode, 502);
  globalThis.fetch = async () => {
    throw new Error("network");
  };
  assert.equal((await invoke()).body.ok, false);
});
test("repeated submissions are limited before contacting the provider", async () => {
  configured();
  for (let i = 0; i < 5; i++)
    assert.equal((await invoke({ ip: "rate-limit-test" })).statusCode, 200);
  const blocked = await invoke({ ip: "rate-limit-test" });
  assert.equal(blocked.statusCode, 429);
  assert.equal(blocked.headers["Retry-After"], "600");
  assert.equal(sends.length, 5);
});
