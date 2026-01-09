'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  Users,
  Edit,
  Trash2,
  Plus,
  UserPlus,
  UserMinus,
  UserCog,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  FolderKanban,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import { ProjectWithMembers, ProjectMember, ProjectStats } from '@/types';

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const projectId = params.id as string;

  const [project, setProject] = useState<ProjectWithMembers | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Member management dialogs
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
  const [isEditMemberDialogOpen, setIsEditMemberDialogOpen] = useState(false);
  const [isRemoveMemberDialogOpen, setIsRemoveMemberDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<ProjectMember | null>(null);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState<'Admin' | 'Member' | 'Viewer'>('Member');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProject = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [projectResponse, membersResponse, statsResponse] = await Promise.all([
        api.getProject(projectId),
        api.getProjectMembers(projectId),
        api.getProjectStats(projectId).catch(() => null),
      ]);

      if (projectResponse.success && projectResponse.data) {
        setProject(projectResponse.data);
      } else {
        setError(projectResponse.error?.message || 'Failed to load project');
      }

      if (membersResponse.success && membersResponse.data) {
        setMembers(membersResponse.data);
      }

      if (statsResponse?.success && statsResponse.data) {
        setStats(statsResponse.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load project');
      console.error('Error fetching project:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      fetchProject();
    }
  }, [projectId, fetchProject]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberEmail.trim()) {
      setError('Email is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Note: In a real app, you'd search for users by email first
      // For now, we'll use a placeholder. You may need to add a user search endpoint
      const response = await api.addProjectMember(projectId, {
        userId: memberEmail, // This should be a user ID, not email
        role: memberRole,
      });

      if (response.success) {
        setIsAddMemberDialogOpen(false);
        setMemberEmail('');
        setMemberRole('Member');
        fetchProject();
      } else {
        setError(response.error?.message || 'Failed to add member');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add member');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateMemberRole = async () => {
    if (!selectedMember) return;

    setIsSubmitting(true);
    setError('');

    try {
      const userId = typeof selectedMember.userId === 'object' 
        ? (selectedMember.userId as any)._id 
        : selectedMember.userId;
      
      const response = await api.updateProjectMemberRole(
        projectId,
        userId,
        memberRole
      );

      if (response.success) {
        setIsEditMemberDialogOpen(false);
        setSelectedMember(null);
        fetchProject();
      } else {
        setError(response.error?.message || 'Failed to update member role');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update member role');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!selectedMember) return;

    setIsSubmitting(true);
    setError('');

    try {
      const userId = typeof selectedMember.userId === 'object' 
        ? (selectedMember.userId as any)._id 
        : selectedMember.userId;
      
      const response = await api.removeProjectMember(projectId, userId);

      if (response.success) {
        setIsRemoveMemberDialogOpen(false);
        setSelectedMember(null);
        fetchProject();
      } else {
        setError(response.error?.message || 'Failed to remove member');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to remove member');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditMemberDialog = (member: ProjectMember) => {
    setSelectedMember(member);
    setMemberRole(member.role as 'Admin' | 'Member' | 'Viewer');
    setIsEditMemberDialogOpen(true);
  };

  const openRemoveMemberDialog = (member: ProjectMember) => {
    setSelectedMember(member);
    setIsRemoveMemberDialogOpen(true);
  };

  const isOwner = () => {
    if (!project || !user) return false;
    return project.ownerId?.toString() === user._id || 
           (project.owner as any)?._id?.toString() === user._id;
  };

  const isAdmin = () => {
    if (!user) return false;
    const member = members.find(m => {
      const userId = typeof m.userId === 'object' ? (m.userId as any)._id : m.userId;
      return userId === user._id;
    });
    return isOwner() || member?.role === 'Admin';
  };

  const getMemberName = (member: ProjectMember) => {
    if (member.user && typeof member.user === 'object') {
      return member.user.name;
    }
    return 'Unknown User';
  };

  const getMemberEmail = (member: ProjectMember) => {
    if (member.user && typeof member.user === 'object') {
      return member.user.email;
    }
    return 'unknown@example.com';
  };

  const getMemberAvatar = (member: ProjectMember) => {
    if (member.user && typeof member.user === 'object') {
      return member.user.avatar;
    }
    return undefined;
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (error && !project) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="space-y-6 p-6 lg:p-8">
            <div className="flex items-center gap-2 p-4 text-destructive bg-destructive/10 rounded-md border border-destructive/20">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
            <Button onClick={() => router.push('/projects')} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Projects
            </Button>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6 p-6 lg:p-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/projects')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-4xl font-bold tracking-tight">Project</h1>
                <p className="text-muted-foreground mt-2">
                  {project.name}
                </p>
              </div>
            </div>
            {isAdmin() && (
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => router.push(`/projects/${projectId}/settings`)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Project
                </Button>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          {/* Stats Cards */}
          {stats && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
                  <FolderKanban className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalTasks || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completed</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.completedTasks || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                  <Clock className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.inProgressTasks || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Progress</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{Math.round(project.progress || 0)}%</div>
                  <div className="w-full h-2 bg-muted rounded-full mt-2">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${project.progress || 0}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Members Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>
                    Manage project members and their roles
                  </CardDescription>
                </div>
                {isAdmin() && (
                  <Button onClick={() => setIsAddMemberDialogOpen(true)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add Member
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {members.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No members yet. Add members to collaborate on this project.</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.map((member) => {
                        const isMemberOwner = isOwner() && 
                          (typeof member.userId === 'object' 
                            ? (member.userId as any)._id?.toString() === user?._id
                            : member.userId === user?._id);
                        const canEdit = isAdmin() && !isMemberOwner;
                        
                        return (
                          <TableRow key={member._id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar>
                                  <AvatarImage src={getMemberAvatar(member)} />
                                  <AvatarFallback>
                                    {getMemberName(member).charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium">{getMemberName(member)}</div>
                                  {isMemberOwner && (
                                    <Badge variant="outline" className="text-xs mt-1">
                                      Owner
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{getMemberEmail(member)}</TableCell>
                            <TableCell>
                              <Badge variant={member.role === 'Admin' ? 'default' : 'secondary'}>
                                {member.role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {canEdit && (
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => openEditMemberDialog(member)}
                                    title="Change Role"
                                  >
                                    <UserCog className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => openRemoveMemberDialog(member)}
                                    title="Remove Member"
                                  >
                                    <UserMinus className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push(`/projects/${projectId}/tasks`)}
                >
                  <FolderKanban className="mr-2 h-4 w-4" />
                  View Tasks
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push(`/projects/${projectId}/tasks?action=create`)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Task
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Add Member Dialog */}
        <Dialog open={isAddMemberDialogOpen} onOpenChange={setIsAddMemberDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Team Member</DialogTitle>
              <DialogDescription>
                Add a new member to this project. Enter their user ID or email.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddMember} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}
              <div className="space-y-2">
                <label htmlFor="member-email" className="text-sm font-medium">
                  User ID or Email *
                </label>
                <Input
                  id="member-email"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  placeholder="Enter user ID or email"
                  required
                  disabled={isSubmitting}
                />
                <p className="text-xs text-muted-foreground">
                  Note: You may need to search for users first. This is a placeholder implementation.
                </p>
              </div>
              <div className="space-y-2">
                <label htmlFor="member-role" className="text-sm font-medium">
                  Role *
                </label>
                <Select value={memberRole} onValueChange={(value) => setMemberRole(value as any)}>
                  <SelectTrigger id="member-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Member">Member</SelectItem>
                    <SelectItem value="Viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddMemberDialogOpen(false);
                    setMemberEmail('');
                    setMemberRole('Member');
                    setError('');
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Member'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Member Role Dialog */}
        <Dialog open={isEditMemberDialogOpen} onOpenChange={setIsEditMemberDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Member Role</DialogTitle>
              <DialogDescription>
                Update the role for {selectedMember ? getMemberName(selectedMember) : 'this member'}
              </DialogDescription>
            </DialogHeader>
            {error && (
              <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="edit-member-role" className="text-sm font-medium">
                  Role *
                </label>
                <Select value={memberRole} onValueChange={(value) => setMemberRole(value as any)}>
                  <SelectTrigger id="edit-member-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Member">Member</SelectItem>
                    <SelectItem value="Viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditMemberDialogOpen(false);
                    setSelectedMember(null);
                    setError('');
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button onClick={handleUpdateMemberRole} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Role'
                  )}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* Remove Member Dialog */}
        <Dialog open={isRemoveMemberDialogOpen} onOpenChange={setIsRemoveMemberDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remove Team Member</DialogTitle>
              <DialogDescription>
                Are you sure you want to remove {selectedMember ? getMemberName(selectedMember) : 'this member'} from the project? They will lose access to all project data.
              </DialogDescription>
            </DialogHeader>
            {error && (
              <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsRemoveMemberDialogOpen(false);
                  setSelectedMember(null);
                  setError('');
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleRemoveMember}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Removing...
                  </>
                ) : (
                  'Remove Member'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

