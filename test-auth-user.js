const assert = require("node:assert/strict");
const { existsSync, rmSync } = require("node:fs");
const { execFileSync } = require("node:child_process");
const { join } = require("node:path");
const Module = require("node:module");

process.env.NODE_PATH = join(__dirname, "node_modules");
Module._initPaths();

const outDir = "/tmp/n3-auth-user-test";
if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });

execFileSync(
  "npx",
  [
    "tsc",
    "lib/auth-user.ts",
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

const { resolveOrCreateUserForEmail } = require(join(outDir, "auth-user.js"));

async function run() {
  const updates = [];
  const supabase = {
    from(table) {
      assert.equal(table, "users");
      return {
        select() {
          return {
            eq() {
              return {
                maybeSingle: async () => ({
                  data: { id: "user-1", email: "user@example.com", walletaddress: "0xabc" },
                }),
              };
            },
          };
        },
        upsert: async (value) => {
          updates.push(value);
          return { error: null };
        },
      };
    },
  };

  const user = await resolveOrCreateUserForEmail(" user@example.com ", { supabase });
  assert.deepEqual(user, {
    id: "user-1",
    email: "user@example.com",
    walletAddress: "0xabc",
  });
  assert.deepEqual(updates, []);
  console.log("auth user tests passed");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
