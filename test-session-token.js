const assert = require("node:assert/strict");
const { existsSync, rmSync } = require("node:fs");
const { execFileSync } = require("node:child_process");
const { join } = require("node:path");

const outDir = "/tmp/n3-session-token-test";
if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });

execFileSync(
  "npx",
  [
    "tsc",
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

const { signSessionPayload, parseSessionPayload } = require(join(outDir, "session-token.js"));

const secret = "test-secret-that-is-long-enough";
const payload = {
  email: "user@example.com",
  walletAddress: "0x123",
  authenticated: true,
};

const token = signSessionPayload(payload, secret);
assert.equal(token.startsWith("v1."), true);
assert.notEqual(token, JSON.stringify(payload));
assert.deepEqual(parseSessionPayload(token, secret), payload);
assert.equal(parseSessionPayload(`${token.slice(0, -1)}x`, secret), null);
assert.deepEqual(parseSessionPayload(JSON.stringify(payload), secret), payload);

console.log("session token tests passed");
