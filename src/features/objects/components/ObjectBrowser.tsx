import { useMemo, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { writeFile } from "@tauri-apps/plugin-fs";
import { tempDir } from "@tauri-apps/api/path";
import { useObjects } from "../hooks/useObjects";
import { useConnectionStore } from "@/stores/connectionStore";
import { useUIStore } from "@/stores/uiStore";
import { ObjectTable } from "./ObjectTable";
import { ObjectGrid } from "./ObjectGrid";
import { DropZone } from "./DropZone";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, FolderOpen, SearchX } from "lucide-react";
import { getFileName } from "@/lib/utils";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { DeleteDialog } from "./DeleteDialog";
import { RenameDialog } from "./RenameDialog";
import { useToast } from "@/components/ui/use-toast";
import { commands } from "@/lib/tauri";

export function ObjectBrowser() {
  const { objects, prefixes, isLoading, error, hasMore, isFetchingMore, loadMore } = useObjects();
  const { activeConnectionId, activeBucket, currentPath } = useConnectionStore();
  const { viewMode, searchQuery, selectedObjects, setSelectedObjects } = useUIStore();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [renameKey, setRenameKey] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const filteredObjects = useMemo(() => {
    if (!searchQuery.trim()) return objects;
    const query = searchQuery.toLowerCase();
    return objects.filter((obj) =>
      getFileName(obj.key).toLowerCase().includes(query)
    );
  }, [objects, searchQuery]);

  const filteredPrefixes = useMemo(() => {
    if (!searchQuery.trim()) return prefixes;
    const query = searchQuery.toLowerCase();
    return prefixes.filter((prefix) =>
      getFileName(prefix).toLowerCase().includes(query)
    );
  }, [prefixes, searchQuery]);

  const handleSelectAll = useCallback(() => {
    setSelectedObjects(filteredObjects.map((o) => o.key));
  }, [filteredObjects, setSelectedObjects]);

  const handleDelete = useCallback(() => {
    if (selectedObjects.length > 0) {
      setDeleteOpen(true);
    }
  }, [selectedObjects]);

  const handleRename = useCallback(() => {
    if (selectedObjects.length === 1) {
      setRenameKey(selectedObjects[0]);
    }
  }, [selectedObjects]);

  useKeyboardShortcuts({
    onDelete: handleDelete,
    onRename: handleRename,
    onSelectAll: handleSelectAll,
  });

  const handleFilesDropped = useCallback(
    async (files: File[]) => {
      if (!activeConnectionId || !activeBucket || isUploading) return;

      setIsUploading(true);
      let successCount = 0;
      let failCount = 0;

      try {
        for (const file of files) {
          try {
            // Read file as array buffer
            const arrayBuffer = await file.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);

            // Write to temp file
            const tempPath = await tempDir();
            const tempFilePath = `${tempPath}baul-upload-${Date.now()}-${file.name}`;
            await writeFile(tempFilePath, uint8Array);

            // Upload via Tauri command
            const key = currentPath + file.name;
            await commands.uploadFile(
              activeConnectionId,
              activeBucket,
              key,
              tempFilePath
            );

            successCount++;
          } catch (err) {
            console.error(`Failed to upload ${file.name}:`, err);
            failCount++;
          }
        }

        // Refresh the object list
        queryClient.invalidateQueries({
          queryKey: ["objects", activeConnectionId, activeBucket],
        });

        if (successCount > 0) {
          toast({
            title: "Upload complete",
            description: `Successfully uploaded ${successCount} file(s)${failCount > 0 ? `, ${failCount} failed` : ""}`,
          });
        } else if (failCount > 0) {
          toast({
            title: "Upload failed",
            description: `Failed to upload ${failCount} file(s)`,
            variant: "destructive",
          });
        }
      } finally {
        setIsUploading(false);
      }
    },
    [activeConnectionId, activeBucket, currentPath, isUploading, queryClient, toast]
  );

  if (isLoading) {
    return (
      <div className="p-4 space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-4 max-w-md px-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-destructive" />
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Failed to load objects</h3>
            <p className="text-sm text-muted-foreground">{String(error)}</p>
          </div>
        </div>
      </div>
    );
  }

  if (objects.length === 0 && prefixes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-4 max-w-md px-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <FolderOpen className="w-6 h-6 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">No objects found</h3>
            <p className="text-sm text-muted-foreground">
              This location is empty. Upload files or create a folder to get
              started.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (searchQuery && filteredObjects.length === 0 && filteredPrefixes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-4 max-w-md px-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <SearchX className="w-6 h-6 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">No matches found</h3>
            <p className="text-sm text-muted-foreground">
              No objects match "{searchQuery}". Try a different search term.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <DropZone onFilesDropped={handleFilesDropped} disabled={isUploading || !activeBucket}>
        {viewMode === "list" ? (
          <ObjectTable
            objects={filteredObjects}
            prefixes={filteredPrefixes}
            hasMore={hasMore}
            isFetchingMore={isFetchingMore}
            onLoadMore={loadMore}
          />
        ) : (
          <ObjectGrid
            objects={filteredObjects}
            prefixes={filteredPrefixes}
            hasMore={hasMore}
            isFetchingMore={isFetchingMore}
            onLoadMore={loadMore}
          />
        )}
      </DropZone>

      <DeleteDialog open={deleteOpen} onOpenChange={setDeleteOpen} />
      <RenameDialog
        open={!!renameKey}
        onOpenChange={(open) => !open && setRenameKey(null)}
        objectKey={renameKey || ""}
      />
    </>
  );
}
