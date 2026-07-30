interface BoundingBox {
  width: number;
  height: number;
  x: number;
  y: number;
}

interface RectangleStyle {
  width: number;
  height: number;
  left: number;
  top: number;
  rotation: number;
}

export function calculateRectangleFromBoundingBox(
  boundingBox: BoundingBox,
  figmaRotationDegrees: number,
): RectangleStyle {
  const rotation = -figmaRotationDegrees;
  const theta = (rotation * Math.PI) / 180;
  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);
  const absCosTheta = Math.abs(cosTheta);
  const absSinTheta = Math.abs(sinTheta);
  const { width: boundingWidth, height: boundingHeight, x, y } = boundingBox;
  const denominator = absCosTheta ** 2 - absSinTheta ** 2;
  const height =
    (boundingWidth * absSinTheta - boundingHeight * absCosTheta) /
    -denominator;
  const width = (boundingWidth - height * absSinTheta) / absCosTheta;
  const corners = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height },
  ].map((corner) => ({
    x: corner.x * cosTheta + corner.y * sinTheta,
    y: -corner.x * sinTheta + corner.y * cosTheta,
  }));
  const left = x - Math.min(...corners.map((corner) => corner.x));
  const top = y - Math.min(...corners.map((corner) => corner.y));

  return {
    width: Number(width.toFixed(2)),
    height: Number(height.toFixed(2)),
    left: Number(left.toFixed(2)),
    top: Number(top.toFixed(2)),
    rotation,
  };
}
