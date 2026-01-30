import { cn } from "@/lib/utils";

interface AppIconProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function AppIcon({ className, size = "md" }: AppIconProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <img
      src="/icons/32x32.png"
      alt="Baul"
      className={cn(sizeClasses[size], className)}
    />
  );
}
