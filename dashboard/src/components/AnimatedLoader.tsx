import React from 'react';
import { Box, Typography } from '@mui/material';
import { motion } from 'framer-motion';

interface AnimatedLoaderProps {
  text?: string;
}

const AnimatedLoader: React.FC<AnimatedLoaderProps> = ({ text = 'جاري التحميل...' }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: 4,
      }}
    >
      <Box sx={{ position: 'relative', width: 120, height: 120 }}>
        {/* Outer rotating ring */}
        <motion.div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '4px solid transparent',
            borderTopColor: '#8B5CF6',
            borderRightColor: '#EC4899',
          }}
          animate={{ rotate: 360 }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'linear',
          }}
        />

        {/* Inner rotating ring */}
        <motion.div
          style={{
            position: 'absolute',
            inset: '20px',
            borderRadius: '50%',
            border: '4px solid transparent',
            borderBottomColor: '#A78BFA',
            borderLeftColor: '#F472B6',
          }}
          animate={{ rotate: -360 }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'linear',
          }}
        />

        {/* Center dot */}
        <motion.div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
            transform: 'translate(-50%, -50%)',
          }}
          animate={{
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </Box>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Typography
          variant="h6"
          sx={{
            background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 600,
          }}
        >
          {text}
        </Typography>
      </motion.div>
    </Box>
  );
};

export default AnimatedLoader;