import { useQuery } from "@tanstack/react-query";
import { FolderOpen, MoreHorizontal, Trash2, Star } from "lucide-react";
import { commands } from "@/lib/tauri";
import { formatBytes } from "@/lib/utils";
import { useFavoritesStore, useToggleFavorite } from "@/stores/favoritesStore";
import { useAddBucketToHistory } from "@/stores/historyStore";
import { useConnectionStore } from "@/stores/connectionStore";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BucketItemProps {
  name: string;
  connectionId: string;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

export function BucketItem({
  name,
  connectionId,
  isActive,
  onSelect,
  onDelete,
}: BucketItemProps) {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["bucket-stats", connectionId, name],
    queryFn: () => commands.getBucketStats(connectionId, name),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false, // Don't retry if it fails (might not have permissions)
  });

  const { connections } = useConnectionStore();
  const isFavorite = useFavoritesStore((s) => s.isFavorite(connectionId, name));
  const toggleFavorite = useToggleFavorite();
  const addToHistory = useAddBucketToHistory();

  const connectionName = connections.find((c) => c.id === connectionId)?.name || "Unknown";

  const handleSelect = () => {
    addToHistory(connectionId, connectionName, name);
    onSelect();
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(connectionId, connectionName, name);
  };

  const formatCount = (count: number) => {
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div className="group relative">
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isActive ? "secondary" : "ghost"}
              className="w-full justify-start gap-2 text-sm pr-14 h-auto py-1.5"
              onClick={handleSelect}
            >
              <FolderOpen className="h-3.5 w-3.5 shrink-0" />
              <div className="flex flex-col items-start min-w-0 flex-1">
                <span className="truncate w-full text-left">{name}</span>
                {stats && !statsLoading && (
                  <span className="text-[10px] text-muted-foreground">
                    {formatCount(stats.objectCount)} objects · {formatBytes(stats.totalSize)}
                  </span>
                )}
              </div>
            </Button>
          </TooltipTrigger>
          {stats && (
            <TooltipContent side="right" className="text-xs">
              <div className="space-y-1">
                <div className="font-medium">{name}</div>
                <div className="text-muted-foreground">
                  {stats.objectCount.toLocaleString()} objects
                </div>
                <div className="text-muted-foreground">
                  {formatBytes(stats.totalSize)} total
                </div>
              </div>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

      <Button
        variant="ghost"
        size="icon"
        className={`absolute right-7 top-1/2 -translate-y-1/2 h-5 w-5 ${isFavorite ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
        onClick={handleToggleFavorite}
      >
        <Star
          className={`h-3 w-3 ${isFavorite ? "fill-yellow-500 text-yellow-500" : ""}`}
        />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5 opacity-0 group-hover:opacity-100"
          >
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {stats && (
            <>
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                <div>{stats.objectCount.toLocaleString()} objects</div>
                <div>{formatBytes(stats.totalSize)}</div>
              </div>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem
            className="text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Bucket
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
