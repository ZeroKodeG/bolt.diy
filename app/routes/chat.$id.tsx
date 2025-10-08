import { json, redirect, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { createServerClient, parse, serialize } from '@supabase/ssr';
import { default as IndexRoute } from './_index';

export async function loader(args: LoaderFunctionArgs) {
  const cookies = parse(args.request.headers.get('Cookie') ?? '');
  const headers = new Headers();

  const supabase = createServerClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!, {
    cookies: {
      get(key) {
        return cookies[key];
      },
      set(key, value, options) {
        headers.append('Set-Cookie', serialize(key, value, options));
      },
      remove(key, options) {
        headers.append('Set-Cookie', serialize(key, '', options));
      },
    },
  });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return redirect('/login', { headers });
  }

  return json({ id: args.params.id }, { headers });
}

export default IndexRoute;
