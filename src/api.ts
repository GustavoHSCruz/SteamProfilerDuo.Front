import type { GeneratorDesign } from './generator';
export type Theme = 'ember' | 'mint' | 'violet' | 'ice';
export type Layout = 'banner' | 'card' | 'square';
export type Design = {
  version: 1;
  title: string;
  subtitle: string;
  eyebrow: string;
  theme: Theme;
  layout: Layout;
  stats: { label: string; value: string }[];
};
export type Project = {
  id: string;
  name: string;
  design: Design | GeneratorDesign;
  revision: number;
  created_at: number;
  updated_at: number;
};
export type Session = {
  user: { id: string; name: string } | null;
  csrf: string | null;
  dev_login: boolean;
};

const errors: Record<string, string> = {
  steam_key_required: 'A coleta Steam precisa da chave de API configurada no servidor do Duo.',
  library_private:
    'A Steam não disponibilizou sua biblioteca. Verifique a privacidade dos detalhes de jogos.',
  profile_required: 'Carregue sua biblioteca para visualizar a composição.',
  rival_required: 'Carregue o segundo perfil para comparar.',
  background_required: 'Escolha uma imagem de fundo.',
  asset_not_found: 'Esta imagem não está disponível para sua conta.',
  invalid_image: 'Use uma imagem PNG de até 900 KB após o processamento.',
  image_limit: 'O limite de 20 imagens da conta foi atingido.',
  rival_limit: 'O limite de perfis comparados foi atingido.',
  invalid_steamid: 'Informe um SteamID64 ou endereço válido de perfil Steam.',
  steam_unavailable: 'A Steam não respondeu. Os dados já carregados continuam disponíveis.',
  login_required: 'Sua sessão terminou. Exporte a arte para guardar uma cópia e entre novamente.',
  revision_conflict:
    'Este projeto mudou em outra aba. Exporte sua arte antes de recarregar para abrir a versão salva.',
  project_limit: 'Você chegou ao limite de 100 projetos. Exclua um projeto para criar outro.',
  project_not_found: 'Este projeto não está mais disponível.',
  invalid_csrf: 'Sua sessão mudou. Recarregue a página para continuar.',
  invalid_origin: 'O endereço do aplicativo não corresponde à configuração da API.',
  invalid_project: 'Confira o nome do projeto e os campos da arte.',
  invalid_design: 'Confira os campos da arte antes de salvar.',
};

export async function api<T>(
  path: string,
  method = 'GET',
  body?: unknown,
  csrf?: string | null,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(
        path.includes('/render') || path.includes('/sync') ? 45000 : 20000,
      ),
    });
  } catch {
    throw new Error(
      'Não foi possível conectar. Suas alterações continuam abertas; tente salvar novamente.',
    );
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      errors[data.error] || 'Não foi possível concluir. Tente novamente em instantes.',
    );
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

export function newDesign(name: string, theme: Theme = 'ember'): Design {
  return {
    version: 1,
    title: name.slice(0, 40),
    subtitle: 'Sua biblioteca em uma imagem.',
    eyebrow: 'STEAMPROFILER / DUO',
    theme,
    layout: 'banner',
    stats: [
      { label: 'JOGOS', value: '—' },
      { label: 'HORAS', value: '—' },
      { label: 'CONQUISTAS', value: '—' },
    ],
  };
}
