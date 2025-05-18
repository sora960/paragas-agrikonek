/// <reference types="vite/client" />

declare module 'date-fns' {
  export function isToday(date: Date | number): boolean;
  export function isYesterday(date: Date | number): boolean;
  export function format(date: Date | number, format: string, options?: object): string;
  export function isSameDay(dateLeft: Date | number, dateRight: Date | number): boolean;
  export function isSameMonth(dateLeft: Date | number, dateRight: Date | number): boolean;
  export function isAfter(dateLeft: Date | number, dateRight: Date | number): boolean;
  export function isBefore(dateLeft: Date | number, dateRight: Date | number): boolean;
  export function parseISO(dateString: string): Date;
  export function addDays(date: Date | number, amount: number): Date;
  export function startOfDay(date: Date | number): Date;
  export function differenceInDays(dateLeft: Date | number, dateRight: Date | number): number;
  export function isPast(date: Date | number): boolean;
}
