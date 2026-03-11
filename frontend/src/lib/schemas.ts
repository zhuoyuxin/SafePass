import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().trim().min(1, "用户名不能为空"),
  password: z.string().min(1, "密码不能为空")
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, "旧密码不能为空"),
  newPassword: z.string().min(10, "新密码至少需要 10 位")
});

export const webDavConfigSchema = z.object({
  url: z.string().trim().min(1, "WebDAV URL 不能为空"),
  username: z.string().trim().min(1, "WebDAV 用户名不能为空"),
  password: z.string().min(1, "WebDAV 密码不能为空"),
  basePath: z.string().trim().default("/password-vault")
});

export const pickFirstIssueMessage = (
  issues: Array<{ message: string }> | undefined,
  fallback: string
): string => {
  const first = issues?.[0]?.message?.trim();
  return first || fallback;
};