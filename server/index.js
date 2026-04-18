import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/database.js';
import { errorHandler } from './middleware/errorHandler.js';
import notFoundHandler from './middleware/notFoundHandler.js';
import { verifyEmailTransport } from './utils/email.js';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import projectRoutes from './routes/projects.js';
import taskRoutes from './routes/tasks.js';
import commentRoutes from './routes/comments.js';
import attachmentRoutes from './routes/attachments.js';
import activityRoutes from './routes/activity.js';
import notificationRoutes from './routes/notifications.js';
import labelRoutes from './routes/labels.js';

const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  console.log('Created uploads directory:', UPLOAD_DIR);
}

const app = express();

// Allow localhost origins (Next.js may use 3000, 3001, etc.)
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    const allowed = origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:');
    cb(null, allowed ? origin : false);
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/projects/:projectId/tasks', taskRoutes);
app.use('/api/projects/:projectId/labels', labelRoutes);
app.use('/api/projects/:projectId/activity', activityRoutes);
app.use('/api/tasks/:taskId/comments', commentRoutes);
app.use('/api/tasks/:taskId/attachments', attachmentRoutes);
app.use('/api/notifications', notificationRoutes);

app.use('/uploads', express.static(UPLOAD_DIR));

app.use(notFoundHandler);
app.use(errorHandler);

async function start() {
  await connectDB();
  await verifyEmailTransport();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
