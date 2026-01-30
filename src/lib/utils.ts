import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString();
}

export function getFileExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

export function isFolder(key: string): boolean {
  return key.endsWith("/");
}

export function getFileName(key: string): string {
  const parts = key.split("/").filter(Boolean);
  return parts[parts.length - 1] || key;
}

export function getParentPath(path: string): string {
  const parts = path.split("/").filter(Boolean);
  parts.pop();
  return parts.length ? parts.join("/") + "/" : "";
}
