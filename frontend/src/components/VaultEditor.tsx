import type { ChangeEvent } from "react";

import type { GeneratorOptions } from "../lib/password-generator";
import type { VaultEntry } from "../types";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";

interface VaultEditorProps {
  entry: VaultEntry | null;
  passwordOptions: GeneratorOptions;
  onChange: (next: VaultEntry) => void;
  onPasswordOptionsChange: (next: GeneratorOptions) => void;
  onGeneratePassword: () => void;
}

const toTags = (value: string): string[] =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export function VaultEditor({
  entry,
  passwordOptions,
  onChange,
  onPasswordOptionsChange,
  onGeneratePassword
}: VaultEditorProps) {
  if (!entry) {
    return (
      <Card className="h-full">
        <div className="flex h-full items-center justify-center text-sm text-slate-500">
          从左侧选择条目后编辑内容。
        </div>
      </Card>
    );
  }

  const update =
    (field: keyof VaultEntry) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange({
        ...entry,
        [field]: event.target.value,
        updatedAt: new Date().toISOString()
      });
    };

  const patchPasswordOption = (
    field: keyof GeneratorOptions,
    value: boolean | number
  ): void => {
    const next = {
      ...passwordOptions,
      [field]: value
    };
    onPasswordOptionsChange(next);
  };

  return (
    <Card className="h-full space-y-4 overflow-y-auto">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-600">站点名称</label>
          <Input value={entry.title} onChange={update("title")} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-600">站点地址</label>
          <Input value={entry.url} onChange={update("url")} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-600">账号</label>
          <Input value={entry.username} onChange={update("username")} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-600">标签（逗号分隔）</label>
          <Input
            value={entry.tags.join(", ")}
            onChange={(event) =>
              onChange({
                ...entry,
                tags: toTags(event.target.value),
                updatedAt: new Date().toISOString()
              })
            }
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-600">密码</label>
        <div className="flex gap-2">
          <Input className="font-mono" value={entry.password} onChange={update("password")} />
          <Button onClick={onGeneratePassword} type="button" variant="secondary">
            生成
          </Button>
        </div>
      </div>

      <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
        <h3 className="text-sm font-semibold text-slate-700">密码生成规则</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs text-slate-600">密码长度</label>
            <Input
              min={6}
              max={64}
              type="number"
              value={String(passwordOptions.length)}
              onChange={(event) => {
                const nextLength = Number(event.target.value || "0");
                patchPasswordOption(
                  "length",
                  Number.isFinite(nextLength)
                    ? Math.min(64, Math.max(6, nextLength))
                    : 20
                );
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
            <label className="flex items-center gap-2">
              <input
                checked={passwordOptions.includeNumbers}
                type="checkbox"
                onChange={(event) =>
                  patchPasswordOption("includeNumbers", event.target.checked)
                }
              />
              数字
            </label>
            <label className="flex items-center gap-2">
              <input
                checked={passwordOptions.includeUpper}
                type="checkbox"
                onChange={(event) =>
                  patchPasswordOption("includeUpper", event.target.checked)
                }
              />
              大写字母
            </label>
            <label className="flex items-center gap-2">
              <input
                checked={passwordOptions.includeLower}
                type="checkbox"
                onChange={(event) =>
                  patchPasswordOption("includeLower", event.target.checked)
                }
              />
              小写字母
            </label>
            <label className="flex items-center gap-2">
              <input
                checked={passwordOptions.includeSymbols}
                type="checkbox"
                onChange={(event) =>
                  patchPasswordOption("includeSymbols", event.target.checked)
                }
              />
              特殊符号
            </label>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-600">备注</label>
        <textarea
          className="min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
          value={entry.note}
          onChange={update("note")}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-slate-600">自定义字段</label>
          <Button
            onClick={() =>
              onChange({
                ...entry,
                customFields: [...entry.customFields, { key: "", value: "" }],
                updatedAt: new Date().toISOString()
              })
            }
            type="button"
            variant="secondary"
          >
            添加字段
          </Button>
        </div>
        <div className="space-y-2">
          {entry.customFields.map((field, index) => (
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2" key={`${field.key}-${index}`}>
              <Input
                placeholder="Key"
                value={field.key}
                onChange={(event) => {
                  const nextFields = [...entry.customFields];
                  nextFields[index] = { ...nextFields[index], key: event.target.value };
                  onChange({
                    ...entry,
                    customFields: nextFields,
                    updatedAt: new Date().toISOString()
                  });
                }}
              />
              <Input
                placeholder="Value"
                value={field.value}
                onChange={(event) => {
                  const nextFields = [...entry.customFields];
                  nextFields[index] = { ...nextFields[index], value: event.target.value };
                  onChange({
                    ...entry,
                    customFields: nextFields,
                    updatedAt: new Date().toISOString()
                  });
                }}
              />
              <Button
                onClick={() => {
                  const nextFields = entry.customFields.filter((_, i) => i !== index);
                  onChange({
                    ...entry,
                    customFields: nextFields,
                    updatedAt: new Date().toISOString()
                  });
                }}
                type="button"
                variant="ghost"
              >
                删除
              </Button>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

