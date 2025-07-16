
import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';
import type { Database } from "@/integrations/supabase/types";

type Profile = Database['public']['Tables']['profiles']['Row'];
type Task = Database['public']['Tables']['tasks']['Row'];
type Notification = Database['public']['Tables']['notifications']['Row'];

export const useSupabaseData = (userId: string | undefined) => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all data
  const fetchData = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      // Fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*');
      
      if (profilesError) throw profilesError;
      setProfiles(profilesData || []);

      // Fetch tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*');
      
      if (tasksError) throw tasksError;
      setTasks(tasksData || []);

      // Fetch notifications
      const { data: notificationsData, error: notificationsError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId);
      
      if (notificationsError) throw notificationsError;
      setNotifications(notificationsData || []);

    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Verify admin role from database
  const verifyAdminRole = async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Error verifying admin role:', error);
        return false;
      }
      
      return data?.role === 'admin';
    } catch (error) {
      console.error('Admin verification error:', error);
      return false;
    }
  };

  // Add user - creates auth user and profile (Admin only)
  const addUser = async (userData: { name: string; email: string; role: 'admin' | 'user' }) => {
    try {
      // Verify admin role before proceeding
      if (!userId || !(await verifyAdminRole(userId))) {
        toast.error('Unauthorized: Admin access required');
        return;
      }

      // Generate temporary password for new user
      const tempPassword = `temp${Math.random().toString(36).substring(2, 15)}`;
      
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: tempPassword,
        email_confirm: true
      });

      if (authError) throw authError;

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          name: userData.name,
          email: userData.email,
          role: userData.role
        });

      if (profileError) throw profileError;

      // Refresh data to include new user
      await fetchData();
      toast.success(`User created successfully. Temporary password: ${tempPassword}`);
    } catch (error: any) {
      console.error('Error adding user:', error);
      toast.error('Failed to add user: ' + error.message);
    }
  };

  // Update user (Admin only)
  const updateUser = async (id: string, userData: { name: string; email: string; role: 'admin' | 'user' }) => {
    try {
      // Verify admin role before proceeding
      if (!userId || !(await verifyAdminRole(userId))) {
        toast.error('Unauthorized: Admin access required');
        return;
      }
      const { error } = await supabase
        .from('profiles')
        .update(userData)
        .eq('id', id);

      if (error) throw error;

      setProfiles(profiles.map(profile => 
        profile.id === id ? { ...profile, ...userData } : profile
      ));
      toast.success('User updated successfully');
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    }
  };

  // Delete user (Admin only)
  const deleteUser = async (id: string) => {
    try {
      // Verify admin role before proceeding
      if (!userId || !(await verifyAdminRole(userId))) {
        toast.error('Unauthorized: Admin access required');
        return;
      }
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setProfiles(profiles.filter(profile => profile.id !== id));
      toast.success('User deleted successfully');
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  // Add task (Admin only)
  const addTask = async (taskData: { 
    title: string; 
    description: string; 
    assigned_to: string; 
    deadline: string; 
  }) => {
    try {
      // Verify admin role before proceeding
      if (!userId || !(await verifyAdminRole(userId))) {
        toast.error('Unauthorized: Admin access required');
        return;
      }
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...taskData,
          assigned_by: userId,
        })
        .select()
        .single();

      if (error) throw error;

      setTasks([...tasks, data]);

      // Send email notification to assigned user
      try {
        const assignedUser = profiles.find(p => p.id === taskData.assigned_to);
        const assignedByUser = profiles.find(p => p.id === userId);
        
        if (assignedUser && assignedByUser) {
          console.log("Sending email notification for task assignment");
          
          const emailResponse = await supabase.functions.invoke('send-task-email', {
            body: {
              assignedToEmail: assignedUser.email,
              assignedToName: assignedUser.name,
              taskTitle: taskData.title,
              taskDescription: taskData.description,
              deadline: taskData.deadline,
              assignedByName: assignedByUser.name,
            },
          });

          if (emailResponse.error) {
            console.error('Email sending error:', emailResponse.error);
            // Don't fail the task creation if email fails
            toast.success('Task created successfully (email notification failed)');
          } else {
            console.log('Email sent successfully');
            toast.success('Task created and email notification sent');
          }
        } else {
          toast.success('Task created successfully');
        }
      } catch (emailError) {
        console.error('Error sending email:', emailError);
        toast.success('Task created successfully (email notification failed)');
      }
    } catch (error: any) {
      console.error('Error adding task:', error);
      toast.error('Failed to create task');
    }
  };

  // Update task (Admin only)
  const updateTask = async (id: string, taskData: { 
    title: string; 
    description: string; 
    assigned_to: string; 
    deadline: string; 
  }) => {
    try {
      // Verify admin role before proceeding
      if (!userId || !(await verifyAdminRole(userId))) {
        toast.error('Unauthorized: Admin access required');
        return;
      }
      const { error } = await supabase
        .from('tasks')
        .update(taskData)
        .eq('id', id);

      if (error) throw error;

      setTasks(tasks.map(task => 
        task.id === id ? { ...task, ...taskData } : task
      ));
      toast.success('Task updated successfully');
    } catch (error: any) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  };

  // Update task status
  const updateTaskStatus = async (id: string, status: 'pending' | 'in-progress' | 'completed') => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      setTasks(tasks.map(task => 
        task.id === id ? { ...task, status } : task
      ));
      toast.success('Task status updated');
    } catch (error: any) {
      console.error('Error updating task status:', error);
      toast.error('Failed to update task status');
    }
  };

  // Delete task (Admin only)
  const deleteTask = async (id: string) => {
    try {
      // Verify admin role before proceeding
      if (!userId || !(await verifyAdminRole(userId))) {
        toast.error('Unauthorized: Admin access required');
        return;
      }
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTasks(tasks.filter(task => task.id !== id));
      toast.success('Task deleted successfully');
    } catch (error: any) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    }
  };

  useEffect(() => {
    fetchData();
  }, [userId]);

  return {
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
    deleteTask,
    refetch: fetchData
  };
};
