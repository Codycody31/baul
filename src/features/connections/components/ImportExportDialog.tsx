import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { save, open as openFile } from "@tauri-apps/plugin-dialog";
import { writeTextFile, readTextFile } from "@tauri-apps/plugin-fs";
import { Download, Upload, Loader2, FileJson, AlertTriangle } from "lucide-react";
import { commands } from "@/lib/tauri";
import { useConnectionStore } from "@/stores/connectionStore";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";

interface ImportExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportExportDialog({ open, onOpenChange }: ImportExportDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { setConnections, connections } = useConnectionStore();
  const [activeTab, setActiveTab] = useState<"export" | "import">("export");

  const exportMutation = useMutation({
    mutationFn: async () => {
      const json = await commands.exportConnections();

      const destination = await save({
        defaultPath: "baul-connections.json",
        filters: [{ name: "JSON", extensions: ["json"] }],
      });

      if (!destination) {
        throw new Error("Export cancelled");
      }

      await writeTextFile(destination, json);
      return destination;
    },
    onSuccess: (path) => {
      toast({
        title: "Export successful",
        description: `Connections exported to ${path}`,
      });
      onOpenChange(false);
    },
    onError: (error) => {
      if (String(error) !== "Export cancelled") {
        toast({
          title: "Export failed",
          description: String(error),
          variant: "destructive",
        });
      }
    },
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      const filePath = await openFile({
        multiple: false,
        filters: [{ name: "JSON", extensions: ["json"] }],
      });

      if (!filePath) {
        throw new Error("Import cancelled");
      }

      const json = await readTextFile(filePath as string);
      const imported = await commands.importConnections(json);

      // Refresh connections
      const allConnections = await commands.listConnections();
      setConnections(allConnections);

      return imported.length;
    },
    onSuccess: (count) => {
      toast({
        title: "Import successful",
        description: `Imported ${count} connection(s). Note: You'll need to re-enter the secret keys.`,
      });
      queryClient.invalidateQueries({ queryKey: ["connections"] });
      onOpenChange(false);
    },
    onError: (error) => {
      if (String(error) !== "Import cancelled") {
        toast({
          title: "Import failed",
          description: String(error),
          variant: "destructive",
        });
      }
    },
  });

  const isPending = exportMutation.isPending || importMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Import / Export Connections</DialogTitle>
          <DialogDescription>
            Backup or restore your connection configurations
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v: string) => setActiveTab(v as "export" | "import")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="export">Export</TabsTrigger>
            <TabsTrigger value="import">Import</TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="space-y-4 pt-4">
            <div className="flex items-center gap-4 p-4 border rounded-lg">
              <FileJson className="h-10 w-10 text-muted-foreground" />
              <div className="flex-1">
                <p className="font-medium">Export {connections.length} connection(s)</p>
                <p className="text-sm text-muted-foreground">
                  Save as a JSON file to backup or share
                </p>
              </div>
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Secret keys are NOT included in exports for security reasons.
                Recipients will need to enter their own credentials.
              </AlertDescription>
            </Alert>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => exportMutation.mutate()}
                disabled={isPending || connections.length === 0}
              >
                {exportMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Export
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="import" className="space-y-4 pt-4">
            <div className="flex items-center gap-4 p-4 border rounded-lg border-dashed">
              <Upload className="h-10 w-10 text-muted-foreground" />
              <div className="flex-1">
                <p className="font-medium">Import from file</p>
                <p className="text-sm text-muted-foreground">
                  Select a Baul connections JSON file
                </p>
              </div>
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Imported connections will be added to your existing list.
                You'll need to edit each connection to add the secret key.
              </AlertDescription>
            </Alert>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={() => importMutation.mutate()} disabled={isPending}>
                {importMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Import
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
