/** How many bytes a text takes once saved as UTF-8, as the download is. */
export function utf8Bytes(text: string): number {
  return new TextEncoder().encode(text).length;
}

/** "96 KB", "1.2 MB", in the reader's number format; under 1 KB counts as 1 KB. For a rough "≈" next to the row count. */
export function formatFileSize(bytes: number, language: string): string {
  const megabytes = bytes / (1024 * 1024);
  if (megabytes >= 1) return `${new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format(megabytes)} MB`;
  return `${new Intl.NumberFormat(language).format(Math.max(1, Math.round(bytes / 1024)))} KB`;
}
