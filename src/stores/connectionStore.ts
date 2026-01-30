import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { S3Connection } from "@/types/connection";

interface ConnectionState {
  connections: S3Connection[];
  activeConnectionId: string | null;
  activeBucket: string | null;
  currentPath: string;

  setConnections: (connections: S3Connection[]) => void;
  addConnection: (connection: S3Connection) => void;
  removeConnection: (id: string) => void;
  setActiveConnection: (id: string | null) => void;
  setActiveBucket: (bucket: string | null) => void;
  setCurrentPath: (path: string) => void;
  navigateToPath: (path: string) => void;
  navigateUp: () => void;
  navigateToFolder: (folder: string) => void;
}

export const useConnectionStore = create<ConnectionState>()(
  persist(
    (set, get) => ({
      connections: [],
      activeConnectionId: null,
      activeBucket: null,
      currentPath: "",

      setConnections: (connections) => set({ connections }),

      addConnection: (connection) =>
        set((state) => ({
          connections: [...state.connections, connection],
        })),

      removeConnection: (id) =>
        set((state) => ({
          connections: state.connections.filter((c) => c.id !== id),
          activeConnectionId:
            state.activeConnectionId === id ? null : state.activeConnectionId,
          activeBucket:
            state.activeConnectionId === id ? null : state.activeBucket,
          currentPath: state.activeConnectionId === id ? "" : state.currentPath,
        })),

      setActiveConnection: (id) =>
        set({
          activeConnectionId: id,
          activeBucket: null,
          currentPath: "",
        }),

      setActiveBucket: (bucket) =>
        set({
          activeBucket: bucket,
          currentPath: "",
        }),

      setCurrentPath: (path) => set({ currentPath: path }),

      navigateToPath: (path) => set({ currentPath: path }),

      navigateUp: () => {
        const current = get().currentPath;
        const parts = current.split("/").filter(Boolean);
        parts.pop();
        set({ currentPath: parts.length ? parts.join("/") + "/" : "" });
      },

      navigateToFolder: (folder) => {
        const current = get().currentPath;
        const newPath = current + folder;
        set({ currentPath: newPath.endsWith("/") ? newPath : newPath + "/" });
      },
    }),
    {
      name: "s3-client-connection-store",
      partialize: (state) => ({
        activeConnectionId: state.activeConnectionId,
        activeBucket: state.activeBucket,
      }),
    }
  )
);
