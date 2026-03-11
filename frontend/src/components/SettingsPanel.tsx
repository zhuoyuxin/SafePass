import { useRef, useState } from "react";

import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";

interface SettingsPanelProps {
  busy: boolean;
  onSaveServer: () => Promise<void>;
  onExport: () => Promise<void>;
  onImport: (file: File) => Promise<void>;
  onChangePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  onLogout: () => Promise<void>;
}

export function SettingsPanel({
  busy,
  onSaveServer,
  onExport,
  onImport,
  onChangePassword,
  onLogout
}: SettingsPanelProps) {
  const importRef = useRef<HTMLInputElement | null>(null);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const submitChangePassword = async () => {
    await onChangePassword(oldPassword, newPassword);
    setOldPassword("");
    setNewPassword("");
  };

  return (
    <Card className="space-y-3">
      <h2 className="text-base font-semibold">系统设置</h2>
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy} onClick={() => void onSaveServer()} type="button">
          保存到服务端
        </Button>
        <Button
          disabled={busy}
          onClick={() => void onExport()}
          type="button"
          variant="secondary"
        >
          导出加密备份
        </Button>
        <Button
          disabled={busy}
          onClick={() => importRef.current?.click()}
          type="button"
          variant="secondary"
        >
          导入加密备份
        </Button>
        <input
          className="hidden"
          ref={importRef}
          type="file"
          accept=".json,.enc"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void onImport(file);
            }
            event.target.value = "";
          }}
        />
      </div>

      <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
        <h3 className="text-sm font-semibold text-slate-700">修改唯一密码</h3>
        <p className="mt-1 text-xs text-slate-500">
          修改后会立即使旧刷新会话失效，需要重新登录。
        </p>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <Input
            type="password"
            placeholder="旧密码"
            value={oldPassword}
            onChange={(event) => setOldPassword(event.target.value)}
          />
          <Input
            type="password"
            placeholder="新密码（至少10位）"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
          <Button disabled={busy} onClick={() => void submitChangePassword()} type="button">
            更新密码
          </Button>
        </div>
      </div>

      <div>
        <Button disabled={busy} onClick={() => void onLogout()} type="button" variant="danger">
          退出登录
        </Button>
      </div>
    </Card>
  );
}
