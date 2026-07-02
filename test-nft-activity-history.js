const assert = require("node:assert/strict");
const { existsSync, rmSync } = require("node:fs");
const { execFileSync } = require("node:child_process");
const { join } = require("node:path");

const outDir = "/tmp/n3-nft-activity-history-test";
if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });

execFileSync(
  "npx",
  [
    "tsc",
    "lib/nft-activity-history.ts",
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

const { buildNftActivityHistory } = require(join(outDir, "nft-activity-history.js"));

const activities = buildNftActivityHistory({
  limit: 3,
  mints: [
    {
      id: 1,
      product_name: "VIP Ticket",
      status: "success",
      created_at: "2026-01-01T10:00:00.000Z",
      transaction_hash: "0xmint",
      shopify_order_id: "order-1",
    },
    {
      id: 2,
      product_name: "Gift Ticket",
      status: "success",
      created_at: "2026-01-03T10:00:00.000Z",
      transaction_hash: "0xreceived",
      shopify_order_id: "transfer-claim-abc",
    },
  ],
  usages: [
    {
      id: "usage-1",
      token_id: "7",
      status: "used",
      used_at: "2026-01-04T10:00:00.000Z",
      transaction_hash: "0xuse",
    },
  ],
  transfers: [
    {
      id: "transfer-1",
      tokenid: "7",
      status: "ACTIVE",
      created_at: "2026-01-02T10:00:00.000Z",
      transaction_hash: null,
    },
  ],
});

assert.deepEqual(
  activities.map((activity) => activity.type),
  ["use", "received", "transfer"]
);
assert.equal(activities.length, 3);
assert.equal(activities[0].title, "チケットを使用しました");
assert.equal(activities[1].title, "チケットを受け取りました");
assert.equal(activities[2].status, "pending");
assert.equal(activities[2].description, "Token ID: 7");

console.log("nft activity history tests passed");
