# ZuzuPlan Software Engineering Product Strategy

## Product Direction

ZuzuPlan should be built as a modern project management platform specifically for software engineering teams.

It should not support broad, generic project management use cases. The product should be opinionated around software delivery: issues, sprints/cycles, pull requests, deployments, engineering knowledge, async communication, and AI-assisted workflows.

The core product question is:

> What are we building, who is working on it, what is blocked, what changed in code, and what shipped?

## Target Users

ZuzuPlan should be optimized for:

- Startup engineering teams
- Remote software teams
- SaaS product teams
- Product engineering organizations
- Dev agencies managing software delivery
- Small to mid-sized engineering teams that want speed without Jira-level administration

## Product Positioning

Recommended positioning:

> ZuzuPlan is a developer-first planning and delivery platform that connects issues, code, pull requests, deployments, and engineering knowledge in one fast workspace.

Short version:

> A fast, AI-native issue tracking and delivery workspace for software teams.

## What To Keep And Strengthen

These existing product areas are strongly aligned with software engineering workflows:

- Spaces/projects, reframed as engineering workspaces, products, apps, repositories, or client software projects
- Board, Backlog, List, Summary, and Docs views
- Tasks, conceptually renamed to Issues
- Sprints or cycles
- Assignees, reporters, status, priority, due dates
- Comments, attachments, subtasks, and linked work
- Knowledge/docs for specs, RFCs, runbooks, decisions, and release notes
- Team members, roles, and invites
- My Tasks, Inbox, For You, and Recent as engineering focus areas
- Global search
- Project switcher
- Account settings, security, sessions, and audit log

## Features To Reframe Or Reduce

These features can stay only if they become engineering-specific:

- Goals: reframe as engineering objectives linked to issues, cycles, releases, or incidents
- Reports: focus on engineering metrics such as cycle time, throughput, stale PRs, review time, deployment frequency, and bug rate
- Roadmaps: postpone until release planning and epics are stronger
- Templates: postpone; avoid broad workflow templates early
- Notifications: focus on developer events such as mentions, assignments, PR reviews, failing builds, blockers, and deployments
- Settings: keep simple and avoid enterprise-heavy configuration

## Features To Avoid

ZuzuPlan should not build:

- CRM pipelines
- HR systems
- Invoice, billing, or accounting workflows
- Construction or field-service planning
- Marketing campaign management
- Heavy approval chains
- Generic form builders
- Generic no-code automation builders
- Enterprise customization systems
- Broad all-in-one business workspace features

## Missing Engineering-Focused Features

Essential missing features for modern software teams:

- Issue types: Bug, Feature, Chore, Tech Debt, Spike, Incident
- Issue hierarchy: Initiative or Epic -> Issue -> Subtask
- Labels/components: frontend, backend, infra, auth, billing, API, database
- Optional estimates: story points or t-shirt size
- Branch linking from issue keys
- GitHub/GitLab integration
- Pull request tracking
- PR review state: requested, approved, changes requested, merged
- Commit linking
- CI/check status visibility
- Deployment status and environment visibility
- Release tracking
- Engineering activity timeline
- Persisted inbox/notification records
- Keyboard command menu
- Markdown-first descriptions, comments, and docs
- Real-time issue updates
- Async standup and blocker workflows
- AI issue drafting and summarization
- AI release notes from merged work

## Recommended Issue Lifecycle

The system should support a software delivery lifecycle:

- Backlog
- Ready
- In Progress
- In Review
- Ready to Merge
- Merged
- Deployed
- Done
- Blocked
- Canceled

For simple teams, the UI can group these into:

- Todo
- In Progress
- Review
- Done

The richer internal lifecycle is important because pull requests and deployments can update issue state automatically.

## Navigation Structure

Recommended future sidebar:

### Personal

- For You
- Inbox
- My Issues

### Engineering

- Issues
- Backlog
- Cycles
- Pull Requests
- Deployments
- Releases
- Knowledge

### Planning

- Roadmap
- Reports

### System

- Integrations
- Settings
- Audit Log

Recommendation: rename the current Board menu to Issues or Workspace. Board should be one view inside the issue workspace, not the primary product concept.

## Dashboard Direction

For You should become a developer command center:

- My assigned issues
- Due or blocked work
- PRs waiting for my review
- My open PRs
- Failed builds related to my work
- Recently changed issues
- Cycle commitments
- AI-generated daily focus summary

Team-level dashboards should focus on:

- Cycle progress
- Blocked issues
- Stale issues
- Stale pull requests
- Review bottlenecks
- Deployment status
- Bug and incident trends

## Inbox Direction

Inbox should focus on actionable engineering events:

- New issue assigned to me
- Mentioned in issue/comment/doc
- PR review requested
- PR changes requested
- Build failed
- Deployment failed
- Issue blocked
- Issue due soon
- Comment on issue I own or follow

Inbox should avoid becoming a generic notification feed. It should help the developer triage work quickly.

## Permissions

Keep permissions simple:

- Owner
- Admin
- Maintainer
- Member
- Viewer

Avoid complex enterprise permission matrices in the early product. Add repository-level or environment-level permissions only when integrations require them.

## Integrations

Priority integrations:

1. GitHub
2. GitLab
3. Slack
4. Vercel / Netlify / Railway / Render
5. Linear/Jira import later

GitHub/GitLab should support:

- Connect repositories
- Link issues to branches, commits, and PRs
- Show PR status in issues
- Show CI/check status
- Auto-update issue state from PR/deployment events
- Generate release notes from merged PRs and completed issues

## AI Capabilities

AI should be workflow-native, not a generic chatbot.

High-value AI features:

- Turn rough notes into structured issues
- Generate acceptance criteria
- Suggest issue type, priority, labels, and components
- Detect duplicate or related issues
- Summarize long issue discussions
- Summarize pull requests
- Generate release notes
- Generate async standup summaries
- Identify stale work and blockers
- Suggest sprint/cycle plans
- Explain what changed between deployments

Avoid generic AI surfaces that are not tied to real engineering work.

## Database Design Direction

Current schema is a solid foundation, but should evolve toward software delivery.

Recommended future models or fields:

- Issue or renamed Task concept
- IssueType
- Label
- Component
- Epic or parent issue relationship
- Estimate
- Repository
- PullRequest
- Commit
- Deployment
- BuildStatus or CheckRun
- Release
- IssueActivity
- Notification or InboxItem
- Watcher or Subscriber

Important: add a real activity timeline model. Audit log and user-facing activity should not be inferred forever from existing records.

## UX Principles

The product should feel:

- Extremely fast
- Developer-native
- Keyboard-first
- Minimal
- Dense but readable
- Collaborative
- AI-native
- Optimized for software delivery

UX patterns to prioritize:

- Command menu for navigation and actions
- Fast issue creation
- Keyboard shortcuts
- Inline status and assignment changes
- Issue detail drawer
- Markdown editing
- Copyable issue keys
- Deep links to issues, PRs, commits, and deployments
- Minimal configuration screens
- Dark mode as first-class

## Performance Considerations

Performance should be a product feature.

Priorities:

- Server-side pagination everywhere
- Fast global search
- Optimistic updates for issue changes
- Cached project/workspace data
- Avoid over-fetching all projects/tasks for large teams
- Virtualize long issue lists later
- Use WebSockets selectively for real-time issue updates
- Split large frontend bundles as the product grows

## Ideal MVP Scope

The strongest MVP should include:

1. Issues with type, status, priority, assignee, labels, due date, and description
2. Backlog, board, list, and issue detail drawer
3. Cycles/sprints with planning and completion
4. Team/project membership and simple roles
5. GitHub integration for repositories, PRs, and issue linking
6. Inbox for assignments, mentions, PR review requests, and due work
7. For You developer dashboard
8. Knowledge docs for specs, RFCs, and runbooks
9. AI issue drafting, issue summarization, and release notes
10. Keyboard command menu

## Postpone Until Later

Postpone:

- Roadmaps
- Advanced reports
- Importers from Jira/Linear
- Complex automation rules
- Custom workflows
- Advanced role permissions
- Advanced notification routing
- Multi-organization administration
- Billing/subscription management
- Advanced release train planning

## Never Build

Never build:

- CRM
- HR
- Accounting
- Invoicing
- Generic campaign management
- Construction scheduling
- Procurement workflows
- Generic all-purpose database tools
- Broad enterprise workflow customization

## Differentiation Strategy

Against Jira:

- Faster
- Cleaner
- Less admin-heavy
- Less configuration
- Better AI-native workflows

Against Linear:

- More integrated engineering context
- Better docs and delivery visibility
- Stronger AI assistance
- Better async team workflows

Against ClickUp:

- Software-only focus
- No generic clutter
- Opinionated workflows
- Better performance and cleaner UX

Against Notion:

- Structured engineering workflow
- Real issue lifecycle
- Git/PR/deployment integration
- Not a flexible document database pretending to be an issue tracker

## Final Direction

ZuzuPlan should become a focused software delivery operating system for engineering teams.

The product should connect:

- Issues
- Cycles
- Code
- Pull requests
- Deployments
- Engineering docs
- Async communication
- AI assistance

The north star is not feature quantity. The north star is developer flow:

> Help engineering teams plan, build, review, ship, and understand software faster.
