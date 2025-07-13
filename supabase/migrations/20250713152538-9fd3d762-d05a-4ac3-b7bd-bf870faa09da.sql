
-- Insert a default admin user into the profiles table
-- This will be a user that can be used to access the admin panel
INSERT INTO public.profiles (id, name, email, role, created_at, updated_at)
VALUES (
    'admin-default-user-id-12345',
    'System Administrator',
    'admin@taskmanager.com',
    'admin',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Note: For this to work with authentication, you'll need to create a corresponding auth.users entry
-- But since we can't directly insert into auth.users, we'll handle this through the signup process
