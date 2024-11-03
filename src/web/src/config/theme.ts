// @mui/material version ^5.0.0
import { createTheme, ThemeOptions, Theme } from '@mui/material';

/*
Human Tasks:
1. Ensure Roboto font is included in the project:
   - Add <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap"> 
     to the public/index.html file
2. Verify that the theme colors match the organization's brand guidelines
3. Test the theme configuration with dark mode if required in the future
*/

// Create custom theme with fleet tracking system specific design tokens
const createCustomTheme = (): Theme => {
  // Define theme configuration object
  const themeOptions: ThemeOptions = {
    // Requirement: Web Dashboard UI Framework - Material-UI component framework implementation
    palette: {
      primary: {
        main: '#1976d2',
        light: '#42a5f5',
        dark: '#1565c0',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#9c27b0',
        light: '#ba68c8',
        dark: '#7b1fa2',
        contrastText: '#ffffff',
      },
      error: {
        main: '#d32f2f',
        light: '#ef5350',
        dark: '#c62828',
      },
      warning: {
        main: '#ed6c02',
        light: '#ff9800',
        dark: '#e65100',
      },
      info: {
        main: '#0288d1',
        light: '#03a9f4',
        dark: '#01579b',
      },
      success: {
        main: '#2e7d32',
        light: '#4caf50',
        dark: '#1b5e20',
      },
      background: {
        default: '#ffffff',
        paper: '#f5f5f5',
      },
      text: {
        primary: 'rgba(0, 0, 0, 0.87)',
        secondary: 'rgba(0, 0, 0, 0.6)',
      },
    },

    // Requirement: Consistent design system for interactive dashboard components
    typography: {
      fontFamily: 'Roboto, Arial, sans-serif',
      fontSize: 14,
      fontWeightRegular: 400,
      fontWeightMedium: 500,
      fontWeightBold: 700,
      h1: {
        fontSize: '2.5rem',
        fontWeight: 500,
      },
      h2: {
        fontSize: '2rem',
        fontWeight: 500,
      },
      h3: {
        fontSize: '1.75rem',
        fontWeight: 500,
      },
      h4: {
        fontSize: '1.5rem',
        fontWeight: 500,
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

    // Requirement: Theme configuration for dashboard layout components
    spacing: 8,

    breakpoints: {
      values: {
        xs: 0,
        sm: 600,
        md: 960,
        lg: 1280,
        xl: 1920,
      },
    },

    // Requirement: Material-UI component framework with custom theme configuration
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 4,
            textTransform: 'none',
            fontWeight: 500,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            borderRadius: 4,
          },
        },
      },
    },
  };

  // Create and return the theme instance
  return createTheme(themeOptions);
};

// Export configured theme instance for global application styling
export const theme = createCustomTheme();