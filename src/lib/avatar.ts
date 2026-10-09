import { ValidationError } from './errors';

// Only raster formats are accepted; MIME headers and filenames are untrusted.
export function avatarContentType(bytes: Uint8Array): string {
  if (
    bytes.length >= 8 &&
    bytes
      .slice(0, 8)
      .every((byte, i) => byte === [137, 80, 78, 71, 13, 10, 26, 10][i])
  )
    return 'image/png';
  if (
    bytes.length >= 3 &&
    bytes[0] === 255 &&
    bytes[1] === 216 &&
    bytes[2] === 255
  )
    return 'image/jpeg';
  if (
    bytes.length >= 12 &&
    new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' &&
    new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP'
  )
    return 'image/webp';
  throw new ValidationError('Choose a JPG, PNG or WebP photo.');
}
