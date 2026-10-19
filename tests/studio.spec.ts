import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Entrar no ambiente de desenvolvimento' }).click();
  await expect(page.getByRole('heading', { name: 'Seu estúdio.' })).toBeVisible();
}

test('module startup failure shows a recovery action and reload opens the app', async ({
  page,
}) => {
  await page.route('**/src/main.tsx*', (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: 'throw new Error("Simulated module loading failure");',
    }),
  );
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('Não foi possível carregar o editor');
  await expect(page.getByText('Ative o JavaScript', { exact: false })).toHaveCount(0);
  await page.unroute('**/src/main.tsx*');
  await page.getByRole('button', { name: 'Recarregar editor', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Entrar com Steam' })).toBeVisible();
});

test('creates, autosaves, exports, resumes after logout and deletes a project', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Entrar com Steam' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('landing.png'), fullPage: true });
  await login(page);
  await page.screenshot({ path: testInfo.outputPath('studio.png'), fullPage: true });
  await page.getByRole('button', { name: '＋ Novo projeto', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Nome do projeto', exact: true })
    .fill('Minha primeira arte');
  await page.getByLabel('Tema', { exact: true }).selectOption('light');
  await page.getByRole('checkbox', { name: 'Dota 2' }).uncheck();
  await page.getByRole('button', { name: 'Subir Portal 2', exact: true }).click();
  await expect(page.getByAltText('Prévia da composição')).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('✓ Tudo salvo');
  await page.screenshot({ path: testInfo.outputPath('editor.png'), fullPage: true });
  for (const format of ['SVG', 'PNG']) {
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: `Baixar ${format}` }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(`duo-Minha-primeira-arte.${format.toLowerCase()}`);
    expect(await download.failure()).toBeNull();
  }
  await page.reload();
  await page.getByRole('button', { name: 'Minha primeira arte', exact: true }).click();
  await expect(page.getByLabel('Tema', { exact: true })).toHaveValue('light');
  await expect(page.getByRole('checkbox', { name: 'Dota 2' })).not.toBeChecked();
  await page.getByRole('button', { name: 'Meus projetos' }).click();
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Entrar com Steam' })).toBeVisible();
  await page.getByRole('button', { name: 'Entrar no ambiente de desenvolvimento' }).click();
  await expect(
    page.getByRole('button', { name: 'Minha primeira arte', exact: true }),
  ).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Excluir', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Minha primeira arte', exact: true })).toHaveCount(
    0,
  );
  expect(errors).toEqual([]);
});

test('keeps unsaved changes visible on network failure and allows retry', async ({ page }) => {
  await login(page);
  await page.getByRole('button', { name: '＋ Novo projeto', exact: true }).click();
  await page.route('**/api/v1/projects/*', (route) =>
    route.request().method() === 'PUT' ? route.abort() : route.continue(),
  );
  await page.getByRole('textbox', { name: 'Nome do projeto', exact: true }).fill('Ainda está aqui');
  await expect(page.getByRole('alert')).toContainText('Não foi possível conectar');
  await expect(page.getByRole('textbox', { name: 'Nome do projeto', exact: true })).toHaveValue(
    'Ainda está aqui',
  );
  await page.unroute('**/api/v1/projects/*');
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('✓ Tudo salvo');
});

test('rejects a stale edit from another tab', async ({ page, context }) => {
  await login(page);
  await page.getByRole('button', { name: '＋ Novo projeto', exact: true }).click();
  await page.getByRole('textbox', { name: 'Nome do projeto', exact: true }).fill('Duas abas');
  await expect(page.getByRole('status')).toHaveText('✓ Tudo salvo');
  const other = await context.newPage();
  await other.goto('/');
  await other.getByRole('button', { name: 'Duas abas', exact: true }).click();
  await page.getByRole('textbox', { name: 'Nome do projeto', exact: true }).fill('Primeira aba');
  await expect(page.getByRole('status')).toHaveText('✓ Tudo salvo');
  await other.getByRole('textbox', { name: 'Nome do projeto', exact: true }).fill('Segunda aba');
  await expect(other.getByRole('alert')).toContainText('mudou em outra aba');
  await other.close();
});

test('mobile layout, privacy dialog and keyboard entry', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Privacidade', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await login(page);
  await page.getByRole('button', { name: '＋ Novo projeto', exact: true }).click();
  await page
    .getByRole('group', { name: 'Tipo de saída' })
    .getByRole('button', { name: 'Artwork', exact: true })
    .click();
  await page.getByLabel('Proporção', { exact: true }).selectOption('square');
  await expect(page.getByRole('status')).toHaveText('✓ Tudo salvo');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await expect(page.getByRole('button', { name: 'Baixar PNG' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('mobile.png'), fullPage: true });
});

test('all six outputs, undo, own background and revocable sharing', async ({ page, request }) => {
  await login(page);
  await page.getByRole('button', { name: '＋ Novo projeto', exact: true }).click();
  const tabs = page.getByRole('group', { name: 'Tipo de saída' });
  await page.getByLabel('Tema', { exact: true }).selectOption('light');
  await page.getByRole('button', { name: '↶ Desfazer', exact: true }).click();
  await expect(page.getByLabel('Tema', { exact: true })).toHaveValue('dark');
  await page.getByRole('button', { name: '↷ Refazer', exact: true }).click();
  await expect(page.getByLabel('Tema', { exact: true })).toHaveValue('light');
  for (const name of ['Banner', 'Badge', 'Comparação', 'Artwork', 'Texto']) {
    await tabs.getByRole('button', { name, exact: true }).click();
    if (name === 'Comparação') {
      await page.getByLabel('SteamID ou URL').fill('rival');
      await page.getByRole('button', { name: 'Carregar comparação', exact: true }).click();
    }
    const button = page.getByRole('button', {
      name: name === 'Texto' ? 'Baixar TXT' : 'Baixar SVG',
      exact: true,
    });
    await expect(button).toBeEnabled();
    const pending = page.waitForEvent('download');
    await button.click();
    expect(await (await pending).failure()).toBeNull();
  }
  await tabs.getByRole('button', { name: 'Artwork', exact: true }).click();
  await page.getByLabel('Fundo', { exact: true }).selectOption('own');
  await page.getByLabel('Escolher imagem').setInputFiles({
    name: 'background.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64',
    ),
  });
  await expect(page.getByText('Imagem salva no projeto.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Baixar PNG', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Ativar link público', exact: true }).click();
  const url = await page.getByLabel('URL', { exact: true }).inputValue();
  const shared = await request.get(url);
  expect(shared.status()).toBe(200);
  expect(await shared.text()).toContain('data:image/png;base64,');
  await page.getByRole('button', { name: 'Desativar link público', exact: true }).click();
  expect((await request.get(url)).status()).toBe(404);
});

test('themes persist, new layouts export and 3D contains actual geometry', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1536, height: 1000 });
  await login(page);
  await page.getByRole('button', { name: '＋ Novo projeto', exact: true }).click();
  await page.getByRole('textbox', { name: 'Nome do projeto', exact: true }).fill('Minha coleção');
  const tabs = page.getByRole('group', { name: 'Tipo de saída' });
  await tabs.getByRole('button', { name: 'Mosaico', exact: true }).click();
  await page.getByLabel('Tema', { exact: true }).selectOption('aurora');
  await page.getByLabel('Formato das imagens', { exact: true }).selectOption('hex');
  await page.getByLabel('Proporção das capas', { exact: true }).selectOption('square');
  await page.getByText('Tela e proporção', { exact: true }).click();
  await page.getByLabel('Proporção da tela', { exact: true }).selectOption('portrait');
  await expect(page.getByRole('status')).toHaveText('✓ Tudo salvo');
  await expect(page.getByRole('button', { name: 'Baixar SVG', exact: true })).toBeEnabled();
  const preview = await page.getByAltText('Prévia da composição').boundingBox();
  const stage = await page.locator('.render-stage').boundingBox();
  expect(preview!.y).toBeGreaterThanOrEqual(stage!.y);
  expect(preview!.y + preview!.height).toBeLessThanOrEqual(stage!.y + stage!.height);
  await page.screenshot({ path: testInfo.outputPath('mosaic.png'), fullPage: true });
  await page.reload();
  await page.getByRole('button', { name: 'Minha coleção', exact: true }).click();
  await expect(page.getByLabel('Formato das imagens', { exact: true })).toHaveValue('hex');
  await expect(page.getByLabel('Cor do fundo', { exact: true })).toHaveValue('#07191e');
  await expect(page.getByRole('checkbox', { name: 'Rodapé', exact: true })).toHaveCount(0);
  for (const name of ['Distribuição', 'Pôster', 'Meu ano', 'Coleção 3D']) {
    await tabs.getByRole('button', { name, exact: true }).click();
    await expect(page.getByRole('button', { name: 'Baixar PNG', exact: true })).toBeEnabled();
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Baixar PNG', exact: true }).click();
    expect(await (await pending).failure()).toBeNull();
    await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true });
  }
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Baixar modelo OBJ', exact: true }).click();
  const obj = await pending;
  const path = await obj.path();
  const { readFileSync } = await import('node:fs');
  expect(readFileSync(path!, 'utf8')).toContain('\nv ');
  expect(readFileSync(path!, 'utf8')).toContain('SteamProfilerDuo_game_');
});

test('one theme selector resets custom colors and exported gradients follow both endpoints and angle', async ({
  page,
}, testInfo) => {
  await login(page);
  await page.getByRole('button', { name: '＋ Novo projeto', exact: true }).click();
  const theme = page.getByLabel('Tema', { exact: true });
  await expect(theme).toHaveCount(1);
  await expect(theme.locator('option')).toHaveCount(19);
  await expect(page.getByText('Direção de arte', { exact: true })).toHaveCount(0);
  await theme.selectOption('aurora');
  await page.getByLabel('Cor do fundo hexadecimal', { exact: true }).fill('#123456');
  await expect(theme).toHaveValue('custom');
  await theme.selectOption('light');
  await expect(page.getByLabel('Cor do fundo', { exact: true })).toHaveValue('#ffffff');
  await expect(page.getByLabel('Cor de destaque', { exact: true })).toHaveValue('#c97f22');
  await expect(page.getByLabel('Efeito de fundo', { exact: true })).toHaveValue('solid');
  await theme.selectOption('steam');
  await expect(page.getByLabel('Cor do fundo', { exact: true })).toHaveValue('#1b2838');
  await theme.selectOption('custom');
  await expect(page.getByLabel('Cor do fundo', { exact: true })).toHaveValue('#1b2838');
  const tabs = page.getByRole('group', { name: 'Tipo de saída' });
  await tabs.getByRole('button', { name: 'Artwork', exact: true }).click();
  await page.getByLabel('Cor do fundo hexadecimal', { exact: true }).fill('#ff0000');
  await page.getByLabel('Segunda cor do fundo hexadecimal', { exact: true }).fill('#0000ff');
  // An incomplete hex edit stays local instead of sending invalid colors to the renderer.
  await page.getByLabel('Cor da borda hexadecimal', { exact: true }).fill('#ab');
  await page.getByLabel('Cor da borda hexadecimal', { exact: true }).blur();
  await expect(page.getByLabel('Cor da borda hexadecimal', { exact: true })).toHaveValue('#2a475e');
  await page.getByLabel('Espessura da borda', { exact: true }).fill('0');
  await page.getByLabel('Arredondamento da arte', { exact: true }).fill('0');
  await page.getByLabel('Efeito de fundo', { exact: true }).selectOption('gradient');
  for (const angle of ['0', '90']) {
    const rendered = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/v1/render') &&
        response.request().postDataJSON()?.options.gradient_angle === angle,
    );
    await page.getByLabel('Ângulo do gradiente', { exact: true }).fill(angle);
    expect((await rendered).ok()).toBe(true);
    await expect(page.getByRole('button', { name: 'Baixar SVG', exact: true })).toBeEnabled();
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Baixar SVG', exact: true }).click();
    const { readFileSync } = await import('node:fs');
    const svg = readFileSync((await (await pending).path())!, 'utf8');
    const pixels = await page.evaluate(async (content) => {
      const image = new Image();
      const url = URL.createObjectURL(new Blob([content], { type: 'image/svg+xml' }));
      image.src = url;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(image, 0, 0);
      const pixel = (x: number, y: number) => Array.from(ctx.getImageData(x, y, 1, 1).data);
      const colors = [pixel(2, 2), pixel(canvas.width - 3, 2), pixel(2, canvas.height - 3)];
      URL.revokeObjectURL(url);
      return colors;
    }, svg);
    expect(pixels[0][0]).toBeGreaterThan(245);
    expect(pixels[0][2]).toBeLessThan(10);
    const end = pixels[angle === '0' ? 1 : 2];
    expect(end[2]).toBeGreaterThan(245);
    expect(end[0]).toBeLessThan(10);
  }
  await expect(page.getByRole('status')).toHaveText('✓ Tudo salvo');
  await page.screenshot({ path: testInfo.outputPath('custom-gradient.png'), fullPage: true });
  await theme.selectOption('sakura');
  await tabs.getByRole('button', { name: 'Badge', exact: true }).click();
  await expect(theme).toHaveValue('sakura');
  await expect(page.getByLabel('Cor de destaque', { exact: true })).toHaveValue('#b73c77');
  await expect(page.getByRole('button', { name: 'Baixar SVG', exact: true })).toBeEnabled();
  await page.screenshot({ path: testInfo.outputPath('compact-badge.png'), fullPage: true });
});
