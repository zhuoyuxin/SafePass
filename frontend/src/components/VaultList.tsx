import type { ReactNode } from "react";

import type { VaultEntry } from "../types";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";

type SortOrder = "updated-desc" | "updated-asc";

interface VaultListProps {
  entries: VaultEntry[];
  selectedId: string | null;
  searchKeyword: string;
  totalMatched: number;
  page: number;
  totalPages: number;
  availableTags: string[];
  selectedTag: string;
  sortOrder: SortOrder;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onSearchChange: (value: string) => void;
  onTagChange: (value: string) => void;
  onSortChange: (value: SortOrder) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
}

const formatDateTime = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("zh-CN", {
    hour12: false
  });
};

const highlightText = (text: string, keyword: string): ReactNode => {
  const source = text || "-";
  const query = keyword.trim().toLowerCase();
  if (!query) {
    return source;
  }

  const lowerSource = source.toLowerCase();
  if (!lowerSource.includes(query)) {
    return source;
  }

  const parts: ReactNode[] = [];
  let cursor = 0;

  // 通过连续切片做高亮，避免正则特殊字符导致匹配异常。
  while (cursor < source.length) {
    const found = lowerSource.indexOf(query, cursor);
    if (found < 0) {
      parts.push(source.slice(cursor));
      break;
    }

    if (found > cursor) {
      parts.push(source.slice(cursor, found));
    }

    const match = source.slice(found, found + query.length);
    parts.push(
      <mark
        className="rounded-sm bg-amber-200 px-0.5 text-inherit"
        key={`${found}-${match}`}
      >
        {match}
      </mark>
    );
    cursor = found + query.length;
  }

  return <>{parts}</>;
};

export function VaultList({
  entries,
  selectedId,
  searchKeyword,
  totalMatched,
  page,
  totalPages,
  availableTags,
  selectedTag,
  sortOrder,
  onSelect,
  onCreate,
  onDelete,
  onSearchChange,
  onTagChange,
  onSortChange,
  onPrevPage,
  onNextPage
}: VaultListProps) {
  return (
    <Card className="h-full">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold">站点条目</h2>
        <Button onClick={onCreate} variant="secondary">
          新建
        </Button>
      </div>

      <div className="mb-3 space-y-2">
        <Input
          placeholder="搜索标题 / 账号 / URL / 标签"
          value={searchKeyword}
          onChange={(event) => onSearchChange(event.target.value)}
        />
        <div className="grid grid-cols-2 gap-2">
          <select
            className="h-10 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700 outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
            value={selectedTag}
            onChange={(event) => onTagChange(event.target.value)}
          >
            <option value="all">全部标签</option>
            {availableTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700 outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
            value={sortOrder}
            onChange={(event) => onSortChange(event.target.value as SortOrder)}
          >
            <option value="updated-desc">更新时间: 新到旧</option>
            <option value="updated-asc">更新时间: 旧到新</option>
          </select>
        </div>
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            命中 {totalMatched} 条 | 第 {page}/{Math.max(totalPages, 1)} 页
          </span>
          <div className="flex items-center gap-2">
            <Button
              className="px-2 py-1 text-xs"
              disabled={page <= 1}
              onClick={onPrevPage}
              type="button"
              variant="ghost"
            >
              上一页
            </Button>
            <Button
              className="px-2 py-1 text-xs"
              disabled={page >= totalPages}
              onClick={onNextPage}
              type="button"
              variant="ghost"
            >
              下一页
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-2 overflow-y-auto">
        {entries.length === 0 ? (
          <p className="rounded-md bg-muted px-3 py-6 text-center text-sm text-slate-500">
            没有匹配条目，换个关键词或标签试试。
          </p>
        ) : (
          entries.map((entry) => (
            <div
              className={`rounded-md border px-3 py-2 transition ${
                selectedId === entry.id
                  ? "border-primary bg-accent"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
              key={entry.id}
            >
              <button
                className="w-full text-left"
                onClick={() => onSelect(entry.id)}
                type="button"
              >
                <p className="truncate text-sm font-medium">
                  {highlightText(entry.title || "未命名站点", searchKeyword)}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {highlightText(entry.username || "-", searchKeyword)}
                </p>
                <p className="truncate text-[11px] text-slate-400">
                  {highlightText(entry.url || "-", searchKeyword)}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  更新于 {formatDateTime(entry.updatedAt)}
                </p>
              </button>
              <div className="mt-2 flex justify-end">
                <Button
                  className="px-2 py-1 text-xs"
                  onClick={() => onDelete(entry.id)}
                  type="button"
                  variant="ghost"
                >
                  删除
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

