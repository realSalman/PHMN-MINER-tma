class ConfigHandler {
  constructor(socket) {
    this.socket = socket;
  }

  registerEvents() {
    this.socket.on('app:getBotUsername', this.handleGetBotUsername.bind(this));
  }

  async handleGetBotUsername(data, callback) {
    try {
      const botUsername = process.env.BOT_USERNAME;
      callback({ success: true, botUsername });
    } catch (error) {
      console.error('Error getting bot username:', error);
      callback({ success: false, error: 'Failed to get bot username' });
    }
  }
}

module.exports = ConfigHandler;
