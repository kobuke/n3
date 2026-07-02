const assert = require("node:assert/strict");
const { existsSync, rmSync } = require("node:fs");
const { execFileSync } = require("node:child_process");
const { join } = require("node:path");

const outDir = "/tmp/n3-webauthn-request-config-test";
if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });

process.env.NEXT_PUBLIC_APP_URL = "https://example.ngrok-free.app";
delete process.env.WEBAUTHN_RP_ID;

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

const { getWebAuthnRpConfig } = require(join(outDir, "webauthn.js"));

assert.deepEqual(getWebAuthnRpConfig(), {
  rpName: "なんじょうNFTポータル",
  rpID: "example.ngrok-free.app",
  origin: "https://example.ngrok-free.app",
});

assert.deepEqual(
  getWebAuthnRpConfig(new Request("http://localhost:3000/ja/mypage")),
  {
    rpName: "なんじょうNFTポータル",
    rpID: "localhost",
    origin: "http://localhost:3000",
  }
);

assert.deepEqual(
  getWebAuthnRpConfig(new Request("http://127.0.0.1:3000/ja/mypage")),
  {
    rpName: "なんじょうNFTポータル",
    rpID: "127.0.0.1",
    origin: "http://127.0.0.1:3000",
  }
);

console.log("webauthn request config tests passed");
