export const capitialize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

// Format "last seen" like WhatsApp: "just now", "5m ago", "2h ago", "Yesterday", "Mon", "12/08/25"
export const formatLastSeen = (timestamp) => {
  if (!timestamp) return "Offline";
  const d = new Date(timestamp);
  const now = new Date();
  const diffMs = now - d;
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString([], { day: "2-digit", month: "2-digit", year: "2-digit" });
};

// Format time like WhatsApp: "9:45 PM", "Yesterday", "Mon", "12/08/25"
export const formatChatTime = (timestamp) => {
  if (!timestamp) return "";
  const d = new Date(timestamp);
  const now = new Date();
  const diffMs = now - d;
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffDays = Math.floor(diffMs / 86400000);

  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  if (diffMinutes < 1) return "now";
  if (isToday)
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (isYesterday) return "Yesterday";
  if (diffDays < 7)
    return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { day: "2-digit", month: "2-digit", year: "2-digit" });
};