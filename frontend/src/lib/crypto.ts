import { argon2id } from "hash-wasm";

import type { EncryptedVaultEnvelope, VaultData } from "../types";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const DEFAULT_KDF_PARAMS = {
  memorySize: 19 * 1024,
  iterations: 2,
  parallelism: 1,
  hashLength: 32
};

const bytesToBase64 = (value: Uint8Array): string => {
  let binary = "";
  for (const byte of value) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
};

const base64ToBytes = (value: string): Uint8Array => {
  const binary = atob(value);
  const result = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    result[i] = binary.charCodeAt(i);
  }
  return result;
};

const asArrayBuffer = (value: Uint8Array): ArrayBuffer => {
  const exact = new Uint8Array(value.byteLength);
  exact.set(value);
  return exact.buffer;
};

const randomBase64 = (size: number): string => {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return bytesToBase64(bytes);
};

const sha256Base64 = async (value: Uint8Array): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", asArrayBuffer(value));
  return bytesToBase64(new Uint8Array(digest));
};

const deriveVaultKey = async (
  password: string,
  salt: string,
  params = DEFAULT_KDF_PARAMS
): Promise<CryptoKey> => {
  const keyBytes = await argon2id({
    password,
    salt: base64ToBytes(salt),
    memorySize: params.memorySize,
    iterations: params.iterations,
    parallelism: params.parallelism,
    hashLength: params.hashLength,
    outputType: "binary"
  });

  return crypto.subtle.importKey("raw", asArrayBuffer(keyBytes), "AES-GCM", false, [
    "encrypt",
    "decrypt"
  ]);
};

export const encryptVaultData = async (
  data: VaultData,
  password: string,
  existingSalt?: string
): Promise<EncryptedVaultEnvelope> => {
  const plaintext = encoder.encode(JSON.stringify(data));
  const contentHash = await sha256Base64(plaintext);
  const salt = existingSalt ?? randomBase64(16);
  const iv = randomBase64(12);
  const aad = btoa("password-vault-v1");
  const key = await deriveVaultKey(password, salt, DEFAULT_KDF_PARAMS);

  // 这里把 AAD 固定写入头部，确保篡改 envelope 元数据会导致解密失败。
  const cipherBuffer = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: asArrayBuffer(base64ToBytes(iv)),
      additionalData: asArrayBuffer(base64ToBytes(aad))
    },
    key,
    plaintext
  );

  return {
    version: 1,
    contentHash,
    kdf: {
      name: "argon2id",
      salt,
      params: DEFAULT_KDF_PARAMS
    },
    cipher: {
      name: "aes-256-gcm",
      iv,
      aad
    },
    ciphertext: bytesToBase64(new Uint8Array(cipherBuffer))
  };
};

export const decryptVaultData = async (
  envelope: EncryptedVaultEnvelope,
  password: string
): Promise<VaultData> => {
  const key = await deriveVaultKey(
    password,
    envelope.kdf.salt,
    envelope.kdf.params
  );
  const plaintextBuffer = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: asArrayBuffer(base64ToBytes(envelope.cipher.iv)),
      additionalData: asArrayBuffer(base64ToBytes(envelope.cipher.aad))
    },
    key,
    asArrayBuffer(base64ToBytes(envelope.ciphertext))
  );

  const plaintextBytes = new Uint8Array(plaintextBuffer);
  const calculatedHash = await sha256Base64(plaintextBytes);
  if (calculatedHash !== envelope.contentHash) {
    throw new Error("密文完整性校验失败");
  }

  return JSON.parse(decoder.decode(plaintextBytes)) as VaultData;
};
