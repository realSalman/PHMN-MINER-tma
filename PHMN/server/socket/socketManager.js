const { sessionMiddleware } = require('../config/session');
const { Server } = require('socket.io');

const socketManager = {
    io: null,
    connectionCount: 0,
    maxConnections: process.env.MAX_CONNECTIONS || 10000,
    connectionStats: {
        totalConnections: 0,
        peakConnections: 0,
        disconnections: 0
    },

    initialize(server) {
        if (this.io) return this.io; // avoid re-init

        this.io = new Server(server, {
            cors: {
                origin: ["http://localhost:3000", process.env.GAME_URL],
                credentials: true,
            },
            allowRequest: (req, callback) => {
                const fakeRes = {
                    getHeader() { return []; },
                    setHeader(key, values) { req.cookieHolder = values[0]; },
                    writeHead() {},
                };
                sessionMiddleware(req, fakeRes, () => {
                    if (req.session) {
                        fakeRes.writeHead();
                        req.session.save();
                    }
                    callback(null, true);
                });
            },
            // Enhanced connection settings for real-time performance
            pingTimeout: 20000,      // 20 seconds (reduced from 60s)
            pingInterval: 5000,      // 5 seconds (reduced from 25s)
            upgradeTimeout: 3000,    // 3 seconds (reduced from 10s)
            allowUpgrades: true,
            perMessageDeflate: {
                threshold: 32768,
                zlibInflateOptions: {
                    chunkSize: 10 * 1024
                },
                zlibDeflateOptions: {
                    level: 6
                }
            },
            httpCompression: true,
            transports: ['websocket', 'polling'],
            maxHttpBufferSize: 1e8,
            allowEIO3: true
        });

        // Add disconnect logic with proper cleanup
        this.io.on('connection', socket => {
            this.handleConnection(socket);
        });

        // Start connection monitoring
        this.startConnectionMonitoring();

        // Graceful shutdown handling
        process.on('SIGTERM', () => this.gracefulShutdown());
        process.on('SIGINT', () => this.gracefulShutdown());

        return this.io;
    },

    handleConnection(socket) {
        // Check connection limits
        if (this.connectionCount >= this.maxConnections) {
            console.log(`⚠️ Connection limit reached (${this.connectionCount}/${this.maxConnections})`);
            socket.disconnect(true);
            return;
        }

        this.connectionCount++;
        this.connectionStats.totalConnections++;
        
        if (this.connectionCount > this.connectionStats.peakConnections) {
            this.connectionStats.peakConnections = this.connectionCount;
        }

        console.log(`🔌 New socket connection: ${socket.id} (${this.connectionCount}/${this.maxConnections})`);
        
        // Monitor connection quality
        let pingStart = Date.now();
        socket.on('ping', () => {
            pingStart = Date.now();
        });
        
        socket.on('pong', () => {
            const latency = Date.now() - pingStart;
            console.log(`📊 Socket ${socket.id} latency: ${latency}ms`);
            
            // Log poor connections for monitoring
            if (latency > 1000) {
                console.log(`⚠️ High latency detected for socket ${socket.id}: ${latency}ms`);
            }
        });

        // Handle leaderboard requests with caching
        socket.on('leaderboard:getData', async () => {
            try {
                console.log('🎯 Leaderboard Socket.IO request received');
                
                const User = require('../models/user');
                
                // Get top 100 players by PHMN with proper indexing
                const topPlayers = await User.find({})
                    .sort({ PHMN: -1 })
                    .limit(100)
                    .select('telegramId username first_name last_name profile_picture PHMN')
                    .lean()
                    .maxTimeMS(5000); // 5 second timeout

                console.log(`🎯 Found ${topPlayers.length} players for leaderboard`);

                // Process players - simple list sorted by PHMN
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

                socket.emit('leaderboard:data', responseData);
                console.log(`🎯 Leaderboard sent to socket ${socket.id}`);

            } catch (error) {
                console.error('❌ Error in leaderboard Socket.IO handler:', error);
                socket.emit('leaderboard:error', { 
                    success: false, 
                    error: 'Failed to fetch leaderboard data' 
                });
            }
        });

        // Handle leaderboard test requests
        socket.on('leaderboard:test', () => {
            console.log('🧪 Leaderboard test request received');
            socket.emit('leaderboard:test', { 
                success: true, 
                message: 'Socket.IO connection working!',
                timestamp: new Date().toISOString()
            });
        });

        // Handle disconnection with proper cleanup
        socket.on('disconnect', async (reason) => {
            this.connectionCount--;
            this.connectionStats.disconnections++;
            console.log(`🔌 Socket disconnected: ${socket.id} (${this.connectionCount}/${this.maxConnections}) - Reason: ${reason}`);

            try {
                const req = socket.request;
                const roomId = req.session?.roomId;
                const playerId = req.session?.playerId;
                if (roomId && playerId) {
                    const { getRoom } = require('../services/roomService');
                    const room = await getRoom(roomId);
                    if (room) {
                        if (room.started) {
                            // Mark player as disconnected during game
                            room.markPlayerDisconnected(socket.id);
                            await room.save();
                            const { sendToPlayersRoomPlayers } = require('../socket/emits');
                            sendToPlayersRoomPlayers(room);
                        } else {
                            // Remove player from lobby
                            const idx = room.players.findIndex(p => p._id.toString() === playerId);
                            if (idx !== -1) {
                                const removed = room.players.splice(idx, 1)[0];
                                if (room.isEmpty()) {
                                    const { sendRoomDeleted } = require('../socket/emits');
                                    sendRoomDeleted(roomId, 'all_players_disconnected');
                                    await Room.findByIdAndDelete(roomId);
                                } else {
                                    await room.save();
                                    const { sendRoomStatus, sendPlayerRemoved, sendToPlayersRoomPlayers } = require('../socket/emits');
                                    sendPlayerRemoved(room._id, removed.name);
                                    sendRoomStatus(room);
                                    sendToPlayersRoomPlayers(room);
                                }
                            }
                        }
                    }
                }
            } catch (err) {
                console.error('❌ Error handling room cleanup on disconnect:', err);
            }

            // Clean up any room references
            this.cleanupSocketRooms(socket);
        });

        // Handle errors
        socket.on('error', (error) => {
            console.error(`❌ Socket error for ${socket.id}:`, error);
            this.connectionCount--;
            this.connectionStats.disconnections++;
        });
    },

    cleanupSocketRooms(socket) {
        try {
            // Get all rooms this socket was in
            const rooms = Array.from(socket.rooms);
            
            for (const roomId of rooms) {
                if (roomId !== socket.id) { // socket.id is always in rooms
                    socket.leave(roomId);
                    console.log(`🏠 Socket ${socket.id} left room ${roomId}`);
                }
            }
        } catch (error) {
            console.error(`❌ Error cleaning up socket rooms for ${socket.id}:`, error);
        }
    },

    startConnectionMonitoring() {
        // Monitor connection stats every minute
        setInterval(() => {
            const memUsage = process.memoryUsage();
            console.log(`📊 Connection Stats:`, {
                current: this.connectionCount,
                peak: this.connectionStats.peakConnections,
                total: this.connectionStats.totalConnections,
                disconnections: this.connectionStats.disconnections,
                memory: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
                uptime: `${Math.round(process.uptime())}s`
            });
        }, 60000); // Every minute
    },

    gracefulShutdown() {
        console.log('🔄 Graceful shutdown initiated...');
        
        // Stop room manager
        roomManager.stop();
        
        // Close all socket connections
        if (this.io) {
            this.io.close(() => {
                console.log('✅ Socket.IO server closed');
                process.exit(0);
            });
        } else {
            process.exit(0);
        }
    },

    getStats() {
        return {
            connections: this.connectionCount,
            maxConnections: this.maxConnections,
            stats: this.connectionStats,
            roomManagerStats: roomManager.getStats()
        };
    },

    getIO() {
        if (!this.io) {
            throw new Error('Socket.IO not initialized');
        }
        return this.io;
    }
};

module.exports = socketManager;
