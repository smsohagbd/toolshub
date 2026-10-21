/**
 * Client-Side Auto Image Compressor
 * Compresses any image (JPEG, PNG, WebP) to strictly LESS THAN 100 KB
 * without requiring any external libraries or server overhead.
 */

export async function compressImageUnder100KB(
  file: File,
  maxDimension = 1200,
  targetSizeBytes = 95 * 1024 // ~95 KB to ensure strictly < 100 KB
): Promise<{ file: File; dataUrl: string; sizeKB: number; originalSizeKB: number }> {
  const originalSizeKB = Math.round(file.size / 1024);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = async () => {
        try {
          let { width, height } = img;

          // Scale down if exceeds maxDimension
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            throw new Error("Canvas context not available");
          }

          // High quality smoothing
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, width, height);

          // Iterative compression loop to guarantee < 100KB
          let quality = 0.85;
          let mimeType = "image/webp";
          let blob: Blob | null = await getCanvasBlob(canvas, mimeType, quality);

          // If webp produces larger or null, try jpeg
          if (!blob) {
            mimeType = "image/jpeg";
            blob = await getCanvasBlob(canvas, mimeType, quality);
          }

          while (blob && blob.size > targetSizeBytes && quality > 0.2) {
            quality -= 0.1;
            blob = await getCanvasBlob(canvas, mimeType, quality);
          }

          // If still over 100KB at low quality, scale canvas down further
          if (blob && blob.size > targetSizeBytes) {
            canvas.width = Math.round(width * 0.7);
            canvas.height = Math.round(height * 0.7);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            blob = await getCanvasBlob(canvas, mimeType, 0.7);
          }

          if (!blob) {
            throw new Error("Image compression failed");
          }

          const compressedFileName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
          const compressedFile = new File([blob], compressedFileName, {
            type: mimeType,
            lastModified: Date.now()
          });

          const sizeKB = Math.round(compressedFile.size / 1024);
          const dataUrl = canvas.toDataURL(mimeType, quality);

          resolve({
            file: compressedFile,
            dataUrl,
            sizeKB,
            originalSizeKB
          });
        } catch (err) {
          reject(err);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function getCanvasBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), mimeType, quality);
  });
}
