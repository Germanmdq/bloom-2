-- ====================================================================
-- CREAR O ACTUALIZAR USUARIO ADMINISTRADOR 'admin' CON CLAVE '123'
-- Email asignado: admin@bloom.com (Permite ingresar con 'admin' o 'admin@bloom.com')
-- Clave: 123
-- Rol: ADMIN
-- ====================================================================

DO $$
DECLARE
  target_user_id UUID;
BEGIN
  -- 1. Verificar si ya existe el usuario con email admin@bloom.com
  SELECT id INTO target_user_id FROM auth.users WHERE email = 'admin@bloom.com';

  IF target_user_id IS NULL THEN
    target_user_id := gen_random_uuid();

    -- Insertar en auth.users con contraseña '123' encriptada con bcrypt
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      target_user_id,
      'authenticated',
      'authenticated',
      'admin@bloom.com',
      crypt('123', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Admin"}',
      false,
      NOW(),
      NOW()
    );

    -- Insertar identidad de autenticación
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      target_user_id,
      target_user_id,
      format('{"sub":"%s","email":"%s"}', target_user_id, 'admin@bloom.com')::jsonb,
      'email',
      NOW(),
      NOW(),
      NOW()
    );

    -- Insertar en public.profiles con rol 'ADMIN'
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (target_user_id, 'Admin', 'ADMIN')
    ON CONFLICT (id) DO UPDATE SET role = 'ADMIN', full_name = 'Admin';

  ELSE
    -- Si ya existe, actualizar contraseña a '123', confirmar email y asegurar rol 'ADMIN'
    UPDATE auth.users
    SET encrypted_password = crypt('123', gen_salt('bf')),
        email_confirmed_at = NOW(),
        updated_at = NOW()
    WHERE id = target_user_id;

    INSERT INTO public.profiles (id, full_name, role)
    VALUES (target_user_id, 'Admin', 'ADMIN')
    ON CONFLICT (id) DO UPDATE SET role = 'ADMIN', full_name = 'Admin';
  END IF;

  RAISE NOTICE 'Usuario admin con clave 123 configurado exitosamente (ID: %)', target_user_id;
END $$;
