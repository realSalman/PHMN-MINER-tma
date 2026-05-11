const express = require('express');
const router = express.Router();
const User = require('../models/user');
const { saveUserData, getUserProfile } = require('../handlers/user');

router.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Airdrop Mining Game Server is running' });
});

router.get('/adsgram/blockId', (req, res) => {
  const blockId = process.env.ADSGRAM_BLOCK_ID || null;
  res.json({
    success: !!blockId,
    blockId: blockId,
    message: blockId ? 'Block ID available' : 'Block ID not configured'
  });
});

router.post('/user/save', async (req, res) => {
  try {
    const user = await saveUserData(req.body);
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/user/:telegramId', async (req, res) => {
  try {
    const user = await getUserProfile(req.params.telegramId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/leaderboard', async (req, res) => {
  try {
    const topPlayers = await User.find({})
      .sort({ PHMN: -1 })
      .limit(100)
      .select('telegramId username first_name last_name profile_picture PHMN')
      .lean();

    const processedPlayers = topPlayers.map(player => ({
      ...player,
      PHMN: player.PHMN || 0
    }));

    const responseData = {
      success: true,
      leaderboard: {
        totalPlayers: processedPlayers.length,
        players: processedPlayers,
        lastUpdated: new Date().toISOString()
      }
    };

    res.json(responseData);
  } catch (error) {
    console.error('❌ Error in leaderboard endpoint:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
