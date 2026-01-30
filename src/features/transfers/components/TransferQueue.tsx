import { useMemo } from "react";
import { ChevronDown, ChevronUp, Trash2, X } from "lucide-react";
import { useTransferStore } from "@/stores/transferStore";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TransferItem } from "./TransferItem";
import { cn } from "@/lib/utils";

export function TransferQueue() {
  const {
    transfers,
    isQueueVisible,
    toggleQueueVisibility,
    setQueueVisible,
    removeTransfer,
    clearCompleted,
    clearAll,
  } = useTransferStore();

  const activeTransfers = useMemo(
    () => transfers.filter((t) => t.status === "queued" || t.status === "in_progress"),
    [transfers]
  );

  const completedTransfers = useMemo(
    () => transfers.filter((t) => t.status === "completed" || t.status === "failed"),
    [transfers]
  );

  if (transfers.length === 0) {
    return null;
  }

  const overallProgress =
    activeTransfers.length > 0
      ? activeTransfers.reduce((sum, t) => sum + t.progress, 0) / activeTransfers.length
      : 100;

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 w-80 bg-card border rounded-lg shadow-lg overflow-hidden transition-all duration-200 z-50",
        isQueueVisible ? "max-h-[400px]" : "max-h-12"
      )}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 bg-muted/50 cursor-pointer"
        onClick={toggleQueueVisibility}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            Transfers ({activeTransfers.length} active)
          </span>
          {activeTransfers.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {Math.round(overallProgress)}%
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              clearAll();
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              setQueueVisible(false);
            }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
          {isQueueVisible ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronUp className="h-4 w-4" />
          )}
        </div>
      </div>

      {/* Mini progress bar when collapsed */}
      {!isQueueVisible && activeTransfers.length > 0 && (
        <Progress value={overallProgress} className="h-1 rounded-none" />
      )}

      {/* Content */}
      {isQueueVisible && (
        <>
          <ScrollArea className="max-h-[300px]">
            {transfers.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No transfers
              </div>
            ) : (
              transfers.map((transfer) => (
                <TransferItem
                  key={transfer.id}
                  transfer={transfer}
                  onRemove={() => removeTransfer(transfer.id)}
                />
              ))
            )}
          </ScrollArea>

          {/* Footer */}
          {completedTransfers.length > 0 && (
            <div className="px-3 py-2 border-t bg-muted/30">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={clearCompleted}
              >
                Clear completed ({completedTransfers.length})
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
