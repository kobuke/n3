const assert = require("node:assert/strict");
const { existsSync, rmSync } = require("node:fs");
const { execFileSync } = require("node:child_process");
const { join } = require("node:path");

const outDir = "/tmp/n3-otp-token-test";
if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });

execFileSync(
  "npx",
  [
    "tsc",
    "lib/otp-token.ts",
    "lib/session-token.ts",
    "--target",
    "ES2022",
    "--module",
    "CommonJS",
    "--moduleResolution",
    "node",
    "--esModuleInterop",
    "--skipLibCheck",
    "--outDir",
    outDir,
  ],
  { stdio: "inherit" }
);

const { signOtpPayload, parseOtpPayload } = require(join(outDir, "otp-token.js"));

const secret = "test-secret-that-is-long-enough";
const payload = {
  otp: "123456",
  pendingEmail: "user@example.com",
  otpExpires: Date.now() + 600000,
};

const token = signOtpPayload(payload, secret);
assert.equal(token.startsWith("otp.v1."), true);
assert.deepEqual(parseOtpPayload(token, secret), payload);
assert.equal(parseOtpPayload(`${token.slice(0, -1)}x`, secret), null);

console.log("otp token tests passed");
