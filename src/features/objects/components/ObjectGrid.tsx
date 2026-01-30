import { useState, useRef, useCallback, useEffect } from "react";
import { Folder, File, Loader2 } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { useMutation } from "@tanstack/react-query";
import { commands } from "@/lib/tauri";
import { useConnectionStore } from "@/stores/connectionStore";
import { useUIStore } from "@/stores/uiStore";
import { getFileName, formatBytes } from "@/lib/utils";
import type { S3Object } from "@/types/object";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { PreviewDialog } from "./PreviewDialog";
import { Button } from "@/components/ui/button";

interface ObjectGridProps {
  objects: S3Object[];
  prefixes: string[];
  hasMore?: boolean;
  isFetchingMore?: boolean;
  onLoadMore?: () => void;
}

type GridItem = { type: "prefix"; prefix: string } | { type: "object"; object: S3Object };

export function ObjectGrid({ objects, prefixes, hasMore, isFetchingMore, onLoadMore }: ObjectGridProps) {
  const { toast } = useToast();
  const { activeConnectionId, activeBucket, navigateToPath } = useConnectionStore();
  const { selectedObjects, toggleObjectSelection } = useUIStore();
  const [previewObject, setPreviewObject] = useState<S3Object | null>(null);

  const downloadMutation = useMutation({
    mutationFn: async ({ key, destination }: { key: string; destination: string }) => {
      await commands.downloadFile(
        activeConnectionId!,
        activeBucket!,
        key,
        destination
      );
    },
    onSuccess: () => {
      toast({
        title: "Download complete",
        description: "File downloaded successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Download failed",
        description: String(error),
        variant: "destructive",
      });
    },
  });

  const handleDownload = async (key: string) => {
    const fileName = getFileName(key);
    const destination = await open({
      directory: false,
      multiple: false,
      defaultPath: fileName,
      title: "Save file as",
    });

    if (destination) {
      downloadMutation.mutate({ key, destination: destination as string });
    }
  };

  const handleFolderClick = (prefix: string) => {
    navigateToPath(prefix);
  };

  const handleObjectDoubleClick = (object: S3Object) => {
    setPreviewObject(object);
  };

  // Combine prefixes and objects into a single list
  const allItems: GridItem[] = [
    ...prefixes.map((prefix): GridItem => ({ type: "prefix", prefix })),
    ...objects.map((object): GridItem => ({ type: "object", object })),
  ];

  const parentRef = useRef<HTMLDivElement>(null);

  // Infinite scroll - load more when near bottom
  const handleScroll = useCallback(() => {
    if (!parentRef.current || !hasMore || isFetchingMore || !onLoadMore) return;

    const { scrollTop, scrollHeight, clientHeight } = parentRef.current;
    const scrolledToBottom = scrollTop + clientHeight >= scrollHeight - 200;

    if (scrolledToBottom) {
      onLoadMore();
    }
  }, [hasMore, isFetchingMore, onLoadMore]);

  useEffect(() => {
    const scrollElement = parentRef.current;
    if (!scrollElement) return;

    scrollElement.addEventListener("scroll", handleScroll);
    return () => scrollElement.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return (
    <>
    <div ref={parentRef} className="h-full overflow-auto">
      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
        {allItems.map((item) => {
          if (item.type === "prefix") {
            return (
              <div
                key={item.prefix}
                className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors"
                onDoubleClick={() => handleFolderClick(item.prefix)}
              >
                <Folder className="h-12 w-12 text-blue-500" />
                <span className="text-sm text-center truncate w-full">
                  {getFileName(item.prefix)}
                </span>
              </div>
            );
          }

          const object = item.object;
          return (
            <div
              key={object.key}
              className={cn(
                "flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors",
                selectedObjects.includes(object.key) && "bg-accent ring-2 ring-primary"
              )}
              onClick={() => toggleObjectSelection(object.key)}
              onDoubleClick={() => handleObjectDoubleClick(object)}
            >
              <File className="h-12 w-12 text-muted-foreground" />
              <span className="text-sm text-center truncate w-full">
                {getFileName(object.key)}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatBytes(object.size)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Load more indicator */}
      {hasMore && (
        <div className="flex justify-center py-4">
          {isFetchingMore ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading more...</span>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={onLoadMore}>
              Load more
            </Button>
          )}
        </div>
      )}
    </div>

    <PreviewDialog
      open={!!previewObject}
      onOpenChange={(open) => !open && setPreviewObject(null)}
      object={previewObject}
      connectionId={activeConnectionId!}
      bucket={activeBucket!}
      onDownload={handleDownload}
    />
    </>
  );
}
