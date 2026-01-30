import { useState } from "react";
import { ChevronDown, ChevronRight, Star, Clock, Folder, Archive, File, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFavoritesStore } from "@/stores/favoritesStore";
import { useHistoryStore } from "@/stores/historyStore";
import { useConnectionStore } from "@/stores/connectionStore";

interface QuickAccessSectionProps {
  collapsed: boolean;
}

interface QuickAccessItemProps {
  type: "bucket" | "path" | "file";
  name: string;
  subtitle: string;
  onNavigate: () => void;
  onRemove?: () => void;
}

function QuickAccessItem({ type, name, subtitle, onNavigate, onRemove }: QuickAccessItemProps) {
  const Icon = type === "bucket" ? Archive : type === "path" ? Folder : File;

  return (
    <div className="group relative">
      <Button
        variant="ghost"
        className="w-full justify-start gap-2 h-auto py-1.5 px-2"
        onClick={onNavigate}
      >
        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <div className="flex flex-col items-start min-w-0">
          <span className="text-sm truncate w-full text-left">{name}</span>
          <span className="text-xs text-muted-foreground truncate w-full text-left">
            {subtitle}
          </span>
        </div>
      </Button>
      {onRemove && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 opacity-0 group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

export function QuickAccessSection({ collapsed }: QuickAccessSectionProps) {
  const [favoritesExpanded, setFavoritesExpanded] = useState(true);
  const [recentExpanded, setRecentExpanded] = useState(true);

  const { favorites, removeFavorite } = useFavoritesStore();
  const { recentItems, removeRecentItem, clearHistory } = useHistoryStore();
  const { setActiveConnection, setActiveBucket, navigateToPath } =
    useConnectionStore();

  if (collapsed) return null;

  const handleNavigate = (
    connectionId: string,
    bucket: string,
    path?: string
  ) => {
    setActiveConnection(connectionId);
    setActiveBucket(bucket);
    if (path) {
      navigateToPath(path);
    }
  };

  if (favorites.length === 0 && recentItems.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1">
      {/* Favorites */}
      {favorites.length > 0 && (
        <div>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 px-2 py-1 h-auto"
            onClick={() => setFavoritesExpanded(!favoritesExpanded)}
          >
            {favoritesExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
            <Star className="h-3.5 w-3.5 text-yellow-500" />
            <span className="text-xs font-medium uppercase tracking-wider">
              Favorites
            </span>
            <span className="text-xs text-muted-foreground ml-auto">
              {favorites.length}
            </span>
          </Button>

          {favoritesExpanded && (
            <div className="ml-2 space-y-0.5">
              {favorites.map((fav) => (
                <QuickAccessItem
                  key={fav.id}
                  type={fav.type}
                  name={fav.name}
                  subtitle={`${fav.connectionName} / ${fav.bucket}`}
                  onNavigate={() =>
                    handleNavigate(fav.connectionId, fav.bucket, fav.path)
                  }
                  onRemove={() => removeFavorite(fav.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recent */}
      {recentItems.length > 0 && (
        <div>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 px-2 py-1 h-auto"
            onClick={() => setRecentExpanded(!recentExpanded)}
          >
            {recentExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium uppercase tracking-wider">
              Recent
            </span>
            <span className="text-xs text-muted-foreground ml-auto">
              {recentItems.length}
            </span>
          </Button>

          {recentExpanded && (
            <div className="ml-2 space-y-0.5">
              {recentItems.slice(0, 5).map((item, index) => (
                <QuickAccessItem
                  key={`${item.connectionId}-${item.bucket}-${item.path || item.key || ""}-${index}`}
                  type={item.type}
                  name={item.name}
                  subtitle={`${item.connectionName} / ${item.bucket}`}
                  onNavigate={() =>
                    handleNavigate(
                      item.connectionId,
                      item.bucket,
                      item.path || (item.key ? item.key.split("/").slice(0, -1).join("/") + "/" : undefined)
                    )
                  }
                  onRemove={() => removeRecentItem(item)}
                />
              ))}
              {recentItems.length > 5 && (
                <Button
                  variant="ghost"
                  className="w-full text-xs text-muted-foreground"
                  onClick={clearHistory}
                >
                  Clear history
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
