const { sessionMiddleware, wrap } = require('../config/session');
const { Server } = require('socket.io');
const { registerUserHandlers } = require('../handlers/user');
const TasksHandler = require('../handlers/tasks');

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
      path: '/api/socket.io',
      pingTimeout: 60000,
      pingInterval: 25000,
      cors: {
        origin: (origin, callback) => callback(null, true),
        methods: ["GET", "POST"],
        credentials: true,
      },
      allowEIO3: true,
      allowRequest: (req, callback) => {
        const fakeRes = {
          getHeader() { return []; },
          setHeader(key, values) { req.cookieHolder = values[0]; },
          writeHead() { },
          on() { return this; },
          once() { return this; },
          emit() { return this; },
          end() { return this; },
          removeListener() { return this; }
        };
        sessionMiddleware(req, fakeRes, () => {
          if (req.session) {
            fakeRes.writeHead();
            req.session.save();
          }
          callback(null, true);
        });
      },
      transports: ['websocket', 'polling']
    });



    this.io.engine.on('initial_headers', (headers, req) => {
        if (req.cookieHolder) {
            headers['set-cookie'] = req.cookieHolder;
            delete req.cookieHolder;
        }
    });

    this.io.use(wrap(sessionMiddleware));



    this.io.on('connection', socket => {
      this.handleConnection(socket);
      


      registerUserHandlers(socket);
      new TasksHandler(socket);
    });



    process.on('SIGTERM', () => this.gracefulShutdown());
    process.on('SIGINT', () => this.gracefulShutdown());

    return this.io;
  },

  handleConnection(socket) {


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





    socket.on('leaderboard:getData', async () => {
      try {


        const User = require('../models/user');



        const topPlayers = await User.find({})
          .sort({ PHMN: -1 })
          .limit(100)
          .select('telegramId username first_name last_name profile_picture PHMN')
          .lean()
          .maxTimeMS(5000);





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


      } catch (error) {
        console.error('❌ Error in leaderboard Socket.IO handler:', error);
        socket.emit('leaderboard:error', {
          success: false,
          error: 'Failed to fetch leaderboard data'
        });
      }
    });



    socket.on('leaderboard:test', () => {

      socket.emit('leaderboard:test', {
        success: true,
        message: 'Socket.IO connection working!',
        timestamp: new Date().toISOString()
      });
    });



    socket.on('disconnect', async (reason) => {
      this.connectionCount--;
      this.connectionStats.disconnections++;


      try {
        const req = socket.request;
        const roomId = req.session?.roomId;
        const playerId = req.session?.playerId;
        if (roomId && playerId) {
          const { getRoom } = require('../services/roomService');
          const room = await getRoom(roomId);
          if (room) {
            if (room.started) {


              room.markPlayerDisconnected(socket.id);
              await room.save();
              const { sendToPlayersRoomPlayers } = require('../socket/emits');
              sendToPlayersRoomPlayers(room);
            } else {


              const idx = room.players.findIndex(p => p._id.toString() === playerId);
              if (idx !== -1) {
                const removed = room.players.splice(idx, 1)[0];
                if (room.isEmpty()) {
                  const { sendRoomDeleted } = require('../socket/emits');
                  sendRoomDeleted(roomId, 'all_players_disconnected');
                  await room.deleteOne();
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



      this.cleanupSocketRooms(socket);
    });



    socket.on('error', (error) => {
      console.error(`❌ Socket error for ${socket.id}:`, error);
      this.connectionCount--;
      this.connectionStats.disconnections++;
    });
  },

  cleanupSocketRooms(socket) {
    try {


      const rooms = Array.from(socket.rooms);

      for (const roomId of rooms) {
        if (roomId !== socket.id) {
          socket.leave(roomId);

        }
      }
    } catch (error) {
      console.error(`❌ Error cleaning up socket rooms for ${socket.id}:`, error);
    }
  },


  gracefulShutdown() {
    console.log('🔄 Graceful shutdown initiated...');



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
      stats: this.connectionStats
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
