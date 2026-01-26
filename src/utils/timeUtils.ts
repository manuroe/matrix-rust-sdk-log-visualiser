export function timeToMs(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m, s] = timeStr.split(':').map(parseFloat);
  return h * 3600000 + m * 60000 + s * 1000;
}

export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
