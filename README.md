# Password Vault V1

单用户密码库网站（仅 `SuperAdmin`），支持：

- 新增站点条目时生成强密码
- 本地加密持久化（IndexedDB）
- 导入/导出加密备份文件
- WebDAV 手动上传/下载同步（后端代理）

## 技术栈

- 前端：React + Vite + Tailwind（shadcn 风格组件）
- 后端：NestJS + SQLite
- 加密：Argon2id + AES-256-GCM（客户端）

## 快速启动

1. 安装依赖

```bash
npm.cmd --workspace backend install
npm.cmd --workspace frontend install
```

2. 配置后端环境变量（可选）

```bash
# 默认值如下，不配置也能启动
ADMIN_USERNAME=admin
ADMIN_PASSWORD=ChangeMe123!
JWT_ACCESS_SECRET=please_change_access_secret
JWT_REFRESH_SECRET=please_change_refresh_secret
DB_PATH=./data/app.db
PORT=3000
FRONTEND_ORIGIN=http://localhost:5173
```

3. 启动后端

```bash
npm.cmd --workspace backend run dev
```

4. 启动前端

```bash
npm.cmd --workspace frontend run dev
```

## 安全说明

- 首次启动会自动创建唯一 `SuperAdmin` 账号（如果数据库还没有管理员）。
- 服务端只保存密文库和元数据，不保存明文密码库。
- WebDAV 凭据只在前端本地加密库中保存，服务端仅做请求代理透传。
