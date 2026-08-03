export function generateMockSku(category: string): string {
  const prefix = category.substring(0, 3).toUpperCase() || 'EQ';
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}-${rand}`;
}
