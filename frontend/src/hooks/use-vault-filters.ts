import { type Dispatch, type SetStateAction, useMemo, useState } from "react";

import type { VaultData, VaultEntry } from "../types";

export type VaultSortOrder = "updated-desc" | "updated-asc";

const PAGE_SIZE = 12;

interface UseVaultFiltersResult {
  searchKeyword: string;
  selectedTag: string;
  sortOrder: VaultSortOrder;
  entryPage: number;
  availableTags: string[];
  filteredEntries: VaultEntry[];
  pagedEntries: VaultEntry[];
  totalPages: number;
  setEntryPage: Dispatch<SetStateAction<number>>;
  applySearchKeyword: (value: string) => void;
  applySelectedTag: (value: string) => void;
  applySortOrder: (value: VaultSortOrder) => void;
  resetFilters: () => void;
}

export function useVaultFilters(vaultData: VaultData | null): UseVaultFiltersResult {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedTag, setSelectedTag] = useState("all");
  const [sortOrder, setSortOrder] = useState<VaultSortOrder>("updated-desc");
  const [entryPage, setEntryPage] = useState(1);

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

  const effectiveSelectedTag =
    selectedTag === "all" || availableTags.includes(selectedTag)
      ? selectedTag
      : "all";

  const filteredEntries = useMemo(() => {
    if (!vaultData) {
      return [];
    }

    const keyword = searchKeyword.trim().toLowerCase();
    const tag = effectiveSelectedTag;

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
      const leftTime = new Date(left.updatedAt).getTime();
      const rightTime = new Date(right.updatedAt).getTime();
      const diff =
        (Number.isFinite(leftTime) ? leftTime : 0) -
        (Number.isFinite(rightTime) ? rightTime : 0);
      return sortOrder === "updated-desc" ? -diff : diff;
    });
  }, [vaultData, searchKeyword, effectiveSelectedTag, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE));
  const effectiveEntryPage = Math.min(entryPage, totalPages);

  const pagedEntries = useMemo(() => {
    const start = (effectiveEntryPage - 1) * PAGE_SIZE;
    return filteredEntries.slice(start, start + PAGE_SIZE);
  }, [filteredEntries, effectiveEntryPage]);

  const applySearchKeyword = (value: string): void => {
    setSearchKeyword(value);
    setEntryPage(1);
  };

  const applySelectedTag = (value: string): void => {
    setSelectedTag(value);
    setEntryPage(1);
  };

  const applySortOrder = (value: VaultSortOrder): void => {
    setSortOrder(value);
    setEntryPage(1);
  };

  // Reset all list filters together to avoid duplicated state resets in App.
  const resetFilters = (): void => {
    setSearchKeyword("");
    setSelectedTag("all");
    setSortOrder("updated-desc");
    setEntryPage(1);
  };

  return {
    searchKeyword,
    selectedTag: effectiveSelectedTag,
    sortOrder,
    entryPage: effectiveEntryPage,
    availableTags,
    filteredEntries,
    pagedEntries,
    totalPages,
    setEntryPage,
    applySearchKeyword,
    applySelectedTag,
    applySortOrder,
    resetFilters
  };
}
