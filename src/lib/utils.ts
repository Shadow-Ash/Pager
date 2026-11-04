export function formatTimeAgo(dateString: string | Date): string {
  const timestamp = new Date(dateString).getTime();
  if (!Number.isFinite(timestamp)) return "Unknown time";

  const diffSeconds = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSeconds < 60) return diffSeconds < 0 ? "now" : "1m";
  const minutes = Math.floor(diffSeconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${Math.max(1, months)}mo`;
  return `${Math.floor(months / 12)}y`;
}
