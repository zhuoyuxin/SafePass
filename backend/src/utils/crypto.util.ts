import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const bytesToBase64 = (value: Uint8Array): string =>
  Buffer.from(value).toString("base64");

export const base64ToBytes = (value: string): Uint8Array =>
  new Uint8Array(Buffer.from(value, "base64"));

export const randomBase64 = (size: number): string =>
  randomBytes(size).toString("base64");

export const randomBase64Url = (size: number): string =>
  randomBytes(size).toString("base64url");

export const sha256Base64 = (value: string): string =>
  createHash("sha256").update(value, "utf8").digest("base64");

export const safeEqualBase64 = (left: string, right: string): boolean => {
  const leftBytes = Buffer.from(left, "base64");
  const rightBytes = Buffer.from(right, "base64");
  if (leftBytes.length !== rightBytes.length) {
    return false;
  }
  return timingSafeEqual(leftBytes, rightBytes);
};

export const isoNow = (): string => new Date().toISOString();

