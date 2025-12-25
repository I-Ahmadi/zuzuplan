import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import projectRoutes from './routes/projects';
import taskRoutes from './routes/tasks';
import commentRoutes from './routes/comments';
import attachmentRoutes from './routes/attachments';
import activityRoutes from './routes/activity';
import notificationRoutes from './routes/notifications';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3001';
app.use(cors({
  origin: CLIENT_URL,
  credentials: true
}));

// Log CORS configuration
console.log(`🔒 CORS enabled for: ${CLIENT_URL}`);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware for debugging
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/projects/:projectId/tasks', taskRoutes);
app.use('/api/tasks/:taskId/comments', commentRoutes);
app.use('/api/tasks/:taskId/attachments', attachmentRoutes);
app.use('/api/projects/:projectId/activity', activityRoutes);
app.use('/api/notifications', notificationRoutes);

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Connect to database and start server
const startServer = async () => {
  try {
    console.log('🔄 Connecting to database...');
    await connectDB();
    
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 API Base URL: http://localhost:${PORT}/api`);
      console.log(`📋 Available endpoints:`);
      console.log(`   POST /api/auth/register`);
      console.log(`   POST /api/auth/login`);
      console.log(`   GET  /health`);
      console.log(`\n✅ All routes registered and server is ready!`);
    });

    // Handle server errors (e.g., port already in use)
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Please:`);
        console.error(`   1. Stop the other process using port ${PORT}`);
        console.error(`   2. Or set a different PORT in your .env file`);
        console.error(`   3. Or kill the process: npx kill-port ${PORT}`);
      } else {
        console.error('❌ Server error:', error);
      }
      process.exit(1);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;

