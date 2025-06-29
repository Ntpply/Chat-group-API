const express = require('express');
const router = express.Router();
const ChatRoom = require('../models/chatRoom');
const Message = require('../models/message');
const User = require('../models/user');

router.post('/newChatRoom', async (req, res) => {
   try {
    const { name, members } = req.body;

    if (!name || !Array.isArray(members) || members.length < 2) {
      return res.status(400).json({ error: 'ต้องระบุชื่อห้องและสมาชิกอย่างน้อย 2 คน' });
    }

    // ค้นหา user ที่มี username ตรงกับที่รับมา
    const users = await User.find({ username: { $in: members } });

    if (users.length !== members.length) {
      return res.status(404).json({ error: 'ไม่พบ username บางรายการ' });
    }

    const userIds = users.map(user => user._id);

    const newChatRoom = new ChatRoom({
      name,
      members: userIds
    });

    const savedRoom = await newChatRoom.save();
    res.status(201).json(savedRoom);
  } catch (err) {
    console.error('Error creating chat room:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการสร้างห้องแชท' });
  }
});
router.get('/check/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) {
      return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
    }
    res.status(200).json({ message: 'พบผู้ใช้', userId: user._id });
  } catch (err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

router.get('/chatRoom/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const rooms = await ChatRoom.find({ members: userId });
    res.json(rooms);
  } catch (error) {
    console.error('Error fetching chatrooms:', error);
    res.status(500).json({ error: 'Server error' });
  }
});
router.get('/messages/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const messages = await Message.find({ chatRoomId: roomId })
      .populate('senderId', 'username')
      .sort({ timestamp: 1 })
      .limit(100); // Limit to last 100 messages

    res.json(messages);
  } catch (error) {
    console.error('❌ Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// REST API endpoint to get message by ID
router.get('/message/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    
    const message = await Message.findById(messageId)
      .populate('senderId', 'username');

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json(message);
  } catch (error) {
    console.error('❌ Error fetching message:', error);
    res.status(500).json({ error: 'Failed to fetch message' });
  }
});

// REST API endpoint to delete message
router.delete('/message/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    
    const deletedMessage = await Message.findByIdAndDelete(messageId);

    if (!deletedMessage) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Broadcast deletion to all clients in the room
    io.to(deletedMessage.chatRoomId.toString()).emit('messageDeleted', {
      messageId: messageId,
      roomId: deletedMessage.chatRoomId
    });

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});


module.exports = router;
