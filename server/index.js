require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Validate required environment variables
const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET', 'CLIENT_URL'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error(`❌ Missing environment variables: ${missingEnvVars.join(', ')}`);
  console.error('Please configure these in your .env file');
  process.exit(1);
}

// Import routes
const authRoutes = require('./routes/auth');
const documentsRoutes = require('./routes/documents');
const versionsRoutes = require('./routes/versions');
const socketHandler = require('./socket/socketHandler');

const app = express();
const httpServer = createServer(app);

// Socket.io setup
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  },
  transports: ['websocket', 'polling'],
});

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  optionsSuccessStatus: 200,
}));

// Request logging middleware (optional but useful)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/versions', versionsRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ 
    status: 'ok',
    database: dbStatus,
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);

  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }

  if (err.name === 'MongoServerError' && err.code === 11000) {
    return res.status(409).json({ error: 'Duplicate field value' });
  }

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
});

const PORT = process.env.PORT || 5000;

// Connect to MongoDB before starting server
const connectDB = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // 10 second timeout
    });

    console.log('✅ MongoDB connected successfully');

    // Socket.io handler
    socketHandler(io);

    // Start server ONLY after DB connection
    httpServer.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
      console.log(`📡 WebSocket namespace: /documents`);
      console.log(`🌍 Client URL: ${process.env.CLIENT_URL}`);
      console.log(`🔐 Auth middleware: JWT + bcryptjs`);
    });
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.error('Please verify your MONGO_URI in .env');
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  mongoose.connection.close(() => {
    console.log('✅ MongoDB connection closed');
    process.exit(0);
  });
});

// Start the application
connectDB();
