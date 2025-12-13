# ZuzuPlan Project Rules

This document establishes the coding standards, conventions, and best practices for the ZuzuPlan project. All contributors must follow these rules to maintain code quality, consistency, and maintainability.

## Quick Reference

- **Indentation**: 2 spaces
- **Quotes**: Single quotes (both client and server)
- **Line Length**: 100 characters max
- **TypeScript**: Strict mode enabled, avoid `any` types
- **Components**: Functional components only, PascalCase naming
- **UI Libraries**: shadcn/ui and Tailwind CSS only (no other UI libraries)
- **API**: RESTful, consistent response format
- **Git**: Conventional Commits, feature/bugfix/hotfix branches
- **Testing**: 80%+ coverage target

---

## 1. Code Style & Conventions

### 1.1 Indentation and Formatting

**Required:**
- Use **2 spaces** for indentation (both client and server)
- Never use tabs
- Remove trailing whitespace

```typescript
// ✅ Good
function example() {
  const data = {
    name: 'John',
    age: 30,
  };
}

// ❌ Bad
function example() {
	const data = {
		name: 'John',
		age: 30,
	};
}
```

### 1.2 Quotes

**Required:**
- Use **single quotes** for strings (both client and server for consistency)
- Use template literals for string interpolation
- Use double quotes only when the string contains single quotes

```typescript
// ✅ Good
const message = 'Hello world';
const greeting = `Hello, ${name}`;
const text = "It's a beautiful day";

// ❌ Bad
const message = "Hello world"; // Inconsistent with project style
```

### 1.3 Line Length

**Required:**
- Maximum line length: **100 characters**
- Break long lines at logical points (operators, commas, function parameters)

```typescript
// ✅ Good
const result = calculateTotal(
  items.map(item => item.price * item.quantity),
  taxRate,
  discount
);

// ❌ Bad
const result = calculateTotal(items.map(item => item.price * item.quantity), taxRate, discount);
```

### 1.4 Semicolons

**Required:**
- Use semicolons consistently (as per ESLint configuration)
- Always use semicolons in server code
- Follow Next.js defaults for client code

### 1.5 Trailing Commas

**Required:**
- Use trailing commas in multi-line objects, arrays, and function parameters

```typescript
// ✅ Good
const config = {
  apiUrl: 'https://api.example.com',
  timeout: 5000,
};

const items = [
  'item1',
  'item2',
  'item3',
];

// ❌ Bad
const config = {
  apiUrl: 'https://api.example.com',
  timeout: 5000
};
```

### 1.6 Blank Lines

**Required:**
- Use blank lines to separate logical sections
- One blank line between functions/classes
- Two blank lines between major sections

---

## 2. TypeScript Rules

### 2.1 Strict Mode

**Required:**
- Strict mode is enabled in both `tsconfig.json` files
- Never disable strict mode options
- All TypeScript files must pass strict type checking

### 2.2 Type Safety

**Required:**
- **Avoid `any` type** - use `unknown` or proper types instead (ESLint warns on `any` usage)
- Use type assertions sparingly and only when necessary
- Prefer type guards over type assertions

```typescript
// ✅ Good
function processData(data: unknown): string {
  if (typeof data === 'string') {
    return data.toUpperCase();
  }
  throw new Error('Invalid data type');
}

// ❌ Bad
function processData(data: any): string {
  return data.toUpperCase();
}
```

### 2.3 Explicit Return Types

**Recommended:**
- Export functions should have explicit return types when not obvious
- Internal functions should have return types when not obvious
- Note: `explicit-module-boundary-types` is disabled in server ESLint config, but explicit types are still recommended for clarity

```typescript
// ✅ Good
export function getUser(id: string): Promise<IUser | null> {
  return User.findById(id);
}

// ❌ Bad
export function getUser(id: string) {
  return User.findById(id);
}
```

### 2.4 Interfaces vs Types

**Required:**
- Use **interfaces** for object shapes that may be extended
- Use **types** for unions, intersections, and computed types
- Prefer interfaces for public APIs

```typescript
// ✅ Good - Interface for object shape
export interface IUser {
  id: string;
  email: string;
  name: string;
}

// ✅ Good - Type for union
export type Status = 'pending' | 'in-progress' | 'completed';

// ✅ Good - Type for intersection
export type AuthenticatedUser = IUser & { token: string };
```

### 2.5 Type Imports

**Required:**
- Use `import type` for type-only imports when possible

```typescript
// ✅ Good
import type { Request, Response } from 'express';
import { User } from '../models/User';

// ❌ Bad
import { Request, Response } from 'express';
```

### 2.6 Null and Undefined

**Required:**
- Explicitly handle `null` and `undefined`
- Use optional chaining (`?.`) and nullish coalescing (`??`) appropriately

```typescript
// ✅ Good
const name = user?.name ?? 'Unknown';
const length = items?.length ?? 0;

// ❌ Bad
const name = user.name || 'Unknown';
```

---

## 3. Project Structure Rules

### 3.1 Directory Structure

**Required:**
- Follow the established directory structure:
  - `client/` - Next.js frontend application
  - `server/` - Express backend API
  - `docs/` - Documentation files

### 3.2 Client Structure

**Required:**
```
client/
├── app/              # Next.js app router pages
├── components/       # React components
│   ├── ui/          # Reusable UI components
│   └── [feature]/    # Feature-specific components
├── contexts/        # React contexts
├── hooks/           # Custom React hooks
├── lib/             # Utility functions and API clients
├── types/           # TypeScript type definitions
└── public/          # Static assets
```

### 3.3 Server Structure

**Required:**
```
server/
├── src/
│   ├── config/      # Configuration files
│   ├── controllers/ # Route handlers
│   ├── services/    # Business logic
│   ├── models/      # Mongoose models
│   ├── middleware/  # Express middleware
│   ├── routes/      # API route definitions
│   └── utils/       # Utility functions
```

### 3.4 File Organization

**Required:**
- One component/class/function per file (unless closely related)
- Group related files in feature directories
- Keep files focused and single-purpose

---

## 4. Naming Conventions

### 4.1 Files and Directories

**Required:**
- **Components**: PascalCase (e.g., `UserProfile.tsx`, `TaskCard.tsx`)
- **Pages**: kebab-case (e.g., `user-profile/page.tsx`, `task-detail/page.tsx`)
- **Utilities/Helpers**: camelCase (e.g., `formatDate.ts`, `apiClient.ts`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_BASE_URL.ts`, `MAX_FILE_SIZE.ts`)
- **Types/Interfaces**: PascalCase with `I` prefix for interfaces (e.g., `IUser.ts`, `TaskStatus.ts`)

### 4.2 Variables and Functions

**Required:**
- Use **camelCase** for variables and functions
- Use descriptive names that indicate purpose
- Boolean variables should start with `is`, `has`, `should`, `can`, etc.

```typescript
// ✅ Good
const userName = 'John';
const isAuthenticated = true;
const hasPermission = checkPermission(user);
function getUserById(id: string) { }

// ❌ Bad
const u = 'John';
const auth = true;
function get(id: string) { }
```

### 4.3 Constants

**Required:**
- Use **UPPER_SNAKE_CASE** for constants
- Group related constants in objects or enums

```typescript
// ✅ Good
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const API_BASE_URL = 'https://api.example.com';

// ✅ Good - Grouped
const CONFIG = {
  MAX_FILE_SIZE: 5 * 1024 * 1024,
  API_BASE_URL: 'https://api.example.com',
} as const;
```

### 4.4 Classes

**Required:**
- Use **PascalCase** for class names
- Use descriptive names that indicate the class purpose

```typescript
// ✅ Good
class UserService { }
class TaskRepository { }

// ❌ Bad
class service { }
class TaskRepo { }
```

### 4.5 Database Models

**Required:**
- Model interfaces: `I` prefix (e.g., `IUser`, `ITask`)
- Model schemas: PascalCase (e.g., `UserSchema`, `TaskSchema`)
- Model exports: PascalCase (e.g., `User`, `Task`)

---

## 5. React/Next.js Rules

### 5.1 Component Structure

**Required:**
- Use **functional components only** (no class components)
- Use TypeScript for all components
- Define props interface above the component

```typescript
// ✅ Good
interface UserCardProps {
  user: IUser;
  onEdit?: (id: string) => void;
}

export default function UserCard({ user, onEdit }: UserCardProps) {
  return (
    <div>
      <h2>{user.name}</h2>
      {onEdit && <button onClick={() => onEdit(user.id)}>Edit</button>}
    </div>
  );
}
```

### 5.2 Hooks

**Required:**
- Custom hooks must be prefixed with `use`
- Place hooks at the top of the component
- Follow Rules of Hooks (only call hooks at the top level)

```typescript
// ✅ Good
export function useUserData(userId: string) {
  const [user, setUser] = useState<IUser | null>(null);
  // ...
  return user;
}

// ✅ Good - Component usage
function UserProfile({ userId }: { userId: string }) {
  const user = useUserData(userId);
  const [isLoading, setIsLoading] = useState(false);
  // ...
}
```

### 5.3 Server vs Client Components

**Required:**
- Use **Server Components by default** (Next.js App Router)
- Add `'use client'` directive only when needed (interactivity, hooks, browser APIs)
- Keep client components small and focused

```typescript
// ✅ Good - Server Component (default)
export default function ProjectList() {
  const projects = await getProjects();
  return <ProjectGrid projects={projects} />;
}

// ✅ Good - Client Component (when needed)
'use client';

import { useState } from 'react';

export function TaskForm() {
  const [title, setTitle] = useState('');
  // ...
}
```

### 5.4 State Management

**Required:**
- Use `useState` for local component state
- Use Context API for shared state across components
- Consider server state management for API data (React Query, SWR)

### 5.5 Props and Children

**Required:**
- Use explicit prop types/interfaces
- Use `React.ReactNode` for children prop
- Destructure props in function parameters

```typescript
// ✅ Good
interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function Layout({ children, title }: LayoutProps) {
  return (
    <div>
      {title && <h1>{title}</h1>}
      {children}
    </div>
  );
}
```

### 5.6 Event Handlers

**Required:**
- Use descriptive handler names (e.g., `handleSubmit`, `onUserClick`)
- Define handlers as arrow functions or use `useCallback` for performance

```typescript
// ✅ Good
function TaskCard({ task, onComplete }: TaskCardProps) {
  const handleComplete = () => {
    onComplete(task.id);
  };

  return <button onClick={handleComplete}>Complete</button>;
}
```

### 5.7 UI Development Libraries

**Required:**
- **Only use shadcn/ui and Tailwind CSS** for UI development in Next.js
- Do not add other UI libraries or component frameworks (e.g., Material-UI, Ant Design, Chakra UI, etc.)
- Use shadcn/ui components from `components/ui/` directory
- Style components using Tailwind CSS utility classes
- Extend shadcn/ui components when custom functionality is needed

```typescript
// ✅ Good - Using shadcn/ui and Tailwind
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">{project.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <Button variant="default" className="mt-4">
          View Project
        </Button>
      </CardContent>
    </Card>
  );
}

// ❌ Bad - Using other UI libraries
import { Button } from '@mui/material'; // Not allowed
import { ChakraProvider } from '@chakra-ui/react'; // Not allowed
```

**Rationale:**
- Maintains consistency across the application
- Reduces bundle size and dependencies
- shadcn/ui provides accessible, customizable components
- Tailwind CSS offers utility-first styling that integrates seamlessly with Next.js

---

## 6. API Design Rules

### 6.1 RESTful Conventions

**Required:**
- Follow RESTful principles
- Use proper HTTP methods: GET, POST, PUT, DELETE, PATCH
- Use plural nouns for resources

```typescript
// ✅ Good
GET    /api/projects           // List projects
POST   /api/projects           // Create project
GET    /api/projects/:id       // Get project
PUT    /api/projects/:id       // Update project
DELETE /api/projects/:id       // Delete project
GET    /api/projects/:id/tasks // Get project tasks
```

### 6.2 Response Format

**Required:**
- Use consistent response format across all endpoints
- Include `success`, `data`, `error`, and `message` fields

```typescript
// ✅ Good - Success response
{
  "success": true,
  "data": {
    "id": "123",
    "name": "Project Name"
  }
}

// ✅ Good - Error response
{
  "success": false,
  "error": "ValidationError",
  "message": "Invalid email format"
}
```

### 6.3 HTTP Status Codes

**Required:**
- Use appropriate HTTP status codes:
  - `200 OK` - Successful GET, PUT, PATCH
  - `201 Created` - Successful POST
  - `400 Bad Request` - Validation errors
  - `401 Unauthorized` - Authentication required
  - `403 Forbidden` - Insufficient permissions
  - `404 Not Found` - Resource not found
  - `500 Internal Server Error` - Server errors

```typescript
// ✅ Good
res.status(201).json({
  success: true,
  data: newProject,
});

res.status(400).json({
  success: false,
  error: 'ValidationError',
  message: 'Invalid input data',
});
```

### 6.4 Request Validation

**Required:**
- Validate all user inputs using middleware
- Use express-validator or similar for request validation
- Return validation errors in consistent format

```typescript
// ✅ Good
import { body, validationResult } from 'express-validator';

export const validateCreateProject = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('description').optional().isString(),
];
```

### 6.5 Pagination

**Required:**
- Implement pagination for list endpoints
- Use `page` and `limit` query parameters
- Return pagination metadata in response

```typescript
// ✅ Good
GET /api/projects?page=1&limit=10

Response:
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

### 6.6 Error Handling

**Required:**
- Use centralized error handling middleware
- Never expose internal error details to clients
- Log errors server-side for debugging

---

## 7. Database & Model Rules

### 7.1 Mongoose Models

**Required:**
- Define interface extending `Document` for type safety
- Use schema validation at model level
- Enable timestamps (`createdAt`, `updatedAt`) on all models

```typescript
// ✅ Good
export interface IUser extends Document {
  _id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);
```

### 7.2 Schema Validation

**Required:**
- Define validation rules in schema
- Use Mongoose validators (required, min, max, enum, etc.)
- Add custom validators when needed

```typescript
// ✅ Good
const TaskSchema = new Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed'],
    default: 'pending',
  },
  priority: {
    type: Number,
    min: 1,
    max: 5,
    default: 3,
  },
});
```

### 7.3 Indexes

**Required:**
- Add indexes on frequently queried fields
- Index fields used in filters, sorts, and joins
- Use compound indexes for multi-field queries

```typescript
// ✅ Good
UserSchema.index({ email: 1 }); // Single field
TaskSchema.index({ projectId: 1, status: 1 }); // Compound index
```

### 7.4 Relationships

**Required:**
- Use `ObjectId` references for relationships
- Populate references when needed
- Handle cascade deletions in application logic

```typescript
// ✅ Good
const TaskSchema = new Schema({
  projectId: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  assigneeId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
});
```

### 7.5 Model Exports

**Required:**
- Export both interface and model
- Use consistent naming: `I[ModelName]` for interface, `[ModelName]` for model

```typescript
// ✅ Good
export interface IUser extends Document { }
export const User = mongoose.model<IUser>('User', UserSchema);
```

---

## 8. Git Workflow Rules

### 8.1 Branch Naming

**Required:**
- Use descriptive branch names with prefixes:
  - `feature/` - New features (e.g., `feature/user-authentication`)
  - `bugfix/` - Bug fixes (e.g., `bugfix/login-error`)
  - `hotfix/` - Critical production fixes (e.g., `hotfix/security-patch`)
  - `refactor/` - Code refactoring (e.g., `refactor/api-structure`)
  - `docs/` - Documentation updates (e.g., `docs/api-documentation`)

### 8.2 Commit Messages

**Required:**
- Follow **Conventional Commits** format:
  ```
  <type>(<scope>): <subject>

  <body>

  <footer>
  ```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

```bash
# ✅ Good
feat(auth): add JWT refresh token mechanism

Implement refresh token rotation for improved security.
Tokens expire after 7 days and can be refreshed once.

Closes #123

# ❌ Bad
fixed login bug
```

### 8.3 Pull Requests

**Required:**
- All changes must go through Pull Requests
- PR title should follow Conventional Commits format
- PR description should include:
  - What changed and why
  - How to test
  - Screenshots (if UI changes)
  - Related issues

**PR Requirements:**
- All tests must pass
- No ESLint errors
- Code review approval from at least one team member
- CI/CD checks must pass

### 8.4 Code Review

**Required:**
- Reviewers should check:
  - Code quality and adherence to rules
  - Test coverage
  - Security considerations
  - Performance implications
- Be constructive and respectful in reviews
- Address all review comments before merging

---

## 9. Security Rules

### 9.1 Authentication

**Required:**
- Use JWT for authentication
- Access tokens: 15 minutes expiration
- Refresh tokens: 7 days expiration
- Store refresh tokens securely (httpOnly cookies or secure storage)

### 9.2 Password Security

**Required:**
- Hash passwords using bcrypt with **10+ salt rounds**
- Never store plain text passwords
- Enforce strong password requirements (min length, complexity)

```typescript
// ✅ Good
import bcrypt from 'bcrypt';

const saltRounds = 10;
const hashedPassword = await bcrypt.hash(password, saltRounds);
```

### 9.3 Input Validation

**Required:**
- Validate and sanitize all user inputs
- Use validation middleware on all endpoints
- Prevent NoSQL injection (Mongoose handles this, but be cautious)
- Prevent XSS attacks (sanitize user-generated content)

### 9.4 Rate Limiting

**Required:**
- Implement rate limiting on authentication endpoints
- Use express-rate-limit middleware
- Configure appropriate limits per endpoint type

```typescript
// ✅ Good
import rateLimit from 'express-rate-limit';

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many login attempts, please try again later',
});
```

### 9.5 Environment Variables

**Required:**
- Never commit secrets to version control
- Use `.env` files for local development
- Use `.env.example` to document required variables
- Use secure secret management in production

### 9.6 CORS Configuration

**Required:**
- Configure CORS appropriately
- Only allow trusted origins in production
- Use environment variables for allowed origins

### 9.7 Authorization

**Required:**
- Implement role-based access control (RBAC)
- Check permissions at both route and resource level
- Use middleware for authorization checks

```typescript
// ✅ Good
export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Insufficient permissions',
      });
    }
    next();
  };
};
```

---

## 10. Error Handling Rules

### 10.1 Error Types

**Required:**
- Create custom error classes for different error types
- Use consistent error structure
- Include error codes for client handling

```typescript
// ✅ Good
export class ValidationError extends Error {
  constructor(
    public message: string,
    public field?: string,
    public code: string = 'VALIDATION_ERROR'
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(
    public resource: string,
    public code: string = 'NOT_FOUND'
  ) {
    super(`${resource} not found`);
    this.name = 'NotFoundError';
  }
}
```

### 10.2 Error Middleware

**Required:**
- Use centralized error handling middleware
- Log errors with appropriate detail level
- Return user-friendly error messages
- Never expose stack traces in production

```typescript
// ✅ Good
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err);

  if (err instanceof ValidationError) {
    return res.status(400).json({
      success: false,
      error: err.code,
      message: err.message,
      field: err.field,
    });
  }

  if (err instanceof NotFoundError) {
    return res.status(404).json({
      success: false,
      error: err.code,
      message: err.message,
    });
  }

  res.status(500).json({
    success: false,
    error: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
  });
};
```

### 10.3 Async Error Handling

**Required:**
- Always handle errors in async functions
- Use try-catch blocks or error handling middleware
- Pass errors to next() in Express route handlers

```typescript
// ✅ Good
export const getProject = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const project = await projectService.findById(req.params.id);
    if (!project) {
      throw new NotFoundError('Project');
    }
    res.json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
};
```

### 10.4 Client-Side Error Handling

**Required:**
- Handle API errors gracefully in React components
- Display user-friendly error messages
- Log errors for debugging
- Provide fallback UI for error states

```typescript
// ✅ Good
function ProjectList() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects()
      .catch(err => {
        setError('Failed to load projects. Please try again.');
        console.error('Error loading projects:', err);
      });
  }, []);

  if (error) {
    return <ErrorMessage message={error} />;
  }
  // ...
}
```

---

## 11. Testing Rules

### 11.1 Test Structure

**Required:**
- Write tests for all services and utilities
- Test files should be co-located or in `__tests__` directories
- Use descriptive test names that explain what is being tested

```typescript
// ✅ Good
describe('UserService', () => {
  describe('register', () => {
    it('should create a new user with hashed password', async () => {
      // Test implementation
    });

    it('should throw error if email already exists', async () => {
      // Test implementation
    });
  });
});
```

### 11.2 Test Coverage

**Required:**
- Maintain **80%+ test coverage**
- Focus on business logic and critical paths
- Test error cases and edge cases

### 11.3 Test Types

**Required:**
- **Unit Tests**: Test individual functions/services in isolation
- **Integration Tests**: Test API endpoints with test database
- **E2E Tests**: Test complete user workflows (if applicable)

### 11.4 Mocking

**Required:**
- Mock external dependencies (database, APIs, file system)
- Use Jest mocking utilities
- Keep mocks simple and focused

```typescript
// ✅ Good
jest.mock('../models/User');
jest.mock('../utils/email');

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  // ...
});
```

### 11.5 Test Data

**Required:**
- Use factories or fixtures for test data
- Clean up test data after tests
- Use test database for integration tests

### 11.6 Running Tests

**Required:**
- Run tests before committing: `npm test`
- All tests must pass before PR merge
- Run coverage report: `npm run test:coverage`

---

## 12. Documentation Rules

### 12.1 Code Comments

**Required:**
- Write self-documenting code (prefer clear code over comments)
- Add comments for complex logic or business rules
- Use JSDoc for public functions and classes

```typescript
// ✅ Good
/**
 * Calculates the total price including tax and discount.
 * 
 * @param items - Array of items with price and quantity
 * @param taxRate - Tax rate as decimal (e.g., 0.1 for 10%)
 * @param discount - Discount amount in currency
 * @returns Total price after tax and discount
 */
export function calculateTotal(
  items: Item[],
  taxRate: number,
  discount: number
): number {
  // Complex calculation logic here
}
```

### 12.2 README Files

**Required:**
- Maintain README.md in project root
- Include setup instructions, dependencies, and usage
- Document environment variables in `.env.example`
- Update README when adding new features

### 12.3 API Documentation

**Required:**
- Document all API endpoints
- Include request/response examples
- Document authentication requirements
- Use Swagger/OpenAPI if implemented

### 12.4 Inline Documentation

**Required:**
- Document complex algorithms or business logic
- Explain "why" not "what" in comments
- Keep comments up-to-date with code changes

---

## 13. Performance Rules

### 13.1 Database Queries

**Required:**
- Use indexes on frequently queried fields
- Avoid N+1 query problems (use populate or aggregation)
- Limit query results with pagination
- Use select() to limit returned fields

```typescript
// ✅ Good
const users = await User.find({ active: true })
  .select('name email')
  .limit(10)
  .skip((page - 1) * limit);

// ❌ Bad
const users = await User.find({ active: true }); // No limit, returns all fields
```

### 13.2 Caching

**Required:**
- Cache frequently accessed, rarely changed data
- Use appropriate cache expiration
- Invalidate cache on data updates

### 13.3 API Optimization

**Required:**
- Minimize API response payload size
- Use compression (gzip) for responses
- Implement request batching when appropriate
- Use pagination for large datasets

### 13.4 Frontend Performance

**Required:**
- Lazy load components and routes
- Optimize images and assets
- Use React.memo for expensive components
- Avoid unnecessary re-renders

```typescript
// ✅ Good
const ExpensiveComponent = React.memo(({ data }: Props) => {
  // Component implementation
});

// ✅ Good - Lazy loading
const LazyComponent = lazy(() => import('./LazyComponent'));
```

### 13.5 Bundle Size

**Required:**
- Monitor bundle size
- Use dynamic imports for large dependencies
- Remove unused dependencies
- Use tree-shaking compatible imports

---

## 14. Dependencies Rules

### 14.1 Package Management

**Required:**
- Use `npm` for package management (as per project setup)
- Commit `package-lock.json` to version control
- Keep dependencies up-to-date
- Review and approve new dependencies

### 14.2 Version Management

**Required:**
- Use exact versions for critical dependencies (security, stability)
- Use caret (^) for minor updates in most cases
- Document version requirements in README
- Test thoroughly after dependency updates

### 14.3 Security Updates

**Required:**
- Regularly update dependencies for security patches
- Use `npm audit` to check for vulnerabilities
- Fix high and critical vulnerabilities immediately
- Document security update process

### 14.4 Adding Dependencies

**Required:**
- Justify new dependencies in PR description
- Prefer well-maintained, popular packages
- Check bundle size impact (client-side)
- Consider alternatives before adding
- **UI Libraries**: Do not add alternative UI component libraries (Material-UI, Ant Design, Chakra UI, etc.). Only shadcn/ui and Tailwind CSS are allowed for UI development

### 14.5 Dev Dependencies

**Required:**
- Keep dev dependencies separate from production
- Include necessary build tools and linters
- Don't include unused dev dependencies

---

## 15. Additional Best Practices

### 15.1 Code Review Checklist

Before submitting a PR, ensure:
- [ ] Code follows all rules in this document
- [ ] All tests pass
- [ ] No ESLint errors or warnings
- [ ] TypeScript compiles without errors
- [ ] Documentation is updated if needed
- [ ] No console.log statements in production code
- [ ] No commented-out code
- [ ] Error handling is implemented
- [ ] Security considerations are addressed

### 15.2 Code Quality Tools

**Required:**
- ESLint is configured and must pass
- TypeScript strict mode is enabled
- Pre-commit hooks (if configured) must pass
- CI/CD pipeline must pass

### 15.3 Refactoring

**Required:**
- Refactor when code becomes hard to maintain
- Keep refactoring PRs separate from feature PRs
- Maintain test coverage during refactoring
- Document significant architectural changes

### 15.4 Dead Code

**Required:**
- Remove unused code, imports, and dependencies
- Remove commented-out code
- Clean up temporary files and debug code

---

## 16. Enforcement

### 16.1 Automated Checks

- ESLint runs on all code
- TypeScript compiler checks types
- Tests must pass in CI/CD
- Pre-commit hooks (if configured) enforce basic checks

### 16.2 Code Review

- All code must be reviewed before merging
- Reviewers should reference this document
- Violations should be addressed before approval

### 16.3 Updates to Rules

- Rules can be updated through team discussion
- Changes should be documented in this file
- All team members should be notified of rule changes

---

## References

- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Express.js Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)
- [Mongoose Documentation](https://mongoosejs.com/docs/)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

**Last Updated**: 2024
**Version**: 1.0

