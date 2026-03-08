const COLORS = [
  '#F44336', // red
  '#E91E63', // pink
  '#9C27B0', // purple
  '#3F51B5', // indigo
  '#2196F3', // blue
  '#009688', // teal
  '#4CAF50', // green
  '#FF9800', // orange
  '#795548', // brown
  '#607D8B', // blue-grey
];

export function getUserColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}
