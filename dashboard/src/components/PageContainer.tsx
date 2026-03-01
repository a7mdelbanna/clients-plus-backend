import React from 'react';
import { Box, Container } from '@mui/material';
import { useTheme } from '@mui/material/styles';

interface PageContainerProps {
  children: React.ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  noPadding?: boolean;
}

const PageContainer: React.FC<PageContainerProps> = ({ 
  children, 
  maxWidth = 'lg',
  noPadding = false 
}) => {
  const theme = useTheme();
  const isRTL = theme.direction === 'rtl';

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        p: { xs: 2, sm: 3 },
        boxSizing: 'border-box',
        overflow: 'auto',
      }}
    >
      {maxWidth === false ? (
        children
      ) : (
        <Container
          maxWidth={maxWidth}
          sx={{
            px: { xs: 0, sm: 2 },
            width: '100%',
            '& > *': {
              maxWidth: '100%',
              boxSizing: 'border-box',
            },
          }}
        >
          {children}
        </Container>
      )}
    </Box>
  );
};

export default PageContainer;