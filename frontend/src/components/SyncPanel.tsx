import { useState } from "react";

import type { WebDavConfig } from "../types";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";

interface SyncPanelProps {
  config: WebDavConfig;
  busy: boolean;
  onChangeConfig: (value: WebDavConfig) => void;
  onTest: () => Promise<void>;
  onPull: () => Promise<void>;
  onPush: () => Promise<void>;
}

export function SyncPanel({
  config,
  busy,
  onChangeConfig,
  onTest,
  onPull,
  onPush
}: SyncPanelProps) {
  const [localConfig, setLocalConfig] = useState<WebDavConfig>(config);

  const commit = (next: WebDavConfig) => {
    setLocalConfig(next);
    onChangeConfig(next);
  };

  return (
    <Card className="space-y-3">
      <h2 className="text-base font-semibold">WebDAV 同步</h2>
      <p className="text-sm text-slate-500">
        凭据只写入本地加密库，服务端只做代理转发。
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm text-slate-600">URL</label>
          <Input
            placeholder="https://dav.example.com"
            value={localConfig.url}
            onChange={(event) => commit({ ...localConfig, url: event.target.value })}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-slate-600">用户名</label>
          <Input
            value={localConfig.username}
            onChange={(event) =>
              commit({ ...localConfig, username: event.target.value })
            }
          />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm text-slate-600">密码 / Token</label>
          <Input
            type="password"
            value={localConfig.password}
            onChange={(event) =>
              commit({ ...localConfig, password: event.target.value })
            }
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-slate-600">远端目录</label>
          <Input
            value={localConfig.basePath}
            onChange={(event) =>
              commit({ ...localConfig, basePath: event.target.value })
            }
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button disabled={busy} onClick={() => void onTest()} type="button" variant="secondary">
          测试连接
        </Button>
        <Button disabled={busy} onClick={() => void onPull()} type="button" variant="secondary">
          从 WebDAV 拉取
        </Button>
        <Button disabled={busy} onClick={() => void onPush()} type="button">
          推送到 WebDAV
        </Button>
      </div>
    </Card>
  );
}
