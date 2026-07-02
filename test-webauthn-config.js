const assert = require("node:assert/strict");
const { existsSync, rmSync } = require("node:fs");
const { execFileSync } = require("node:child_process");
const { join } = require("node:path");

const outDir = "/tmp/n3-webauthn-config-test";
if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });

process.env.NEXT_PUBLIC_APP_URL = "https://example.com";
process.env.WEBAUTHN_RP_ID = "example.com";

execFileSync(
  "npx",
  [
    "tsc",
    "lib/webauthn.ts",
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

const { getWebAuthnRpConfig, registrationUserIdForEmail } = require(join(outDir, "webauthn.js"));

assert.deepEqual(getWebAuthnRpConfig(), {
  rpName: "なんじょうNFTポータル",
  rpID: "example.com",
  origin: "https://example.com",
});
assert.equal(registrationUserIdForEmail("USER@example.com"), "user@example.com");

console.log("webauthn config tests passed");
