const User = require('../../models/user');
const { 
  MINING_LEVELS, 
  getMiningRateFromLevel, 
  getEffectiveMiningRate 
} = require('./userUtils');

const getMiningStats = async (telegramId) => {
  try {
    const user = await User.findOne({ telegramId: parseInt(telegramId) });
    if (!user) return null;

    const now = new Date();
    let sessionStatus = 'idle';
    let remainingTime = 0;
    let pendingRewards = 0;

    if (user.miningSessionStartTime && user.miningSessionEndTime) {
      if (now < user.miningSessionEndTime) {
        sessionStatus = 'active';
        remainingTime = Math.max(0, Math.floor((user.miningSessionEndTime - now) / 1000));
        const elapsedHours = (now - user.miningSessionStartTime) / (1000 * 60 * 60);
        const totalSessionHours = (user.miningSessionEndTime - user.miningSessionStartTime) / (1000 * 60 * 60);
        const effectiveMiningRate = getEffectiveMiningRate(user);
        const totalRewards = effectiveMiningRate * totalSessionHours;
        pendingRewards = Math.min(totalRewards, effectiveMiningRate * elapsedHours);
      } else {
        sessionStatus = 'completed';
        remainingTime = 0;
        pendingRewards = user.miningSessionPendingRewards || 0;
      }
    }

    return {
      sessionStatus,
      remainingTime,
      pendingRewards: Math.floor(pendingRewards),
      miningRate: getEffectiveMiningRate(user),
      miningLevel: user.miningLevel || 1,
      PHMN: user.PHMN || 0,
      updatedAt: user.updated_at
    };
  } catch (error) {
    console.error('Error in getMiningStats:', error);
    throw error;
  }
};

const registerMiningHandlers = (socket) => {
  socket.on('playMining:start', async (data, callback) => {
    try {
      const telegramId = data?.telegramId || socket.request.session?.telegramId;
      if (!telegramId) return callback && callback({ success: false, error: 'Not authenticated' });

      const user = await User.findOne({ telegramId: parseInt(telegramId) });
      if (!user) return callback && callback({ success: false, error: 'User not found' });

      if (user.miningSessionStartTime && user.miningSessionEndTime) {
        const now = new Date();
        if (now < user.miningSessionEndTime) {
          return callback && callback({ success: false, error: 'Mining session already in progress', sessionStatus: 'active' });
        }
        if (user.miningSessionPendingRewards > 0) {
          return callback && callback({ success: false, error: 'Please claim your previous mining rewards before starting a new session', sessionStatus: 'completed' });
        }
      }

      if (user.adsWatchedForCycle < 1) {
        return callback && callback({ success: false, error: 'Please watch 1 ad before starting mining', requiresAds: true, adsWatched: user.adsWatchedForCycle || 0, adsRequired: 1 });
      }

      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + (12 * 60 * 60 * 1000));

      user.miningSessionStartTime = startTime;
      user.miningSessionEndTime = endTime;
      user.miningSessionPendingRewards = 0;
      user.miningSessionReminderSent = false;
      user.adsWatchedForCycle = 0;

      const currentMiningLevel = user.miningLevel || 1;
      const baseMiningRate = getMiningRateFromLevel(currentMiningLevel);
      const effectiveMiningRate = getEffectiveMiningRate(user);

      if (user.miningRate !== baseMiningRate) {
        user.miningRate = baseMiningRate;
      }
      await user.save();

      const sessionDurationHours = 12;
      const estimatedRewards = effectiveMiningRate * sessionDurationHours;
      const remainingSeconds = 12 * 60 * 60;

      callback && callback({
        success: true,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        miningRate: effectiveMiningRate,
        baseMiningRate: baseMiningRate,
        miningLevel: currentMiningLevel,
        activeBoost: user.activeBoost && user.activeBoost.endTime && new Date() < new Date(user.activeBoost.endTime) ? {
          mode: user.activeBoost.mode,
          multiplier: user.activeBoost.multiplier
        } : null,
        estimatedRewards,
        remainingTime: remainingSeconds
      });
    } catch (error) {
      console.error('Error starting mining session:', error);
      callback && callback({ success: false, error: error.message });
    }
  });

  socket.on('playMining:status', async (data, callback) => {
    try {
      const telegramId = data?.telegramId || socket.request.session?.telegramId;
      if (!telegramId) return callback && callback({ success: false, error: 'Not authenticated' });

      const user = await User.findOne({ telegramId: parseInt(telegramId) });
      if (!user) return callback && callback({ success: false, error: 'User not found' });

      const now = new Date();
      let sessionStatus = 'idle';
      let remainingTime = 0;
      let pendingRewards = 0;

      const currentMiningLevel = user.miningLevel || 1;
      const baseMiningRate = getMiningRateFromLevel(currentMiningLevel);
      const effectiveMiningRate = getEffectiveMiningRate(user);

      if (user.miningSessionStartTime && user.miningSessionEndTime) {
        if (now < user.miningSessionEndTime) {
          sessionStatus = 'active';
          remainingTime = Math.max(0, Math.floor((user.miningSessionEndTime - now) / 1000));
          const elapsedHours = (now - user.miningSessionStartTime) / (1000 * 60 * 60);
          const totalSessionHours = (user.miningSessionEndTime - user.miningSessionStartTime) / (1000 * 60 * 60);
          const totalRewards = effectiveMiningRate * totalSessionHours;
          pendingRewards = Math.min(totalRewards, effectiveMiningRate * elapsedHours);
        } else {
          sessionStatus = 'completed';
          remainingTime = 0;
          const totalSessionHours = (user.miningSessionEndTime - user.miningSessionStartTime) / (1000 * 60 * 60);
          const calculatedRewards = effectiveMiningRate * totalSessionHours;

          if (user.miningSessionPendingRewards !== calculatedRewards) {
            user.miningSessionPendingRewards = calculatedRewards;
            await user.save();
          }
          pendingRewards = user.miningSessionPendingRewards;
        }
      }

      if (user.miningRate !== baseMiningRate) {
        user.miningRate = baseMiningRate;
        await user.save();
      }

      const isBoostActive = user.activeBoost && user.activeBoost.endTime && new Date() < new Date(user.activeBoost.endTime);

      callback && callback({
        success: true,
        sessionStatus,
        remainingTime,
        pendingRewards: Math.floor(pendingRewards),
        miningRate: effectiveMiningRate,
        baseMiningRate: baseMiningRate,
        miningLevel: currentMiningLevel,
        activeBoost: isBoostActive ? {
          mode: user.activeBoost.mode,
          multiplier: user.activeBoost.multiplier,
          endTime: user.activeBoost.endTime
        } : null,
        startTime: user.miningSessionStartTime ? user.miningSessionStartTime.toISOString() : null,
        endTime: user.miningSessionEndTime ? user.miningSessionEndTime.toISOString() : null,
        PHMN: user.PHMN || 0
      });
    } catch (error) {
      console.error('Error getting mining status:', error);
      callback && callback({ success: false, error: error.message });
    }
  });

  socket.on('playMining:claim', async (data, callback) => {
    try {
      const telegramId = data?.telegramId || socket.request.session?.telegramId;
      if (!telegramId) return callback && callback({ success: false, error: 'Not authenticated' });

      const user = await User.findOne({ telegramId: parseInt(telegramId) });
      if (!user) return callback && callback({ success: false, error: 'User not found' });

      if (!user.miningSessionStartTime || !user.miningSessionEndTime) {
        return callback && callback({ success: false, error: 'No mining session found' });
      }

      const now = new Date();
      if (now < user.miningSessionEndTime) {
        return callback && callback({ success: false, error: 'Mining session is still in progress' });
      }

      const effectiveMiningRate = getEffectiveMiningRate(user);

      if (user.miningSessionPendingRewards <= 0) {
        const totalSessionHours = (user.miningSessionEndTime - user.miningSessionStartTime) / (1000 * 60 * 60);
        user.miningSessionPendingRewards = effectiveMiningRate * (totalSessionHours || 12);
        await user.save();
      }

      const rewardsToClaim = user.miningSessionPendingRewards;
      user.PHMN = (user.PHMN || 0) + rewardsToClaim;
      user.miningSessionStartTime = null;
      user.miningSessionEndTime = null;
      user.miningSessionPendingRewards = 0;

      await user.save();

      callback && callback({
        success: true,
        claimedRewards: rewardsToClaim,
        newBalance: user.PHMN
      });
    } catch (error) {
      console.error('Error claiming mining rewards:', error);
      callback && callback({ success: false, error: error.message });
    }
  });

  socket.on('mining:upgradeLevel', async (data, callback) => {
    try {
      const telegramId = data?.telegramId || socket.request.session?.telegramId;
      if (!telegramId) return callback && callback({ success: false, error: 'Not authenticated' });

      const { targetLevel } = data;
      const levelData = MINING_LEVELS[targetLevel];
      if (!levelData || !levelData.coinsNeeded) {
        return callback && callback({ success: false, error: 'Invalid or non-upgradable level' });
      }

      const user = await User.findOne({ telegramId: parseInt(telegramId) });
      if (!user) return callback && callback({ success: false, error: 'User not found' });

      if (user.miningLevel >= targetLevel) {
        return callback && callback({ success: false, error: 'You already have this level or higher' });
      }

      if ((user.PHMN || 0) < levelData.coinsNeeded) {
        return callback && callback({ success: false, error: `You need at least ${levelData.coinsNeeded} PHMN to unlock this level.` });
      }

      user.miningLevel = targetLevel;
      user.miningRate = levelData.coinsPerHour;
      await user.save();

      callback && callback({
        success: true,
        newLevel: targetLevel,
        newMiningRate: levelData.coinsPerHour,
        newBalance: user.PHMN,
        message: `Successfully unlocked level ${targetLevel}!`
      });
    } catch (error) {
      console.error('Error upgrading mining level:', error);
      callback && callback({ success: false, error: error.message });
    }
  });

  socket.on('mining:purchaseBoost', async (data, callback) => {
    try {
      const telegramId = data?.telegramId || socket.request.session?.telegramId;
      if (!telegramId) return callback && callback({ success: false, error: 'Not authenticated' });

      const { mode, duration, multiplier, tonAmount, usdAmount, transactionHash } = data;
      if (!mode || !duration || !multiplier || !tonAmount || !usdAmount || !transactionHash) {
        return callback && callback({ success: false, error: 'Missing required boost purchase data' });
      }

      const validModes = ['turbo', 'super', 'ultimate'];
      if (!validModes.includes(mode)) return callback && callback({ success: false, error: 'Invalid boost mode' });

      const validDurations = ['day', 'week', 'month'];
      if (!validDurations.includes(duration)) return callback && callback({ success: false, error: 'Invalid duration' });

      const user = await User.findOne({ telegramId: parseInt(telegramId) });
      if (!user) return callback && callback({ success: false, error: 'User not found' });

      const now = new Date();
      let endTime = new Date(now);
      if (duration === 'day') endTime.setDate(now.getDate() + 1);
      else if (duration === 'week') endTime.setDate(now.getDate() + 7);
      else if (duration === 'month') endTime.setMonth(now.getMonth() + 1);

      user.activeBoost = { mode, multiplier, startTime: now, endTime, duration, tonAmount, usdAmount, transactionHash };
      
      if (!user.boostHistory) user.boostHistory = [];
      user.boostHistory.push({ ...user.activeBoost, purchasedAt: now });

      await user.save();

      callback && callback({
        success: true,
        boost: { mode, multiplier, startTime: now.toISOString(), endTime: endTime.toISOString(), duration },
        message: `Successfully activated ${multiplier}x boost!`
      });
    } catch (error) {
      console.error('Error purchasing boost:', error);
      callback && callback({ success: false, error: error.message });
    }
  });
};

module.exports = {
  getMiningStats,
  registerMiningHandlers
};
