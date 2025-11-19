import { io } from "socket.io-client";

export const socket = io("https://api.phoneminer.org", {
  path: "/socket.io",
  transports: ["websocket", "polling"],
  withCredentials: true,
});

