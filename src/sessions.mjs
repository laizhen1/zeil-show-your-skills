import { get, put, BlobPreconditionFailedError } from '@vercel/blob';

export const sessionTtl = 2 * 60 * 60 * 1000;
const conflict = () => Object.assign(new Error('This session changed in another request. Reload and try again.'), { status: 409 });

export class MemorySessions {
  records = new Map();
  async read(id) {
    for (const [key, record] of this.records) if (Date.now() - record.data.created > sessionTtl) this.records.delete(key);
    return structuredClone(this.records.get(id) || null);
  }
  async write(id, data, version) {
    if (this.records.get(id)?.version !== version) throw conflict();
    if (version === undefined && this.records.size >= 100) throw Object.assign(new Error('Demo capacity reached. Please try again later.'), { status: 503 });
    const next = (version || 0) + 1;
    this.records.set(id, { data: structuredClone(data), version: next });
    return next;
  }
}

export class BlobSessions {
  async read(id) {
    if (!/^[a-f0-9]{48}$/.test(id || '')) return null;
    // Use the stored representation's ETag, not a compressed HTTP variant's ETag.
    const result = await get(`sessions/${id}.json`, {
      access: 'private', useCache: false, headers: { 'Accept-Encoding': 'identity' },
    });
    if (!result) return null;
    const data = await new Response(result.stream).json();
    if (Date.now() - data.created > sessionTtl) return null;
    return { data, version: result.blob.etag };
  }
  async write(id, data, version) {
    try {
      const result = await put(`sessions/${id}.json`, JSON.stringify(data), {
        access: 'private', addRandomSuffix: false, allowOverwrite: version !== undefined,
        ...(version ? { ifMatch: version } : {}), contentType: 'application/json',
      });
      return result.etag;
    } catch (error) {
      if (error instanceof BlobPreconditionFailedError) throw conflict();
      throw error;
    }
  }
}

export function deploymentSessions() {
  if (process.env.VERCEL) {
    if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) throw new Error('Connect a private Vercel Blob store before using the deployed demo.');
    return new BlobSessions();
  }
  return new MemorySessions();
}
