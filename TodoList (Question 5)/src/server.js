const app = require('./app');
const connectDB = require('./config/db');
const { connectRedis } = require('./config/redis');
const { initRecurringTasks } = require('./services/recurringTaskService');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDB();
    await connectRedis();
    initRecurringTasks();
    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
