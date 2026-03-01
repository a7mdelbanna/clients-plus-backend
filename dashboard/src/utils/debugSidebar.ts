// Debug utility for sidebar menu items
export function debugSidebar() {
  console.log('=== Sidebar Debug Info ===');
  
  // Check if Products route exists
  const productRoutes = [
    '/products',
    '/products/new',
    '/products/:productId/edit',
    '/products/categories'
  ];
  
  console.log('Product routes that should be available:', productRoutes);
  
  // Check current location
  console.log('Current location:', window.location.pathname);
  
  // Check localStorage for any cached data
  console.log('LocalStorage keys:', Object.keys(localStorage));
  
  // Suggest actions
  console.log('\n=== Troubleshooting Steps ===');
  console.log('1. Try hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)');
  console.log('2. Clear browser cache and cookies for this site');
  console.log('3. Navigate directly to: ' + window.location.origin + '/products');
  console.log('4. Check browser console for any errors');
  console.log('5. Try logging out and logging back in');
  
  // Try to navigate directly
  console.log('\n=== Direct Navigation ===');
  console.log('To navigate directly to products, run: window.location.href = "/products"');
  
  return 'Debug info printed to console';
}

// Make it available globally
if (typeof window !== 'undefined') {
  (window as any).debugSidebar = debugSidebar;
}