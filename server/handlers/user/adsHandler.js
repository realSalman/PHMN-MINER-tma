const User = require('../../models/user');

const registerAdsHandlers = (socket) => {
  socket.on('ads:markWatched', async (data, callback) => {
    try {
      const telegramId = data?.telegramId || socket.request.session?.telegramId;
      if (!telegramId) return callback && callback({ success: false, error: 'Not authenticated' });

      const { adsWatched } = data;
      if (typeof adsWatched !== 'number' || adsWatched < 1 || adsWatched > 1) {
        return callback && callback({ success: false, error: 'Invalid ads watched count. Must be 1.' });
      }

      const user = await User.findOne({ telegramId: parseInt(telegramId) });
      if (!user) return callback && callback({ success: false, error: 'User not found' });

      if (user.adsWatchedForCycle < 1) {
        user.adsWatchedForCycle = 1;
        await user.save();
      }

      callback && callback({
        success: true,
        adsWatched: user.adsWatchedForCycle,
        adsRequired: 1,
        canStartMining: user.adsWatchedForCycle >= 1
      });
    } catch (error) {
      console.error('Error marking ads as watched:', error);
      callback && callback({ success: false, error: error.message });
    }
  });

  socket.on('adsgram:getBlockId', async (data, callback) => {
    try {
      const blockId = process.env.ADSGRAM_BLOCK_ID || null;
      callback && callback({
        success: !!blockId,
        blockId: blockId,
        message: blockId ? 'Block ID available' : 'Block ID not configured'
      });
    } catch (error) {
      console.error('Error getting Adsgram block ID:', error);
      callback && callback({ success: false, error: error.message });
    }
  });

  socket.on('ads:getStatus', async (data, callback) => {
    try {
      const telegramId = data?.telegramId || socket.request.session?.telegramId;
      if (!telegramId) return callback && callback({ success: false, error: 'Not authenticated' });

      const user = await User.findOne({ telegramId: parseInt(telegramId) });
      if (!user) return callback && callback({ success: false, error: 'User not found' });

      callback && callback({
        success: true,
        adsWatched: user.adsWatchedForCycle || 0,
        adsRequired: 1,
        canStartMining: (user.adsWatchedForCycle || 0) >= 1
      });
    } catch (error) {
      console.error('Error getting ads status:', error);
      callback && callback({ success: false, error: error.message });
    }
  });
};

module.exports = { registerAdsHandlers };
