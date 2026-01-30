import { create } from "zustand";
import { persist } from "zustand/middleware";

export type FavoriteType = "bucket" | "path";

export interface Favorite {
  id: string;
  type: FavoriteType;
  connectionId: string;
  connectionName: string;
  bucket: string;
  path?: string;
  name: string;
  createdAt: number;
}

interface FavoritesState {
  favorites: Favorite[];

  addFavorite: (item: Omit<Favorite, "id" | "createdAt">) => void;
  removeFavorite: (id: string) => void;
  isFavorite: (connectionId: string, bucket: string, path?: string) => boolean;
  getFavoriteId: (connectionId: string, bucket: string, path?: string) => string | null;
  clearFavorites: () => void;
}

let favoriteIdCounter = 0;

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],

      addFavorite: (item) => {
        const id = `fav-${++favoriteIdCounter}-${Date.now()}`;
        const newFavorite: Favorite = {
          ...item,
          id,
          createdAt: Date.now(),
        };

        set((state) => ({
          favorites: [...state.favorites, newFavorite],
        }));
      },

      removeFavorite: (id) => {
        set((state) => ({
          favorites: state.favorites.filter((f) => f.id !== id),
        }));
      },

      isFavorite: (connectionId, bucket, path) => {
        const { favorites } = get();
        return favorites.some(
          (f) =>
            f.connectionId === connectionId &&
            f.bucket === bucket &&
            (path ? f.path === path : !f.path)
        );
      },

      getFavoriteId: (connectionId, bucket, path) => {
        const { favorites } = get();
        const found = favorites.find(
          (f) =>
            f.connectionId === connectionId &&
            f.bucket === bucket &&
            (path ? f.path === path : !f.path)
        );
        return found?.id || null;
      },

      clearFavorites: () => {
        set({ favorites: [] });
      },
    }),
    {
      name: "baul-favorites-store",
    }
  )
);

// Hook to toggle favorite status
export function useToggleFavorite() {
  const { addFavorite, removeFavorite, getFavoriteId } = useFavoritesStore();

  return (
    connectionId: string,
    connectionName: string,
    bucket: string,
    path?: string
  ) => {
    const existingId = getFavoriteId(connectionId, bucket, path);

    if (existingId) {
      removeFavorite(existingId);
      return false; // Now unfavorited
    } else {
      const name = path
        ? path.split("/").filter(Boolean).pop() || bucket
        : bucket;

      addFavorite({
        type: path ? "path" : "bucket",
        connectionId,
        connectionName,
        bucket,
        path,
        name,
      });
      return true; // Now favorited
    }
  };
}
