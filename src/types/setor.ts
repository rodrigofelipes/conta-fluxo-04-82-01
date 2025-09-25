export type Setor = 'PESSOAL' | 'FISCAL' | 'CONTABIL' | 'PLANEJAMENTO' | 'TODOS' | 'CADASTRO' | 'COORDENACAO';

// Setores disponíveis para clientes (WhatsApp e formulários)
export const SETORES_CLIENTE = [
  { value: 'PLANEJAMENTO' as const, label: 'Coordenação' },
  { value: 'CONTABIL' as const, label: 'Contábil' },
  { value: 'FISCAL' as const, label: 'Fiscal' },
  { value: 'PESSOAL' as const, label: 'RH - Pessoal' },
  { value: 'CADASTRO' as const, label: 'Cadastro / Registro e Legalização' },
  { value: 'TODOS' as const, label: 'Todos os Setores' },
] as const;

// Setores disponíveis para admins (sistema interno)
export const SETORES_ADMIN = [
  { value: 'COORDENACAO' as const, label: 'Coordenação (Admin)' },
  { value: 'PLANEJAMENTO' as const, label: 'Planejamento' },
  { value: 'CADASTRO' as const, label: 'Cadastro / Registro e Legalização' },
  { value: 'CONTABIL' as const, label: 'Contábil' },
  { value: 'FISCAL' as const, label: 'Fiscal' },
  { value: 'PESSOAL' as const, label: 'RH - Pessoal' },
  { value: 'TODOS' as const, label: 'Todos os Setores' },
] as const;

// Para compatibilidade com código existente
export const SETORES_OPTIONS = SETORES_ADMIN;