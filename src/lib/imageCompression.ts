/**
 * Automatically compress and convert any uploaded image to WebP < 100 KB
 */
export async function compressImageToUnder100KB(
  file: File,
  maxDimension = 1200,
  targetSizeKB = 95
): Promise<File> {
  // If not an image (e.g. zip file or pdf), return original
  if (!file.type || !file.type.startsWith("image/")) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Scale down large dimensions
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
        if (!ctx) return resolve(file);

        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.85;
        const tryExport = (q: number) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) return resolve(file);
              const sizeKB = blob.size / 1024;
              if (sizeKB <= targetSizeKB || q <= 0.3) {
                const newName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
                const compressedFile = new File([blob], newName, { type: "image/webp" });
                resolve(compressedFile);
              } else {
                tryExport(Math.max(0.2, q - 0.15));
              }
            },
            "image/webp",
            q
          );
        };
        tryExport(quality);
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
}
