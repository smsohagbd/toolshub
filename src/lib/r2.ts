/**
 * Cloudflare R2 Object Storage Service
 * Bucket: tools-media
 */

export interface R2Bucket {
  put(key: string, value: any, options?: any): Promise<any>;
  get(key: string): Promise<any>;
  delete(key: string): Promise<void>;
  list(options?: any): Promise<any>;
}

export function getR2Bucket(): R2Bucket | null {
  if (typeof (globalThis as any).BUCKET !== "undefined") {
    return (globalThis as any).BUCKET;
  }
  if (typeof process !== "undefined" && (process.env as any).BUCKET) {
    return (process.env as any).BUCKET;
  }
  return null;
}

/**
 * Uploads a file buffer or stream directly to Cloudflare R2
 */
export async function uploadToR2(
  key: string,
  content: ArrayBuffer | Uint8Array | ReadableStream,
  contentType: string = "application/octet-stream"
) {
  const bucket = getR2Bucket();
  if (bucket) {
    return await bucket.put(key, content, {
      httpMetadata: {
        contentType
      }
    });
  }

  // Local Mock / Fallback
  console.log(`[R2 Local Mode] Stored simulated file '${key}' with content-type: ${contentType}`);
  return { key, size: 1024 * 1024 };
}

/**
 * Retrieves a file object from Cloudflare R2
 */
export async function getFromR2(key: string) {
  const bucket = getR2Bucket();
  if (bucket) {
    return await bucket.get(key);
  }
  return null;
}
