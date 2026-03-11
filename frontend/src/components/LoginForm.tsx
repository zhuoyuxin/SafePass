import { type FormEvent, useState } from "react";

import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";

interface LoginFormProps {
  loading: boolean;
  error: string;
  onSubmit: (username: string, password: string) => Promise<void>;
}

export function LoginForm({
  loading,
  error,
  onSubmit
}: LoginFormProps) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await onSubmit(username.trim(), password);
  };

  return (
    <div className="mx-auto max-w-md py-16">
      <Card className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">SuperAdmin 登录</h1>
          <p className="mt-1 text-sm text-slate-500">
            首次启动默认用户名 `admin`，密码来自后端环境变量。
          </p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-600">用户名</label>
            <Input
              value={username}
              autoComplete="username"
              onChange={(event) => setUsername(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-600">密码</label>
            <Input
              type="password"
              value={password}
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button disabled={loading} className="w-full" type="submit">
            {loading ? "登录中..." : "登录"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
