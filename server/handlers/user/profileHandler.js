const User = require('../../models/user');
const { onlineUsers } = require('./userUtils');

const saveUserData = async (telegramUser) => {
  try {
    const userData = {
      telegramId: telegramUser.id,
      username: telegramUser.username,
      first_name: telegramUser.first_name,
      last_name: telegramUser.last_name,
      profile_picture: telegramUser.photo_url || null
    };

    const user = await User.findOneAndUpdate(
      { telegramId: telegramUser.id },
      userData,
      { upsert: true, new: true }
    );

    return user;
  } catch (error) {
    console.error('Error saving user data:', error);
    throw error;
  }
};

const getUserProfile = async (telegramId) => {
  try {
    const user = await User.findOne({ telegramId: parseInt(telegramId) });

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.publicId) {
      user.publicId = await user.generatePublicId();
      await user.save();

    }

    return user;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

const registerProfileHandlers = (socket) => {
  const trackUserOnline = (telegramId) => {
    if (telegramId) {
      onlineUsers.set(telegramId.toString(), socket.id);


    }
  };

  const trackUserOffline = (telegramId) => {
    if (telegramId) {
      onlineUsers.delete(telegramId.toString());


    }
  };

  socket.on('user:connected', (telegramId) => {
    trackUserOnline(telegramId);
  });

  socket.on('user:disconnected', (telegramId) => {
    trackUserOffline(telegramId);
  });

  socket.on('user:save', async (telegramUser) => {
    try {
      const user = await saveUserData(telegramUser);
      trackUserOnline(telegramUser.id);

      socket.request.session.telegramId = telegramUser.id;
      socket.request.session.save();

      const userRoom = `user_${telegramUser.id}`;
      socket.join(userRoom);
      
      socket.emit('user:saved', { success: true, user });
    } catch (error) {
      socket.emit('user:saved', { success: false, error: error.message });
    }
  });

  socket.on('user:updateWalletAddress', async (data, callback) => {
    try {
      const { telegramId, walletAddress } = data;
      if (!telegramId || !walletAddress) {
        return callback && callback({ success: false, error: 'Missing telegramId or walletAddress' });
      }

      const user = await User.findOneAndUpdate(
        { telegramId: parseInt(telegramId) },
        { walletAddress: walletAddress },
        { new: true }
      );

      if (!user) {
        return callback && callback({ success: false, error: 'User not found' });
      }

      callback && callback({
        success: true,
        walletAddress: walletAddress,
        message: 'Wallet address updated successfully'
      });
    } catch (error) {
      callback && callback({ success: false, error: error.message });
    }
  });

  socket.on('user:setTimezone', async (data, callback) => {
    try {
      const telegramId = data?.telegramId || socket.request.session?.telegramId;
      if (!telegramId) {
        return callback && callback({ success: false, error: 'Not authenticated' });
      }

      const { timezone } = data;
      if (!timezone) {
        return callback && callback({ success: false, error: 'Timezone is required' });
      }

      const user = await User.findOne({ telegramId: parseInt(telegramId) });
      if (!user) {
        return callback && callback({ success: false, error: 'User not found' });
      }

      user.timezone = timezone;
      await user.save();

      callback && callback({
        success: true,
        timezone: timezone,
        message: 'Timezone set successfully'
      });
    } catch (error) {
      callback && callback({ success: false, error: error.message });
    }
  });

  socket.on('disconnect', () => {
    for (const [telegramId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        trackUserOffline(telegramId);
        break;
      }
    }
  });
};

module.exports = {
  saveUserData,
  getUserProfile,
  registerProfileHandlers
};
