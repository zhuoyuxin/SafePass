import { argon2id } from "hash-wasm";

import { base64ToBytes, bytesToBase64 } from "./crypto.util";

export interface Argon2Params {
  memorySize: number;
  iterations: number;
  parallelism: number;
  hashLength: number;
}

export const AUTH_ARGON2_PARAMS: Argon2Params = {
  // 19 MB 左右内存开销，兼顾浏览器/服务端和安全性。
  memorySize: 19 * 1024,
  iterations: 2,
  parallelism: 1,
  hashLength: 32
};

export const deriveArgon2idBase64 = async (
  password: string,
  saltBase64: string,
  params: Argon2Params = AUTH_ARGON2_PARAMS
): Promise<string> => {
  const hash = await argon2id({
    password,
    salt: base64ToBytes(saltBase64),
    parallelism: params.parallelism,
    iterations: params.iterations,
    memorySize: params.memorySize,
    hashLength: params.hashLength,
    outputType: "binary"
  });

  return bytesToBase64(hash);
};

