// Utilitário para validação e normalização de números de telefone para WhatsApp

export interface PhoneValidationResult {
  valid: boolean;
  normalized?: string;
  originalFormat?: string;
  errors?: string[];
  suggestions?: string[];
}

/**
 * Normaliza um número de telefone para o formato esperado pelo WhatsApp
 * @param phone - Número de telefone original
 * @returns Número normalizado ou erro
 */
export function normalizePhoneNumber(phone: string): PhoneValidationResult {
  const result: PhoneValidationResult = {
    valid: false,
    originalFormat: phone,
    errors: [],
    suggestions: []
  };

  if (!phone || typeof phone !== 'string') {
    result.errors!.push('Número de telefone é obrigatório');
    return result;
  }

  // Remove todos os caracteres não numéricos
  const cleaned = phone.replace(/[^\d]/g, '');
  
  if (cleaned.length === 0) {
    result.errors!.push('Número não contém dígitos válidos');
    return result;
  }

  // Validar comprimento mínimo
  if (cleaned.length < 10) {
    result.errors!.push(`Número muito curto: ${cleaned.length} dígitos (mínimo 10)`);
    result.suggestions!.push('Números brasileiros: 11 dígitos (DDD + celular)');
    return result;
  }

  // Validar comprimento máximo
  if (cleaned.length > 15) {
    result.errors!.push(`Número muito longo: ${cleaned.length} dígitos (máximo 15)`);
    return result;
  }

  let normalized = cleaned;

  // Lógica específica para números brasileiros
  if (isBrazilianNumber(cleaned)) {
    normalized = normalizeBrazilianNumber(cleaned);
  } else {
    // Para números internacionais, assumir que já estão com código do país
    normalized = cleaned;
  }

  // Validação final
  if (normalized.length < 10 || normalized.length > 15) {
    result.errors!.push(`Número normalizado inválido: ${normalized}`);
    return result;
  }

  result.valid = true;
  result.normalized = normalized;
  
  // Adicionar sugestões úteis
  if (phone !== normalized) {
    result.suggestions!.push(`Número foi normalizado de "${phone}" para "${normalized}"`);
  }

  return result;
}

/**
 * Verifica se um número limpo é brasileiro
 */
function isBrazilianNumber(cleaned: string): boolean {
  // Se já começa com 55, é brasileiro
  if (cleaned.startsWith('55')) {
    return true;
  }
  
  // Se tem 10 ou 11 dígitos sem código do país, assumir brasileiro
  if (cleaned.length === 10 || cleaned.length === 11) {
    return true;
  }
  
  return false;
}

/**
 * Normaliza número brasileiro
 */
function normalizeBrazilianNumber(cleaned: string): string {
  // Se já começa com 55
  if (cleaned.startsWith('55')) {
    // Verificar se tem comprimento correto após o 55
    const afterCountryCode = cleaned.substring(2);
    
    if (afterCountryCode.length === 10 || afterCountryCode.length === 11) {
      return cleaned; // Já está no formato correto
    }
    
    // Se tem mais dígitos após 55, pode ter sido digitado errado
    if (afterCountryCode.length > 11) {
      // Tentar pegar os últimos 11 dígitos após 55
      const last11 = afterCountryCode.substring(afterCountryCode.length - 11);
      return '55' + last11;
    }
  }
  
  // Se tem 11 dígitos (DDD + celular), adicionar 55
  if (cleaned.length === 11) {
    return '55' + cleaned;
  }
  
  // Se tem 10 dígitos (DDD + telefone fixo), adicionar 55
  if (cleaned.length === 10) {
    return '55' + cleaned;
  }
  
  // Para outros casos, retornar como está
  return cleaned;
}

/**
 * Gera formatos alternativos para teste
 */
export function generateAlternativeFormats(phone: string): string[] {
  const cleaned = phone.replace(/[^\d]/g, '');
  const formats: string[] = [];
  
  // Formato original limpo
  formats.push(cleaned);
  
  // Se é brasileiro
  if (isBrazilianNumber(cleaned)) {
    const normalized = normalizeBrazilianNumber(cleaned);
    
    // Adicionar formato com 55
    if (!formats.includes(normalized)) {
      formats.push(normalized);
    }
    
    // Adicionar formato sem 55 se aplicável
    if (normalized.startsWith('55')) {
      const without55 = normalized.substring(2);
      if (!formats.includes(without55)) {
        formats.push(without55);
      }
    }
  }
  
  // Remover duplicatas e ordenar por probabilidade de sucesso
  return [...new Set(formats)].sort((a, b) => {
    // Priorizar números com código do país
    if (a.startsWith('55') && !b.startsWith('55')) return -1;
    if (!a.startsWith('55') && b.startsWith('55')) return 1;
    
    // Priorizar números com 13 dígitos (55 + 11)
    if (a.length === 13 && b.length !== 13) return -1;
    if (a.length !== 13 && b.length === 13) return 1;
    
    return 0;
  });
}

/**
 * Formatar número para exibição amigável
 */
export function formatPhoneForDisplay(phone: string): string {
  const cleaned = phone.replace(/[^\d]/g, '');
  
  if (cleaned.startsWith('55') && cleaned.length === 13) {
    // Formato brasileiro: +55 (11) 99999-9999
    const countryCode = cleaned.substring(0, 2);
    const areaCode = cleaned.substring(2, 4);
    const firstPart = cleaned.substring(4, 9);
    const secondPart = cleaned.substring(9, 13);
    
    return `+${countryCode} (${areaCode}) ${firstPart}-${secondPart}`;
  }
  
  if (cleaned.length === 11) {
    // Formato brasileiro sem código do país: (11) 99999-9999
    const areaCode = cleaned.substring(0, 2);
    const firstPart = cleaned.substring(2, 7);
    const secondPart = cleaned.substring(7, 11);
    
    return `(${areaCode}) ${firstPart}-${secondPart}`;
  }
  
  // Para outros formatos, retornar com espaços a cada 4 dígitos
  return cleaned.replace(/(\d{4})(?=\d)/g, '$1 ');
}

/**
 * Validar se número pode receber WhatsApp (heurística básica)
 */
export function validateWhatsAppCompatibility(phone: string): {
  compatible: boolean;
  warnings: string[];
} {
  const result = {
    compatible: true,
    warnings: [] as string[]
  };
  
  const cleaned = phone.replace(/[^\d]/g, '');
  
  // Verificar se é número fixo brasileiro (não suporta WhatsApp)
  if (cleaned.startsWith('55') && cleaned.length === 12) {
    // Números fixos brasileiros: 55 + 2 dígitos DDD + 8 dígitos
    const afterCountryAndArea = cleaned.substring(4);
    if (afterCountryAndArea.length === 8 && !afterCountryAndArea.startsWith('9')) {
      result.warnings.push('Número parece ser fixo - WhatsApp só funciona em celulares');
      result.compatible = false;
    }
  }
  
  // Verificar números muito antigos ou inválidos
  if (cleaned.startsWith('55') && cleaned.length === 13) {
    const areaCode = cleaned.substring(2, 4);
    const cellNumber = cleaned.substring(4);
    
    // DDDs válidos no Brasil
    const validAreaCodes = [
      '11', '12', '13', '14', '15', '16', '17', '18', '19', // SP
      '21', '22', '24', // RJ
      '27', '28', // ES
      '31', '32', '33', '34', '35', '37', '38', // MG
      '41', '42', '43', '44', '45', '46', // PR
      '47', '48', '49', // SC
      '51', '53', '54', '55', // RS
      '61', // DF
      '62', '64', // GO
      '63', // TO
      '65', '66', // MT
      '67', // MS
      '68', // AC
      '69', // RO
      '71', '73', '74', '75', '77', // BA
      '79', // SE
      '81', '87', // PE
      '82', // AL
      '83', // PB
      '84', // RN
      '85', '88', // CE
      '86', '89', // PI
      '91', '93', '94', // PA
      '92', '97', // AM
      '95', // RR
      '96', // AP
      '98', '99' // MA
    ];
    
    if (!validAreaCodes.includes(areaCode)) {
      result.warnings.push(`DDD ${areaCode} pode não ser válido no Brasil`);
    }
    
    // Celulares brasileiros devem começar com 9
    if (!cellNumber.startsWith('9')) {
      result.warnings.push('Número brasileiro deve começar com 9 após o DDD');
      result.compatible = false;
    }
  }
  
  return result;
}