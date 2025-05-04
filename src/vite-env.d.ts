/// <reference types="vite/client" />

declare module 'date-fns' {
  export function isToday(date: Date | number): boolean;
  export function isYesterday(date: Date | number): boolean;
  export function format(date: Date | number, format: string, options?: object): string;
}
