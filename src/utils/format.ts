import { format as dateFnsFormat, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Formata um valor monetário para o formato brasileiro
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Formata uma data para o formato brasileiro
 */
export function formatDate(date: Date | string, formatString = 'dd/MM/yyyy'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return dateFnsFormat(dateObj, formatString, { locale: ptBR });
}

/**
 * Formata uma data para o formato brasileiro com horas
 */
export function formatDateTime(date: Date | string, formatString = 'dd/MM/yyyy HH:mm'): string {
  return formatDate(date, formatString);
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