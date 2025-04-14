import { extendTheme } from '@chakra-ui/react';

const colors = {
  brand: {
    50: '#E6F5FF',
    100: '#CCE5FF',
    200: '#99C8FF',
    300: '#66ABFF',
    400: '#338DFF',
    500: '#0070FF', // Principal
    600: '#0057CC',
    700: '#003F99',
    800: '#002866',
    900: '#001433',
  },
  secondary: {
    50: '#F5F5FF',
    100: '#EBEBFF',
    200: '#D6D6FF',
    300: '#C2C2FF',
    400: '#ADADFF',
    500: '#9999FF', // Secundária
    600: '#7A7ACC',
    700: '#5B5B99',
    800: '#3D3D66',
    900: '#1E1E33',
  },
};

const fonts = {
  heading: 'Inter, sans-serif',
  body: 'Inter, sans-serif',
};

const theme = extendTheme({
  colors,
  fonts,
  styles: {
    global: {
      body: {
        bg: 'gray.50',
        color: 'gray.800',
      },
    },
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: 'bold',
        borderRadius: 'md',
      },
      variants: {
        solid: {
          bg: 'brand.500',
          color: 'white',
          _hover: {
            bg: 'brand.600',
          },
        },
        outline: {
          borderColor: 'brand.500',
          color: 'brand.500',
          _hover: {
            bg: 'brand.50',
          },
        },
      },
      defaultProps: {
        variant: 'solid',
      },
    },
  },
});

export default theme; 