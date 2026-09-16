export function validProductImage(value) {
  if (typeof value !== 'string' || value.length > 255) return false;
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'i.ibb.co' && !url.username && !url.password && !url.port;
  } catch { return false; }
}

export async function uploadProductImage(req, res) {
  if (!process.env.IMGBB_API_KEY?.trim()) return res.status(503).json({ error: 'Image uploads need IMGBB_API_KEY in the backend environment.' });
  const bytes = req.body;
  const valid = Buffer.isBuffer(bytes) && (
    bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ||
    bytes.subarray(0, 3).equals(Buffer.from([255,216,255])) ||
    (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP')
  );
  if (!valid) return res.status(400).json({ error: 'Choose a PNG, JPEG or WebP image.' });
  try {
    const body = new FormData();
    body.set('key', process.env.IMGBB_API_KEY.trim());
    body.set('image', bytes.toString('base64'));
    const response = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body, signal: AbortSignal.timeout(30000) });
    const result = await response.json();
    if (!response.ok || !result.success || !validProductImage(result.data?.url)) throw new Error('Upload rejected');
    return res.json({ image_url: result.data.url });
  } catch {
    return res.status(502).json({ error: 'ImgBB upload failed. Check the API key and try again.' });
  }
}
