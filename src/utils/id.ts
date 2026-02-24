import { nanoid } from 'nanoid';

export const createId = (prefix?: string): string =>
  prefix ? `${prefix}-${nanoid(8)}` : nanoid(8);
