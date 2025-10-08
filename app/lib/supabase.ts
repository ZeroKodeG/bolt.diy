import { createBrowserClient } from '@supabase/ssr';

// En un proyecto con Vite, las variables de entorno del cliente se acceden a través de import.meta.env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
