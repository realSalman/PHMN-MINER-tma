import React, { useState } from 'react';
import { motion } from 'framer-motion';
import upgradeImg from '../images/upgrade.png';
import phmnCoinImg from '../images/PHMN coin.png';
import tasksImg from '../images/tasks.png';

function Upgrade() {
  const [activeMiningMode, setActiveMiningMode] = useState('basic');
  const [claimCards, setClaimCards] = useState([
    { id: 1, amount: 5000, claimed: false },
    { id: 2, amount: 10000, claimed: false },
    { id: 3, amount: 15000, claimed: false },
    { id: 4, amount: 20000, claimed: false },
    { id: 5, amount: 25000, claimed: false },
    { id: 6, amount: 30000, claimed: false },
    { id: 7, amount: 50000, claimed: false },
  ]);

  const miningModes = [
    { id: 'basic', label: 'Basic', available: true },
    { id: 'turbo', label: 'Turbo', available: true },
    { id: 'super', label: 'Super', available: true },
    { id: 'ultimate', label: 'Ultimate', available: true },
  ];

  const handleClaim = (cardId) => {
    setClaimCards(prev => prev.map(card => 
      card.id === cardId ? { ...card, claimed: true } : card
    ));
  };

  return (
    <motion.div 
      className="relative min-h-screen text-white font-sans overflow-x-hidden pb-24"
      variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.4 } } }}
      initial="hidden"
      animate="visible"
    >
      <div className="grok-bg" />
      <div className="relative z-10 max-w-xl mx-auto px-4 pt-4">
        {/* Upgrade Header */}
        <motion.div 
          className="flex items-center justify-center gap-2 mb-6 mt-2"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <img src={upgradeImg} alt="Upgrade" className="h-6 w-auto" />
        </motion.div>

        {/* Upgrade Cards Section */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {/* Max Energy Card 
          
          <motion.div
            className="bg-gradient-to-br from-purple-600/30 to-purple-800/30 rounded-xl p-4 border border-purple-500/30"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <img src={maxEnergyImg} alt="Max Energy" className="w-6 h-6" />
              <h3 className="text-sm font-semibold text-white">Max Energy</h3>
            </div>
            <div className="text-xs text-gray-300 mb-3">
              LVL {maxEnergyLevel} : {maxEnergyValue.toLocaleString()}
            </div>
            <div className="mb-2">
              <div className="text-xs text-purple-300 mb-1">Upgrade</div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full" style={{ width: '60%' }}></div>
              </div>
            </div>
            <div className="flex items-center justify-end">
              <span className="text-xs text-gray-400">→</span>
            </div>
          </motion.div>
          
          
          */}

          {/* Restore Energy Card 
          <motion.div
            className="bg-gradient-to-br from-green-600/30 to-green-800/30 rounded-xl p-4 border border-green-500/30"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <img src={renewableEnergyImg} alt="Restore Energy" className="w-6 h-6" />
              <h3 className="text-sm font-semibold text-white">Restore Energy</h3>
            </div>
            <div className="text-xs text-gray-300 mb-3">
              {restoreEnergyRate} PHMN/hr x{restoreEnergyMultiplier}
            </div>
            <div className="mb-2">
              <div className="text-xs text-green-300 mb-1">Restore</div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>
            <div className="text-xs text-green-300">{restoreTimeRemaining} remaining</div>
            <div className="flex items-center justify-end mt-1">
              <span className="text-xs text-gray-400">→</span>
            </div>
          </motion.div>
          
          
          */}
          
        </div>

        {/* Mining Mode Section */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <h2 className="text-lg font-bold text-white mb-3">Mining Mode</h2>
          
          {/* Mining Mode Tabs */}
          <div className="flex gap-2 mb-4 overflow-x-auto">
            {miningModes.map((mode) => (
              <div key={mode.id} className="relative flex-shrink-0">
                {!mode.available && (
                  <div className="absolute -top-2 left-0 right-0 text-[8px] text-yellow-400 text-center font-bold">
                    COMING SOON
                  </div>
                )}
                <motion.button
                  onClick={() => mode.available && setActiveMiningMode(mode.id)}
                  disabled={!mode.available}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                    activeMiningMode === mode.id
                      ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg'
                      : mode.available
                      ? 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
                      : 'bg-gray-800/30 text-gray-600 cursor-not-allowed'
                  }`}
                  whileHover={mode.available ? { scale: 1.05 } : {}}
                  whileTap={mode.available ? { scale: 0.95 } : {}}
                >
                  {mode.label}
                </motion.button>
              </div>
            ))}
          </div>

          {/* Claim Cards Grid */}
          <div className="grid grid-cols-3 gap-3">
            {claimCards.map((card, index) => (
              <motion.div
                key={card.id}
                className="bg-gradient-to-br from-purple-600/30 to-purple-800/30 rounded-xl p-3 border border-purple-500/30 flex flex-col items-center"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.4 + index * 0.05 }}
              >
                {/* Miner Image */}
                <div className="mb-2">
                  <img 
                    src={tasksImg} 
                    alt="Miner" 
                    className="w-20 h-20 object-contain"
                  />
                </div>
                
                {/* Claim Label */}
                <div className="text-xs font-semibold text-white mb-1">
                  Claim {card.id}
                </div>
                
                {/* Coin Amount */}
                <div className="flex items-center gap-1 mb-2">
                  <img src={phmnCoinImg} alt="Coin" className="w-4 h-4" />
                  <span className="text-xs font-bold text-yellow-400">
                    {card.amount.toLocaleString()}
                  </span>
                </div>
                
                {/* Claim Button */}
                {card.claimed ? (
                  <div className="w-full py-1.5 px-2 bg-gradient-to-r from-green-500 to-green-600 rounded-lg text-xs font-semibold text-white text-center">
                    ✓ Claimed
                  </div>
                ) : (
                  <motion.button
                    onClick={() => handleClaim(card.id)}
                    className="w-full py-1.5 px-2 bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg text-xs font-semibold text-white hover:from-purple-700 hover:to-purple-800 transition-all"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Claim Now
                  </motion.button>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
    </div>
    </motion.div>
  );
}

export default Upgrade;
