 # PHONE MINER — Telegram Mini App (TMA)

A robust, full-stack Telegram Mini App built for the **PHMN** ecosystem. This application integrates Telegram's Web App capabilities with the **TON Blockchain** to provide a seamless mining and reward experience.

### THE APP IS LIVE- https://t.me/PHMN_miner_bot/

## 🚀 Overview

PHMN Miner is a high-performance Telegram Mini App designed for engagement. It features real-time data synchronization, secure TON wallet connectivity, and a scalable backend architecture to handle high-concurrency users during airdrop events.

## 🛠 Tech Stack

### Frontend
- **Framework**: React 18
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Blockchain**: TON Connect SDK (`@tonconnect/ui-react`)

### Backend
- **Runtime**: Node.js
- **Server**: Express.js
- **Database**: MongoDB
- **Real-time**: Socket.io

## ✨ Key Features

- **TON Wallet Integration**: Seamless connection with TON-compatible wallets for future airdrops and transactions.
- **Telegram Native UI**: Optimized for the Telegram interface with smooth transitions and responsive design.
- **Global Leaderboard**: Competitive ranking system tracking PHMN points across the entire user base.
- **Real-time Updates**: Socket-driven state management for instant mining feedback and notifications.
- **Task System**: Interactive tasks and challenges to boost user engagement and rewards.
- **Ads Integration**: Monetization support via Adsgram.

## 📂 Project Structure

```text
├── client/          # React frontend
├── server/          # Express backend
```

### Development Tip
To test the Telegram Mini App locally, use a tunneling service like **ngrok** or **Localtunnel** to expose your local server to the internet, then set the `TG_GAME_URL` in your `.env` to the secure tunnel URL.

### Prerequisites
- Node.js (v18+)
- MongoDB (Local or Atlas)
- Telegram Bot Token (from @BotFather)

### Environment Variables

**Server (`/server/.env`):**
- `PORT`: Server port (default: 3001)
- `CONNECTION_URI`: MongoDB connection string
- `BOT_TOKEN`: Your Telegram Bot Token
- `BOT_USERNAME`: Your Bot's username
- `SESSION_SECRET`: Random string for session security
- `ADSGRAM_BLOCK_ID`: Adsgram integration ID

## 📄 License

Copyright © 2025. All Rights Reserved.

This project is proprietary. The source code is available for viewing and educational purposes only. Unauthorized copying, modification, distribution, or any other use of this code is strictly prohibited.
