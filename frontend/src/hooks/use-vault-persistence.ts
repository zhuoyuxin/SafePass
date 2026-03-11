import { type Dispatch, type SetStateAction, useCallback, useEffect } from "react";

import { encryptVaultData } from "../lib/crypto";
import { saveLocalEnvelope } from "../lib/indexed-db";
import type { EncryptedVaultEnvelope, VaultData } from "../types";

interface UseVaultPersistenceParams {
  vaultData: VaultData | null;
  sessionPassword: string;
  vaultSalt: string | undefined;
  setVaultSalt: Dispatch<SetStateAction<string | undefined>>;
}

interface UseVaultPersistenceResult {
  ensureEnvelope: () => Promise<EncryptedVaultEnvelope>;
}

export function useVaultPersistence(
  params: UseVaultPersistenceParams
): UseVaultPersistenceResult {
  const { vaultData, sessionPassword, vaultSalt, setVaultSalt } = params;

  useEffect(() => {
    if (!vaultData || !sessionPassword) {
      return;
    }

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const envelope = await encryptVaultData(vaultData, sessionPassword, vaultSalt);
          if (!vaultSalt) {
            setVaultSalt(envelope.kdf.salt);
          }
          await saveLocalEnvelope(envelope);
        } catch (error) {
          console.warn("Auto save encrypted envelope failed.", error);
        }
      })();
    }, 500);

    return () => window.clearTimeout(timer);
  }, [vaultData, sessionPassword, vaultSalt, setVaultSalt]);

  const ensureEnvelope = useCallback(async (): Promise<EncryptedVaultEnvelope> => {
    if (!vaultData || !sessionPassword) {
      throw new Error("当前没有可加密的 vault 数据");
    }

    const envelope = await encryptVaultData(vaultData, sessionPassword, vaultSalt);
    if (!vaultSalt) {
      setVaultSalt(envelope.kdf.salt);
    }
    return envelope;
  }, [vaultData, sessionPassword, vaultSalt, setVaultSalt]);

  return { ensureEnvelope };
}
