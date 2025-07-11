
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Users, 
  Plus, 
  Edit3, 
  Trash2, 
  Calendar, 
  CheckCircle, 
  Clock, 
  Play, 
  User,
  LogOut,
  UserPlus,
  ClipboardList,
  Bell,
  Mail
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import AuthForm from "@/components/AuthForm";
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import type { Database } from "@/integrations/supabase/types";

type Profile = Database['public']['Tables']['profiles']['Row'];
type Task = Database['public']['Tables']['tasks']['Row'];
type Notification = Database['public']['Tables']['notifications']['Row'];

const Index = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [userForm, setUserForm] = useState({ name: '', email: '', role: 'user' as 'admin' | 'user' });
  const [taskForm, setTaskForm] = useState({ title: '', description: '', assigned_to: '', deadline: '' });
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  const { 
    profiles, 
    tasks, 
    notifications, 
    loading,
    addUser,
    updateUser,
    deleteUser,
    addTask,
    updateTask,
    updateTaskStatus,
    deleteTask 
  } = useSupabaseData(user?.id);

  // Set up auth state listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Get current user profile
  useEffect(() => {
    if (user && profiles.length > 0) {
      const profile = profiles.find(p => p.id === user.id);
      setCurrentProfile(profile || null);
    }
  }, [user, profiles]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Logged out successfully');
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    addUser(userForm);
    setUserForm({ name: '', email: '', role: 'user' });
    setShowUserDialog(false);
  };

  const handleEditUser = (profile: Profile) => {
    setEditingUser(profile);
    setUserForm({
      name: profile.name,
      email: profile.email,
      role: profile.role
    });
    setShowUserDialog(true);
  };

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      updateUser(editingUser.id, userForm);
      setEditingUser(null);
      setUserForm({ name: '', email: '', role: 'user' });
      setShowUserDialog(false);
    }
  };

  const handleDeleteUser = (userId: string) => {
    deleteUser(userId);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    addTask(taskForm);
    setTaskForm({ title: '', description: '', assigned_to: '', deadline: '' });
    setShowTaskDialog(false);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      description: task.description || '',
      assigned_to: task.assigned_to || '',
      deadline: task.deadline || ''
    });
    setShowTaskDialog(true);
  };

  const handleUpdateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTask) {
      updateTask(editingTask.id, taskForm);
      setEditingTask(null);
      setTaskForm({ title: '', description: '', assigned_to: '', deadline: '' });
      setShowTaskDialog(false);
    }
  };

  const handleDeleteTask = (taskId: string) => {
    deleteTask(taskId);
  };

  const handleUpdateTaskStatus = (taskId: string, status: 'pending' | 'in-progress' | 'completed') => {
    updateTaskStatus(taskId, status);
  };

  // Helper functions
  const getUserById = (id: string) => profiles.find(profile => profile.id === id);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'in-progress': return <Play className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getUserTasks = () => {
    if (!currentProfile) return [];
    if (currentProfile.role === 'admin') return tasks;
    return tasks.filter(task => task.assigned_to === currentProfile.id);
  };

  const getUserNotifications = () => {
    return notifications.filter(notif => !notif.read);
  };

  const getStats = () => {
    const userTasks = getUserTasks();
    return {
      total: userTasks.length,
      pending: userTasks.filter(t => t.status === 'pending').length,
      inProgress: userTasks.filter(t => t.status === 'in-progress').length,
      completed: userTasks.filter(t => t.status === 'completed').length
    };
  };

  // Show auth form if not authenticated
  if (!user || !session) {
    return <AuthForm onAuthSuccess={() => {}} />;
  }

  // Show loading while fetching data
  if (loading || !currentProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ClipboardList className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-500">Loading your tasks...</p>
        </div>
      </div>
    );
  }

  const stats = getStats();
  const userNotifications = getUserNotifications();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <ClipboardList className="w-8 h-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">Task Manager</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Button variant="ghost" size="sm" className="relative">
                  <Bell className="w-5 h-5" />
                  {userNotifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {userNotifications.length}
                    </span>
                  )}
                </Button>
              </div>
              <div className="flex items-center space-x-2">
                <User className="w-5 h-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">{currentProfile.name}</span>
                <Badge variant={currentProfile.role === 'admin' ? 'default' : 'secondary'}>
                  {currentProfile.role}
                </Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            {currentProfile.role === 'admin' && <TabsTrigger value="users">Users</TabsTrigger>}
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          {/* Dashboard */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Tasks</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                    </div>
                    <ClipboardList className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Pending</p>
                      <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                    </div>
                    <Clock className="w-8 h-8 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">In Progress</p>
                      <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
                    </div>
                    <Play className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Completed</p>
                      <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Tasks */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Tasks</CardTitle>
                <CardDescription>Your latest task assignments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {getUserTasks().slice(0, 5).map((task) => (
                    <div key={task.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{task.title}</h3>
                        <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Due: {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline'}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(task.status)}>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(task.status)}
                            <span className="capitalize">{task.status.replace('-', ' ')}</span>
                          </div>
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tasks */}
          <TabsContent value="tasks" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Tasks</h2>
              {currentProfile.role === 'admin' && (
                <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      setEditingTask(null);
                      setTaskForm({ title: '', description: '', assigned_to: '', deadline: '' });
                    }}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Task
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingTask ? 'Edit Task' : 'Add New Task'}</DialogTitle>
                      <DialogDescription>
                        {editingTask ? 'Update task details' : 'Create a new task and assign it to a user'}
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={editingTask ? handleUpdateTask : handleAddTask} className="space-y-4">
                      <div>
                        <Label htmlFor="title">Title</Label>
                        <Input
                          id="title"
                          value={taskForm.title}
                          onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={taskForm.description}
                          onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="assignedTo">Assign To</Label>
                        <Select value={taskForm.assigned_to} onValueChange={(value) => setTaskForm({ ...taskForm, assigned_to: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select user" />
                          </SelectTrigger>
                          <SelectContent>
                            {profiles.filter(profile => profile.role === 'user').map((profile) => (
                              <SelectItem key={profile.id} value={profile.id}>
                                {profile.name} ({profile.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="deadline">Deadline</Label>
                        <Input
                          id="deadline"
                          type="date"
                          value={taskForm.deadline}
                          onChange={(e) => setTaskForm({ ...taskForm, deadline: e.target.value })}
                        />
                      </div>
                      <Button type="submit" className="w-full">
                        {editingTask ? 'Update Task' : 'Create Task'}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            <div className="grid gap-6">
              {getUserTasks().map((task) => (
                <Card key={task.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                          <Badge className={getStatusColor(task.status)}>
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(task.status)}
                              <span className="capitalize">{task.status.replace('-', ' ')}</span>
                            </div>
                          </Badge>
                        </div>
                        <p className="text-gray-600 mb-3">{task.description}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <User className="w-4 h-4" />
                            <span>Assigned to: {getUserById(task.assigned_to || '')?.name || 'Unassigned'}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>Due: {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {currentProfile.role === 'user' && task.assigned_to === currentProfile.id && (
                          <Select
                            value={task.status}
                            onValueChange={(value: 'pending' | 'in-progress' | 'completed') => 
                              handleUpdateTaskStatus(task.id, value)
                            }
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="in-progress">In Progress</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        {currentProfile.role === 'admin' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditTask(task)}
                            >
                              <Edit3 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTask(task.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Users (Admin only) */}
          {currentProfile.role === 'admin' && (
            <TabsContent value="users" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Users</h2>
                <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      setEditingUser(null);
                      setUserForm({ name: '', email: '', role: 'user' });
                    }}>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add User
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingUser ? 'Edit User' : 'Add New User'}</DialogTitle>
                      <DialogDescription>
                        {editingUser ? 'Update user information' : 'Create a new user account'}
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={editingUser ? handleUpdateUser : handleAddUser} className="space-y-4">
                      <div>
                        <Label htmlFor="name">Name</Label>
                        <Input
                          id="name"
                          value={userForm.name}
                          onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={userForm.email}
                          onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="role">Role</Label>
                        <Select value={userForm.role} onValueChange={(value: 'admin' | 'user') => setUserForm({ ...userForm, role: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button type="submit" className="w-full">
                        {editingUser ? 'Update User' : 'Create User'}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid gap-4">
                {profiles.map((profile) => (
                  <Card key={profile.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{profile.name}</h3>
                            <p className="text-sm text-gray-500">{profile.email}</p>
                          </div>
                          <Badge variant={profile.role === 'admin' ? 'default' : 'secondary'}>
                            {profile.role}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditUser(profile)}
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          {profile.id !== currentProfile.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteUser(profile.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          )}

          {/* Notifications */}
          <TabsContent value="notifications" className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
            <div className="space-y-4">
              {getUserNotifications().length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No new notifications</p>
                  </CardContent>
                </Card>
              ) : (
                getUserNotifications().map((notification) => (
                  <Card key={notification.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-gray-900">{notification.message}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            {new Date(notification.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
