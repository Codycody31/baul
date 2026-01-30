import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { commands } from "@/lib/tauri";
import { useConnectionStore } from "@/stores/connectionStore";

export type ConnectionHealth = "unknown" | "healthy" | "unhealthy" | "checking";

// Store health status in a simple map (not persisted)
const healthMap = new Map<string, ConnectionHealth>();
const healthListeners = new Set<() => void>();

function notifyListeners() {
  healthListeners.forEach((listener) => listener());
}

export function setConnectionHealth(connectionId: string, health: ConnectionHealth) {
  healthMap.set(connectionId, health);
  notifyListeners();
}

export function getConnectionHealth(connectionId: string): ConnectionHealth {
  return healthMap.get(connectionId) || "unknown";
}

export function useConnectionHealth(connectionId: string | null): ConnectionHealth {
  // Force re-render when health changes
  useEffect(() => {
    const listener = () => {};
    healthListeners.add(listener);
    return () => {
      healthListeners.delete(listener);
    };
  }, []);

  if (!connectionId) return "unknown";
  return getConnectionHealth(connectionId);
}

export function useActiveConnectionHealthCheck() {
  const { activeConnectionId } = useConnectionStore();

  const { refetch } = useQuery({
    queryKey: ["connection-health", activeConnectionId],
    queryFn: async () => {
      if (!activeConnectionId) return null;

      setConnectionHealth(activeConnectionId, "checking");

      try {
        // Try to list buckets as a health check
        await commands.listBuckets(activeConnectionId);
        setConnectionHealth(activeConnectionId, "healthy");
        return "healthy";
      } catch {
        setConnectionHealth(activeConnectionId, "unhealthy");
        return "unhealthy";
      }
    },
    enabled: !!activeConnectionId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Check every 5 minutes
    retry: false,
  });

  return {
    checkHealth: refetch,
  };
}
