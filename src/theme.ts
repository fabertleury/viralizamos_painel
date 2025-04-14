import { extendTheme } from '@chakra-ui/react';

// Configuração para preferência de cor (light/dark mode)
const config = {
  initialColorMode: 'light',
  useSystemColorMode: false,
};

// Cores personalizadas
const colors = {
  brand: {
    50: '#e6f0fa',
    100: '#c6dcf2',
    200: '#a3c8e9',
    300: '#7fb3e0',
    400: '#5c9fd7',
    500: '#3182ce', // Azul padrão
    600: '#2b6cb0', // Um tom mais escuro para hover
    700: '#1e4e8c',
    800: '#173b69',
    900: '#0f2746',
  },
};

// Estilos de componentes personalizados
const components = {
  Button: {
    baseStyle: {
      fontWeight: 'semibold',
      borderRadius: 'md',
    },
    variants: {
      primary: {
        bg: 'brand.500',
        color: 'white',
        _hover: {
          bg: 'brand.600',
        },
      },
    },
  },
};

// Estender o tema padrão
const theme = extendTheme({
  config,
  colors,
  components,
  fonts: {
    heading: 'Inter, system-ui, sans-serif',
    body: 'Inter, system-ui, sans-serif',
  },
});

export default theme; 