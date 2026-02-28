import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';
import { getResizeForMaxLongSide } from './imageCrop';

const JPEG_FORMAT =
  ImageManipulator?.SaveFormat?.JPEG ||
  ImageManipulator?.SaveFormat?.jpeg ||
  'jpeg';

const WEB_JPEG_MIME = 'image/jpeg';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const normalizePositiveInt = (value, fallback = 1) =>
  Math.max(1, Math.floor(Number(value) || fallback));
const normalizeQuality = (value, fallback = 0.8) =>
  clamp(Number.isFinite(Number(value)) ? Number(value) : fallback, 0.1, 1);

const isWebCanvasAvailable = () =>
  Platform.OS === 'web' &&
  typeof window !== 'undefined' &&
  typeof document !== 'undefined';

const loadImage = (uri) =>
  new Promise((resolve, reject) => {
    if (!isWebCanvasAvailable()) {
      reject(new Error('Canvas non disponibile.'));
      return;
    }
    const img = new window.Image();
    img.decoding = 'async';
    if (/^https?:\/\//i.test(uri)) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Impossibile caricare immagine per canvas crop.'));
    img.src = uri;
  });

const canvasToBlob = (canvas, quality) =>
  new Promise((resolve, reject) => {
    if (!canvas || typeof canvas.toBlob !== 'function') {
      reject(new Error('canvas.toBlob non disponibile.'));
      return;
    }
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Impossibile generare blob JPEG dal canvas.'));
        }
      },
      WEB_JPEG_MIME,
      quality,
    );
  });

const processWithImageManipulator = async ({
  uri,
  sourceWidth,
  sourceHeight,
  cropRect,
  maxLongSide,
  compress,
}) => {
  const actions = [];
  let workingWidth = normalizePositiveInt(sourceWidth, 1);
  let workingHeight = normalizePositiveInt(sourceHeight, 1);
  const quality = normalizeQuality(compress, 0.8);

  if (cropRect) {
    actions.push({
      crop: {
        originX: Math.max(0, Math.floor(cropRect.originX ?? 0)),
        originY: Math.max(0, Math.floor(cropRect.originY ?? 0)),
        width: normalizePositiveInt(cropRect.width, 1),
        height: normalizePositiveInt(cropRect.height, 1),
      },
    });
    workingWidth = normalizePositiveInt(cropRect.width, 1);
    workingHeight = normalizePositiveInt(cropRect.height, 1);
  }

  const resize = getResizeForMaxLongSide(workingWidth, workingHeight, maxLongSide);
  if (resize) {
    actions.push({ resize });
    workingWidth = resize.width;
    workingHeight = resize.height;
  }

  const result = await ImageManipulator.manipulateAsync(uri, actions, {
    compress: quality,
    format: JPEG_FORMAT,
  });

  return {
    uri: result?.uri || uri,
    width: result?.width || workingWidth,
    height: result?.height || workingHeight,
  };
};

const processWithWebCanvas = async ({
  uri,
  cropRect,
  maxLongSide,
  compress,
}) => {
  if (!isWebCanvasAvailable()) {
    throw new Error('Web canvas non disponibile.');
  }

  const image = await loadImage(uri);
  const naturalWidth = normalizePositiveInt(image.naturalWidth || image.width, 1);
  const naturalHeight = normalizePositiveInt(image.naturalHeight || image.height, 1);
  const quality = normalizeQuality(compress, 0.8);

  let cropX = 0;
  let cropY = 0;
  let cropWidth = naturalWidth;
  let cropHeight = naturalHeight;

  if (cropRect) {
    // Crop coordinates are computed in source pixels from the preview transform.
    cropX = clamp(Math.floor(cropRect.originX ?? 0), 0, Math.max(0, naturalWidth - 1));
    cropY = clamp(Math.floor(cropRect.originY ?? 0), 0, Math.max(0, naturalHeight - 1));
    cropWidth = clamp(normalizePositiveInt(cropRect.width, naturalWidth), 1, Math.max(1, naturalWidth - cropX));
    cropHeight = clamp(normalizePositiveInt(cropRect.height, naturalHeight), 1, Math.max(1, naturalHeight - cropY));
  }

  const resize = getResizeForMaxLongSide(cropWidth, cropHeight, maxLongSide);
  const targetWidth = resize?.width || cropWidth;
  const targetHeight = resize?.height || cropHeight;

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Contesto canvas 2D non disponibile.');
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(
    image,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    targetWidth,
    targetHeight,
  );

  const blob = await canvasToBlob(canvas, quality);
  if (typeof URL?.createObjectURL !== 'function') {
    throw new Error('URL.createObjectURL non disponibile.');
  }
  const objectUrl = URL.createObjectURL(blob);

  return {
    uri: objectUrl,
    width: targetWidth,
    height: targetHeight,
  };
};

export const processPostImageForUpload = async ({
  uri,
  sourceWidth,
  sourceHeight,
  cropRect = null,
  maxLongSide = 1600,
  compress = 0.8,
}) => {
  if (!uri) {
    throw new Error('URI immagine non valida.');
  }
  const canUseManipulator = typeof ImageManipulator?.manipulateAsync === 'function';
  const isWeb = Platform.OS === 'web';

  if (!isWeb) {
    if (!canUseManipulator) {
      throw new Error('ImageManipulator non disponibile.');
    }
    return processWithImageManipulator({
      uri,
      sourceWidth,
      sourceHeight,
      cropRect,
      maxLongSide,
      compress,
    });
  }

  if (canUseManipulator) {
    try {
      return await processWithImageManipulator({
        uri,
        sourceWidth,
        sourceHeight,
        cropRect,
        maxLongSide,
        compress,
      });
    } catch (_error) {
      // On web, fallback to canvas if manipulateAsync is missing or fails.
    }
  }

  return processWithWebCanvas({
    uri,
    cropRect,
    maxLongSide,
    compress,
  });
};
