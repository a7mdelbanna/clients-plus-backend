import { createTheme, alpha, darken, lighten } from '@mui/material/styles';

export interface BusinessTheme {
  id: string;
  name: string;
  nameAr: string;
  primary: string;
  secondary: string;
  description: string;
  descriptionAr: string;
}

export const businessThemes: BusinessTheme[] = [
  {
    id: 'modern-purple',
    name: 'Modern Purple',
    nameAr: 'البنفسجي العصري',
    primary: '#8B5CF6',
    secondary: '#EC4899',
    description: 'A modern gradient theme with purple and pink tones',
    descriptionAr: 'تصميم عصري بتدرجات البنفسجي والوردي'
  },
  {
    id: 'ocean-blue',
    name: 'Ocean Blue',
    nameAr: 'أزرق المحيط',
    primary: '#3B82F6',
    secondary: '#06B6D4',
    description: 'Cool and professional blue gradients',
    descriptionAr: 'تدرجات زرقاء احترافية وهادئة'
  },
  {
    id: 'forest-green',
    name: 'Forest Green',
    nameAr: 'أخضر الغابة',
    primary: '#10B981',
    secondary: '#84CC16',
    description: 'Natural and calming green theme',
    descriptionAr: 'تصميم طبيعي ومريح باللون الأخضر'
  },
  {
    id: 'sunset-orange',
    name: 'Sunset Orange',
    nameAr: 'برتقالي الغروب',
    primary: '#F97316',
    secondary: '#F59E0B',
    description: 'Warm and energetic orange tones',
    descriptionAr: 'ألوان برتقالية دافئة ونشطة'
  },
  {
    id: 'royal-gold',
    name: 'Royal Gold',
    nameAr: 'الذهبي الملكي',
    primary: '#D97706',
    secondary: '#A78BFA',
    description: 'Luxury gold and purple combination',
    descriptionAr: 'مزيج فاخر من الذهبي والبنفسجي'
  },
  {
    id: 'minimal-gray',
    name: 'Minimal Gray',
    nameAr: 'الرمادي البسيط',
    primary: '#6B7280',
    secondary: '#9CA3AF',
    description: 'Clean and professional gray theme',
    descriptionAr: 'تصميم نظيف واحترافي باللون الرمادي'
  }
];

export const createBusinessTheme = (themeConfig: BusinessTheme, mode: 'light' | 'dark' = 'light') => {
  const isDark = mode === 'dark';
  
  return createTheme({
    direction: 'rtl',
    palette: {
      mode,
      primary: {
        main: themeConfig.primary,
        light: lighten(themeConfig.primary, 0.2),
        dark: darken(themeConfig.primary, 0.2),
      },
      secondary: {
        main: themeConfig.secondary,
        light: lighten(themeConfig.secondary, 0.2),
        dark: darken(themeConfig.secondary, 0.2),
      },
      background: {
        default: isDark ? '#0A0A0A' : '#F9FAFB',
        paper: isDark ? '#1A1A1A' : '#FFFFFF',
      },
      text: {
        primary: isDark ? '#FFFFFF' : '#1F2937',
        secondary: isDark ? '#D1D5DB' : '#6B7280',
      },
      divider: isDark ? alpha('#FFFFFF', 0.1) : alpha('#000000', 0.1),
    },
    typography: {
      fontFamily: 'Tajawal, Arial, sans-serif',
      h1: {
        fontSize: '3rem',
        fontWeight: 700,
      },
      h2: {
        fontSize: '2.5rem',
        fontWeight: 600,
      },
      h3: {
        fontSize: '2rem',
        fontWeight: 600,
      },
      h4: {
        fontSize: '1.5rem',
        fontWeight: 600,
      },
      h5: {
        fontSize: '1.25rem',
        fontWeight: 500,
      },
      h6: {
        fontSize: '1rem',
        fontWeight: 500,
      },
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 8,
            padding: '8px 16px',
            transition: 'all 0.3s ease',
          },
          contained: {
            background: `linear-gradient(45deg, ${themeConfig.primary} 30%, ${themeConfig.secondary} 90%)`,
            boxShadow: `0 3px 5px 2px ${alpha(themeConfig.primary, 0.3)}`,
            '&:hover': {
              boxShadow: `0 6px 10px 4px ${alpha(themeConfig.primary, 0.3)}`,
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            boxShadow: isDark 
              ? `0 4px 20px ${alpha('#000000', 0.5)}`
              : `0 4px 20px ${alpha('#000000', 0.1)}`,
            background: isDark 
              ? alpha('#FFFFFF', 0.05)
              : alpha('#FFFFFF', 0.9),
            backdropFilter: 'blur(10px)',
            border: `1px solid ${isDark ? alpha('#FFFFFF', 0.1) : alpha('#000000', 0.05)}`,
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: isDark 
                ? `0 8px 30px ${alpha('#000000', 0.6)}`
                : `0 8px 30px ${alpha('#000000', 0.15)}`,
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            background: isDark 
              ? alpha('#FFFFFF', 0.05)
              : alpha('#FFFFFF', 0.9),
            backdropFilter: 'blur(10px)',
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 8,
              '& fieldset': {
                borderColor: isDark ? alpha('#FFFFFF', 0.2) : alpha('#000000', 0.2),
              },
              '&:hover fieldset': {
                borderColor: themeConfig.primary,
              },
              '&.Mui-focused fieldset': {
                borderColor: themeConfig.primary,
                borderWidth: 2,
              },
            },
          },
        },
      },
    },
  });
};

// Export default theme (Modern Purple)
export const defaultTheme = businessThemes[0];