import * as ImageManipulator from 'expo-image-manipulator';
import { getResizeForMaxLongSide } from './imageCrop';

const JPEG_FORMAT =
  ImageManipulator?.SaveFormat?.JPEG ||
  ImageManipulator?.SaveFormat?.jpeg ||
  'jpeg';

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
  if (typeof ImageManipulator?.manipulateAsync !== 'function') {
    throw new Error('ImageManipulator non disponibile.');
  }

  const actions = [];
  let workingWidth = Math.max(1, Number(sourceWidth) || 1);
  let workingHeight = Math.max(1, Number(sourceHeight) || 1);

  if (cropRect) {
    actions.push({
      crop: {
        originX: Math.max(0, Math.floor(cropRect.originX || 0)),
        originY: Math.max(0, Math.floor(cropRect.originY || 0)),
        width: Math.max(1, Math.floor(cropRect.width || 1)),
        height: Math.max(1, Math.floor(cropRect.height || 1)),
      },
    });
    workingWidth = Math.max(1, Math.floor(cropRect.width || 1));
    workingHeight = Math.max(1, Math.floor(cropRect.height || 1));
  }

  const resize = getResizeForMaxLongSide(workingWidth, workingHeight, maxLongSide);
  if (resize) {
    actions.push({ resize });
    workingWidth = resize.width;
    workingHeight = resize.height;
  }

  const result = await ImageManipulator.manipulateAsync(uri, actions, {
    compress,
    format: JPEG_FORMAT,
  });

  return {
    uri: result?.uri || uri,
    width: result?.width || workingWidth,
    height: result?.height || workingHeight,
  };
};
