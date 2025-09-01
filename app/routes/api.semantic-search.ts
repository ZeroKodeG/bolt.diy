import { type ActionFunctionArgs, json } from '@remix-run/node';
import { indexVirtualFile, searchIndex } from '~/lib/semantic-search.server';

interface RequestPayload {
  type: 'INDEX_VIRTUAL_FILE' | 'SEARCH';
  payload: {
    chatId: string;
    filePath?: string;
    content?: string;
    query?: string;
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const body = (await request.json()) as RequestPayload;
  const { type, payload } = body;

  if (!payload.chatId) {
    return json({ error: 'chatId es requerido' }, { status: 400 });
  }

  switch (type) {
    case 'INDEX_VIRTUAL_FILE': {
      const { filePath, content, chatId } = payload;

      if (!filePath || content === undefined) {
        return json({ error: 'filePath y content son requeridos' }, { status: 400 });
      }

      if (filePath.search('-lock') > 0) {
        console.log('No indexamos el lock file');
        return json({ error: 'No indexamos el lock file' }, { status: 400 });
      }

      const result = await indexVirtualFile(filePath, content, chatId);

      return json(result);
    }

    case 'SEARCH': {
      const { query, chatId } = payload;

      if (!query) {
        return json({ error: 'query es requerido' }, { status: 400 });
      }

      const results = await searchIndex(query, chatId);

      return json({ results });
    }

    default:
      return json({ error: `Tipo de acción no soportado: ${type}` }, { status: 400 });
  }
}
