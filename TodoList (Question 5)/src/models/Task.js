const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a task title'],
  },
  description: {
    type: String,
  },
  status: {
    type: String,
    enum: ['pending', 'completed'],
    default: 'pending',
  },
  list: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TodoList',
    required: true,
  },
  isRecurring: {
    type: Boolean,
    default: false,
  },
  recurrenceFrequency: {
    type: String,
    enum: ['day', 'week', 'month'],
  },
  dueDate: {
    type: Date,
  },
  lastOccurrence: {
    type: Date,
  }
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);
