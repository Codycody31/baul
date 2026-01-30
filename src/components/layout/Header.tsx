import { RefreshCw, Upload, FolderPlus, Trash2, Grid, List, Search, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useConnectionStore } from "@/stores/connectionStore";
import { useUIStore } from "@/stores/uiStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { BreadcrumbNav } from "@/features/objects/components/BreadcrumbNav";
import { UploadDialog } from "@/features/objects/components/UploadDialog";
import { CreateFolderDialog } from "@/features/objects/components/CreateFolderDialog";
import { DeleteDialog } from "@/features/objects/components/DeleteDialog";
import { useState } from "react";

export function Header() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { activeConnectionId, activeBucket } = useConnectionStore();
  const { viewMode, setViewMode, selectedObjects, searchQuery, setSearchQuery } = useUIStore();
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["objects"] });
  };

  const showBrowserControls = activeConnectionId && activeBucket;

  return (
    <header className="flex h-14 items-center justify-between border-b px-4">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {showBrowserControls && <BreadcrumbNav />}
        {showBrowserControls && (
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Filter objects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-8 h-8"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>

      {showBrowserControls && (
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8 rounded-r-none"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8 rounded-l-none"
              onClick={() => setViewMode("grid")}
            >
              <Grid className="h-4 w-4" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6" />

          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleRefresh}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setCreateFolderOpen(true)}
          >
            <FolderPlus className="h-4 w-4" />
            New Folder
          </Button>

          <Button
            variant="default"
            size="sm"
            className="gap-2"
            onClick={() => setUploadOpen(true)}
          >
            <Upload className="h-4 w-4" />
            Upload
          </Button>

          {selectedObjects.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              className="gap-2"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
              Delete ({selectedObjects.length})
            </Button>
          )}
        </div>
      )}

      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
      <CreateFolderDialog
        open={createFolderOpen}
        onOpenChange={setCreateFolderOpen}
      />
      <DeleteDialog open={deleteOpen} onOpenChange={setDeleteOpen} />
    </header>
  );
}
