const mongoose = require('mongoose');

const todoListSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a list title'],
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  sharedWith: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
}, { timestamps: true });

module.exports = mongoose.model('TodoList', todoListSchema);
