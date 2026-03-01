import React, { useEffect } from 'react';
import { Box } from '@mui/material';

interface ViewportWrapperProps {
  children: React.ReactNode;
}

const ViewportWrapper: React.FC<ViewportWrapperProps> = ({ children }) => {
  useEffect(() => {
    // Force viewport recalculation on mount
    const checkViewport = () => {
      const viewportWidth = window.innerWidth;
      const documentWidth = document.documentElement.scrollWidth;
      
      if (documentWidth > viewportWidth) {
        console.warn(`Content overflow detected! Viewport: ${viewportWidth}px, Document: ${documentWidth}px`);
        
        // Find elements causing overflow
        const allElements = document.querySelectorAll('*');
        allElements.forEach((element) => {
          const rect = element.getBoundingClientRect();
          if (rect.right > viewportWidth || rect.left < 0) {
            console.warn('Overflowing element:', element, {
              left: rect.left,
              right: rect.right,
              width: rect.width,
            });
          }
        });
      }
    };

    // Check on mount and resize
    checkViewport();
    window.addEventListener('resize', checkViewport);

    return () => {
      window.removeEventListener('resize', checkViewport);
    };
  }, []);

  return (
    <Box
      sx={{
        width: '100%',
        height: '100vh',
        position: 'relative',
      }}
    >
      {children}
    </Box>
  );
};

export default ViewportWrapper;