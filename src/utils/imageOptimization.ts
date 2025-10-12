/**
 * Image optimization utilities for automatic resizing
 */

export interface ResizeOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxFileSizeMB?: number;
}

const DEFAULT_OPTIONS: Required<ResizeOptions> = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.85,
  maxFileSizeMB: 2,
};

/**
 * Resize an image file while maintaining aspect ratio
 */
export async function resizeImage(file: File, options: ResizeOptions = {}): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Check if file is an image
  if (!file.type.startsWith('image/')) {
    throw new Error('ファイルが画像ではありません。');
  }

  // Check for supported image types
  const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!supportedTypes.includes(file.type.toLowerCase())) {
    throw new Error('サポートされていない画像形式です。JPG、PNG、WebP形式をご利用ください。');
  }

  // For files from cloud storage (Google Drive, etc.) on Android,
  // we need to ensure the file is fully loaded before processing
  let processableFile: File;
  try {
    // Read the file completely to ensure it's accessible
    const arrayBuffer = await file.arrayBuffer();
    // Recreate the file from the buffer to ensure it's in memory
    const blob = new Blob([arrayBuffer], { type: file.type });
    processableFile = new File([blob], file.name, {
      type: file.type,
      lastModified: file.lastModified,
    });
  } catch (error) {
    // If reading fails, it might be a network/permission issue
    throw new Error('ファイルの読み込みに失敗しました。ネットワーク接続とファイルへのアクセス許可を確認してください。');
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas context を取得できませんでした。'));
      return;
    }

    const objectUrl = URL.createObjectURL(processableFile);
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const clearResources = () => {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }
      URL.revokeObjectURL(objectUrl);
    };

    timeoutId = setTimeout(() => {
      clearResources();
      reject(new Error('画像の読み込みがタイムアウトしました。'));
    }, 10000); // 10 second timeout

    img.onload = () => {
      clearResources();

      try {
        // Calculate new dimensions while maintaining aspect ratio
        const { width: newWidth, height: newHeight } = calculateNewDimensions(
          img.width,
          img.height,
          opts.maxWidth,
          opts.maxHeight
        );

        // If no resizing is needed and file size is acceptable, return original
        if (newWidth === img.width && newHeight === img.height && processableFile.size <= opts.maxFileSizeMB * 1024 * 1024) {
          resolve(processableFile);
          return;
        }

        // Set canvas dimensions
        canvas.width = newWidth;
        canvas.height = newHeight;

        // Use high-quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw and resize the image
        ctx.drawImage(img, 0, 0, newWidth, newHeight);

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('画像の圧縮に失敗しました。'));
              return;
            }

            // Create new file with optimized image
            const optimizedFile = new File([blob], processableFile.name, {
              type: processableFile.type,
              lastModified: Date.now(),
            });

            resolve(optimizedFile);
          },
          processableFile.type,
          opts.quality
        );
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      clearResources();
      reject(new Error('画像の読み込みに失敗しました。'));
    };

    // Load the image
    img.src = objectUrl;
  });
}

/**
 * Calculate new dimensions while maintaining aspect ratio
 */
function calculateNewDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  // If image is already smaller than max dimensions, keep original size
  if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
    return { width: originalWidth, height: originalHeight };
  }

  const aspectRatio = originalWidth / originalHeight;

  let newWidth = maxWidth;
  let newHeight = maxWidth / aspectRatio;

  // If height exceeds max height, adjust based on height instead
  if (newHeight > maxHeight) {
    newHeight = maxHeight;
    newWidth = maxHeight * aspectRatio;
  }

  return {
    width: Math.round(newWidth),
    height: Math.round(newHeight),
  };
}