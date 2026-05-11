const TelegramBot = require('node-telegram-bot-api');
const User = require('../models/user');
const mongoose = require('../config/database');
const { referralCodeStore } = require('../utils/referralStore');

let telegramBotInstance = null;

const botToken = process.env.BOT_TOKEN;
const botUsername = process.env.BOT_USERNAME;
const gameUrl = process.env.TG_GAME_URL;
const enableMiniApp = process.env.ENABLE_MINI_APP === 'true';
const miniAppEnabled = enableMiniApp && !!gameUrl;

const ensureGameUrlConfigured = async (chatId, bot) => {
  if (gameUrl) return true;
  await bot.sendMessage(chatId, '⚠️ The game link is not configured yet. Please try again later.');
  return false;
};

const buildLaunchButton = (text, referralCode) => {
  const targetUrl = referralCode ? `${gameUrl}?start=${referralCode}` : gameUrl;
  if (miniAppEnabled) {
    return { text, web_app: { url: targetUrl } };
  }
  return { text, url: targetUrl };
};

const runMiningReminder = async () => {
  try {
    if (mongoose.connection.readyState !== 1) return;
    if (!telegramBotInstance) return;

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const usersToRemind = await User.find({
      miningSessionEndTime: { $lt: now, $gt: twentyFourHoursAgo },
      $or: [
        { miningSessionReminderSent: false },
        { miningSessionReminderSent: { $exists: false } }
      ]
    }).limit(50);

    if (usersToRemind.length > 0) {
      console.log(`⏰ Found ${usersToRemind.length} users to remind about mining completion`);
    }

    for (const user of usersToRemind) {
      try {
        const keyboard = {
          inline_keyboard: [[buildLaunchButton('🎮 Start Mining')]]
        };
        const chatId = user.telegramId.toString();
        await telegramBotInstance.sendMessage(chatId,
          "⛏️ *Mining Completed!* ⛏️\n\nYour mining session has finished and your rewards are ready to claim! 💰\n\nStart a new session now to keep earning PHMN! 🚀",
          { parse_mode: 'Markdown', reply_markup: keyboard }
        );
        user.miningSessionReminderSent = true;
        await user.save();

      } catch (e) {
        if (e.response && (e.response.statusCode === 403 || e.response.statusCode === 400)) {
          user.miningSessionReminderSent = true;
          await user.save();
        } else {
          console.error(`❌ Failed to send reminder to user ${user.telegramId}:`, e.message);
        }
      }
    }
  } catch (err) {
    console.error('❌ Error in mining reminder cron:', err);
  }
};

const initializeBot = () => {
  if (!botToken || botToken === 'your_bot_token_here' || botToken === '') {
    console.log('⚠️ No valid BOT_TOKEN found - Telegram bot disabled');
    return;
  }

  try {
    const bot = new TelegramBot(botToken, { polling: true });
    telegramBotInstance = bot;

    console.log('🤖 Telegram Bot starting...');
    console.log(`📱 Bot username: @${botUsername}`);
    console.log(`🎮 Game URL: ${gameUrl || 'not configured'}`);
    console.log(`📱 Mini App mode: ${miniAppEnabled ? 'Enabled' : 'Disabled'}`);

    const welcomeHelpText = `🎮 PHMN CHAD Game\n\n📱 Play and earn PHMN rewards!\n\n🎯 How to play:\n• Open the game via the button below\n• Start mining to earn PHMN every 12 hours\n• Complete tasks for extra rewards\n\n🎁 Referral System:\n• Share your link with friends\n• Earn PHMN for every active referral\n\n🎲 Features:\n• 12h Mining Cycle\n• Team Battles\n• Passive Income`;

    bot.onText(/\/help/, async (msg) => {
      bot.sendMessage(msg.chat.id, welcomeHelpText, {
        reply_markup: { inline_keyboard: [[buildLaunchButton('🎮 Open Game')]] }
      });
    });

    bot.onText(/\/testremind/, async (msg) => {
      const chatId = msg.chat.id;
      try {
        const user = await User.findOne({ telegramId: chatId });
        if (!user) return bot.sendMessage(chatId, "❌ User not found in database.");
        user.miningSessionEndTime = new Date(Date.now() - 1000);
        user.miningSessionReminderSent = false;
        await user.save();
        await bot.sendMessage(chatId, "🧪 Test mode activated! Reminder will arrive within 5 mins.");
      } catch (err) {
        bot.sendMessage(chatId, "❌ Error: " + err.message);
      }
    });

    bot.onText(/\/start(.+)?/, async (msg, match) => {
      const chatId = msg.chat.id;
      const startParam = match ? match[1] : null;
      const referralCode = startParam && startParam.trim() ? startParam.trim() : null;
      
      if (!(await ensureGameUrlConfigured(chatId, bot))) return;

      const buttonLabel = miniAppEnabled ? '🎮 Open Game' : '🎮 Play';
      const welcomeMsg = `🎮 Welcome!${referralCode ? '\n\nYou were invited!' : ''}\n\nClick below to play:`;

      if (referralCode) {
        referralCodeStore.set(chatId.toString(), {
          code: referralCode,
          timestamp: Date.now(),
          expiresAt: Date.now() + (60 * 60 * 1000)
        });
      }

      bot.sendMessage(chatId, welcomeMsg, {
        reply_markup: { 
          inline_keyboard: [[buildLaunchButton(buttonLabel, referralCode)]] 
        }
      });
    });

    // Cleanup interval for referralCodeStore
    setInterval(() => {
      const now = Date.now();
      for (const [chatId, data] of referralCodeStore.entries()) {
        if (data.expiresAt < now) referralCodeStore.delete(chatId);
      }
    }, 30 * 60 * 1000);

    // Mining reminder timers
    setTimeout(runMiningReminder, 45000);
    setInterval(runMiningReminder, 5 * 60 * 1000);

    bot.on('error', (error) => {});
    bot.on('polling_error', (error) => {});

    console.log('✅ Telegram Bot is running!');
    return bot;
  } catch (error) {
    console.error('❌ Failed to initialize Telegram Bot:', error);
  }
};

module.exports = { initializeBot };
