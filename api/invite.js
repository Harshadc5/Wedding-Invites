const PROJECT_ID = 'wedding-invites-0';

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function formatDate(isoDate) {
  try {
    const dt = new Date(isoDate + 'T00:00:00');
    return dt.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch (e) {
    return '';
  }
}

module.exports = async (req, res) => {
  const slug = (req.query.slug || '').toString();

  let title = "Wedding Invitation";
  let description = "You're invited! Tap to view the invitation, countdown & RSVP.";
  let bride = '';
  let groom = '';
  let dateFmt = '';

  if (slug) {
    try {
      const fsRes = await fetch(
        `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/invitations/${encodeURIComponent(slug)}`
      );
      if (fsRes.ok) {
        const doc = await fsRes.json();
        const f = doc.fields || {};
        bride = (f.brideName && f.brideName.stringValue) || '';
        groom = (f.groomName && f.groomName.stringValue) || '';
        const dateStr = f.weddingDate && f.weddingDate.stringValue;
        if (bride && groom) {
          title = `${bride} & ${groom} | Wedding Invitation`;
          dateFmt = dateStr ? formatDate(dateStr) : '';
          description = `You're invited! Join us for ${bride} & ${groom}'s wedding${dateFmt ? ' on ' + dateFmt : ''}.`;
        }
      }
    } catch (e) {
      // fall back to generic title/description below
    }
  }

  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  const host = req.headers.host;
  const pageUrl = `${proto}://${host}/i/${encodeURIComponent(slug)}/`;
  const imageUrl = (bride && groom)
    ? `${proto}://${host}/api/og?bride=${encodeURIComponent(bride)}&groom=${encodeURIComponent(groom)}&date=${encodeURIComponent(dateFmt)}`
    : `${proto}://${host}/assets/og-preview.png`;

  let html;
  try {
    const shellRes = await fetch(`${proto}://${host}/i/index.html`);
    html = await shellRes.text();
  } catch (e) {
    res.status(502).send('Could not load invitation.');
    return;
  }

  const metaTags = `
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:url" content="${pageUrl}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${imageUrl}">
`;

  html = html.replace('</title>', `</title>${metaTags}`);
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
};
