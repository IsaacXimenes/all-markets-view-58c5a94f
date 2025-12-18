// Máscara IMEI padrão: WW-XXXXXX-YYYYYY-Z
// Formato: 2 dígitos + 6 dígitos + 6 dígitos + 1 dígito = 15 dígitos total

export const formatIMEI = (value: string): string => {
  // Remove tudo que não for dígito
  const digits = value.replace(/\D/g, '');
  
  // Limita a 15 dígitos
  const limited = digits.slice(0, 15);
  
  // Aplica a máscara WW-XXXXXX-YYYYYY-Z
  let formatted = '';
  
  for (let i = 0; i < limited.length; i++) {
    if (i === 2 || i === 8 || i === 14) {
      formatted += '-';
    }
    formatted += limited[i];
  }
  
  return formatted;
};

export const unformatIMEI = (value: string): string => {
  return value.replace(/\D/g, '');
};

export const isValidIMEI = (value: string): boolean => {
  const digits = value.replace(/\D/g, '');
  return digits.length === 15;
};

// Para exibição, formatar IMEI existente que não tem máscara
export const displayIMEI = (imei: string): string => {
  if (!imei) return '-';
  const digits = imei.replace(/\D/g, '');
  if (digits.length !== 15) return imei; // Retorna original se não tiver 15 dígitos
  return formatIMEI(digits);
};

// Alias para aplicar máscara em inputs
export const applyIMEIMask = formatIMEI;
