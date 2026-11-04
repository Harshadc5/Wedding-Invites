import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

function h(type, props, children) {
  return { type, props: { ...props, children } };
}

async function loadGoogleFont(fontFamily, text) {
  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@700&text=${encodeURIComponent(text)}`;
  const css = await (await fetch(url)).text();
  const resource = css.match(/src: url\(([^)]+)\) format\('(opentype|truetype)'\)/);
  if (resource) {
    const response = await fetch(resource[1]);
    if (response.status === 200) {
      return await response.arrayBuffer();
    }
  }
  throw new Error('failed to load font data');
}

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const bride = searchParams.get('bride') || 'Bride';
  const groom = searchParams.get('groom') || 'Groom';
  const date = searchParams.get('date') || '';

  let fontData = null;
  try {
    fontData = await loadGoogleFont('Playfair Display', bride + groom + date + ' &');
  } catch (e) {
    fontData = null;
  }

  const fontFamily = fontData ? 'Playfair Display' : 'serif';

  const children = [
    h('div', { style: { fontSize: 26, letterSpacing: 6, color: '#b9892f' } }, 'YOU ARE CORDIALLY INVITED'),
    h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 36, marginTop: 28 } }, [
      h('div', { style: { fontSize: 84, color: '#8a1f3b', fontWeight: 700 } }, bride),
      h('div', { style: { fontSize: 54, color: '#b9892f' } }, '&'),
      h('div', { style: { fontSize: 84, color: '#8a1f3b', fontWeight: 700 } }, groom),
    ]),
  ];
  if (date) {
    children.push(h('div', { style: { fontSize: 30, color: '#4a3324', marginTop: 30 } }, date));
  }
  children.push(h('div', { style: { fontSize: 22, color: '#d8b25c', marginTop: 50, letterSpacing: 2 } }, 'Crafted with love'));

  const tree = h('div', {
    style: {
      width: '1200px',
      height: '630px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#fbf2e2',
      fontFamily,
      padding: '0 60px',
      textAlign: 'center',
    },
  }, children);

  try {
    return new ImageResponse(tree, {
      width: 1200,
      height: 630,
      fonts: fontData ? [{ name: 'Playfair Display', data: fontData, weight: 700, style: 'normal' }] : [],
    });
  } catch (e) {
    return new Response('Image generation failed: ' + e.message, { status: 500 });
  }
}
