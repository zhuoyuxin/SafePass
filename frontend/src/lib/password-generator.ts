const LOWER = "abcdefghjkmnpqrstuvwxyz";
const UPPER = "ABCDEFGHJKMNPQRSTUVWXYZ";
const NUMBERS = "23456789";
const SYMBOLS = "!@#$%^&*()-_=+[]{}<>?";

export interface GeneratorOptions {
  length: number;
  includeLower: boolean;
  includeUpper: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
}

const randomInt = (max: number): number => {
  if (!Number.isInteger(max) || max <= 0) {
    throw new Error("max must be a positive integer");
  }

  // 使用拒绝采样消除取模偏差，保证每个索引命中概率一致。
  const limit = Math.floor(0x100000000 / max) * max;
  const array = new Uint32Array(1);
  let value = 0;
  do {
    crypto.getRandomValues(array);
    value = array[0];
  } while (value >= limit);

  return value % max;
};

const pick = (chars: string): string => chars[randomInt(chars.length)];

export const generatePassword = (options?: Partial<GeneratorOptions>): string => {
  const normalized: GeneratorOptions = {
    length: options?.length ?? 20,
    includeLower: options?.includeLower ?? true,
    includeUpper: options?.includeUpper ?? true,
    includeNumbers: options?.includeNumbers ?? true,
    includeSymbols: options?.includeSymbols ?? true
  };

  const pools: string[] = [];
  if (normalized.includeLower) pools.push(LOWER);
  if (normalized.includeUpper) pools.push(UPPER);
  if (normalized.includeNumbers) pools.push(NUMBERS);
  if (normalized.includeSymbols) pools.push(SYMBOLS);

  if (pools.length === 0) {
    throw new Error("至少需要启用一种字符集");
  }
  if (normalized.length < pools.length) {
    throw new Error("长度过短，无法覆盖所有启用字符集");
  }

  // 先保证每个启用字符集至少出现一次，再做乱序，避免弱口令分布。
  const result = pools.map((pool) => pick(pool));
  const all = pools.join("");
  while (result.length < normalized.length) {
    result.push(pick(all));
  }

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result.join("");
};
