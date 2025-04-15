import { format as dateFnsFormat, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Utilitários de formatação para valores de moeda e datas
 */

/**
 * Formata um valor para moeda brasileira (R$)
 * @param value - Valor a ser formatado
 * @returns String formatada no padrão de moeda brasileira
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

/**
 * Formata uma data de acordo com o padrão especificado
 * @param date - Objeto Date a ser formatado
 * @param pattern - Padrão de formatação (dd/MM/yyyy, yyyy-MM-dd, etc.)
 * @returns String com a data formatada
 */
export const formatDate = (date: Date, pattern: string = 'dd/MM/yyyy'): string => {
  if (!date || isNaN(date.getTime())) {
    return '';
  }

  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');

  return pattern
    .replace('dd', day)
    .replace('MM', month)
    .replace('yyyy', year.toString())
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
};

/**
 * Formata um número para incluir separadores de milhares
 * @param value - Valor a ser formatado
 * @param decimalPlaces - Número de casas decimais (padrão: 0)
 * @returns String formatada com separadores de milhares
 */
export const formatNumber = (value: number, decimalPlaces: number = 0): string => {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(value);
};

/**
 * Trunca um texto para o tamanho máximo especificado, adicionando reticências
 * @param text - Texto a ser truncado
 * @param maxLength - Tamanho máximo do texto
 * @returns Texto truncado com reticências se necessário
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) {
    return text || '';
  }
  
  return `${text.substring(0, maxLength)}...`;
};

/**
 * Formata uma data para o formato brasileiro
 */
export function formatDateFns(date: Date | string, formatString = 'dd/MM/yyyy'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return dateFnsFormat(dateObj, formatString, { locale: ptBR });
}

/**
 * Formata uma data para o formato brasileiro com horas
 */
export function formatDateTime(date: Date | string, formatString = 'dd/MM/yyyy HH:mm'): string {
  return formatDateFns(date, formatString);
}

/**
 * Formata um número de CPF/CNPJ
 */
export function formatCpfCnpj(value: string): string {
  const digits = value.replace(/\D/g, '');
  
  if (digits.length <= 11) {
    // CPF: 000.000.000-00
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  } else {
    // CNPJ: 00.000.000/0000-00
    return digits
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
}

/**
 * Formata um número de telefone
 */
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  
  if (digits.length <= 10) {
    // Telefone: (00) 0000-0000
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  } else {
    // Celular: (00) 00000-0000
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2');
  }
} 