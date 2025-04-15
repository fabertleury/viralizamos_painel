import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Box, Spinner, Center } from '@chakra-ui/react';

// Carregamento dinâmico do ApexCharts para evitar problemas de SSR
const ReactApexChart = dynamic(() => import('react-apexcharts'), {
  ssr: false,
  loading: () => (
    <Center p={8}>
      <Spinner size="xl" color="brand.500" />
    </Center>
  ),
});

interface ChartProps {
  options: any;
  series: any[];
  type?: 'line' | 'area' | 'bar' | 'pie' | 'donut' | 'radialBar' | 'scatter' | 'bubble' | 'heatmap' | 'candlestick' | 'boxPlot' | 'radar' | 'polarArea' | 'rangeBar' | 'rangeArea' | 'treemap';
  height?: number | string;
  width?: number | string;
}

const Chart: React.FC<ChartProps> = ({ options, series, type = 'line', height = 350, width = '100%' }) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <Center p={8} height={height} width={width}>
        <Spinner size="xl" color="brand.500" />
      </Center>
    );
  }

  return (
    <Box width={width} height={height}>
      <ReactApexChart options={options} series={series} type={type} height={height} width={width} />
    </Box>
  );
};

export default Chart; 