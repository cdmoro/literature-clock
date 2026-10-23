const MAX_IMAGE_SIZE = 20 * 1024 * 1024;

export const handler = async (event) => {
  let imageUrl;
  try {
    imageUrl = new URL(event.queryStringParameters?.url || '');
  } catch {
    return { statusCode: 400, body: 'Invalid image URL' };
  }

  if (
    imageUrl.protocol !== 'https:' ||
    imageUrl.hostname !== 'images-assets.nasa.gov' ||
    imageUrl.username ||
    imageUrl.password
  ) {
    return { statusCode: 400, body: 'Unsupported image host' };
  }

  try {
    const upstream = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) });
    if (!upstream.ok || new URL(upstream.url).hostname !== 'images-assets.nasa.gov') {
      return { statusCode: 502, body: 'NASA image unavailable' };
    }

    const contentType = upstream.headers.get('content-type')?.split(';')[0].toLowerCase();
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(contentType)) {
      return { statusCode: 415, body: 'Unsupported image format' };
    }

    const contentLength = Number(upstream.headers.get('content-length'));
    if (contentLength > MAX_IMAGE_SIZE || !upstream.body) {
      return { statusCode: 413, body: 'Image too large' };
    }

    const reader = upstream.body.getReader();
    const chunks = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_IMAGE_SIZE) {
        await reader.cancel();
        return { statusCode: 413, body: 'Image too large' };
      }
      chunks.push(Buffer.from(value));
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
      body: Buffer.concat(chunks).toString('base64'),
      isBase64Encoded: true,
    };
  } catch {
    return { statusCode: 502, body: 'NASA image unavailable' };
  }
};
