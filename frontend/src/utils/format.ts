/**
 * Formats a file size in bytes to a human-readable string
 * @param bytes - The size in bytes
 * @returns Formatted string (e.g., "1.2 MB", "456 KB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
