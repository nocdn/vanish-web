import { joyful } from 'joyful';

const SEGMENTS = 2;
const SEPARATOR = '-';
const TOTAL_MAX_LENGTH = 14;

export function generateRandomEmail(): string {
  return joyful({
    segments: SEGMENTS,
    separator: SEPARATOR,
    maxLength: TOTAL_MAX_LENGTH,
  });
}
