module.exports = async function handler(req, res) {
  const gistId = process.env.GIST_ID;
  const token = process.env.GIST_TOKEN;

  // CORS — allow Vite dev server and production origins
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  if (!gistId || !token) {
    res.status(501).json({ error: 'sync_not_configured' });
    return;
  }

  const headers = {
    'Authorization': `token ${token}`,
    'User-Agent': 'LivingPokedex/1.0',
    'Content-Type': 'application/json'
  };

  try {
    if (req.method === 'GET') {
      const r = await fetch(`https://api.github.com/gists/${gistId}`, { headers });
      if (!r.ok) {
        res.status(r.status).json({ error: 'gist_fetch_failed' });
        return;
      }
      const data = await r.json();
      const file = data.files && data.files['pokedex-progress.json'];
      if (file && file.content) {
        const parsed = JSON.parse(file.content);
        res.status(200).json(Array.isArray(parsed) ? parsed : []);
        return;
      }
      res.status(200).json([]);
      return;
    }

    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch { body = null; }
      }
      if (!Array.isArray(body)) {
        res.status(400).json({ error: 'invalid_payload' });
        return;
      }

      const r = await fetch(`https://api.github.com/gists/${gistId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          files: {
            'pokedex-progress.json': { content: JSON.stringify(body) }
          }
        })
      });

      if (!r.ok) {
        res.status(r.status).json({ error: 'gist_save_failed' });
        return;
      }

      res.status(200).json({ ok: true });
      return;
    }

    res.setHeader('Allow', 'GET, POST');
    res.status(405).end();
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
}
