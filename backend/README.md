# ZuzuPlan Server API

A modern, scalable task-management platform server built with Node.js, TypeScript, Express, Mongoose, and MongoDB.

## Features

- 🔐 JWT Authentication with refresh tokens
- 👥 User management with role-based access control
- 📁 Project management with member collaboration
- ✅ Task and subtask management
- 💬 Real-time comments
- 📎 File attachments
- 🏷️ Labels and tagging
- 📊 Activity logging
- 🔔 Notifications
- 🔄 Real-time updates via Firebase

## Tech Stack

- **Runtime:** Node.js with TypeScript
- **Framework:** Express.js
- **ODM:** Mongoose
- **Database:** MongoDB
- **Authentication:** JWT (jsonwebtoken) + refresh tokens
- **File Upload:** Multer
- **Email Service:** Nodemailer
- **Real-time:** Firebase Admin SDK

## Prerequisites

- Node.js (v18 or higher)
- MongoDB (v5.0 or higher) - local installation or MongoDB Atlas account
- npm or yarn

## Installation

1. **Clone the repository and navigate to server directory:**
   ```bash
   cd server
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and configure:
   - Database connection string (MongoDB URI)
     ```env
     DATABASE_URL=mongodb://localhost:27017/zuzuplan
     # Or for MongoDB Atlas:
     # DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/zuzuplan
     ```
   - JWT secrets
   - Email service credentials
   - Firebase configuration (optional)
   - File upload settings

4. **Set up the database:**
   ```bash
   # Make sure MongoDB is running locally, or use MongoDB Atlas
   
   # (Optional) Seed the database
   npm run seed
   ```

## Running the Application

### Development Mode
```bash
npm run dev
```

The server will start on `http://localhost:3000` (or the port specified in `.env`).

### Production Mode
```bash
npm run build
npm start
```

## API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication Endpoints

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and get tokens
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout (invalidate refresh token)
- `POST /api/auth/verify-email` - Verify email address
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token

### User Endpoints

- `GET /api/users/me` - Get current user profile
- `PUT /api/users/me` - Update current user profile
- `PUT /api/users/me/avatar` - Update user avatar
- `GET /api/users/:id` - Get user by ID

### Project Endpoints

- `GET /api/projects` - List all projects (with filters, pagination)
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project
- `GET /api/projects/:id/members` - Get project members
- `POST /api/projects/:id/members` - Add member to project
- `PUT /api/projects/:id/members/:userId` - Update member role
- `DELETE /api/projects/:id/members/:userId` - Remove member from project
- `GET /api/projects/:id/stats` - Get project statistics

### Task Endpoints

- `GET /api/projects/:projectId/tasks` - List tasks (with filters, pagination)
- `POST /api/projects/:projectId/tasks` - Create new task
- `GET /api/projects/:projectId/tasks/:id` - Get task details
- `PUT /api/projects/:projectId/tasks/:id` - Update task
- `DELETE /api/projects/:projectId/tasks/:id` - Delete task
- `POST /api/projects/:projectId/tasks/:id/subtasks` - Add subtask
- `PUT /api/projects/:projectId/tasks/:id/subtasks/:subtaskId` - Update subtask
- `DELETE /api/projects/:projectId/tasks/:id/subtasks/:subtaskId` - Delete subtask

### Comment Endpoints

- `GET /api/tasks/:taskId/comments` - Get all comments for a task
- `POST /api/tasks/:taskId/comments` - Add comment
- `PUT /api/tasks/:taskId/comments/:id` - Update comment
- `DELETE /api/tasks/:taskId/comments/:id` - Delete comment

### Attachment Endpoints

- `GET /api/tasks/:taskId/attachments` - List attachments for a task
- `POST /api/tasks/:taskId/attachments` - Upload attachment (multipart/form-data)
- `DELETE /api/tasks/:taskId/attachments/:id` - Delete attachment

### Activity Endpoints

- `GET /api/projects/:projectId/activity` - Get activity log (with pagination)

### Notification Endpoints

- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark notification as read
- `PUT /api/notifications/read-all` - Mark all as read

## Project Structure

```
server/
├── src/
│   ├── config/          # Database, Firebase configs
│   ├── controllers/     # Route handlers
│   ├── models/          # Mongoose models/schemas
│   ├── services/        # Business logic
│   ├── middleware/      # Auth, validation, error handling
│   ├── routes/          # API routes
│   ├── utils/           # Helpers, constants
│   └── index.ts         # Entry point
├── prisma/
│   └── seed.ts          # Database seed script
├── uploads/             # File uploads directory
├── .env.example         # Environment variables template
├── package.json
└── tsconfig.json
```

## Environment Variables

See `.env.example` for all required environment variables.

## Database

MongoDB uses a schema-less design, so migrations are handled automatically by Mongoose. The models in `src/models/` define the schema structure.

To view your database:
- Use MongoDB Compass (GUI tool)
- Use MongoDB Atlas web interface (if using Atlas)
- Use `mongosh` (MongoDB shell) for command-line access

## Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Security Features

- Password hashing with bcrypt (10 salt rounds)
- JWT token expiration (access: 15min, refresh: 7days)
- Rate limiting on authentication endpoints
- CORS configuration
- NoSQL injection prevention (via Mongoose validation and sanitization)
- File upload security (type validation, size limits)

## Error Handling

All errors are handled centrally and return standardized responses:

```json
{
  "success": false,
  "error": {
    "message": "Error message",
    "statusCode": 400
  }
}
```

## License

[To be determined]

