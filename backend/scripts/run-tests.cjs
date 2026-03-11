const assert = require("node:assert/strict");

const { deriveArgon2idBase64 } = require("../dist/utils/argon2.util.js");

const main = async () => {
  const salt = "c2FsdC1mb3ItdGVzdA==";
  const one = await deriveArgon2idBase64("Password#123", salt);
  const two = await deriveArgon2idBase64("Password#123", salt);
  assert.equal(one, two, "相同盐值下派生结果应一致");

  const left = await deriveArgon2idBase64("Password#123", "c2FsdC1BQUFBQQ==");
  const right = await deriveArgon2idBase64("Password#123", "c2FsdC1CQUFBQQ==");
  assert.notEqual(left, right, "不同盐值下派生结果应不同");

  console.log("backend tests passed");
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
