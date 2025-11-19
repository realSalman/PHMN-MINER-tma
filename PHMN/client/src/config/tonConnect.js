// TON Connect configuration using @tonconnect/ui-react approach
// This follows the working demo implementation

// TON Connect manifest for your Mini App
export const manifest = {
  url: process.env.GAME_URL || 'https://64.hexterminator.xyz',
  name: 'Ludo Game',
  iconUrl: `${process.env.GAME_URL || 'https://64.hexterminator.xyz'}/logo192.png`,
  termsOfUseUrl: `${process.env.GAME_URL || 'https://64.hexterminator.xyz'}/terms`,
  privacyPolicyUrl: `${process.env.GAME_URL || 'https://64.hexterminator.xyz'}/privacy`,
  features: ['ton_addr', 'ton_proof'],
  items: ['ton_addr', 'ton_proof']
};

// wallet address for receiving payments
export const SERVER_WALLET_ADDRESS = process.env.SERVER_WALLET_ADDRESS;

// Mining plan prices in TON
export const MINING_PLAN_PRICES = {
  1: parseFloat(process.env.REACT_APP_MINING_PRICE_1) || 0.001,   // TORTOISE - 0.5 TON
  2: parseFloat(process.env.REACT_APP_MINING_PRICE_2) || 0.001,   // RABBIT - 0.7 TON  
  3: parseFloat(process.env.REACT_APP_MINING_PRICE_3) || 0.001,   // CAR - 1.0 TON
  4: parseFloat(process.env.REACT_APP_MINING_PRICE_4) || 0.001,   // ROCKET - 1.5 TON
  5: parseFloat(process.env.REACT_APP_MINING_PRICE_5) || 0.001,   // UFO - 1.7 TON
  6: parseFloat(process.env.REACT_APP_MINING_PRICE_6) || 0.001    // LIGHTSPEED - 2.0 TON
};

// TON Network configuration
export const tonNetwork = {
  mainnet: {
    name: 'mainnet',
    chainId: 0,
    rpcUrl: 'https://toncenter.com/api/v2/jsonRPC'
  },
  testnet: {
    name: 'testnet', 
    chainId: -3,
    rpcUrl: 'https://testnet.toncenter.com/api/v2/jsonRPC'
  }
};
