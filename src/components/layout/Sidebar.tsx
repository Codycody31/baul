import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  RefreshCw,
  FileJson,
} from "lucide-react";
import { commands } from "@/lib/tauri";
import { useConnectionStore } from "@/stores/connectionStore";
import { useUIStore } from "@/stores/uiStore";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useActiveConnectionHealthCheck } from "@/hooks/useConnectionHealth";
import { ConnectionDialog } from "@/features/connections/components/ConnectionDialog";
import { ImportExportDialog } from "@/features/connections/components/ImportExportDialog";
import { CreateBucketDialog } from "@/features/buckets/components/CreateBucketDialog";
import { DeleteBucketDialog } from "@/features/buckets/components/DeleteBucketDialog";
import { BucketItem } from "@/features/buckets/components/BucketItem";
import { ThemeToggle } from "./ThemeToggle";
import { ConnectionItem } from "./ConnectionItem";
import { QuickAccessSection } from "./QuickAccessSection";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Sidebar() {
  const [connectionDialogOpen, setConnectionDialogOpen] = useState(false);
  const [importExportOpen, setImportExportOpen] = useState(false);
  const [createBucketOpen, setCreateBucketOpen] = useState(false);
  const [deleteBucketOpen, setDeleteBucketOpen] = useState(false);
  const [bucketToDelete, setBucketToDelete] = useState("");

  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const {
    connections,
    activeConnectionId,
    activeBucket,
    setActiveConnection,
    setActiveBucket,
    removeConnection,
  } = useConnectionStore();

  const queryClient = useQueryClient();

  // Health check for active connection
  useActiveConnectionHealthCheck();

  const deleteConnectionMutation = useMutation({
    mutationFn: commands.deleteConnection,
    onSuccess: (_, connectionId) => {
      removeConnection(connectionId);
      queryClient.invalidateQueries({ queryKey: ["connections"] });
    },
  });

  // Fetch buckets when a connection is selected
  const {
    data: buckets,
    isLoading: bucketsLoading,
    error: bucketsError,
    refetch: refetchBuckets,
  } = useQuery({
    queryKey: ["buckets", activeConnectionId],
    queryFn: () => commands.listBuckets(activeConnectionId!),
    enabled: !!activeConnectionId,
    staleTime: 60000, // 1 minute
  });

  const handleSelectBucket = (bucketName: string) => {
    setActiveBucket(bucketName);
  };

  const handleDeleteBucket = (bucketName: string) => {
    setBucketToDelete(bucketName);
    setDeleteBucketOpen(true);
  };

  return (
    <div
      className={cn(
        "flex flex-col border-r bg-card transition-all duration-200",
        sidebarCollapsed ? "w-14" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b px-3">
        {!sidebarCollapsed ? (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Archive className="h-4 w-4 text-primary" />
            </div>
            <span className="font-semibold tracking-tight">Baul</span>
          </div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mx-auto">
            <Archive className="h-4 w-4 text-primary" />
          </div>
        )}
        <Button variant="ghost" size="icon" className={cn(sidebarCollapsed && "hidden")} onClick={toggleSidebar}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {sidebarCollapsed && (
        <Button variant="ghost" size="icon" className="mx-auto mt-2" onClick={toggleSidebar}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}

      {/* Connections */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {!sidebarCollapsed && (
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Connections
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setImportExportOpen(true)}
                  title="Import/Export"
                >
                  <FileJson className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setConnectionDialogOpen(true)}
                  title="Add connection"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          {sidebarCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="w-full"
              onClick={() => setConnectionDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}

          <TooltipProvider>
            {connections.map((connection) => (
              <ConnectionItem
                key={connection.id}
                id={connection.id}
                name={connection.name}
                isActive={activeConnectionId === connection.id}
                sidebarCollapsed={sidebarCollapsed}
                onSelect={() => setActiveConnection(connection.id)}
                onDelete={() => deleteConnectionMutation.mutate(connection.id)}
              />
            ))}
          </TooltipProvider>
        </div>

        {/* Quick Access - Favorites & Recent */}
        {!sidebarCollapsed && (
          <>
            <Separator className="my-2" />
            <div className="p-2">
              <QuickAccessSection collapsed={sidebarCollapsed} />
            </div>
          </>
        )}

        {/* Buckets List */}
        {activeConnectionId && !sidebarCollapsed && (
          <>
            <Separator className="my-2" />
            <div className="p-2 space-y-1">
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Buckets
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setCreateBucketOpen(true)}
                    title="Create bucket"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => refetchBuckets()}
                    disabled={bucketsLoading}
                    title="Refresh buckets"
                  >
                    {bucketsLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>

              {bucketsLoading && (
                <div className="space-y-2 px-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              )}

              {bucketsError && (
                <div className="px-2 py-2 text-sm text-destructive">
                  Failed to load buckets
                </div>
              )}

              {!bucketsLoading && !bucketsError && buckets?.length === 0 && (
                <div className="px-2 py-2 text-sm text-muted-foreground">
                  No buckets found
                </div>
              )}

              {buckets?.map((bucket) => (
                <BucketItem
                  key={bucket.name}
                  name={bucket.name}
                  connectionId={activeConnectionId!}
                  isActive={activeBucket === bucket.name}
                  onSelect={() => handleSelectBucket(bucket.name)}
                  onDelete={() => handleDeleteBucket(bucket.name)}
                />
              ))}
            </div>
          </>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="border-t p-2">
        <ThemeToggle collapsed={sidebarCollapsed} />
      </div>

      <ConnectionDialog open={connectionDialogOpen} onOpenChange={setConnectionDialogOpen} />
      <ImportExportDialog open={importExportOpen} onOpenChange={setImportExportOpen} />
      <CreateBucketDialog open={createBucketOpen} onOpenChange={setCreateBucketOpen} />
      <DeleteBucketDialog
        open={deleteBucketOpen}
        onOpenChange={setDeleteBucketOpen}
        bucketName={bucketToDelete}
      />
    </div>
  );
}
