const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/**
 * Maps the visible crop frame on screen back to the original image coordinates.
 * The image is rendered centered, then transformed by translateX/translateY and scale.
 */
export const computeCropRect = ({
  imageWidth,
  imageHeight,
  frameWidth,
  frameHeight,
  translateX,
  translateY,
  scale,
}) => {
  const safeImageWidth = Math.max(1, Number(imageWidth) || 1);
  const safeImageHeight = Math.max(1, Number(imageHeight) || 1);
  const safeFrameWidth = Math.max(1, Number(frameWidth) || 1);
  const safeFrameHeight = Math.max(1, Number(frameHeight) || 1);
  const safeScale = Math.max(0.0001, Number(scale) || 1);
  const safeTranslateX = Number(translateX) || 0;
  const safeTranslateY = Number(translateY) || 0;

  const originX =
    (-safeFrameWidth / 2 - safeTranslateX) / safeScale + safeImageWidth / 2;
  const originY =
    (-safeFrameHeight / 2 - safeTranslateY) / safeScale + safeImageHeight / 2;
  const rawWidth = safeFrameWidth / safeScale;
  const rawHeight = safeFrameHeight / safeScale;

  const x = clamp(Math.floor(originX), 0, Math.max(0, safeImageWidth - 1));
  const y = clamp(Math.floor(originY), 0, Math.max(0, safeImageHeight - 1));
  const width = clamp(
    Math.round(rawWidth),
    1,
    Math.max(1, safeImageWidth - x),
  );
  const height = clamp(
    Math.round(rawHeight),
    1,
    Math.max(1, safeImageHeight - y),
  );

  return { originX: x, originY: y, width, height };
};

export const getResizeForMaxLongSide = (
  width,
  height,
  maxLongSide = 1600,
) => {
  const safeWidth = Math.max(1, Number(width) || 1);
  const safeHeight = Math.max(1, Number(height) || 1);
  const safeMax = Math.max(1, Number(maxLongSide) || 1600);
  const longSide = Math.max(safeWidth, safeHeight);

  if (longSide <= safeMax) return null;

  const ratio = safeMax / longSide;
  return {
    width: Math.max(1, Math.round(safeWidth * ratio)),
    height: Math.max(1, Math.round(safeHeight * ratio)),
  };
};

export const clampTranslationToFrame = ({
  translateX,
  translateY,
  imageWidth,
  imageHeight,
  frameWidth,
  frameHeight,
  scale,
}) => {
  const renderedWidth = Math.max(1, (Number(imageWidth) || 1) * Math.max(0.0001, Number(scale) || 1));
  const renderedHeight = Math.max(1, (Number(imageHeight) || 1) * Math.max(0.0001, Number(scale) || 1));
  const safeFrameWidth = Math.max(1, Number(frameWidth) || 1);
  const safeFrameHeight = Math.max(1, Number(frameHeight) || 1);
  const maxX = Math.max(0, (renderedWidth - safeFrameWidth) / 2);
  const maxY = Math.max(0, (renderedHeight - safeFrameHeight) / 2);

  return {
    x: clamp(Number(translateX) || 0, -maxX, maxX),
    y: clamp(Number(translateY) || 0, -maxY, maxY),
  };
};

export { clamp };
