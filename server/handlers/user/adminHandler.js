const User = require('../../models/user');
const Settings = require('../../models/settings');
const { getEffectiveMiningRate } = require('./userUtils');

const registerAdminHandlers = (socket) => {
  socket.on('admin:getMiningStats', async (data, callback) => {
    try {
      const now = new Date();
      const allMiners = await User.find({
        miningSessionStartTime: { $ne: null },
        miningSessionEndTime: { $ne: null }
      }).select('telegramId first_name last_name username miningSessionStartTime miningSessionEndTime miningSessionPendingRewards miningRate miningLevel PHMN activeBoost miningRateBoostFromAds');

      const activeSessions = allMiners.filter(user => new Date(user.miningSessionEndTime) > now);

      const totalPlayers = activeSessions.length;
      const totalMined = activeSessions.reduce((sum, user) => {
        const startTime = new Date(user.miningSessionStartTime);
        const endTime = new Date(user.miningSessionEndTime);
        const elapsedHours = (now - startTime) / (1000 * 60 * 60);
        const totalSessionHours = (endTime - startTime) / (1000 * 60 * 60);
        const effectiveRate = getEffectiveMiningRate(user);
        const mined = Math.min(effectiveRate * totalSessionHours, effectiveRate * elapsedHours);
        return sum + Math.max(0, mined);
      }, 0);

      const players = activeSessions.map(user => {
        const startTime = new Date(user.miningSessionStartTime);
        const endTime = new Date(user.miningSessionEndTime);
        const elapsedHours = (now - startTime) / (1000 * 60 * 60);
        const totalSessionHours = (endTime - startTime) / (1000 * 60 * 60);
        const effectiveRate = getEffectiveMiningRate(user);
        const mined = Math.min(effectiveRate * totalSessionHours, effectiveRate * elapsedHours);

        return {
          telegramId: user.telegramId,
          name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || `User ${user.telegramId}`,
          username: user.username,
          miningLevel: user.miningLevel || 1,
          miningRate: effectiveRate,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          remainingHours: Math.max(0, (endTime - now) / (1000 * 60 * 60)),
          mined: Math.max(0, mined),
          totalPHMN: user.PHMN || 0
        };
      });

      players.sort((a, b) => b.mined - a.mined);

      const totalPHMNResult = await User.aggregate([
        { $group: { _id: null, totalPHMN: { $sum: { $ifNull: ['$PHMN', 0] } } } }
      ]);
      const totalPHMNBalance = totalPHMNResult.length > 0 ? totalPHMNResult[0].totalPHMN : 0;

      const streakAchievers = await User.find({ dailyStreak: { $gte: 7 } })
        .select('telegramId first_name last_name username').lean();

      const processedStreakAchievers = streakAchievers.map(user => ({
        telegramId: user.telegramId,
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || `User ${user.telegramId}`
      }));

      const winnerSetting = await Settings.findOne({ key: 'raffleWinner' });

      callback && callback({
        success: true,
        totalPlayers,
        totalMined,
        totalPHMNBalance,
        players,
        streakAchievers: processedStreakAchievers,
        raffleWinner: winnerSetting ? winnerSetting.value : null,
        lastUpdated: now.toISOString()
      });
    } catch (error) {
      console.error('Error getting admin mining stats:', error);
      callback && callback({ success: false, error: error.message });
    }
  });

  socket.on('admin:pickRaffleWinner', async (data, callback) => {
    try {
      const achievers = await User.find({ dailyStreak: { $gte: 7 } })
        .select('telegramId first_name last_name username').lean();

      if (achievers.length === 0) return callback && callback({ success: false, error: 'No achievers found' });

      const winner = achievers[Math.floor(Math.random() * achievers.length)];
      const winnerName = `${winner.first_name || ''} ${winner.last_name || ''}`.trim() || winner.username || `User ${winner.telegramId}`;

      await Settings.findOneAndUpdate(
        { key: 'raffleWinner' },
        { value: winnerName, updatedAt: new Date() },
        { upsert: true }
      );

      callback && callback({ success: true, winnerName, winnerId: winner.telegramId });
    } catch (error) {
      console.error('Error picking winner:', error);
      callback && callback({ success: false, error: error.message });
    }
  });
};

module.exports = { registerAdminHandlers };
