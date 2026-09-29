-- CONFIRMAR ADMIN Y ACTIVAR CLAVE '123'
UPDATE auth.users 
SET email_confirmed_at = NOW(),
    encrypted_password = crypt('123', gen_salt('bf'))
WHERE email = 'admin@bloom.com';

INSERT INTO public.profiles (id, full_name, role)
VALUES ('9720482c-301d-4298-a324-5bcded231868', 'Admin', 'ADMIN')
ON CONFLICT (id) DO UPDATE SET role = 'ADMIN', full_name = 'Admin';
