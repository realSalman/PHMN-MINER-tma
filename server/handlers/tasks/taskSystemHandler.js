const User = require('../../models/user');
const Task = require('../../models/task');
const mongoose = require('mongoose');
let fetch;
try {
  fetch = require('node-fetch');
} catch (e) {
  fetch = global.fetch;
}

class TaskSystemHandler {
  constructor(socket) {
    this.socket = socket;
  }

  registerEvents() {
    this.socket.on('tasks:getAvailable', this.handleGetAvailableTasks.bind(this));
    this.socket.on('tasks:claimReward', this.handleClaimTaskReward.bind(this));
    this.socket.on('tasks:checkChannelMembership', this.handleCheckChannelMembership.bind(this));
  }

  async handleGetAvailableTasks(data, callback) {
    try {
      const { telegramId } = data;
      if (!telegramId) {
        return callback({ success: false, error: 'Telegram ID is required' });
      }

      const user = await User.findOne({ telegramId: parseInt(telegramId) });
      if (!user) {
        return callback({ success: false, error: 'User not found' });
      }

      const tasks = [];
      const today = new Date().toDateString();

      const lastDaily = user.lastDailyReward ? new Date(user.lastDailyReward).toDateString() : null;
      tasks.push({
        id: 'daily_login',
        type: 'daily',
        title: 'Daily Login',
        description: 'Log in today to claim your daily reward',
        icon: '📅',
        reward: 50,
        completed: lastDaily === today,
        progress: lastDaily === today ? 1 : 0,
        target: 1
      });

      const lastBoostRate = user.lastBoostRateTaskClaimed ? new Date(user.lastBoostRateTaskClaimed).toDateString() : null;
      tasks.push({
        id: 'boost_mining_rate',
        type: 'mining',
        title: 'Boost Mining Rate',
        description: 'Watch 1 ad to boost mining rate by +0.2%',
        icon: '⚡',
        reward: 0,
        completed: lastBoostRate === today,
        progress: lastBoostRate === today ? 1 : 0,
        target: 1,
        lastBoostRateTaskClaimed: user.lastBoostRateTaskClaimed
      });

      const lastExtendTime = user.lastExtendTimeTaskClaimed ? new Date(user.lastExtendTimeTaskClaimed).toDateString() : null;
      tasks.push({
        id: 'extend_mining_time',
        type: 'mining',
        title: 'Extend Mining Time',
        description: 'Watch 1 ad to extend mining time by +2 hours',
        icon: '⏰',
        reward: 0,
        completed: lastExtendTime === today,
        progress: lastExtendTime === today ? 1 : 0,
        target: 1,
        lastExtendTimeTaskClaimed: user.lastExtendTimeTaskClaimed
      });

      tasks.push({
        id: 'join_channel',
        type: 'social',
        title: 'Join Telegram Group',
        description: '',
        reward: 0.3,
        completed: user.channelJoinedRewardClaimed || false,
        progress: user.channelJoinedRewardClaimed ? 1 : 0,
        target: 1,
        channelLink: 'https://t.me/PhoneMinerChadGlobal'
      });

      tasks.push({
        id: 'follow_x',
        type: 'social',
        title: 'Follow us on X',
        description: 'Follow us X (Twitter) for updates and rewards',
        reward: 0.3,
        completed: user.xFollowRewardClaimed || false,
        progress: user.xFollowRewardClaimed ? 1 : 0,
        target: 1,
        xLink: 'https://x.com/PhoneMinerChad'
      });

      tasks.push({
        id: 'join_discord',
        type: 'social',
        title: 'Join Discord Server',
        description: 'Join our Discord server for updates and rewards',
        reward: 0.3,
        completed: user.discordJoinedRewardClaimed || false,
        progress: user.discordJoinedRewardClaimed ? 1 : 0,
        target: 1,
        discordLink: 'https://discord.gg/zzJjEAjs'
      });

      tasks.push({
        id: 'join_tinlake',
        type: 'social',
        title: 'Join Tinlake - the first crypto EdTech TMA',
        description: 'Join Tinlake mini-app for rewards',
        reward: 0.3,
        completed: user.tinlakeJoinedRewardClaimed || false,
        progress: user.tinlakeJoinedRewardClaimed ? 1 : 0,
        target: 1,
        tinlakeLink: 'https://t.me/tinlake_bot/start?startapp=50161F7D6'
      });



      const dynamicTasks = await Task.find({ active: true });
      dynamicTasks.forEach(task => {
        tasks.push({
          id: task._id.toString(),
          type: task.type,
          title: task.title,
          description: task.description,
          icon: task.icon,
          reward: task.reward,
          link: task.link,
          completed: user.completedTasks && user.completedTasks.includes(task._id),
          progress: user.completedTasks && user.completedTasks.includes(task._id) ? 1 : 0,
          target: 1,
          isDynamic: true
        });
      });

      callback({ success: true, tasks });
    } catch (error) {
      console.error('Error getting available tasks:', error);
      callback({ success: false, error: 'Failed to get available tasks' });
    }
  }

  async handleClaimTaskReward(data, callback) {
    try {
      const { telegramId, taskId } = data;
      
      if (!telegramId || !taskId) {
        return callback({ success: false, error: 'Telegram ID and task ID are required' });
      }

      const user = await User.findOne({ telegramId: parseInt(telegramId) });
      if (!user) {
        return callback({ success: false, error: 'User not found' });
      }

      let rewardAmount = 0;
      let message = '';
      const today = new Date().toDateString();

      switch (taskId) {
        case 'referral':


          if (user.totalReferrals === 0) {
            return callback({ success: false, error: 'No referrals to claim rewards for' });
          }
          const unclaimedReferrals = user.referrals.filter(refId => !user.referralRewardsClaimed.includes(refId));
          if (unclaimedReferrals.length === 0) {
            return callback({ success: false, error: 'All referral rewards have been claimed' });
          }
          let eligibleCount = 0;
          for (const refId of unclaimedReferrals) {
            const referredUser = await User.findOne({ telegramId: refId });
            if (referredUser && referredUser.total_games_played > 0) {
              eligibleCount++;
              user.referralRewardsClaimed.push(refId);
            }
          }
          if (eligibleCount === 0) {
            return callback({ success: false, error: 'No eligible referrals found. Your referrals need to complete games first.' });
          }
          rewardAmount = eligibleCount * 0.3;
          user.PHMN = (user.PHMN || 0) + rewardAmount;
          user.totalReferralEarnings += rewardAmount;
          message = `Referral rewards claimed! +${rewardAmount.toFixed(2)} PHMN for ${eligibleCount} referral(s)`;
          break;

        case 'daily_login':
          if (user.lastDailyReward && new Date(user.lastDailyReward).toDateString() === today) {
            return callback({ success: false, error: 'Daily reward already claimed today' });
          }
          rewardAmount = 0.2;
          user.lastDailyReward = new Date();
          user.PHMN = (user.PHMN || 0) + rewardAmount;
          message = 'Daily login reward claimed! +0.2 PHMN';
          break;

        case 'boost_mining_rate':
          if (user.lastBoostRateTaskClaimed && new Date(user.lastBoostRateTaskClaimed).toDateString() === today) {
            return callback({ success: false, error: 'Mining rate boost already claimed today' });
          }
          user.miningRateBoostFromAds = (user.miningRateBoostFromAds || 0) + 0.002;
          user.lastBoostRateTaskClaimed = new Date();
          message = 'Mining rate boosted by +0.2%!';
          break;

        case 'extend_mining_time':
          if (user.lastExtendTimeTaskClaimed && new Date(user.lastExtendTimeTaskClaimed).toDateString() === today) {
            return callback({ success: false, error: 'Mining time extension already claimed today' });
          }
          const now = new Date();
          const hasActiveSession = user.miningSessionStartTime && user.miningSessionEndTime && now < new Date(user.miningSessionEndTime);
          if (!hasActiveSession) {
            return callback({ success: false, error: 'Please start mining first before extending mining time', requiresMiningActive: true });
          }
          user.miningTimeExtended = (user.miningTimeExtended || 0) + 2;
          user.lastExtendTimeTaskClaimed = new Date();
          const currentEndTime = new Date(user.miningSessionEndTime);
          currentEndTime.setHours(currentEndTime.getHours() + 2);
          user.miningSessionEndTime = currentEndTime;
          message = 'Mining time extended by +2 hours!';
          break;

        case 'join_channel':
          if (user.channelJoinedRewardClaimed) {
            return callback({ success: false, error: 'Channel join reward already claimed' });
          }
          rewardAmount = 0.3;
          user.channelJoinedRewardClaimed = true;
          user.PHMN = (user.PHMN || 0) + rewardAmount;
          message = 'Channel join reward claimed! +0.3 PHMN';
          break;

        case 'follow_x':
          if (user.xFollowRewardClaimed) {
            return callback({ success: false, error: 'X follow reward already claimed' });
          }
          if (!data.confirmed) {
            return callback({ success: false, error: 'Please follow on X first, then confirm to claim your reward.', requiresConfirmation: true });
          }
          rewardAmount = 0.3;
          user.xFollowRewardClaimed = true;
          user.PHMN = (user.PHMN || 0) + rewardAmount;
          message = 'X follow reward claimed! +0.3 PHMN';
          break;

        case 'join_discord':
          if (user.discordJoinedRewardClaimed) {
            return callback({ success: false, error: 'Discord join reward already claimed' });
          }
          if (!data.confirmed) {
            return callback({ success: false, error: 'Please join Discord server first, then confirm to claim your reward.', requiresConfirmation: true });
          }
          rewardAmount = 0.3;
          user.discordJoinedRewardClaimed = true;
          user.PHMN = (user.PHMN || 0) + rewardAmount;
          message = 'Discord join reward claimed! +0.3 PHMN';
          break;

        case 'join_tinlake':
          if (user.tinlakeJoinedRewardClaimed) {
            return callback({ success: false, error: 'Tinlake join reward already claimed' });
          }
          if (!data.confirmed) {
            return callback({ success: false, error: 'Please join Tinlake first, then confirm to claim your reward.', requiresConfirmation: true });
          }
          rewardAmount = 0.3;
          user.tinlakeJoinedRewardClaimed = true;
          user.PHMN = (user.PHMN || 0) + rewardAmount;
          message = 'Tinlake join reward claimed! +0.3 PHMN';
          break;

        default:
          if (mongoose.Types.ObjectId.isValid(taskId)) {
            const dynamicTask = await Task.findById(taskId);
            if (dynamicTask) {
              if (user.completedTasks && user.completedTasks.includes(dynamicTask._id)) {
                return callback({ success: false, error: 'Task already completed' });
              }
              if (!data.confirmed) {
                return callback({ success: false, error: `Please complete "${dynamicTask.title}" first, then confirm to claim your reward.`, requiresConfirmation: true });
              }
              rewardAmount = dynamicTask.reward;
              if (!user.completedTasks) user.completedTasks = [];
              user.completedTasks.push(dynamicTask._id);
              user.PHMN = (user.PHMN || 0) + rewardAmount;
              message = `${dynamicTask.title} reward claimed! +${rewardAmount} PHMN`;
            } else {
              return callback({ success: false, error: 'Invalid task ID' });
            }
          } else {
            return callback({ success: false, error: 'Invalid task ID' });
          }
      }

      await user.save();
      callback({ success: true, message, rewardAmount, PHMN: user.PHMN || 0 });
    } catch (error) {
      console.error('Error claiming task reward:', error);
      callback({ success: false, error: 'Failed to claim task reward' });
    }
  }

  async handleCheckChannelMembership(data, callback) {
    try {
      const { telegramId } = data;
      if (!telegramId) {
        return callback({ success: false, error: 'Telegram ID is required' });
      }

      const user = await User.findOne({ telegramId: parseInt(telegramId) });
      if (!user) {
        return callback({ success: false, error: 'User not found' });
      }

      if (user.channelJoinedRewardClaimed) {
        return callback({ success: true, isMember: true, canClaim: false, message: 'Channel join reward already claimed' });
      }

      const isVerifiedMember = await this.verifyChannelMembership(telegramId);
      
      if (isVerifiedMember) {
        return callback({ success: true, isMember: true, canClaim: true, message: 'Channel membership verified! You can claim your reward.' });
      } else {
        return callback({ success: true, isMember: false, canClaim: true, message: 'Please confirm that you have joined the channel to claim your reward.', requiresManualVerification: true });
      }
    } catch (error) {
      console.error('Error checking channel membership:', error);
      callback({ success: false, error: 'Failed to check channel membership' });
    }
  }

  async verifyChannelMembership(telegramId) {
    try {
      const botToken = process.env.BOT_TOKEN;
      const channelUsername = 'ludoremastered';
      if (!botToken) return false;

      const response = await fetch(`https://api.telegram.org/bot${botToken}/getChatMember`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: `@${channelUsername}`, user_id: telegramId })
      });

      const data = await response.json();
      if (data.ok) {
        return ['member', 'administrator', 'creator'].includes(data.result.status);
      }
      return false;
    } catch (error) {
      console.error('❌ Error verifying channel membership:', error);
      return false;
    }
  }
}

module.exports = TaskSystemHandler;
