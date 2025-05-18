/**
 * Helper function to get the current fiscal year (using next calendar year)
 * This ensures consistency across the application for fiscal year calculations
 */
export const getCurrentFiscalYear = (): number => {
  return new Date().getFullYear() + 1;
};

/**
 * Format a number as Philippine Peso
 * @param amount - The amount to format
 * @param options - Intl.NumberFormat options
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number | string | null | undefined, options?: Intl.NumberFormatOptions): string => {
  if (amount === null || amount === undefined || amount === '') return '₱0';
  
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numericAmount)) return '₱0';
  
  const defaultOptions: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    ...options
  };
  
  return new Intl.NumberFormat('en-PH', defaultOptions).format(numericAmount);
};

/**
 * Format date to a consistent format across the application
 * @param date - Date to format
 * @returns Formatted date string
 */
export const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return '-';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return dateObj.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}; 