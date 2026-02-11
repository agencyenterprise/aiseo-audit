import type { Grade } from './schema.js';

export const GRADE_THRESHOLDS: Array<[number, Grade]> = [
  [95, 'A+'],
  [90, 'A'],
  [85, 'A-'],
  [80, 'B+'],
  [75, 'B'],
  [70, 'B-'],
  [65, 'C+'],
  [60, 'C'],
  [55, 'C-'],
  [45, 'D'],
  [0, 'F'],
];
