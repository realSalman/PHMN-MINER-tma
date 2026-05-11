import { io } from "socket.io-client";

export const socket = io(process.env.REACT_APP_GAME_URL, {
  path: '/api/socket.io',
  transports: ["polling", "websocket"],
  withCredentials: true,
  reconnection: true,
  timeout: 20000
});
