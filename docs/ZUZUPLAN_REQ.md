# ZuzuPlan – Requirements Document

## 1. Overview
A modern, scalable **task-management platform** designed for individual and team productivity. Supports real-time updates, role-based access, and comprehensive project/task management.

---

## 2. Core Features

### 2.1 User Management
- Registration, login, logout  
- Authentication: JWT + refresh tokens  
- Password reset and email verification  
- Roles: Owner, Admin, Member, Viewer  
- Profile management (avatar, name, email, preferences)

### 2.2 Projects
- Create, edit, delete projects  
- Assign members and roles per project  
- Track progress with completion percentage  
- Project search and filtering  

### 2.3 Tasks and Subtasks
- Create, edit, delete tasks  
- Add and track subtasks  
- Assign tasks to users  
- Set due dates, reminders, and priority levels  
- Labels/tags for categorization  
- Attach files and images  

### 2.4 Comments and Collaboration
- Real-time task comments  
- Mentions to notify users  
- Activity logs for updates  

### 2.5 Views
- **Dashboard:** Stats, upcoming tasks, recent activity  
- **Project Board:** Kanban view for tasks  
- **Calendar:** Monthly, weekly, daily views  
- **Task Detail View:** Full task metadata, attachments, comments  

### 2.6 Notifications and Reminders
- In-app and optional email notifications  
- Due date reminders  
- Activity alerts  

### 2.7 Real-Time Updates
- Firebase-powered real-time updates for tasks, comments, and activity logs  

### 2.8 Settings & Integrations
- User preferences  
- Notification settings  
- Team and role management  
- Optional integrations (Slack, Calendar, Email)  

---

---

## 3. Server Implementation Plan

### 3.1 Technology Stack
- **Runtime:** Node.js with TypeScript
- **Framework:** Express.js
- **ODM:** Mongoose
- **Database:** MongoDB
- **Authentication:** JWT (jsonwebtoken) + refresh tokens
- **Validation:** Zod or Joi
- **File Upload:** Multer (for attachments)
- **Email Service:** Nodemailer or SendGrid
- **Real-time:** Firebase Admin SDK (for real-time updates)
- **Testing:** Jest + Supertest
- **API Documentation:** Swagger/OpenAPI

### 3.2 Project Structure
```
server/
├── src/
│   ├── config/          # Database, env configs
│   ├── controllers/     # Route handlers
│   ├── services/        # Business logic
│   ├── models/          # Mongoose models (schemas)
│   ├── middleware/      # Auth, validation, error handling
│   ├── routes/          # API routes
│   ├── utils/           # Helpers, constants
│   ├── types/           # TypeScript types
│   └── tests/           # Test files
├── prisma/
│   └── seed.ts          # Database seed script
├── .env.example
├── package.json
└── tsconfig.json
```

### 3.3 Database Schema (MongoDB/Mongoose)

#### Core Models:
- **User:** id, email, password, name, avatar, role, emailVerified, createdAt, updatedAt
- **Project:** id, name, description, ownerId, progress, createdAt, updatedAt
- **ProjectMember:** id, projectId, userId, role (Owner/Admin/Member/Viewer)
- **Task:** id, title, description, projectId, assigneeId, dueDate, priority, status, createdAt, updatedAt
- **Subtask:** id, taskId, title, completed, createdAt, updatedAt
- **Label:** id, name, color, projectId
- **TaskLabel:** id, taskId, labelId (many-to-many)
- **Comment:** id, taskId, userId, content, createdAt, updatedAt
- **Attachment:** id, taskId, fileName, fileUrl, fileType, fileSize, uploadedBy, createdAt
- **ActivityLog:** id, projectId, taskId, userId, action, details, createdAt
- **Notification:** id, userId, type, message, read, relatedId, createdAt

### 3.4 API Endpoints

#### Authentication Routes (`/api/auth`)
- `POST /register` - User registration
- `POST /login` - User login (returns JWT + refresh token)
- `POST /refresh` - Refresh access token
- `POST /logout` - Logout (invalidate refresh token)
- `POST /forgot-password` - Request password reset
- `POST /reset-password` - Reset password with token
- `POST /verify-email` - Verify email address

#### User Routes (`/api/users`)
- `GET /me` - Get current user profile
- `PUT /me` - Update current user profile
- `GET /users/:id` - Get user by ID (with permissions check)
- `PUT /users/:id/avatar` - Upload user avatar

#### Project Routes (`/api/projects`)
- `GET /projects` - List all projects (with filters, pagination)
- `POST /projects` - Create new project
- `GET /projects/:id` - Get project details
- `PUT /projects/:id` - Update project
- `DELETE /projects/:id` - Delete project
- `GET /projects/:id/members` - Get project members
- `POST /projects/:id/members` - Add member to project
- `PUT /projects/:id/members/:userId` - Update member role
- `DELETE /projects/:id/members/:userId` - Remove member from project
- `GET /projects/:id/stats` - Get project statistics

#### Task Routes (`/api/projects/:projectId/tasks`)
- `GET /tasks` - List tasks (with filters, pagination, search)
- `POST /tasks` - Create new task
- `GET /tasks/:id` - Get task details
- `PUT /tasks/:id` - Update task
- `DELETE /tasks/:id` - Delete task
- `POST /tasks/:id/subtasks` - Add subtask
- `PUT /tasks/:id/subtasks/:subtaskId` - Update subtask
- `DELETE /tasks/:id/subtasks/:subtaskId` - Delete subtask

#### Comment Routes (`/api/tasks/:taskId/comments`)
- `GET /comments` - Get all comments for a task
- `POST /comments` - Add comment
- `PUT /comments/:id` - Update comment
- `DELETE /comments/:id` - Delete comment

#### Attachment Routes (`/api/tasks/:taskId/attachments`)
- `GET /attachments` - List attachments for a task
- `POST /attachments` - Upload attachment
- `DELETE /attachments/:id` - Delete attachment

#### Activity Routes (`/api/projects/:projectId/activity`)
- `GET /activity` - Get activity log (with pagination)

#### Notification Routes (`/api/notifications`)
- `GET /notifications` - Get user notifications
- `PUT /notifications/:id/read` - Mark notification as read
- `PUT /notifications/read-all` - Mark all as read

### 3.5 Middleware Implementation

#### Authentication Middleware
- Verify JWT token
- Extract user from token
- Handle token expiration and refresh

#### Authorization Middleware
- Role-based access control (RBAC)
- Project-level permissions check
- Resource ownership verification

#### Validation Middleware
- Request body validation using Zod
- Query parameter validation
- File upload validation (size, type)

#### Error Handling Middleware
- Centralized error handler
- Custom error classes
- Standardized error responses

### 3.6 Services Layer

#### AuthService
- User registration with password hashing (bcrypt)
- Login with JWT generation
- Token refresh logic
- Password reset flow
- Email verification

#### UserService
- Profile management
- Avatar upload handling

#### ProjectService
- CRUD operations
- Member management
- Progress calculation
- Permission checks

#### TaskService
- CRUD operations
- Subtask management
- Assignment logic
- Status transitions
- Due date reminders

#### NotificationService
- Create notifications
- Send email notifications
- Real-time notification triggers

#### ActivityLogService
- Log all project/task activities
- Generate activity feed

### 3.7 Real-Time Implementation
- Firebase Admin SDK integration
- Real-time listeners for:
  - Task updates
  - New comments
  - Activity logs
  - Notifications
- WebSocket alternative (Socket.io) if needed

### 3.8 Security Features
- Password hashing with bcrypt (salt rounds: 10+)
- JWT token expiration (access: 15min, refresh: 7days)
- Rate limiting on authentication endpoints
- CORS configuration
- Input sanitization
- NoSQL injection prevention (via Mongoose validation and sanitization)
- XSS protection
- File upload security (type validation, size limits)

### 3.9 Testing Strategy
- **Unit Tests:** Service functions, utilities
- **Integration Tests:** API endpoints with test database
- **E2E Tests:** Complete user workflows
- Test coverage target: 80%+

### 3.10 Database Considerations
- Indexes on: email, projectId, taskId, userId, status
- Cascade deletions handled in application logic
- Soft deletes for projects/tasks (optional)
- Schema changes handled automatically by Mongoose
- Seed data for development

### 3.11 Environment Configuration
- Development, Staging, Production environments
- Environment variables for:
  - Database URL
  - JWT secrets
  - Email service credentials
  - Firebase config
  - File storage (AWS S3 or local)
  - API port and host

---

## 4. Implementation Phases

### Phase 1: Foundation Setup
- Initialize Node.js + TypeScript project
- Set up Mongoose with MongoDB
- Create database schemas (Mongoose models)
- Set up Express server structure
- Configure environment variables

### Phase 2: Authentication System
- Implement user registration/login
- JWT token generation and validation
- Refresh token mechanism
- Password reset flow
- Email verification

### Phase 3: Core Features
- User management APIs
- Project CRUD with member management
- Task CRUD with subtasks
- Basic filtering and pagination

### Phase 4: Advanced Features
- Comments system
- File attachments
- Activity logging
- Labels and tagging

### Phase 5: Real-Time & Notifications
- Firebase integration
- Notification system
- Email notifications
- Activity feed

### Phase 6: Polish & Testing
- Error handling refinement
- Input validation
- Security hardening
- Comprehensive testing
- API documentation

---

## 5. Future Considerations (Frontend & Other)
- Frontend implementation will follow server completion
- AI features (task suggestions, priority scoring)  
