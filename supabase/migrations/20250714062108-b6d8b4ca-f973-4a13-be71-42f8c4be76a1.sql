-- Remove the existing default admin profile that doesn't have corresponding auth user
DELETE FROM public.profiles WHERE id = 'admin-default-user-id-12345';

-- Create a function to handle admin user creation and login
CREATE OR REPLACE FUNCTION public.ensure_admin_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    admin_user_id uuid;
    admin_exists boolean;
BEGIN
    -- Check if admin profile already exists
    SELECT EXISTS(
        SELECT 1 FROM public.profiles 
        WHERE email = 'admin@taskmanager.com' AND role = 'admin'
    ) INTO admin_exists;
    
    -- If admin doesn't exist in profiles, check if auth user exists
    IF NOT admin_exists THEN
        -- This will be called when admin tries to sign in
        -- The auth.users entry should be created through normal signup process
        -- We just need to ensure the profile gets admin role
        UPDATE public.profiles 
        SET role = 'admin' 
        WHERE email = 'admin@taskmanager.com';
    END IF;
END;
$$;

-- Update the handle_new_user function to automatically make admin@taskmanager.com an admin
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