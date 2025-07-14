export const formatChatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();

  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays <= 7) {
    return 'Last week';
  } else if (diffDays <= 30) {
    return 'Last month';
  } else if (diffDays <= 365) {
    return 'Last year';
  } else {
    return date.toLocaleDateString(); // Fallback for older dates
  }
};
