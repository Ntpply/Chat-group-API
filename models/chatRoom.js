const mongoose = require('mongoose');

const chatRoomSchema  = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ChatRoom', chatRoomSchema );
