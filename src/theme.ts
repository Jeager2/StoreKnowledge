import { extendTheme, ThemeConfig } from '@chakra-ui/react';

// Color mode config
const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
};

// Custom colors
const colors = {
  brand: {
    50: '#e6f7ff',
    100: '#b3e0ff',
    200: '#80caff',
    300: '#4db3ff',
    400: '#1a9dff',
    500: '#0087e6',
    600: '#006bb4',
    700: '#004e82',
    800: '#003251',
    900: '#001a2b',
  },
};

// Component style overrides
const components = {
  Card: {
    baseStyle: {
      container: {
        borderRadius: 'lg',
      },
    },
  },
  Button: {
    baseStyle: {
      borderRadius: 'md',
      fontWeight: 'medium',
    },
  },
  Modal: {
    baseStyle: {
      dialog: {
        borderRadius: 'lg',
      },
    },
  },
  Drawer: {
    baseStyle: {
      dialog: {
        bg: 'bg-surface',
      },
    },
  },
};

// Fonts
const fonts = {
  heading: "Inter, system-ui, sans-serif",
  body: "Inter, system-ui, sans-serif",
};

// Global styles
const styles = {
  global: (props: { colorMode: string }) => ({
    body: {
      bg: props.colorMode === 'dark' ? 'gray.800' : 'gray.50',
      color: props.colorMode === 'dark' ? 'white' : 'gray.800',
    },
  }),
};

// Create and export the theme
const theme = extendTheme({
  config,
  colors,
  components,
  fonts,
  styles,
});

export default theme;