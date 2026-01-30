import { Database, Settings, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useConnectionHealth, type ConnectionHealth } from "@/hooks/useConnectionHealth";

interface ConnectionItemProps {
  id: string;
  name: string;
  isActive: boolean;
  sidebarCollapsed: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function HealthIndicator({ health }: { health: ConnectionHealth }) {
  const getColor = () => {
    switch (health) {
      case "healthy":
        return "bg-green-500";
      case "unhealthy":
        return "bg-red-500";
      case "checking":
        return "bg-yellow-500 animate-pulse";
      default:
        return "bg-gray-400";
    }
  };

  const getLabel = () => {
    switch (health) {
      case "healthy":
        return "Connected";
      case "unhealthy":
        return "Connection failed";
      case "checking":
        return "Checking...";
      default:
        return "Unknown";
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("w-2 h-2 rounded-full shrink-0", getColor())} />
      </TooltipTrigger>
      <TooltipContent side="right">
        <p>{getLabel()}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function ConnectionItem({
  id,
  name,
  isActive,
  sidebarCollapsed,
  onSelect,
  onDelete,
}: ConnectionItemProps) {
  const health = useConnectionHealth(isActive ? id : null);

  return (
    <div className="group relative">
      <Button
        variant={isActive ? "secondary" : "ghost"}
        className={cn(
          "w-full justify-start gap-2",
          sidebarCollapsed && "justify-center px-0"
        )}
        onClick={onSelect}
      >
        <Database className="h-4 w-4 shrink-0" />
        {!sidebarCollapsed && (
          <>
            <span className="truncate flex-1 text-left">{name}</span>
            {isActive && <HealthIndicator health={health} />}
          </>
        )}
      </Button>

      {!sidebarCollapsed && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 opacity-0 group-hover:opacity-100"
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="text-destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
