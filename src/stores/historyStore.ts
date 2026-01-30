import { create } from "zustand";
import { persist } from "zustand/middleware";

export type HistoryItemType = "bucket" | "path" | "file";

export interface HistoryItem {
  type: HistoryItemType;
  connectionId: string;
  connectionName: string;
  bucket: string;
  path?: string;
  key?: string;
  name: string;
  accessedAt: number;
}

interface HistoryState {
  recentItems: HistoryItem[];
  maxItems: number;

  addRecentItem: (item: Omit<HistoryItem, "accessedAt">) => void;
  removeRecentItem: (item: HistoryItem) => void;
  clearHistory: () => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      recentItems: [],
      maxItems: 15,

      addRecentItem: (item) => {
        const now = Date.now();
        const newItem: HistoryItem = { ...item, accessedAt: now };

        set((state) => {
          // Remove duplicate if exists
          const filtered = state.recentItems.filter(
            (existing) =>
              !(
                existing.type === item.type &&
                existing.connectionId === item.connectionId &&
                existing.bucket === item.bucket &&
                existing.path === item.path &&
                existing.key === item.key
              )
          );

          // Add new item at the beginning
          const updated = [newItem, ...filtered];

          // Trim to max items
          return {
            recentItems: updated.slice(0, state.maxItems),
          };
        });
      },

      removeRecentItem: (item) => {
        set((state) => ({
          recentItems: state.recentItems.filter(
            (existing) =>
              !(
                existing.type === item.type &&
                existing.connectionId === item.connectionId &&
                existing.bucket === item.bucket &&
                existing.path === item.path &&
                existing.key === item.key
              )
          ),
        }));
      },

      clearHistory: () => {
        set({ recentItems: [] });
      },
    }),
    {
      name: "baul-history-store",
    }
  )
);

// Hook to add bucket to history
export function useAddBucketToHistory() {
  const addRecentItem = useHistoryStore((state) => state.addRecentItem);

  return (connectionId: string, connectionName: string, bucket: string) => {
    addRecentItem({
      type: "bucket",
      connectionId,
      connectionName,
      bucket,
      name: bucket,
    });
  };
}

// Hook to add path to history
export function useAddPathToHistory() {
  const addRecentItem = useHistoryStore((state) => state.addRecentItem);

  return (connectionId: string, connectionName: string, bucket: string, path: string) => {
    if (!path) return; // Don't add root paths
    const name = path.split("/").filter(Boolean).pop() || path;
    addRecentItem({
      type: "path",
      connectionId,
      connectionName,
      bucket,
      path,
      name,
    });
  };
}

// Hook to add file to history
export function useAddFileToHistory() {
  const addRecentItem = useHistoryStore((state) => state.addRecentItem);

  return (connectionId: string, connectionName: string, bucket: string, key: string) => {
    const name = key.split("/").pop() || key;
    addRecentItem({
      type: "file",
      connectionId,
      connectionName,
      bucket,
      key,
      name,
    });
  };
}
