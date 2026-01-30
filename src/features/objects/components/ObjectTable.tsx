import { useState, useRef, useCallback, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Folder, File, Download, Trash2, MoreHorizontal, Eye, Pencil, Info, Share2, Copy, Link, Loader2 } from "lucide-react";
import { save } from "@tauri-apps/plugin-dialog";
import { commands } from "@/lib/tauri";
import { useConnectionStore } from "@/stores/connectionStore";
import { useUIStore } from "@/stores/uiStore";
import { useTransferStore } from "@/stores/transferStore";
import { formatBytes, formatDate, getFileName } from "@/lib/utils";
import type { S3Object } from "@/types/object";
import { PreviewDialog } from "./PreviewDialog";
import { RenameDialog } from "./RenameDialog";
import { MetadataDialog } from "./MetadataDialog";
import { ShareDialog } from "./ShareDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { useCopyToClipboard } from "@/hooks/useKeyboardShortcuts";
import {
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";

interface ObjectTableProps {
  objects: S3Object[];
  prefixes: string[];
  hasMore?: boolean;
  isFetchingMore?: boolean;
  onLoadMore?: () => void;
}

type RowItem = { type: "prefix"; prefix: string } | { type: "object"; object: S3Object };

export function ObjectTable({ objects, prefixes, hasMore, isFetchingMore, onLoadMore }: ObjectTableProps) {
  const { toast } = useToast();
  const { activeConnectionId, activeBucket, navigateToPath } =
    useConnectionStore();
  const { selectedObjects, toggleObjectSelection, setSelectedObjects } =
    useUIStore();
  const [previewObject, setPreviewObject] = useState<S3Object | null>(null);
  const [renameKey, setRenameKey] = useState<string | null>(null);
  const [metadataObject, setMetadataObject] = useState<S3Object | null>(null);
  const [shareKey, setShareKey] = useState<string | null>(null);
  const copyToClipboard = useCopyToClipboard();
  const { addTransfer, updateTransfer } = useTransferStore();

  // Combine prefixes and objects into a single list for virtualization
  const allItems: RowItem[] = [
    ...prefixes.map((prefix): RowItem => ({ type: "prefix", prefix })),
    ...objects.map((object): RowItem => ({ type: "object", object })),
  ];

  // Virtualization setup
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: allItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 10,
  });

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

  const handleCopyPath = async (key: string) => {
    const path = `${activeBucket}/${key}`;
    const success = await copyToClipboard(path);
    if (success) {
      toast({ title: "Path copied to clipboard" });
    }
  };

  const handleCopyS3Uri = async (key: string) => {
    const uri = `s3://${activeBucket}/${key}`;
    const success = await copyToClipboard(uri);
    if (success) {
      toast({ title: "S3 URI copied to clipboard" });
    }
  };

  const handleDownload = async (key: string, size?: number) => {
    if (!activeConnectionId || !activeBucket) return;

    const fileName = getFileName(key);
    const destination = await save({
      defaultPath: fileName,
      title: "Save file as",
    });

    if (!destination) return;

    // Add to transfer queue
    const transferId = addTransfer({
      type: "download",
      fileName,
      bucket: activeBucket,
      key,
      totalBytes: size || 0,
    });

    updateTransfer(transferId, {
      status: "in_progress",
      startedAt: Date.now(),
    });

    try {
      await commands.downloadFile(
        activeConnectionId,
        activeBucket,
        key,
        destination
      );

      updateTransfer(transferId, {
        status: "completed",
        progress: 100,
        bytesTransferred: size || 0,
        completedAt: Date.now(),
      });

      toast({
        title: "Download complete",
        description: `${fileName} downloaded successfully`,
      });
    } catch (error) {
      updateTransfer(transferId, {
        status: "failed",
        error: String(error),
        completedAt: Date.now(),
      });

      toast({
        title: "Download failed",
        description: String(error),
        variant: "destructive",
      });
    }
  };

  const handleFolderClick = (prefix: string) => {
    navigateToPath(prefix);
  };

  const allSelected =
    objects.length > 0 && selectedObjects.length === objects.length;
  const someSelected = selectedObjects.length > 0 && !allSelected;

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedObjects([]);
    } else {
      setSelectedObjects(objects.map((o) => o.key));
    }
  };

  return (
    <>
    <div ref={parentRef} className="h-full overflow-auto">
      <Table>
        <TableHeader className="sticky top-0 bg-background z-10">
          <TableRow>
            <TableHead className="w-[40px]">
              <Checkbox
                checked={allSelected}
                indeterminate={someSelected}
                onCheckedChange={handleSelectAll}
              />
            </TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="w-[100px]">Size</TableHead>
            <TableHead className="w-[180px]">Modified</TableHead>
            <TableHead className="w-[60px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <tr style={{ height: virtualizer.getVirtualItems()[0]?.start ?? 0 }} />
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const item = allItems[virtualRow.index];
            if (item.type === "prefix") {
              return (
                <TableRow
                  key={item.prefix}
                  data-index={virtualRow.index}
                  className="cursor-pointer"
                  onDoubleClick={() => handleFolderClick(item.prefix)}
                  style={{ height: 48 }}
                >
                  <TableCell></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Folder className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">{getFileName(item.prefix)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">--</TableCell>
                  <TableCell className="text-muted-foreground">--</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              );
            }

            const object = item.object;
            return (
              <TableRow
                key={object.key}
                data-index={virtualRow.index}
                className="cursor-pointer"
                onDoubleClick={() => setPreviewObject(object)}
                style={{ height: 48 }}
              >
                <TableCell>
                  <Checkbox
                    checked={selectedObjects.includes(object.key)}
                    onCheckedChange={() => toggleObjectSelection(object.key)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <File className="h-4 w-4 text-muted-foreground" />
                    <span>{getFileName(object.key)}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatBytes(object.size)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {object.lastModified ? formatDate(object.lastModified) : "--"}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setPreviewObject(object)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setMetadataObject(object)}>
                        <Info className="h-4 w-4 mr-2" />
                        Metadata
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShareKey(object.key)}>
                        <Share2 className="h-4 w-4 mr-2" />
                        Share
                      </DropdownMenuItem>
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                          <DropdownMenuItem onClick={() => handleCopyPath(object.key)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Copy Path
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCopyS3Uri(object.key)}>
                            <Link className="h-4 w-4 mr-2" />
                            Copy S3 URI
                          </DropdownMenuItem>
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                      <DropdownMenuItem onClick={() => handleDownload(object.key, object.size)}>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setRenameKey(object.key)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => toggleObjectSelection(object.key)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
          <tr style={{ height: Math.max(0, virtualizer.getTotalSize() - (virtualizer.getVirtualItems()[virtualizer.getVirtualItems().length - 1]?.end ?? 0)) }} />
        </TableBody>
      </Table>

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
      onDownload={(key) => handleDownload(key, previewObject?.size)}
    />

    <RenameDialog
      open={!!renameKey}
      onOpenChange={(open) => !open && setRenameKey(null)}
      objectKey={renameKey || ""}
    />

    <MetadataDialog
      open={!!metadataObject}
      onOpenChange={(open) => !open && setMetadataObject(null)}
      object={metadataObject}
      connectionId={activeConnectionId!}
      bucket={activeBucket!}
    />

    <ShareDialog
      open={!!shareKey}
      onOpenChange={(open) => !open && setShareKey(null)}
      objectKey={shareKey || ""}
    />
    </>
  );
}
