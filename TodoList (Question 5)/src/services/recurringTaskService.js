const cron = require('node-cron');
const Task = require('../models/Task');
const logger = require('../utils/logger');
const { delCache } = require('../utils/cache');

const processRecurringTasks = async () => {
  logger.info('Running recurring tasks processor...');

  const now = new Date();

  const tasks = await Task.find({
    isRecurring: true,
    status: 'completed',

  });

  for (const task of tasks) {
    let nextDueDate = new Date(task.dueDate || now);

    if (task.recurrenceFrequency === 'day') {
      nextDueDate.setDate(nextDueDate.getDate() + 1);
    } else if (task.recurrenceFrequency === 'week') {
      nextDueDate.setDate(nextDueDate.getDate() + 7);
    } else if (task.recurrenceFrequency === 'month') {
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);
    }

    await Task.create({
      title: task.title,
      description: task.description,
      list: task.list,
      isRecurring: true,
      recurrenceFrequency: task.recurrenceFrequency,
      dueDate: nextDueDate,
      status: 'pending'
    });

    task.isRecurring = false;
    task.lastOccurrence = now;
    await task.save();

    await delCache(`tasks:${task.list}`);

    logger.info(`Created next occurrence for task: ${task.title}`);
  }
};

const initRecurringTasks = () => {
  cron.schedule('0 0 * * *', processRecurringTasks);
  logger.info('Recurring tasks cron job scheduled');
};

module.exports = { initRecurringTasks, processRecurringTasks };
