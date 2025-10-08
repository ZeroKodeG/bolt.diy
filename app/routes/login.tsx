import { useState } from 'react';

// import { useNavigate } from '@remix-run/react';
import { supabase } from '~/lib/supabase';

export default function LoginPage() {
  // const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAuthAction = async (action: 'sign_in' | 'sign_up') => {
    console.log(`[Login] Intentando ${action}`);
    setLoading(true);
    setError(null);

    let error: Error | null = null;

    if (action === 'sign_in') {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      error = signInError;
    } else {
      // action === 'sign_up'
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {}, // Pass an empty options object to signUp
      });
      error = signUpError;
    }

    if (error) {
      console.error(`[Login] Falló el ${action}:`, error);
      setError(error.message);
    } else {
      if (action === 'sign_up') {
        alert('¡Registro exitoso! Por favor, revisa tu correo para verificar tu cuenta.');
      }
    }

    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
        <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white">Bolt Login</h1>
        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 mt-1 text-gray-900 bg-gray-50 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 mt-1 text-gray-900 bg-gray-50 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <div className="flex flex-col space-y-4">
            <button
              type="button"
              onClick={() => handleAuthAction('sign_in')}
              disabled={loading}
              className="w-full px-4 py-2 font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:bg-purple-400"
            >
              {loading ? 'Iniciando...' : 'Iniciar Sesión'}
            </button>
            <button
              type="button"
              onClick={() => handleAuthAction('sign_up')}
              disabled={loading}
              className="w-full px-4 py-2 font-medium text-purple-700 bg-purple-100 rounded-md hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:bg-purple-50"
            >
              {loading ? 'Registrando...' : 'Registrarse'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
