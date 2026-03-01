// URL configuration for different environments
export const getBookingAppUrl = (): string => {
  // In production, use environment variable or default production URL
  if (import.meta.env.PROD) {
    return import.meta.env.VITE_BOOKING_APP_URL || 'https://booking.clientsplus.com';
  }
  
  // In development, use the same dashboard URL since booking is integrated
  return 'http://localhost:5173';
};

export const getDashboardUrl = (): string => {
  if (import.meta.env.PROD) {
    return import.meta.env.VITE_DASHBOARD_URL || 'https://app.clientsplus.com';
  }
  
  return 'http://localhost:5173';
};