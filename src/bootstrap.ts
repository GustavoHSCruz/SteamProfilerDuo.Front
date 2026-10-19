// Module loading errors happen before React can mount an error boundary.
import('./main').catch((error: unknown) => {
  console.error('SteamProfiler Duo: falha ao carregar o editor.', error);
  const root = document.getElementById('root');
  if (!root) return;

  const message = document.createElement('p');
  message.setAttribute('role', 'alert');
  message.textContent =
    'Não foi possível carregar o editor. Recarregue a página para tentar novamente.';
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.textContent = 'Recarregar editor';
  retry.addEventListener('click', () => window.location.reload());
  root.replaceChildren(message, retry);
});
