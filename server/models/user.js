const mongoose = require('../config/database');

const userSchema = new mongoose.Schema({
  telegramId: { type: Number, required: true, unique: true },
  username: String,
  first_name: String,
  last_name: String,
  profile_picture: String,
  score: { type: Number, default: 0 },



  referralCode: { type: String, unique: true, sparse: true },
  referredBy: { type: Number, ref: 'User' },
  referrals: [{ type: Number, ref: 'User' }],
  totalReferrals: { type: Number, default: 0 },
  totalReferralEarnings: { type: Number, default: 0 },
  referralRewardsClaimed: [{ type: Number }],
  referralHistory: [
    {
      type: { type: String, enum: ['mile  stone', 'first_game'] },
      referralId: { type: Number },
      reward: { type: Number },
      milestone: { type: Number },
      timestamp: { type: Date, default: Date.now }
    }],




  total_mined_pieces: { type: Number, default: 0 },
  current_game_mined: { type: Number, default: 0 },
  last_game_session: { type: String, default: null },
  mining_start_time: { type: Date, default: null },


  mining_premium_plan_level: { type: Number, default: 0 },
  mining_boost_multiplier: { type: Number, default: 1 },
  purchased_plans: [Number],


  ton_transactions: [
    {
      planLevel: { type: Number, required: true },
      amount: { type: Number, required: true },
      transactionHash: { type: String, required: true },
      purchasedAt: { type: Date, default: Date.now }
    }
  ],


  PHMN: { type: Number, default: 0 },


  miningSessionStartTime: { type: Date, default: null },
  miningSessionEndTime: { type: Date, default: null },
  miningSessionPendingRewards: { type: Number, default: 0 },
  miningLevel: { type: Number, default: 1 },
  miningRate: { type: Number, default: 0.00463 },
  timezone: { type: String, default: null },



  adsWatchedForCycle: { type: Number, default: 0 },
  lastCycleWithAds: { type: Number, default: null },



  miningSessionReminderSent: { type: Boolean, default: false },



  activeBoost: {
    mode: { type: String, enum: ['turbo', 'super', 'ultimate'], default: null },
    multiplier: { type: Number, default: 1 },
    startTime: { type: Date, default: null },
    endTime: { type: Date, default: null },
    duration: { type: String, enum: ['day', 'week', 'month'], default: null },
    tonAmount: { type: Number, default: 0 },
    usdAmount: { type: Number, default: 0 },
    transactionHash: { type: String, default: null }
  },
  boostHistory: [
    {
      mode: { type: String, enum: ['turbo', 'super', 'ultimate'] },
      multiplier: { type: Number },
      duration: { type: String },
      tonAmount: { type: Number },
      usdAmount: { type: Number },
      transactionHash: { type: String },
      startTime: { type: Date },
      endTime: { type: Date },
      purchasedAt: { type: Date, default: Date.now }
    }],



  walletAddress: { type: String, default: null },



  friends: [{ type: Number, ref: 'User' }],
  friend_requests: [{ type: Number, ref: 'User' }],



  lastDailyReward: { type: Date, default: null },
  lastBoostRateTaskClaimed: { type: Date, default: null },
  lastExtendTimeTaskClaimed: { type: Date, default: null },
  miningRateBoostFromAds: { type: Number, default: 0 },
  miningTimeExtended: { type: Number, default: 0 },
  gamesPlayed: { type: Number, default: 0 },
  miningStreak: { type: Number, default: 0 },
  lastMiningDate: { type: Date, default: null },
  dailyStreak: { type: Number, default: 0 },
  channelJoinedRewardClaimed: { type: Boolean, default: false },
  xFollowRewardClaimed: { type: Boolean, default: false },
  youtubeSubscribeRewardClaimed: { type: Boolean, default: false },
  discordJoinedRewardClaimed: { type: Boolean, default: false },
  tinlakeJoinedRewardClaimed: { type: Boolean, default: false },
  completedTasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
  publicId: { type: String, unique: true, sparse: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});



userSchema.pre('save', function (next) {
  this.updated_at = Date.now();


  next();
});



userSchema.pre('save', async function (next) {
  if (!this.referralCode) {
    this.referralCode = await this.generateReferralCode();
  }
  if (!this.publicId) {
    this.publicId = await this.generatePublicId();
  }
  next();
});



userSchema.methods.generateReferralCode = async function () {
  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  let code;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 10;

  while (!isUnique && attempts < maxAttempts) {
    code = generateCode();
    const existingUser = await this.constructor.findOne({ referralCode: code });
    if (!existingUser) {
      isUnique = true;
    }
    attempts++;
  }

  if (!isUnique) {
    throw new Error('Failed to generate unique referral code');
  }

  return code;
};



userSchema.methods.generatePublicId = async function () {
  const generateId = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 10; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  let publicId;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 10;

  while (!isUnique && attempts < maxAttempts) {
    publicId = generateId();
    const existingUser = await this.constructor.findOne({ publicId: publicId });
    if (!existingUser) {
      isUnique = true;
    }
    attempts++;
  }

  if (!isUnique) {
    throw new Error('Failed to generate unique public ID');
  }

  return publicId;
};

module.exports = mongoose.model('User', userSchema);
