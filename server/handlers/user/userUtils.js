const User = require('../../models/user');



const MINING_LEVELS = {
  1: { multiplier: 1.0, coinsPerHour: 0.00463, coinsNeeded: null },
  5: { multiplier: 1.2, coinsPerHour: 0.00556, coinsNeeded: 5 },
  10: { multiplier: 1.5, coinsPerHour: 0.00694, coinsNeeded: 10 },
  15: { multiplier: 1.8, coinsPerHour: 0.00833, coinsNeeded: 15 },
  20: { multiplier: 2.2, coinsPerHour: 0.01019, coinsNeeded: 20 },
  25: { multiplier: 2.8, coinsPerHour: 0.01296, coinsNeeded: 25 },
  30: { multiplier: 3.5, coinsPerHour: 0.0162, coinsNeeded: 30 },
  50: { multiplier: 5.0, coinsPerHour: 0.02315, coinsNeeded: 50 },
};



const DAILY_REWARDS = [0.1, 0.3, 0.6, 0.9, 1.3, 1.6, 2.0];



const getMiningRateFromLevel = (level) => {
  const levelData = MINING_LEVELS[level];
  return levelData ? levelData.coinsPerHour : 0.00463; // Default to level 1
};



const getEffectiveMiningRate = (user) => {
  const baseRate = getMiningRateFromLevel(user.miningLevel || 1);
  let effectiveRate = baseRate;



  const adsBoostMultiplier = 1 + (user.miningRateBoostFromAds || 0);
  effectiveRate = effectiveRate * adsBoostMultiplier;



  if (user.activeBoost && user.activeBoost.multiplier && user.activeBoost.endTime) {
    const now = new Date();
    const endTime = new Date(user.activeBoost.endTime);



    if (now < endTime) {
      const boostMultiplier = user.activeBoost.multiplier || 1;
      effectiveRate = effectiveRate * boostMultiplier;
      return effectiveRate;
    } else {



      user.activeBoost = {
        mode: null,
        multiplier: 1,
        startTime: null,
        endTime: null,
        duration: null,
        tonAmount: 0,
        usdAmount: 0,
        transactionHash: null
      };


      user.save().catch(err => console.error('Error clearing expired boost:', err));
    }
  }

  return effectiveRate;
};



const onlineUsers = new Map(); // telegramId -> socketId

module.exports = {
  MINING_LEVELS,
  DAILY_REWARDS,
  getMiningRateFromLevel,
  getEffectiveMiningRate,
  onlineUsers
};
