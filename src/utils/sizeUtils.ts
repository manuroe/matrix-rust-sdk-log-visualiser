/**
 * Convert a size string from log output (e.g. "48B", "38.8k", "1.2M") to bytes.
 * Uses 1024-based multipliers to match the formatBytes display helper.
 */
export function parseSizeString(sizeStr: string): number {
  if (!sizeStr) return 0;
  const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*([BbkKmMgG]?)$/);
  if (!match) return 0;
  const value = parseFloat(match[1]);
  if (Number.isNaN(value)) return 0;
  const unit = match[2].toLowerCase();
  switch (unit) {
    case 'k': return Math.round(value * 1_024);
    case 'm': return Math.round(value * 1_048_576);
    case 'g': return Math.round(value * 1_073_741_824);
    default: return Math.round(value); // 'b' or no unit
  }
}

/**
 * Format a byte count as a human-readable string (e.g. "1.2 MB", "38.8 KB").
 * Uses 1024-based multipliers.
 */
export function formatBytes(bytes: number): string {
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1_024) return `${(bytes / 1_024).toFixed(1)} KB`;
  return `${bytes} B`;
}
