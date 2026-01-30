import { useState, useCallback, type ReactNode, type DragEvent } from "react";
import { Upload } from "lucide-react";

interface DropZoneProps {
  children: ReactNode;
  onFilesDropped: (files: File[]) => void;
  disabled?: boolean;
}

export function DropZone({ children, onFilesDropped, disabled }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  void dragCounter; // Used in callbacks for tracking enter/leave events

  const handleDragEnter = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;

      setDragCounter((prev) => prev + 1);
      if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
        setIsDragging(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;

      setDragCounter((prev) => {
        const newCount = prev - 1;
        if (newCount === 0) {
          setIsDragging(false);
        }
        return newCount;
      });
    },
    [disabled]
  );

  const handleDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;
    },
    [disabled]
  );

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;

      setIsDragging(false);
      setDragCounter(0);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        onFilesDropped(files);
      }
    },
    [disabled, onFilesDropped]
  );

  return (
    <div
      className="relative h-full"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}

      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm border-2 border-dashed border-primary rounded-lg">
          <div className="flex flex-col items-center gap-4 text-center p-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Drop files to upload</h3>
              <p className="text-sm text-muted-foreground">
                Release to start uploading
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
