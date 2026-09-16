// Decoration achievement system

export function checkDecorationAchievements(data) {
  const achievements = [];

  if ((data?.score || 0) >= 90) {
    achievements.push('top_design');
  }

  if ((data?.furnitureCount || 0) >= 50) {
    achievements.push('collector');
  }

  return achievements;
}
