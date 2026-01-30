import { create } from "zustand";
import { persist } from "zustand/middleware";

type ViewMode = "list" | "grid";

interface UIState {
  sidebarCollapsed: boolean;
  viewMode: ViewMode;
  selectedObjects: string[];
  searchQuery: string;

  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setViewMode: (mode: ViewMode) => void;
  setSelectedObjects: (keys: string[]) => void;
  toggleObjectSelection: (key: string) => void;
  clearSelection: () => void;
  setSearchQuery: (query: string) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      viewMode: "list",
      selectedObjects: [],
      searchQuery: "",

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      setViewMode: (mode) => set({ viewMode: mode }),

      setSelectedObjects: (keys) => set({ selectedObjects: keys }),

      toggleObjectSelection: (key) => {
        const current = get().selectedObjects;
        if (current.includes(key)) {
          set({ selectedObjects: current.filter((k) => k !== key) });
        } else {
          set({ selectedObjects: [...current, key] });
        }
      },

      clearSelection: () => set({ selectedObjects: [] }),

      setSearchQuery: (query) => set({ searchQuery: query }),
    }),
    {
      name: "s3-client-ui-store",
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        viewMode: state.viewMode,
      }),
    }
  )
);
