import React from 'react';
import { Box } from '@mui/material';
import { motion } from 'framer-motion';

const AnimatedBackground: React.FC = () => {
  // Check localStorage directly to avoid context dependency
  const savedMode = localStorage.getItem('darkMode');
  const isDarkMode = savedMode ? JSON.parse(savedMode) : false;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        zIndex: -1,
      }}
    >
      {/* Gradient Background */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: isDarkMode
            ? 'radial-gradient(ellipse at top right, rgba(139, 92, 246, 0.1) 0%, transparent 50%), radial-gradient(ellipse at bottom left, rgba(236, 72, 153, 0.1) 0%, transparent 50%)'
            : 'radial-gradient(ellipse at top right, rgba(139, 92, 246, 0.05) 0%, transparent 50%), radial-gradient(ellipse at bottom left, rgba(236, 72, 153, 0.05) 0%, transparent 50%)',
        }}
      />

      {/* Animated Gradient Orbs */}
      <motion.div
        style={{
          position: 'absolute',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: isDarkMode
            ? 'radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
        animate={{
          x: [0, 100, 0],
          y: [0, -100, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <motion.div
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: '800px',
          height: '800px',
          borderRadius: '50%',
          background: isDarkMode
            ? 'radial-gradient(circle, rgba(236, 72, 153, 0.2) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(236, 72, 153, 0.15) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
        animate={{
          x: [0, -150, 0],
          y: [0, 150, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Floating Particles */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          style={{
            position: 'absolute',
            width: '4px',
            height: '4px',
            borderRadius: '50%',
            background: isDarkMode
              ? 'rgba(167, 139, 250, 0.6)'
              : 'rgba(139, 92, 246, 0.4)',
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [-20, 20, -20],
            x: [-10, 10, -10],
            opacity: [0.3, 1, 0.3],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: Math.random() * 2,
          }}
        />
      ))}
    </Box>
  );
};

export default AnimatedBackground;