import { atom } from 'nanostores';
import type { Session, User } from '@supabase/supabase-js';

export interface SessionState {
  session: Session | null;
  user: User | null;
  loading: boolean;
}

export const sessionStore = atom<SessionState>({
  session: null,
  user: null,
  loading: true, // Empieza en true para esperar la primera comprobación de estado
});

// Función para actualizar la sesión de forma centralizada
export function setSession(session: Session | null) {
  sessionStore.set({
    session,
    user: session?.user ?? null,
    loading: false,
  });
}
