// Vercel: extend the function timeout. Default Hobby is 10s — way too short.
// Pro/Hobby both support up to 60s for Node serverless functions now.
export const maxDuration = 60;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({
      error: { message: 'Server is missing ANTHROPIC_API_KEY env var.' }
    });
  }

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body)
    });

    // Read as text first so we can surface non-JSON upstream errors cleanly.
    const raw = await upstream.text();

    if (!upstream.ok) {
      // Try to forward Anthropic's structured error; fall back to raw text.
      let parsed;
      try { parsed = JSON.parse(raw); } catch { parsed = null; }
      return res.status(upstream.status).json(
        parsed || { error: { message: raw || `Upstream ${upstream.status}` } }
      );
    }

    // Happy path — forward Anthropic's JSON unchanged.
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).send(raw);

  } catch (err) {
    return res.status(500).json({
      error: { message: err?.message || 'Unknown server error' }
    });
  }
}
