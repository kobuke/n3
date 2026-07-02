const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");

const ja = JSON.parse(readFileSync("messages/ja.json", "utf8"));
const en = JSON.parse(readFileSync("messages/en.json", "utf8"));

const requiredAuthErrorKeys = [
  "passkey_login_session_expired",
  "passkey_unknown",
  "passkey_verification_failed",
  "passkey_registration_failed",
  "passkey_save_failed",
  "passkey_not_registered",
  "otp_session_expired",
  "otp_expired",
  "otp_invalid",
];

for (const key of requiredAuthErrorKeys) {
  assert.equal(typeof ja.LoginPage.auth_errors[key], "string", `ja missing auth error: ${key}`);
  assert.equal(typeof en.LoginPage.auth_errors[key], "string", `en missing auth error: ${key}`);
}

const jaText = JSON.stringify(ja.LoginPage) + JSON.stringify(ja.MyPage);
assert.equal(jaText.includes("生体認証"), false, "Japanese auth copy should use パスキー instead of 生体認証");

assert.equal(ja.LoginPage.login_card.submit_email, "続ける");
assert.equal(en.LoginPage.login_card.submit_email, "Continue");

console.log("auth copy tests passed");
