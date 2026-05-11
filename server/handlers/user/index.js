const { registerProfileHandlers, saveUserData, getUserProfile } = require('./profileHandler');
const { registerMiningHandlers, getMiningStats } = require('./miningHandler');
const { registerStreakHandlers } = require('./streakHandler');
const { registerAdsHandlers } = require('./adsHandler');
const { registerAdminHandlers } = require('./adminHandler');

const registerUserHandlers = (socket) => {
  registerProfileHandlers(socket);
  registerMiningHandlers(socket);
  registerStreakHandlers(socket);
  registerAdsHandlers(socket);
  registerAdminHandlers(socket);
};

module.exports = {
  saveUserData,
  getUserProfile,
  getMiningStats,
  registerUserHandlers
};
