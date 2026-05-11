const User = require('../../models/user');

class ReferralHandler {
  constructor(socket) {
    this.socket = socket;
  }

  registerEvents() {
    this.socket.on('referral:getCode', this.handleGetReferralCode.bind(this));
    this.socket.on('referral:useCode', this.handleUseReferralCode.bind(this));
    this.socket.on('referral:getStats', this.handleGetReferralStats.bind(this));
    this.socket.on('referral:claimReward', this.handleClaimReferralReward.bind(this));
    this.socket.on('referral:debug', this.handleGetReferralDebug.bind(this));
    this.socket.on('referral:getStoredCode', this.handleGetStoredReferralCode.bind(this));
  }

  async handleGetReferralCode(data, callback) {
    try {
      const { telegramId } = data;
      if (!telegramId) {
        return callback({ success: false, error: 'Telegram ID is required' });
      }

      let user = await User.findOne({ telegramId: parseInt(telegramId) });
      if (!user) {
        return callback({ success: false, error: 'User not found' });
      }

      if (!user.referralCode) {
        user.referralCode = await user.generateReferralCode();
        await user.save();
      }

      callback({
        success: true,
        referralCode: user.referralCode,
        totalReferrals: user.totalReferrals,
        totalEarnings: user.totalReferralEarnings
      });
    } catch (error) {
      console.error('Error getting referral code:', error);
      callback({ success: false, error: 'Failed to get referral code' });
    }
  }

  async handleUseReferralCode(data, callback) {
    try {
      const { telegramId, referralCode } = data;
      if (!telegramId || !referralCode) {
        return callback({ success: false, error: 'Telegram ID and referral code are required' });
      }



      const referrer = await User.findOne({ referralCode: referralCode.toUpperCase() });
      if (!referrer) {
        return callback({ success: false, error: 'Invalid referral code' });
      }

      if (referrer.telegramId === parseInt(telegramId)) {
        return callback({ success: false, error: 'Cannot refer yourself' });
      }



      let user = await User.findOne({ telegramId: parseInt(telegramId) });
      if (user && user.referredBy) {
        return callback({ success: false, error: 'User already used a referral code' });
      }

      if (!user) {
        user = new User({ telegramId: parseInt(telegramId) });
      }
      
      user.referredBy = referrer.telegramId;
      
      // Give bonus to the person who uses the referral code (50 Gold Pieces)
      user.total_mined_pieces += 50;
      
      await user.save();



      referrer.referrals.push(parseInt(telegramId));
      referrer.totalReferrals = referrer.referrals.length;
      
      // Give immediate reward for each referral (0.01 PHMN)
      const immediateReward = 0.3;
      referrer.PHMN = (referrer.PHMN || 0) + immediateReward;
      referrer.totalReferralEarnings += immediateReward;
      


      const milestoneReward = this.calculateMilestoneReward(referrer.totalReferrals);
      if (milestoneReward > 0) {
        referrer.total_mined_pieces += milestoneReward;
        referrer.totalReferralEarnings += milestoneReward;
        


        if (!referrer.referralHistory) referrer.referralHistory = [];
        referrer.referralHistory.push({
          type: 'milestone',
          referralId: parseInt(telegramId),
          reward: milestoneReward,
          milestone: referrer.totalReferrals,
          timestamp: new Date()
        });
      }
      
      if (!referrer.referralHistory) referrer.referralHistory = [];
      referrer.referralHistory.push({
        type: 'first_game',
        referralId: parseInt(telegramId),
        reward: immediateReward,
        timestamp: new Date()
      });
      
      await referrer.save();



      await this.autoAddReferralFriends(referrer.telegramId, parseInt(telegramId));

      callback({
        success: true,
        message: 'Referral code applied successfully! You received 50 Gold Pieces as a welcome bonus!',
        referrerName: referrer.first_name || referrer.username || 'Unknown'
      });
    } catch (error) {
      console.error('Error using referral code:', error);
      callback({ success: false, error: 'Failed to use referral code' });
    }
  }

  async handleGetStoredReferralCode(data, callback) {
    try {
      const { telegramId } = data;
      if (!telegramId) {
        return callback({ success: false, error: 'Telegram ID is required' });
      }



      const { referralCodeStore } = require('../../utils/referralStore');
      
      if (!referralCodeStore) {
        return callback({ success: false, error: 'Referral code store not available' });
      }

      const storedData = referralCodeStore.get(telegramId.toString());
      
      if (!storedData) {
        return callback({ success: false, error: 'No stored referral code found' });
      }

      if (storedData.expiresAt < Date.now()) {
        referralCodeStore.delete(telegramId.toString());
        return callback({ success: false, error: 'Stored referral code has expired' });
      }



      callback({
        success: true,
        referralCode: storedData.code,
        timestamp: storedData.timestamp
      });



      referralCodeStore.delete(telegramId.toString());
      
    } catch (error) {
      console.error('Error getting stored referral code:', error);
      callback({ success: false, error: 'Failed to get stored referral code' });
    }
  }

  async autoAddReferralFriends(referrerTelegramId, referredTelegramId) {
    try {
      const referrer = await User.findOne({ telegramId: referrerTelegramId });
      const referred = await User.findOne({ telegramId: referredTelegramId });

      if (!referrer || !referred) {
        console.error('❌ Auto-add friends: One or both users not found');
        return;
      }

      if (referrer.friends.includes(referredTelegramId) || referred.friends.includes(referrerTelegramId)) {
        return;
      }

      if (!referrer.friends.includes(referredTelegramId)) {
        referrer.friends.push(referredTelegramId);
      }
      if (!referred.friends.includes(referrerTelegramId)) {
        referred.friends.push(referrerTelegramId);
      }



      referrer.friend_requests = referrer.friend_requests.filter(id => id !== referredTelegramId);
      referred.friend_requests = referred.friend_requests.filter(id => id !== referrerTelegramId);

      await referrer.save();
      await referred.save();



      const socketManager = require('../../socket/socketManager');
      const io = socketManager.getIO();
      
      // Notify referrer
      const referrerRoom = `user_${referrerTelegramId}`;
      io.to(referrerRoom).emit('friends:autoAdded', {
        success: true,
        friend: {
          telegramId: referredTelegramId,
          first_name: referred.first_name,
          last_name: referred.last_name,
          profile_picture: referred.profile_picture,
          publicId: referred.publicId
        },
        message: `You and ${referred.first_name || 'your referral'} are now friends!`
      });

      // Notify referred user
      const referredRoom = `user_${referredTelegramId}`;
      io.to(referredRoom).emit('friends:autoAdded', {
        success: true,
        friend: {
          telegramId: referrerTelegramId,
          first_name: referrer.first_name,
          last_name: referrer.last_name,
          profile_picture: referrer.profile_picture,
          publicId: referrer.publicId
        },
        message: `You and ${referrer.first_name || 'your referrer'} are now friends!`
      });

    } catch (error) {
      console.error('❌ Error auto-adding referral friends:', error);
    }
  }



  calculateMilestoneReward(referralCount) {
    if (referralCount === 1) return 10;
    if (referralCount === 5) return 50;
    if (referralCount === 10) return 100;
    if (referralCount === 50) return 500;
    if (referralCount === 100) return 0; // Mindrop coming soon
    if (referralCount === 1000) return 0; // Megadrop coming soon
    return 0;
  }

  async handleGetReferralStats(data, callback) {
    try {
      const { telegramId } = data;
      if (!telegramId) {
        return callback({ success: false, error: 'Telegram ID is required' });
      }

      const user = await User.findOne({ telegramId: parseInt(telegramId) });
      if (!user) {
        return callback({ success: false, error: 'User not found' });
      }



      const referrals = await User.find({ 
        telegramId: { $in: user.referrals } 
      }).select('telegramId first_name last_name username created_at total_games_played');



      let referrer = null;
      if (user.referredBy) {
        referrer = await User.findOne({ telegramId: user.referredBy })
          .select('telegramId first_name last_name username');
      }



      const referralHistory = user.referralHistory || [];
      const actualTotalEarnings = referralHistory.reduce((sum, entry) => {
        if (entry.type === 'first_game') {
          return sum + (entry.reward || 0);
        }
        return sum;
      }, 0);

      callback({
        success: true,
        stats: {
          referralCode: user.referralCode,
          totalReferrals: user.totalReferrals,
          totalEarnings: actualTotalEarnings,
          referrals: referrals.map(ref => ({
            telegramId: ref.telegramId,
            name: ref.first_name || ref.last_name || ref.username || 'Unknown',
            joinedAt: ref.created_at,
            gamesPlayed: ref.total_games_played || 0
          })),
          referrer: referrer ? {
            telegramId: referrer.telegramId,
            name: referrer.first_name || referrer.last_name || referrer.username || 'Unknown'
          } : null,
          referralHistory: referralHistory
        }
      });
    } catch (error) {
      console.error('Error getting referral stats:', error);
      callback({ success: false, error: 'Failed to get referral stats' });
    }
  }

  async handleClaimReferralReward(data, callback) {
    try {
      const { telegramId, referralId } = data;
      if (!telegramId || !referralId) {
        return callback({ success: false, error: 'Telegram ID and referral ID are required' });
      }

      const user = await User.findOne({ telegramId: parseInt(telegramId) });
      if (!user) {
        return callback({ success: false, error: 'User not found' });
      }

      if (!user.referrals.includes(parseInt(referralId))) {
        return callback({ success: false, error: 'Invalid referral ID' });
      }

      if (user.referralRewardsClaimed.includes(parseInt(referralId))) {
        return callback({ success: false, error: 'Reward already claimed for this referral' });
      }



      const referredUser = await User.findOne({ telegramId: parseInt(referralId) });
      if (!referredUser || referredUser.total_games_played === 0) {
        return callback({ success: false, error: 'Referred user has not completed any games yet' });
      }



      const rewardAmount = 0.3; // 0.3 PHMN for first game
      user.PHMN = (user.PHMN || 0) + rewardAmount;
      user.totalReferralEarnings += rewardAmount;
      user.referralRewardsClaimed.push(parseInt(referralId));
      
      if (!user.referralHistory) user.referralHistory = [];
      user.referralHistory.push({
        type: 'first_game',
        referralId: parseInt(referralId),
        reward: rewardAmount,
        timestamp: new Date()
      });
      
      await user.save();

      callback({
        success: true,
        message: `Referral reward claimed! +${rewardAmount} PHMN`,
        rewardAmount,
        totalEarnings: user.totalReferralEarnings
      });
    } catch (error) {
      console.error('Error claiming referral reward:', error);
      callback({ success: false, error: 'Failed to claim referral reward' });
    }
  }

  async handleGetReferralDebug(data, callback) {
    try {
      const { telegramId } = data;
      if (!telegramId) {
        return callback({ success: false, error: 'Telegram ID is required' });
      }

      const user = await User.findOne({ telegramId: parseInt(telegramId) });
      if (!user) {
        return callback({ success: false, error: 'User not found' });
      }



      const referralDetails = [];
      for (const refId of user.referrals) {
        const referredUser = await User.findOne({ telegramId: refId });
        if (referredUser) {
          referralDetails.push({
            telegramId: refId,
            name: referredUser.first_name || referredUser.username || 'Unknown',
            gamesPlayed: referredUser.total_games_played,
            isClaimed: user.referralRewardsClaimed.includes(refId),
            joinedAt: referredUser.created_at
          });
        }
      }

      callback({
        success: true,
        debug: {
          referralCode: user.referralCode,
          totalReferrals: user.totalReferrals,
          totalEarnings: user.totalReferralEarnings,
          referrals: referralDetails,
          referralRewardsClaimed: user.referralRewardsClaimed,
          referralHistory: user.referralHistory || [],
          miningPieces: user.miningPieces
        }
      });
    } catch (error) {
      console.error('Error getting referral debug info:', error);
      callback({ success: false, error: 'Failed to get referral debug info' });
    }
  }



}

module.exports = ReferralHandler;
