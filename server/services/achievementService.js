import { Achievement, UserAchievement } from '../models/index.js';
export function meetsRequirement(user, achievement) {
  const value = ['CSS', 'JavaScript'].includes(achievement.metric) ? user.categorySolved[achievement.metric] : user[achievement.metric];
  return value >= achievement.threshold;
}
export async function awardAchievements(user, session) {
  const definitions = await Achievement.find().session(session);
  const awarded = [];
  for (const achievement of definitions) {
    if (!meetsRequirement(user, achievement)) continue;
    const result = await UserAchievement.updateOne({ userId: user._id, achievementId: achievement._id }, { $setOnInsert: { earnedAt: new Date() } }, { upsert: true, session });
    if (result.upsertedCount) awarded.push(achievement);
  }
  return awarded;
}
