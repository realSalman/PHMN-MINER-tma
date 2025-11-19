import { io } from "socket.io-client";

export const socket = io(process.env.GAME_URL || "https://api.phonemier.org", {
  path: "/socket.io",
  transports: ["websocket", "polling"],
  upgrade: true,
  rememberUpgrade: true,
  timeout: 30000,
  forceNew: false,
  reconnection: true,
  reconnectionAttempts: 3,
  reconnectionDelay: 3000,
  reconnectionDelayMax: 10000,
  maxReconnectionAttempts: 3,
  autoConnect: true,
  query: {},
  extraHeaders: {},
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 10000,
  allowUpgrades: true,
  perMessageDeflate: true,
  httpCompression: true,
  cors: {
    origin: "*",
    credentials: true
  }
});
