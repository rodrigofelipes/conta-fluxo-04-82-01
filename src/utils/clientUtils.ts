import { supabase } from "@/integrations/supabase/client";

// Função para buscar um cliente por ID no Supabase
export const findClientById = async (id: string) => {
  if (!id) return null;
  
  try {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Erro ao buscar cliente:', error);
      return null;
    }
    
    return {
      id: data.id,
      name: data.nome,
      email: data.email,
      phone: data.telefone,
      cnpj: data.cnpj,
      regime: data.regime_tributario,
      city: data.cidade,
      state: data.estado,
      setor: data.setor,
      dataAbertura: data.data_abertura,
      inscricaoEstadual: data.inscricao_estadual
    };
  } catch (error) {
    console.error('Erro inesperado ao buscar cliente:', error);
    return null;
  }
};