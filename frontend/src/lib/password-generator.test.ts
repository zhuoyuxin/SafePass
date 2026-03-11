import { describe, expect, it } from "vitest";

import { generatePassword } from "./password-generator";

describe("generatePassword", () => {
  it("should generate target length", () => {
    const value = generatePassword({ length: 24 });
    expect(value).toHaveLength(24);
  });

  it("should only contain numbers when number pool enabled", () => {
    const value = generatePassword({
      length: 18,
      includeLower: false,
      includeUpper: false,
      includeNumbers: true,
      includeSymbols: false
    });
    expect(/^[0-9]+$/.test(value)).toBe(true);
  });

  it("should include all required pools when all are enabled", () => {
    const value = generatePassword({
      length: 20,
      includeLower: true,
      includeUpper: true,
      includeNumbers: true,
      includeSymbols: true
    });
    expect(/[a-z]/.test(value)).toBe(true);
    expect(/[A-Z]/.test(value)).toBe(true);
    expect(/[0-9]/.test(value)).toBe(true);
    expect(/[!@#$%^&*()\[\]{}<>?_\-=+]/.test(value)).toBe(true);
  });
});

