import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://elvifblvjvcbwabhrlco.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsdmlmYmx2anZjYndhYmhybGNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MDUwNjksImV4cCI6MjA4Mzk4MTA2OX0.-qQkxgfz9Sz6c77QLHLo1bELXSAJINrKDJ5ovwBeECY'
);

// Intentar crear usuario admin
const { data, error } = await supabase.auth.signUp({
  email: 'admin@bloom.com',
  password: 'bloom2026',
});

if (error) {
  console.log('SignUp result:', error.message);
  // Intentar login con esas credenciales
  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email: 'admin@bloom.com',
    password: 'bloom2026',
  });
  if (loginError) {
    console.log('Login falló:', loginError.message);
  } else {
    console.log('✅ Login exitoso con admin@bloom.com / bloom2026');
    console.log('User ID:', loginData.user?.id);
  }
} else {
  if (data.user && !data.session) {
    console.log('⚠️  Usuario creado pero requiere confirmación de email en Supabase.');
    console.log('Desactivá "Email confirmations" en: https://supabase.com/dashboard/project/elvifblvjvcbwabhrlco/auth/providers');
  } else if (data.session) {
    console.log('✅ Usuario admin@bloom.com creado exitosamente con contraseña: bloom2026');
    console.log('User ID:', data.user?.id);
  }
}
