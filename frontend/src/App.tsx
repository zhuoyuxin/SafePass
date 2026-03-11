import { useEffect, useMemo, useState } from "react";

import { LoginForm } from "./components/LoginForm";
import { SettingsPanel } from "./components/SettingsPanel";
import { SyncPanel } from "./components/SyncPanel";
import { VaultEditor } from "./components/VaultEditor";
import { VaultList } from "./components/VaultList";
import { ApiClient, ApiError } from "./lib/api";
import { decryptVaultData, encryptVaultData } from "./lib/crypto";
import { loadLocalEnvelope, saveLocalEnvelope } from "./lib/indexed-db";
import { generatePassword, type GeneratorOptions } from "./lib/password-generator";
import type {
  EncryptedVaultEnvelope,
  VaultData,
  VaultEntry,
  WebDavConfig
} from "./types";

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  "http://localhost:3000";

const defaultWebDavConfig = (): WebDavConfig => ({
  url: "",
  username: "",
  password: "",
  basePath: "/password-vault"
});

const createEntry = (): VaultEntry => {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: "",
    url: "",
    username: "",
    password: "",
    note: "",
    tags: [],
    customFields: [],
    createdAt: now,
    updatedAt: now
  };
};

const emptyVault = (): VaultData => ({
  version: 1,
  entries: [],
  webdavConfig: defaultWebDavConfig(),
  updatedAt: new Date().toISOString()
});

const defaultPasswordOptions = (): GeneratorOptions => ({
  length: 20,
  includeLower: true,
  includeUpper: true,
  includeNumbers: true,
  includeSymbols: true
});

function App() {
  const api = useMemo(() => new ApiClient(API_BASE_URL), []);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [username, setUsername] = useState("");
  const [sessionPassword, setSessionPassword] = useState("");
  const [vaultData, setVaultData] = useState<VaultData | null>(null);
  const [vaultRevision, setVaultRevision] = useState(0);
  const [vaultSalt, setVaultSalt] = useState<string | undefined>(undefined);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedTag, setSelectedTag] = useState("all");
  const [sortOrder, setSortOrder] = useState<"updated-desc" | "updated-asc">(
    "updated-desc"
  );
  const [passwordOptions, setPasswordOptions] = useState<GeneratorOptions>(
    defaultPasswordOptions()
  );
  const [entryPage, setEntryPage] = useState(1);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!vaultData || !sessionPassword) {
      return;
    }

    const timer = window.setTimeout(() => {
      void (async () => {
        const envelope = await encryptVaultData(
          vaultData,
          sessionPassword,
          vaultSalt
        );
        if (!vaultSalt) {
          setVaultSalt(envelope.kdf.salt);
        }
        await saveLocalEnvelope(envelope);
      })();
    }, 500);

    return () => window.clearTimeout(timer);
  }, [vaultData, sessionPassword, vaultSalt]);

  const currentEntry =
    vaultData?.entries.find((entry) => entry.id === selectedEntryId) ?? null;

  const availableTags = useMemo(() => {
    if (!vaultData) {
      return [];
    }

    const tagSet = new Set<string>();
    for (const entry of vaultData.entries) {
      for (const tag of entry.tags) {
        if (tag.trim()) {
          tagSet.add(tag.trim());
        }
      }
    }
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b, "zh-CN"));
  }, [vaultData]);

  useEffect(() => {
    if (selectedTag !== "all" && !availableTags.includes(selectedTag)) {
      setSelectedTag("all");
      setEntryPage(1);
    }
  }, [availableTags, selectedTag]);

  const filteredEntries = useMemo(() => {
    if (!vaultData) {
      return [];
    }

    const keyword = searchKeyword.trim().toLowerCase();
    const tag = selectedTag;

    const filtered = vaultData.entries.filter((entry) => {
      const tagMatched = tag === "all" || entry.tags.includes(tag);
      if (!tagMatched) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      const haystack = [
        entry.title,
        entry.url,
        entry.username,
        entry.note,
        entry.tags.join(" ")
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(keyword);
    });

    return filtered.sort((left, right) => {
      const l = new Date(left.updatedAt).getTime();
      const r = new Date(right.updatedAt).getTime();
      const diff = (Number.isFinite(l) ? l : 0) - (Number.isFinite(r) ? r : 0);
      return sortOrder === "updated-desc" ? -diff : diff;
    });
  }, [vaultData, searchKeyword, selectedTag, sortOrder]);

  const pageSize = 12;
  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / pageSize));

  useEffect(() => {
    if (entryPage > totalPages) {
      setEntryPage(totalPages);
    }
  }, [entryPage, totalPages]);

  const pagedEntries = useMemo(() => {
    const start = (entryPage - 1) * pageSize;
    return filteredEntries.slice(start, start + pageSize);
  }, [filteredEntries, entryPage]);

  const setErrorMessage = (value: string): void => {
    setNotice("");
    setError(value);
  };

  const setNoticeMessage = (value: string): void => {
    setError("");
    setNotice(value);
  };

  const ensureEnvelope = async (): Promise<EncryptedVaultEnvelope> => {
    if (!vaultData || !sessionPassword) {
      throw new Error("当前没有可加密的 vault 数据");
    }
    const envelope = await encryptVaultData(vaultData, sessionPassword, vaultSalt);
    if (!vaultSalt) {
      setVaultSalt(envelope.kdf.salt);
    }
    return envelope;
  };

  const loadVaultAfterLogin = async (password: string): Promise<void> => {
    const remote = await api.getVault();
    if (remote.hasVault && remote.envelope) {
      try {
        const decrypted = await decryptVaultData(remote.envelope, password);
        setVaultData({
          ...decrypted,
          webdavConfig: decrypted.webdavConfig ?? defaultWebDavConfig()
        });
        setVaultSalt(remote.envelope.kdf.salt);
        setVaultRevision(remote.revision);
        setSelectedEntryId(decrypted.entries[0]?.id ?? null);
        await saveLocalEnvelope(remote.envelope);
        return;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn("Remote vault decryption failed, trying local cache.", error);
        // 改密后若服务端密文未更新，优先回退本地缓存，避免直接锁死访问。
        const localFallback = await loadLocalEnvelope();
        if (localFallback) {
          const localDecrypted = await decryptVaultData(localFallback, password);
          setVaultData({
            ...localDecrypted,
            webdavConfig: localDecrypted.webdavConfig ?? defaultWebDavConfig()
          });
          setVaultSalt(localFallback.kdf.salt);
          setVaultRevision(remote.revision);
          setSelectedEntryId(localDecrypted.entries[0]?.id ?? null);
          setNoticeMessage("远端密文暂不可解，已使用本地加密缓存加载。");
          return;
        }

        throw new Error("远端密码库解密失败，且本地无可用备份");
      }
    }

    const local = await loadLocalEnvelope();
    if (local) {
      const decrypted = await decryptVaultData(local, password);
      setVaultData({
        ...decrypted,
        webdavConfig: decrypted.webdavConfig ?? defaultWebDavConfig()
      });
      setVaultSalt(local.kdf.salt);
      setVaultRevision(0);
      setSelectedEntryId(decrypted.entries[0]?.id ?? null);
      return;
    }

    const initial = emptyVault();
    setVaultData(initial);
    setSelectedEntryId(null);
    setVaultRevision(0);
    setVaultSalt(undefined);
  };

  const handleLogin = async (user: string, password: string): Promise<void> => {
    setLoginLoading(true);
    setError("");
    setNotice("");
    try {
      const result = await api.login(user, password);
      await loadVaultAfterLogin(password);
      setUsername(result.username);
      setSessionPassword(password);
      setIsLoggedIn(true);
      setNoticeMessage("登录成功，密码库已解锁。");
    } catch (e) {
      const message = e instanceof Error ? e.message : "登录失败";
      setErrorMessage(message);
      setIsLoggedIn(false);
    } finally {
      setLoginLoading(false);
    }
  };

  const updateVault = (next: VaultData): void => {
    setVaultData({
      ...next,
      updatedAt: new Date().toISOString()
    });
  };

  const saveToServer = async (): Promise<void> => {
    if (!vaultData) {
      return;
    }

    setBusy(true);
    try {
      const envelope = await ensureEnvelope();
      const result = await api.saveVault(envelope, vaultRevision);
      setVaultRevision(result.revision);
      setNoticeMessage(`服务端保存成功，revision = ${result.revision}`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setErrorMessage("服务端版本冲突，请先确认并同步最新版本后再保存。");
      } else {
        const message = e instanceof Error ? e.message : "保存失败";
        setErrorMessage(message);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleCreateEntry = (): void => {
    if (!vaultData) return;
    const entry = createEntry();
    updateVault({
      ...vaultData,
      entries: [entry, ...vaultData.entries]
    });
    setSearchKeyword("");
    setSelectedTag("all");
    setSortOrder("updated-desc");
    setEntryPage(1);
    setSelectedEntryId(entry.id);
  };

  const handleDeleteEntry = (id: string): void => {
    if (!vaultData) return;
    if (!window.confirm("确认删除该条目吗？")) {
      return;
    }
    const nextEntries = vaultData.entries.filter((entry) => entry.id !== id);
    updateVault({ ...vaultData, entries: nextEntries });
    if (selectedEntryId === id) {
      setSelectedEntryId(nextEntries[0]?.id ?? null);
    }
  };

  const handleChangeEntry = (nextEntry: VaultEntry): void => {
    if (!vaultData) {
      return;
    }
    const nextEntries = vaultData.entries.map((entry) =>
      entry.id === nextEntry.id ? nextEntry : entry
    );
    updateVault({
      ...vaultData,
      entries: nextEntries
    });
  };

  const handleGeneratePassword = (): void => {
    if (!currentEntry) {
      return;
    }
    try {
      handleChangeEntry({
        ...currentEntry,
        password: generatePassword(passwordOptions),
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "密码生成失败";
      setErrorMessage(message);
    }
  };

  const handleWebDavConfigChange = (config: WebDavConfig): void => {
    if (!vaultData) {
      return;
    }
    updateVault({
      ...vaultData,
      webdavConfig: config
    });
  };

  const ensureWebDavConfig = (): WebDavConfig => {
    const config = vaultData?.webdavConfig;
    if (!config || !config.url || !config.username || !config.password) {
      throw new Error("WebDAV 配置不完整");
    }
    return config;
  };

  const handleWebDavTest = async (): Promise<void> => {
    setBusy(true);
    try {
      await api.webDavTest(ensureWebDavConfig());
      setNoticeMessage("WebDAV 连接成功");
    } catch (e) {
      const message = e instanceof Error ? e.message : "WebDAV 连接失败";
      setErrorMessage(message);
    } finally {
      setBusy(false);
    }
  };

  const handleWebDavPull = async (): Promise<void> => {
    if (!sessionPassword) return;

    setBusy(true);
    try {
      const config = ensureWebDavConfig();
      const result = await api.webDavPull(config);
      if (!result.found || !result.envelope) {
        setNoticeMessage("远端还没有 vault 文件");
        return;
      }

      const localEnvelope = await ensureEnvelope();
      if (localEnvelope.contentHash !== result.envelope.contentHash) {
        const shouldReplace = window.confirm(
          "远端内容与本地不同，是否用远端覆盖本地？"
        );
        if (!shouldReplace) {
          setNoticeMessage("已取消拉取");
          return;
        }
      }

      const decrypted = await decryptVaultData(result.envelope, sessionPassword);
      setVaultData({
        ...decrypted,
        webdavConfig: decrypted.webdavConfig ?? config
      });
      setSelectedEntryId(decrypted.entries[0]?.id ?? null);
      setVaultSalt(result.envelope.kdf.salt);
      await saveLocalEnvelope(result.envelope);
      setNoticeMessage("已从 WebDAV 拉取并覆盖本地");
    } catch (e) {
      const message = e instanceof Error ? e.message : "拉取失败";
      setErrorMessage(message);
    } finally {
      setBusy(false);
    }
  };

  const handleWebDavPush = async (): Promise<void> => {
    setBusy(true);
    try {
      const config = ensureWebDavConfig();
      const localEnvelope = await ensureEnvelope();
      const remote = await api.webDavPull(config);
      if (remote.found && remote.envelope) {
        // 手动冲突裁决：远端与本地哈希不同时，必须由用户明确选择是否覆盖。
        if (remote.envelope.contentHash !== localEnvelope.contentHash) {
          const shouldOverwrite = window.confirm(
            "远端内容与本地不同，是否使用本地覆盖远端？"
          );
          if (!shouldOverwrite) {
            setNoticeMessage("已取消推送");
            return;
          }
        }
      }

      await api.webDavPush(config, localEnvelope, vaultRevision);
      updateVault({
        ...(vaultData as VaultData),
        lastWebdavSyncHash: localEnvelope.contentHash
      });
      setNoticeMessage("已推送到 WebDAV");
    } catch (e) {
      const message = e instanceof Error ? e.message : "推送失败";
      setErrorMessage(message);
    } finally {
      setBusy(false);
    }
  };

  const handleExport = async (): Promise<void> => {
    setBusy(true);
    try {
      const envelope = await ensureEnvelope();
      const blob = new Blob([JSON.stringify({ envelope }, null, 2)], {
        type: "application/json"
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vault-backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setNoticeMessage("加密备份已导出");
    } catch (e) {
      const message = e instanceof Error ? e.message : "导出失败";
      setErrorMessage(message);
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async (file: File): Promise<void> => {
    if (!sessionPassword) {
      return;
    }

    setBusy(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as {
        envelope?: EncryptedVaultEnvelope;
      };
      if (!parsed.envelope) {
        throw new Error("备份文件缺少 envelope");
      }
      const decrypted = await decryptVaultData(parsed.envelope, sessionPassword);
      setVaultData({
        ...decrypted,
        webdavConfig: decrypted.webdavConfig ?? defaultWebDavConfig()
      });
      setSelectedEntryId(decrypted.entries[0]?.id ?? null);
      setVaultSalt(parsed.envelope.kdf.salt);
      await saveLocalEnvelope(parsed.envelope);
      setNoticeMessage("备份已导入，请手动点击“保存到服务端”持久化");
    } catch (e) {
      const message = e instanceof Error ? e.message : "导入失败";
      setErrorMessage(message);
    } finally {
      setBusy(false);
    }
  };

  const handleChangePassword = async (
    oldPassword: string,
    newPassword: string
  ): Promise<void> => {
    if (!vaultData) {
      return;
    }

    setBusy(true);
    try {
      // 改密时必须生成新 salt，避免新旧密码派生结果可关联。
      const reEncrypted = await encryptVaultData(vaultData, newPassword);
      await api.changePassword(oldPassword, newPassword);

      try {
        const saveResult = await api.saveVault(reEncrypted, vaultRevision);
        setVaultRevision(saveResult.revision);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn("Vault save after password change failed.", error);
        // 改密已成功但服务端保存失败时，至少保住本地可解密副本，避免数据直接不可读。
        await saveLocalEnvelope(reEncrypted);
        setVaultSalt(reEncrypted.kdf.salt);
        setSessionPassword(newPassword);
        setNoticeMessage("密码已修改，但服务端保存失败。已保留本地新密文，请尽快点击“保存到服务端”。");
        return;
      }

      setVaultSalt(reEncrypted.kdf.salt);
      setSessionPassword(newPassword);
      await saveLocalEnvelope(reEncrypted);
      setNoticeMessage("密码修改成功，vault 已用新密码重加密");
    } catch (e) {
      const message = e instanceof Error ? e.message : "修改密码失败";
      setErrorMessage(message);
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async (): Promise<void> => {
    setBusy(true);
    try {
      await api.logout();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("Logout request failed, continue local cleanup.", error);
      // 退出失败不阻塞本地会话清理。
    } finally {
      setBusy(false);
      setIsLoggedIn(false);
      setSessionPassword("");
      setVaultData(null);
      setVaultRevision(0);
      setSelectedEntryId(null);
      setSearchKeyword("");
      setSelectedTag("all");
      setSortOrder("updated-desc");
      setPasswordOptions(defaultPasswordOptions());
      setEntryPage(1);
      setUsername("");
      setVaultSalt(undefined);
      setNotice("");
      setError("");
    }
  };

  if (!isLoggedIn) {
    return (
      <main className="min-h-screen bg-background px-6">
        <LoginForm error={error} loading={loginLoading} onSubmit={handleLogin} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-5 sm:px-6 lg:px-8">
        <header className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold">Password Vault</h1>
              <p className="text-sm text-slate-500">
                当前账号：{username} | 服务端 revision：{vaultRevision}
              </p>
            </div>
            <p className="text-xs text-slate-500">
              单用户模式 | 客户端加密 | 无公开注册
            </p>
          </div>
          {notice ? <p className="mt-2 text-sm text-emerald-700">{notice}</p> : null}
          {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
        </header>

        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <div className="min-h-[460px]">
            <VaultList
              entries={pagedEntries}
              availableTags={availableTags}
              page={entryPage}
              searchKeyword={searchKeyword}
              selectedTag={selectedTag}
              sortOrder={sortOrder}
              totalMatched={filteredEntries.length}
              totalPages={totalPages}
              onCreate={handleCreateEntry}
              onDelete={handleDeleteEntry}
              onNextPage={() => setEntryPage((prev) => Math.min(totalPages, prev + 1))}
              onPrevPage={() => setEntryPage((prev) => Math.max(1, prev - 1))}
              onSearchChange={(value) => {
                setSearchKeyword(value);
                setEntryPage(1);
              }}
              onTagChange={(value) => {
                setSelectedTag(value);
                setEntryPage(1);
              }}
              onSortChange={(value) => {
                setSortOrder(value);
                setEntryPage(1);
              }}
              onSelect={setSelectedEntryId}
              selectedId={selectedEntryId}
            />
          </div>
          <div className="min-h-[460px]">
            <VaultEditor
              entry={currentEntry}
              onChange={handleChangeEntry}
              onPasswordOptionsChange={setPasswordOptions}
              onGeneratePassword={handleGeneratePassword}
              passwordOptions={passwordOptions}
            />
          </div>
        </div>

        <SyncPanel
          busy={busy}
          config={vaultData?.webdavConfig ?? defaultWebDavConfig()}
          onChangeConfig={handleWebDavConfigChange}
          onPull={handleWebDavPull}
          onPush={handleWebDavPush}
          onTest={handleWebDavTest}
        />

        <SettingsPanel
          busy={busy}
          onChangePassword={handleChangePassword}
          onExport={handleExport}
          onImport={handleImport}
          onLogout={handleLogout}
          onSaveServer={saveToServer}
        />
      </div>
    </main>
  );
}

export default App;
