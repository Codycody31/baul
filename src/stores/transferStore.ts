import { create } from "zustand";

export type TransferStatus = "queued" | "in_progress" | "completed" | "failed";
export type TransferType = "upload" | "download";

export interface Transfer {
  id: string;
  type: TransferType;
  fileName: string;
  bucket: string;
  key: string;
  status: TransferStatus;
  progress: number;
  bytesTransferred: number;
  totalBytes: number;
  error?: string;
  startedAt?: number;
  completedAt?: number;
}

interface TransferState {
  transfers: Transfer[];
  isQueueVisible: boolean;

  addTransfer: (transfer: Omit<Transfer, "id" | "status" | "progress" | "bytesTransferred">) => string;
  updateTransfer: (id: string, updates: Partial<Transfer>) => void;
  removeTransfer: (id: string) => void;
  clearCompleted: () => void;
  clearAll: () => void;
  toggleQueueVisibility: () => void;
  setQueueVisible: (visible: boolean) => void;
}

let transferIdCounter = 0;

export const useTransferStore = create<TransferState>()((set) => ({
  transfers: [],
  isQueueVisible: false,

  addTransfer: (transfer) => {
    const id = `transfer-${++transferIdCounter}-${Date.now()}`;
    const newTransfer: Transfer = {
      ...transfer,
      id,
      status: "queued",
      progress: 0,
      bytesTransferred: 0,
    };

    set((state) => ({
      transfers: [...state.transfers, newTransfer],
      isQueueVisible: true,
    }));

    return id;
  },

  updateTransfer: (id, updates) => {
    set((state) => ({
      transfers: state.transfers.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
    }));
  },

  removeTransfer: (id) => {
    set((state) => ({
      transfers: state.transfers.filter((t) => t.id !== id),
    }));
  },

  clearCompleted: () => {
    set((state) => ({
      transfers: state.transfers.filter(
        (t) => t.status !== "completed" && t.status !== "failed"
      ),
    }));
  },

  clearAll: () => {
    set({ transfers: [] });
  },

  toggleQueueVisibility: () => {
    set((state) => ({ isQueueVisible: !state.isQueueVisible }));
  },

  setQueueVisible: (visible) => {
    set({ isQueueVisible: visible });
  },
}));

// Selectors
export const selectActiveTransfers = (state: TransferState) =>
  state.transfers.filter((t) => t.status === "queued" || t.status === "in_progress");

export const selectCompletedTransfers = (state: TransferState) =>
  state.transfers.filter((t) => t.status === "completed" || t.status === "failed");

export const selectTransferProgress = (state: TransferState) => {
  const active = selectActiveTransfers(state);
  if (active.length === 0) return 100;

  const totalProgress = active.reduce((sum, t) => sum + t.progress, 0);
  return totalProgress / active.length;
};
