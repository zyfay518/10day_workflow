export function getDimensionIconName(dimensionName: string, iconName?: string | null) {
  if (iconName && iconName.trim().length > 0) return iconName;

  const name = (dimensionName || '').toLowerCase();

  if (name.includes('work') || name.includes('工作')) return 'work';
  if (name.includes('study') || name.includes('read') || name.includes('学习') || name.includes('阅读')) return 'auto_stories';
  if (name.includes('health') || name.includes('健康')) return 'health_and_safety';
  if (name.includes('wealth') || name.includes('finance') || name.includes('开销') || name.includes('财')) return 'payments';
  if (name.includes('family') || name.includes('relationship') || name.includes('家')) return 'diversity_3';

  // soft, minimal fallback (avoid circle-dot / brain)
  return 'lightbulb';
}
