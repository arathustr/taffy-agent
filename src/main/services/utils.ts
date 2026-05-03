import { nanoid } from 'nanoid';

export function createId(prefix: string): string {
  return `${prefix}_${nanoid(10)}`;
}

export function truncate(text: string, max = 12000): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n...[truncated ${text.length - max} chars]`;
}

export function redact(value: string): string {
  if (!value) return value;
  if (value.length <= 8) return '********';
  return `${value.slice(0, 3)}***${value.slice(-4)}`;
}

