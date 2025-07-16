-- Reset kariukiterry52@gmail.com to user role
UPDATE public.profiles 
SET role = 'user'::user_role 
WHERE email = 'kariukiterry52@gmail.com';

-- Update the handle_new_user function to only make admin@taskmanager.com an admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.profiles (id, name, email, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
        NEW.email,
        CASE 
            WHEN NEW.email = 'admin@taskmanager.com' THEN 'admin'::user_role
            ELSE 'user'::user_role
        END
    );
    RETURN NEW;
END;
$$;

-- Create admin user if it doesn't exist in auth.users
-- Note: This will create the auth user, the trigger will handle the profile
DO $$
DECLARE
    admin_exists boolean;
BEGIN
    -- Check if admin user exists in profiles
    SELECT EXISTS(
        SELECT 1 FROM public.profiles 
        WHERE email = 'admin@taskmanager.com'
    ) INTO admin_exists;
    
    -- If admin doesn't exist, we need to create the auth user
    -- The user will need to sign up with admin@taskmanager.com and password admin123
    -- The trigger will automatically assign admin role
    
    -- Ensure admin role is set if profile exists
    IF admin_exists THEN
        UPDATE public.profiles 
        SET role = 'admin'::user_role 
        WHERE email = 'admin@taskmanager.com';
    END IF;
END;
$$;