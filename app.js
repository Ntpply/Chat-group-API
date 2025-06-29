const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const cors = require('cors');
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const createError = require('http-errors');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const mongoose = require('mongoose');

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const chatRouter = require('./routes/chat');

// MongoDB connection
const MONGODB_URI = 'mongodb+srv://nitipoom:momoni2545@cluster0.c4mjvn6.mongodb.net/';
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Middleware
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(cors());
app.use(express.json({ limit: '10mb' })); 
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true  }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/chat', chatRouter);

// Error Handling
app.use((req, res, next) => next(createError(404)));
app.use((err, req, res, next) => {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});
function isValidBase64Image(base64String) {
  try {
    if (!base64String.startsWith('data:image/')) {
      return false;
    }
    
    const base64Data = base64String.split(',')[1];
    if (!base64Data) {
      return false;
    }
    
    // Basic base64 validation
    const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/;
    return base64Pattern.test(base64Data);
  } catch (error) {
    return false;
  }
}

// Helper function to get image size from base64
function getImageSizeFromBase64(base64String) {
  try {
    const base64Data = base64String.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');
    return buffer.length;
  } catch (error) {
    return 0;
  }
}
// Socket.io Events
const Message = require('./models/message');
io.on('connection', (socket) => {
  console.log('🟢 User connected:', socket.id);

  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);
    console.log(`✅ User ${socket.id} joined room: ${roomId}`);
  });

  socket.on('sendMessage', async (data) => {
    try {
      console.log('📨 Received message:', {
        roomId: data.roomId,
        senderId: data.senderId,
        type: data.type,
        contentLength: data.text ? data.text.length : 0
      });

      // Validate required fields
      if (!data.roomId || !data.senderId || !data.text) {
        console.error('❌ Missing required fields');
        socket.emit('messageError', { error: 'Missing required fields' });
        return;
      }

      // Additional validation for image messages
      if (data.type === 'image') {
        if (!isValidBase64Image(data.text)) {
          console.error('❌ Invalid image format');
          socket.emit('messageError', { error: 'Invalid image format' });
          return;
        }

        // Check image size (limit to 5MB)
        const imageSize = getImageSizeFromBase64(data.text);
        const maxSize = 5 * 1024 * 1024; // 5MB in bytes
        
        if (imageSize > maxSize) {
          console.error('❌ Image too large:', imageSize);
          socket.emit('messageError', { error: 'Image size too large (max 5MB)' });
          return;
        }

        console.log('📷 Image message validated, size:', imageSize, 'bytes');
      }

      // Create new message
      const newMessage = new Message({
        chatRoomId: data.roomId,
        senderId: data.senderId,
        type: data.type || 'text',
        content: data.text,
      });

      // Save message to database
      const savedMessage = await newMessage.save();
      const populated = await savedMessage.populate('senderId', 'username');

      // Prepare message data for broadcast
      const messageData = {
        _id: savedMessage._id,
        roomId: data.roomId,
        sender: populated.senderId.username,
        senderId: populated.senderId._id,
        text: savedMessage.content,
        type: savedMessage.type,
        timestamp: savedMessage.timestamp,
      };

      // Broadcast to all clients in the room
      io.to(data.roomId).emit('receiveMessage', messageData);

      console.log('✅ Message saved and broadcasted:', {
        messageId: savedMessage._id,
        type: savedMessage.type,
        roomId: data.roomId
      });

    } catch (err) {
      console.error('❌ Error saving message:', err);
      socket.emit('messageError', { 
        error: 'Failed to save message',
        details: err.message 
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('🔴 User disconnected:', socket.id);
  });

  socket.on('error', (error) => {
    console.error('🚨 Socket error:', error);
  });
});

const PORT = 8000;
server.listen(PORT, () => {
  console.log(`🚀 Server with Socket.IO running at ${PORT}`);
});
