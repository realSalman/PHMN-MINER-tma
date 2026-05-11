const Task = require('../../models/task');

class AdminTaskHandler {
  constructor(socket) {
    this.socket = socket;
  }

  registerEvents() {
    this.socket.on('admin:addTask', this.handleAddTask.bind(this));
    this.socket.on('admin:deleteTask', this.handleDeleteTask.bind(this));
    this.socket.on('admin:getTasks', this.handleGetTasks.bind(this));
  }

  async handleGetTasks(data, callback) {
    try {
      const tasks = await Task.find({}).sort({ createdAt: -1 });
      callback({ success: true, tasks });
    } catch (error) {
      console.error('Error getting tasks:', error);
      callback({ success: false, error: 'Failed to get tasks' });
    }
  }

  async handleAddTask(data, callback) {
    try {
      const { title, description, reward, link, icon, type } = data;
      if (!title || !reward || !link) {
        return callback({ success: false, error: 'Title, reward, and link are required' });
      }

      const newTask = new Task({
        title,
        description,
        reward: parseFloat(reward),
        link,
        icon: icon || '🎯',
        type: type || 'social'
      });

      await newTask.save();
      callback({ success: true, task: newTask, message: 'Task added successfully' });
    } catch (error) {
      console.error('Error adding task:', error);
      callback({ success: false, error: 'Failed to add task' });
    }
  }

  async handleDeleteTask(data, callback) {
    try {
      const { taskId } = data;
      if (!taskId) {
        return callback({ success: false, error: 'Task ID is required' });
      }

      await Task.findByIdAndDelete(taskId);
      callback({ success: true, message: 'Task deleted successfully' });
    } catch (error) {
      console.error('Error deleting task:', error);
      callback({ success: false, error: 'Failed to delete task' });
    }
  }
}

module.exports = AdminTaskHandler;
