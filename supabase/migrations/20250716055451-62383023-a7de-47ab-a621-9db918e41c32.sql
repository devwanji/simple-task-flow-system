-- Update one user to be admin for testing
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'kariukiterry52@gmail.com';

-- Verify the update
SELECT id, name, email, role FROM profiles;