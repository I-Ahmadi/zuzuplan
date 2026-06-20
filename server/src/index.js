import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/database.js';
import { errorHandler } from './middleware/errorHandler.js';
import notFoundHandler from './middleware/notFoundHandler.js';
import { verifyEmailTransport } from './utils/email.js';

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/usersRoutes.js';
import projectRoutes from './routes/projectsRoutes.js';
import taskRoutes from './routes/tasksRoutes.js';
import commentRoutes from './routes/commentsRoutes.js';
import attachmentRoutes from './routes/attachmentsRoutes.js';
import sprintRoutes from './routes/sprintsRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import activityRoutes from './routes/activityRoutes.js';
import inboxRoutes from './routes/inboxRoutes.js';
import deliveryRoutes from './routes/deliveryRoutes.js';
import wikiRoutes from './routes/wikiRoutes.js';

// App Configuration
const PORT = process.env.PORT;
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  console.log('Created uploads directory:', UPLOAD_DIR);
}

// Initialize Express Application
const app = express();

// CORS Configuration
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    const allowed = origin.startsWith('http://localhost:');
    cb(null, allowed ? origin : false);
  },
  credentials: true,
}));

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Health Check Route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/projects/:projectId/tasks', taskRoutes);
app.use('/api/projects/:projectId/issues', taskRoutes);
app.use('/api/projects/:projectId/sprints', sprintRoutes);
app.use('/api/projects/:projectId/delivery', deliveryRoutes);
app.use('/api/projects/:projectId/wiki', wikiRoutes);
app.use('/api/spaces', projectRoutes);
app.use('/api/spaces/:projectId/tasks', taskRoutes);
app.use('/api/spaces/:projectId/issues', taskRoutes);
app.use('/api/spaces/:projectId/sprints', sprintRoutes);
app.use('/api/spaces/:projectId/delivery', deliveryRoutes);
app.use('/api/spaces/:projectId/wiki', wikiRoutes);
app.use('/api/tasks/:taskId/comments', commentRoutes);
app.use('/api/tasks/:taskId/attachments', attachmentRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/inbox', inboxRoutes);
app.use('/api/search', searchRoutes);

app.use('/uploads', express.static(UPLOAD_DIR));

app.use(notFoundHandler);
app.use(errorHandler);

// Server Startup
async function start() {
  await connectDB();
  await verifyEmailTransport();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Start Application
start().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
