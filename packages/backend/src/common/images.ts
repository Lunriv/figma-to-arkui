export const PLACEHOLDER_IMAGE_DOMAIN = "https://placehold.co";

export const getPlaceholderImage = (width: number, height = width): string =>
  `${PLACEHOLDER_IMAGE_DOMAIN}/${width.toFixed()}x${height.toFixed()}`;
