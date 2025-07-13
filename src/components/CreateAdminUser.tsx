
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';

const CreateAdminUser = () => {
  const [isCreating, setIsCreating] = useState(false);

  const createAdminUser = async () => {
    setIsCreating(true);
    try {
      // First, try to sign up the admin user
      const { data, error } = await supabase.auth.signUp({
        email: 'admin@taskmanager.com',
        password: 'admin123',
        options: {
          data: {
            name: 'System Administrator',
          }
        }
      });

      if (error) {
        if (error.message.includes('User already registered')) {
          toast.success('Admin user already exists! You can now login.');
        } else {
          toast.error(`Error creating admin user: ${error.message}`);
        }
      } else if (data.user) {
        // Update the profile to admin role
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ role: 'admin' })
          .eq('id', data.user.id);

        if (profileError) {
          console.error('Error updating profile:', profileError);
        }

        toast.success('Admin user created successfully! You can now login with admin credentials.');
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Failed to create admin user');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle>Setup Admin User</CardTitle>
        <CardDescription>
          Create the admin user account for the first time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={createAdminUser} 
          disabled={isCreating}
          className="w-full"
        >
          {isCreating ? 'Creating Admin User...' : 'Create Admin User'}
        </Button>
        <p className="text-sm text-gray-600 mt-2">
          This will create an admin account with email: admin@taskmanager.com
        </p>
      </CardContent>
    </Card>
  );
};

export default CreateAdminUser;
