// TON Connect configuration using @tonconnect/ui-react approach
// This follows the working demo implementation

// Get the base URL - use current origin in browser, or env variable
const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return process.env.GAME_URL || process.env.GAME_URL;
};

const baseUrl = getBaseUrl();

// TON Connect manifest for your Mini App
export const manifest = {
  url: baseUrl,
  name: 'PHMN Mining Game',
  // Use a data URL or a simple icon that exists, or point to a valid image
  // For now, using a simple approach - you can add logo192.png to public folder later
  iconUrl: `${baseUrl}/favicon.ico`, // Fallback to favicon if logo doesn't exist
  // Optional fields - can be omitted if files don't exist
  // termsOfUseUrl: `${baseUrl}/terms`,
  // privacyPolicyUrl: `${baseUrl}/privacy`,
  features: ['ton_addr', 'ton_proof'],
  items: ['ton_addr', 'ton_proof']
};

// wallet address for receiving payments
// Fetch from server API instead of client env variable
let cachedWalletAddress = null;
let walletAddressPromise = null;

export const getServerWalletAddress = async () => {
  // Return cached value if available
  if (cachedWalletAddress) {
    return cachedWalletAddress;
  }
  
  // Return existing promise if already fetching
  if (walletAddressPromise) {
    return walletAddressPromise;
  }
  
  // Fetch from server
  walletAddressPromise = (async () => {
    try {
      const baseUrl = typeof window !== 'undefined' 
        ? window.location.origin 
        : process.env.GAME_URL || process.env.GAME_URL || 'https://app.phoneminer.org';
      
      const response = await fetch(`${baseUrl}/api/config/wallet-address`);
      const data = await response.json();
      
      if (data.success && data.walletAddress) {
        cachedWalletAddress = data.walletAddress;
        return data.walletAddress;
      } else {
        console.error('Failed to get wallet address from server:', data.error);
        return null;
      }
    } catch (error) {
      console.error('Error fetching wallet address from server:', error);
      return null;
    } finally {
      walletAddressPromise = null;
    }
  })();
  
  return walletAddressPromise;
};

// For backward compatibility, export a getter that fetches async
export const SERVER_WALLET_ADDRESS = null; // Will be fetched dynamically
