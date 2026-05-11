const User = require('../../models/user');
const Settings = require('../../models/settings');
const { DAILY_REWARDS } = require('./userUtils');

const registerStreakHandlers = (socket) => {
  socket.on('user:getDailyStreak', async (telegramId) => {
    try {
      const user = await User.findOne({ telegramId: parseInt(telegramId) });
      if (!user) return socket.emit('user:dailyStreakStatus', { success: false, error: 'User not found' });

      const now = new Date();
      const lastClaim = user.lastDailyReward ? new Date(user.lastDailyReward) : null;
      let streak = user.dailyStreak || 0;
      let canClaim = false;

      if (!lastClaim) {
        canClaim = true;
        streak = 0;
      } else {
        const today = new Date(now.setHours(0, 0, 0, 0));
        const lastClaimDate = new Date(new Date(lastClaim).setHours(0, 0, 0, 0));
        const diffDays = Math.ceil(Math.abs(today - lastClaimDate) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) canClaim = false;
        else if (diffDays === 1) canClaim = true;
        else {
          canClaim = true;
          streak = 0;
        }
      }

      if (streak >= 7) streak = 0;

      socket.emit('user:dailyStreakStatus', {
        success: true,
        streak,
        canClaim,
        reward: DAILY_REWARDS[streak],
        nextReward: DAILY_REWARDS[streak] || DAILY_REWARDS[0],
        lastClaimDate: user.lastDailyReward
      });
    } catch (error) {
      console.error('Error checking streak:', error);
      socket.emit('user:dailyStreakStatus', { success: false, error: error.message });
    }
  });

  socket.on('user:claimDailyStreak', async (telegramId) => {
    try {
      const user = await User.findOne({ telegramId: parseInt(telegramId) });
      if (!user) return socket.emit('user:dailyStreakClaimed', { success: false, error: 'User not found' });

      const now = new Date();
      const lastClaim = user.lastDailyReward ? new Date(user.lastDailyReward) : null;
      let streak = user.dailyStreak || 0;

      if (lastClaim) {
        const today = new Date(now.setHours(0, 0, 0, 0));
        const lastClaimDate = new Date(new Date(lastClaim).setHours(0, 0, 0, 0));
        const diffDays = Math.ceil(Math.abs(today - lastClaimDate) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return socket.emit('user:dailyStreakClaimed', { success: false, error: 'Already claimed today' });
        if (diffDays > 1) streak = 0;
      } else streak = 0;

      if (streak >= 7) streak = 0;

      const rewardAmount = DAILY_REWARDS[streak];
      user.PHMN = (user.PHMN || 0) + rewardAmount;
      user.dailyStreak = streak + 1;
      user.lastDailyReward = new Date();

      await user.save();

      if (user.dailyStreak === 7) {
        await Settings.deleteOne({ key: 'raffleWinner' });
      }

      socket.emit('user:dailyStreakClaimed', {
        success: true,
        reward: rewardAmount,
        newBalance: user.PHMN,
        nextStreak: user.dailyStreak,
        message: `Claimed ${rewardAmount} PHMN!`
      });
    } catch (error) {
      console.error('Error claiming streak:', error);
      socket.emit('user:dailyStreakClaimed', { success: false, error: error.message });
    }
  });
};

module.exports = { registerStreakHandlers };
