import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/index.js';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
  log: ['error', 'warn'],
});

const seedUserEmail = 'demo@sprintly.local';
const seedPassword = 'DemoPass123!';
const baseDate = new Date('2026-06-24T12:00:00.000Z');

const users = [
  { email: seedUserEmail, name: 'Demo Owner', role: 'Admin', avatar: 'https://api.dicebear.com/9.x/initials/svg?seed=Demo%20Owner' },
  { email: 'maya@sprintly.local', name: 'Maya Chen', role: 'Manager', avatar: 'https://api.dicebear.com/9.x/initials/svg?seed=Maya%20Chen' },
  { email: 'leo@sprintly.local', name: 'Leo Brooks', role: 'Employee', avatar: 'https://api.dicebear.com/9.x/initials/svg?seed=Leo%20Brooks' },
  { email: 'nora@sprintly.local', name: 'Nora Patel', role: 'Employee', avatar: 'https://api.dicebear.com/9.x/initials/svg?seed=Nora%20Patel' },
  { email: 'sam@sprintly.local', name: 'Sam Rivera', role: 'Viewer', avatar: 'https://api.dicebear.com/9.x/initials/svg?seed=Sam%20Rivera' },
];

const taskStatuses = [
  'TODO',
  'IN_PROGRESS',
  'IN_REVIEW',
  'DONE',
];

const taskTypes = ['FEATURE', 'BUG', 'CHORE', 'TECH_DEBT', 'SPIKE', 'INCIDENT'];
const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

const projectBlueprints = [
  {
    key: 'CORE',
    name: 'Sprintly Core',
    description: 'End-to-end task management, board behavior, comments, search, and project navigation.',
    visibility: 'private',
    status: 'active',
    tasks: [
      'Create project from empty state',
      'Rename project key and preserve links',
      'Switch task board columns without losing filters',
      'Open task detail drawer from list and board',
      'Update assignee and notify the new owner',
      'Add comments with long markdown-like notes',
      'Review task counters and activity signals',
      'Search by task title and description',
      'Paginate task lists at high volume',
      'Archive completed project safely',
      'Drag task between board columns',
      'Edit due date from analytics panel',
      'Show overdue count in analytics',
      'Render canceled work as closed',
      'Keep sidebar project selection after reload',
      'Validate empty task title errors',
      'Filter by sprint backlog',
      'Display activity timeline on task detail',
      'Use global search keyboard flow',
      'Check mobile task layout'
    ],
  },
  {
    key: 'MOBILE',
    name: 'Mobile Companion',
    description: 'Responsive handheld workflows, activity review, notifications, and offline-friendly task review.',
    visibility: 'private',
    status: 'active',
    tasks: [
      'Tune compact board cards for touch',
      'Verify activity review actions',
      'Add quick-create task from mobile header',
      'Keep bottom spacing above browser toolbar',
      'Test long project names in switcher',
      'Show unread badge after assignment',
      'Handle deployment failure alert',
      'Render account preference forms on narrow screens',
      'Support swipe-free status changes',
      'Check authentication redirect loop',
      'Validate password reset screens',
      'Keep task table readable on mobile',
      'Show sprint picker with many sprints',
      'Test avatar upload error state',
      'Review dark theme contrast',
      'Confirm invite accept flow',
      'Handle expired invite messaging',
      'Check long comment wrapping',
      'Verify search dialog fits viewport',
      'Exercise optimistic task changes'
    ],
  },
  {
    key: 'API',
    name: 'API Reliability',
    description: 'Backend validation, permissions, pagination, delivery endpoints, and cross-resource activity logging.',
    visibility: 'private',
    status: 'active',
    tasks: [
      'Reject invalid project ids',
      'Confirm Todo status handling',
      'Confirm Done status handling',
      'Protect project member management routes',
      'Validate assignee belongs to project',
      'Return task counts with list responses',
      'Record status change activity',
      'Record blocked task activity',
      'Link pull request to task',
      'List deployments by environment',
      'Prevent duplicate task links',
      'Verify sprint ownership on update',
      'Calculate progress after task changes',
      'Reject viewer task mutations',
      'Test search across projects',
      'Exercise comments permissions',
      'Verify duplicate task title handling',
      'Check refresh token rotation',
      'Validate upload content type',
      'Run not-found middleware paths'
    ],
  },
  {
    key: 'DESIGN',
    name: 'Design System QA',
    description: 'Visual and interaction coverage for forms, dialogs, tables, cards, density, themes, and empty states.',
    visibility: 'public',
    status: 'active',
    tasks: [
      'Audit button states across variants',
      'Check dialog close and focus behavior',
      'Verify table row hover affordance',
      'Review card density preferences',
      'Exercise select dropdown keyboard flow',
      'Test textarea resizing in task form',
      'Confirm destructive dialog copy',
      'Render empty project state',
      'Check loading skeleton consistency',
      'Validate disabled submit styles',
      'Review high priority color usage',
      'Test multi-line task card titles',
      'Check theme persistence',
      'Compare comfortable and compact density',
      'Verify sidebar collapse state',
      'Audit avatar fallback initials',
      'Test project edit validation',
      'Review report metric cards',
      'Check activity severity colors',
      'Inspect task content spacing'
    ],
  },
  {
    key: 'LAUNCH',
    name: 'Launch Readiness',
    description: 'Production-style release checklist with PR review, staged deployments, rollback paths, and final sign-off.',
    visibility: 'private',
    status: 'active',
    tasks: [
      'Prepare release candidate checklist',
      'Verify staging smoke test pass',
      'Review production deployment banner',
      'Document rollback steps',
      'Check failed deployment activity alert',
      'Confirm merged PR appears in delivery',
      'Validate release checklist task',
      'Run accessibility pass on main flows',
      'Check analytics report totals',
      'Verify completed sprint snapshot',
      'Review blocked launch risks',
      'Confirm canceled scope is hidden from progress',
      'Test production URL links',
      'Check critical incident task styling',
      'Confirm manager can assign urgent work',
      'Review viewer read-only access',
      'Validate all filters reset cleanly',
      'Check deployment history ordering',
      'Verify due-soon notification copy',
      'Final launch sign-off'
    ],
  },
];

function days(offset) {
  return new Date(baseDate.getTime() + offset * 24 * 60 * 60 * 1000);
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function statusDates(status, taskIndex) {
  const data = {};
  if (['IN_PROGRESS', 'IN_REVIEW', 'DONE'].includes(status)) {
    data.readyAt = days(-14 + taskIndex);
  }
  if (status === 'DONE') {
    data.mergedAt = days(-8 + taskIndex);
    data.deployedAt = days(-5 + taskIndex);
  }
  return data;
}

async function upsertUsers(passwordHash) {
  const seeded = [];
  for (const person of users) {
    seeded.push(await prisma.user.upsert({
      where: { email: person.email },
      update: {
        name: person.name,
        avatar: person.avatar,
        emailVerified: true,
        emailVerificationToken: null,
      },
      create: {
        email: person.email,
        name: person.name,
        avatar: person.avatar,
        password: passwordHash,
        emailVerified: true,
        preferences: {
          create: {
            defaultView: person.email === seedUserEmail ? 'board' : 'list',
            density: person.role === 'Viewer' ? 'comfortable' : 'compact',
            theme: 'system',
            profileNote: `${person.role} seed user for QA coverage.`,
          },
        },
      },
    }));
  }
  return seeded;
}

async function resetDemoProjects(ownerId) {
  await prisma.project.deleteMany({
    where: {
      ownerId,
      key: { in: projectBlueprints.map((project) => project.key) },
    },
  });
}

async function createProjectGraph(blueprint, projectIndex, people) {
  const owner = people[0];
  const createdAt = days(-45 + projectIndex * 3);
  const project = await prisma.project.create({
    data: {
      name: blueprint.name,
      key: blueprint.key,
      description: blueprint.description,
      ownerId: owner.id,
      visibility: blueprint.visibility,
      status: blueprint.status,
      startDate: days(-42 + projectIndex * 4),
      endDate: days(35 + projectIndex * 10),
      progress: 0,
      createdAt,
      members: {
        create: people.map((person, personIndex) => ({
          userId: person.id,
          role: users[personIndex].role,
          createdAt: days(-41 + projectIndex * 4 + personIndex),
        })),
      },
    },
  });

  const sprints = [];
  for (const sprint of [
    { name: 'Sprint 1 - Discovery', status: 'COMPLETED', start: -28, end: -14 },
    { name: 'Sprint 2 - Build', status: 'ACTIVE', start: -7, end: 7 },
    { name: 'Sprint 3 - Hardening', status: 'PLANNED', start: 8, end: 21 },
  ]) {
    sprints.push(await prisma.sprint.create({
      data: {
        projectId: project.id,
        name: sprint.name,
        status: sprint.status,
        goal: `${blueprint.key}: ${sprint.name.toLowerCase()} coverage`,
        startDate: days(sprint.start + projectIndex),
        endDate: days(sprint.end + projectIndex),
      },
    }));
  }

  const tasks = [];
  for (let taskIndex = 0; taskIndex < blueprint.tasks.length; taskIndex += 1) {
    const status = taskStatuses[taskIndex % taskStatuses.length];
    const assignee = people[(taskIndex % (people.length - 1)) + 1];
    const sprint = taskIndex < 5 ? null : sprints[Math.min(2, Math.floor((taskIndex - 5) / 5))];
    const blockedReason = null;
    const task = await prisma.task.create({
      data: {
        projectId: project.id,
        sprintId: sprint?.id || null,
        createdById: taskIndex % 4 === 0 ? people[1].id : owner.id,
        assigneeId: taskIndex % 6 === 0 ? null : assignee.id,
        title: `[${blueprint.key}-${taskIndex + 1}] ${blueprint.tasks[taskIndex]}`,
        description: `Seeded QA task for ${blueprint.name}. Covers ${status.toLowerCase().replaceAll('_', ' ')} behavior, ${priorities[taskIndex % priorities.length].toLowerCase()} priority styling, assignment, filters, detail views, and search.`,
        type: taskTypes[(taskIndex + projectIndex) % taskTypes.length],
        priority: priorities[(taskIndex + projectIndex) % priorities.length],
        status,
        estimate: taskIndex % 4 === 0 ? null : (taskIndex % 8) + 1,
        branchName: status === 'TODO' ? null : `${blueprint.key.toLowerCase()}/${slugify(blueprint.tasks[taskIndex])}`,
        blockedReason,
        dueDate: taskIndex % 5 === 0 ? days(-2 - projectIndex) : days(4 + taskIndex + projectIndex),
        backlogOrder: projectIndex * 1000 + taskIndex + 1,
        sprintOrder: sprint ? taskIndex + 1 : 0,
        createdAt: days(-35 + taskIndex + projectIndex),
        updatedAt: days(-12 + taskIndex + projectIndex),
        ...statusDates(status, taskIndex),
        subtasks: {
          create: [
            { title: 'Reproduce the target workflow', completed: taskIndex % 3 !== 0 },
            { title: 'Verify empty, loading, and error states', completed: taskIndex % 4 === 0 },
            { title: 'Capture notes for regression coverage', completed: status === 'DONE' },
          ],
        },
        comments: {
          create: [
            {
              userId: assignee.id,
              content: `Checked ${status} behavior. Please verify filters, counts, and detail rendering for this task.`,
              createdAt: days(-8 + taskIndex),
            },
            {
              userId: owner.id,
              content: blockedReason || 'Looks good for seeded QA. Keep this as a regression fixture.',
              createdAt: days(-7 + taskIndex),
            },
          ],
        },
      },
    });
    tasks.push(task);
  }

  for (let index = 0; index < tasks.length - 1; index += 4) {
    await prisma.taskLink.create({
      data: {
        sourceTaskId: tasks[index].id,
        targetTaskId: tasks[index + 1].id,
        type: index % 8 === 0 ? 'BLOCKS' : 'RELATES_TO',
      },
    });
  }

  const deliveryTasks = tasks.filter((task) => ['IN_REVIEW', 'DONE'].includes(task.status));
  for (let index = 0; index < Math.min(8, deliveryTasks.length); index += 1) {
    const task = deliveryTasks[index];
    const prStatus = task.status === 'DONE' ? 'MERGED' : index % 3 === 0 ? 'DRAFT' : 'OPEN';
    const pr = await prisma.pullRequest.create({
      data: {
        projectId: project.id,
        taskId: task.id,
        provider: 'MANUAL',
        repository: `sprintly/${blueprint.key.toLowerCase()}`,
        number: projectIndex * 100 + index + 1,
        title: task.title.replace(`[${blueprint.key}-`, `PR ${blueprint.key}-`),
        url: `https://example.local/${blueprint.key.toLowerCase()}/pull/${projectIndex * 100 + index + 1}`,
        branch: task.branchName,
        targetBranch: 'main',
        status: prStatus,
        reviewState: prStatus === 'MERGED' ? 'MERGED' : index % 2 === 0 ? 'APPROVED' : 'REQUESTED',
        ciStatus: index % 5 === 0 ? 'FAILED' : index % 2 === 0 ? 'SUCCESS' : 'PENDING',
        author: users[(index % 3) + 1].name,
        openedAt: days(-9 + index),
        mergedAt: prStatus === 'MERGED' ? days(-2 + index) : null,
      },
    });

    if (index % 2 === 0 || task.status === 'DONE') {
      await prisma.deployment.create({
        data: {
          projectId: project.id,
          taskId: task.id,
          pullRequestId: pr.id,
          environment: index % 4 === 0 ? 'production' : index % 3 === 0 ? 'preview' : 'staging',
          status: index % 5 === 0 ? 'FAILED' : task.status === 'DONE' ? 'SUCCESS' : 'RUNNING',
          version: `v${projectIndex + 1}.${index + 1}.${task.id.slice(-3)}`,
          url: `https://${blueprint.key.toLowerCase()}-${index + 1}.example.local`,
          deployedBy: users[(index % 3) + 1].name,
          deployedAt: index % 5 === 0 ? null : days(-1 + index),
        },
      });
    }
  }

  const activitySeeds = [
    { task: tasks[0], type: 'task.created', title: 'Task created', severity: 'SUCCESS' },
    { task: tasks[4], type: 'task.status_changed', title: 'Status changed to IN_REVIEW', severity: 'INFO' },
    { task: tasks[8], type: 'task.status_changed', title: 'Status changed to IN_PROGRESS', severity: 'INFO' },
    { task: tasks[16], type: 'deployment.created', title: 'Deployment recorded', severity: 'CRITICAL' },
  ];

  for (const [index, item] of activitySeeds.entries()) {
    const event = await prisma.activityEvent.create({
      data: {
        projectId: project.id,
        taskId: item.task.id,
        actorId: people[(index % 3) + 1].id,
        targetUserId: item.task.assigneeId,
        type: item.type,
        entityType: item.type.startsWith('deployment') ? 'deployment' : 'task',
        entityId: item.task.id,
        title: item.title,
        description: item.task.title,
        severity: item.severity,
        metadata: { status: item.task.status, priority: item.task.priority, seed: true },
        createdAt: days(-5 + index + projectIndex),
      },
    });

  }

  const doneCount = tasks.filter((task) => task.status === 'DONE').length;
  await prisma.project.update({
    where: { id: project.id },
    data: { progress: Math.round((doneCount / tasks.length) * 100) },
  });

  return { project, tasks };
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to seed Sprintly.');
  }

  const passwordHash = await bcrypt.hash(seedPassword, 12);
  const people = await upsertUsers(passwordHash);
  await resetDemoProjects(people[0].id);

  const created = [];
  for (let index = 0; index < projectBlueprints.length; index += 1) {
    created.push(await createProjectGraph(projectBlueprints[index], index, people));
  }

  const taskCount = created.reduce((total, item) => total + item.tasks.length, 0);
  console.log(`Seeded ${created.length} projects and ${taskCount} tasks.`);
  console.log(`Demo login: ${seedUserEmail} / ${seedPassword}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
