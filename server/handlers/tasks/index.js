const ReferralHandler = require('./referralHandler');
const TaskSystemHandler = require('./taskSystemHandler');
const AdminTaskHandler = require('./adminTaskHandler');
const ConfigHandler = require('./configHandler');

class TasksHandler {
  constructor(socket) {
    if (!socket) {
      throw new Error('Socket is required for TasksHandler');
    }
    this.socket = socket;

    this.referralHandler = new ReferralHandler(socket);
    this.taskSystemHandler = new TaskSystemHandler(socket);
    this.adminTaskHandler = new AdminTaskHandler(socket);
    this.configHandler = new ConfigHandler(socket);

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.referralHandler.registerEvents();
    this.taskSystemHandler.registerEvents();
    this.adminTaskHandler.registerEvents();
    this.configHandler.registerEvents();
  }
}

module.exports = TasksHandler;
