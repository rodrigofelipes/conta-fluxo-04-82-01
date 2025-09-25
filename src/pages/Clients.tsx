import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Search, Edit } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/state/auth";
import { ImportExcel } from "@/components/ImportExcel";
import { SearchInput } from "@/components/SearchInput";
import { AdminSelect } from "@/components/AdminSelect";
import { ClientAdminAssignments } from "@/components/ClientAdminAssignments";
import { MultipleAdminSelect } from "@/components/MultipleAdminSelect";
import { ClientPhoneManager } from "@/components/ClientPhoneManager";
import { EditClientDialog } from "@/components/EditClientDialog";
import { useClientPhones } from "@/hooks/useClientPhones";
import type { Setor } from "@/state/auth";

// Função para formatar CNPJ
const formatCNPJ = (value: string) => {
  // Remove tudo que não é número
  const cleaned = value.replace(/\D/g, '');
  
  // Aplica a máscara XX.XXX.XXX/XXXX-XX
  if (cleaned.length <= 2) {
    return cleaned;
  } else if (cleaned.length <= 5) {
    return `${cleaned.slice(0, 2)}.${cleaned.slice(2)}`;
  } else if (cleaned.length <= 8) {
    return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5)}`;
  } else if (cleaned.length <= 12) {
    return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8)}`;
  } else {
    return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8, 12)}-${cleaned.slice(12, 14)}`;
  }
};

// Função para formatar Telefone
const formatTelefone = (value: string) => {
  // Remove tudo que não é número
  const cleaned = value.replace(/\D/g, '');
  
  // Aplica a máscara (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
  if (cleaned.length <= 2) {
    return cleaned;
  } else if (cleaned.length <= 6) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
  } else if (cleaned.length <= 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  } else {
    // Para celular com 9 dígitos
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
  }
};

// Função para formatar Data
const formatDate = (value: string) => {
  // Remove tudo que não é número
  const cleaned = value.replace(/\D/g, '');
  
  // Aplica a máscara DD/MM/AAAA
  if (cleaned.length <= 2) {
    return cleaned;
  } else if (cleaned.length <= 4) {
    return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
  } else {
    return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
  }
};

// Função para converter DD/MM/AAAA para AAAA-MM-DD
const convertToISODate = (dateStr: string) => {
  if (!dateStr || dateStr.length !== 10) return '';
  const [day, month, year] = dateStr.split('/');
  if (!day || !month || !year || year.length !== 4) return '';
  
  // Validar componentes da data
  const dayNum = parseInt(day, 10);
  const monthNum = parseInt(month, 10);
  const yearNum = parseInt(year, 10);
  
  // Validações básicas
  if (dayNum < 1 || dayNum > 31) return '';
  if (monthNum < 1 || monthNum > 12) return '';
  if (yearNum < 1900 || yearNum > 2100) return '';
  
  // Validar se a data existe (usando Date object)
  const testDate = new Date(yearNum, monthNum - 1, dayNum);
  if (testDate.getFullYear() !== yearNum || 
      testDate.getMonth() !== monthNum - 1 || 
      testDate.getDate() !== dayNum) {
    return '';
  }
  
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

// Função para converter AAAA-MM-DD para DD/MM/AAAA
const convertFromISODate = (isoDate: string) => {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-');
  if (!year || !month || !day) return '';
  return `${day}/${month}/${year}`;
};

// Função para formatar Inscrição Estadual
const formatInscricaoEstadual = (value: string) => {
  const upperValue = value.toUpperCase();
  
  // Se for "ISENTO" completo, mantém como está
  if (upperValue === 'ISENTO') {
    return 'ISENTO';
  }
  
  // Permite digitação progressiva de "ISENTO"
  const isentoPrefix = 'ISENTO';
  if (isentoPrefix.startsWith(upperValue) && upperValue.length > 0) {
    return upperValue;
  }
  
  // Remove tudo que não é número
  const cleaned = value.replace(/\D/g, '');
  
  // Retorna os números sem formatação rígida, permitindo qualquer quantidade
  return cleaned;
};

const clientFormSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string()
    .optional()
    .refine((val) => !val || val === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
      message: "Email inválido"
    }),
  telefone: z.string().optional(),
  cnpj: z.string().min(14, "CNPJ deve ter pelo menos 14 caracteres"),
  regime_tributario: z.string().min(1, "Selecione um regime tributário"),
  cidade: z.string().min(2, "Cidade deve ter pelo menos 2 caracteres"),
  estado: z.string().min(2, "Estado deve ter pelo menos 2 caracteres"),
  setor: z.enum(["PESSOAL", "FISCAL", "CONTABIL", "PLANEJAMENTO", "TODOS"], {
    required_error: "Selecione um setor",
  }),
  admins_responsaveis: z.array(z.string()).min(1, "Selecione pelo menos um admin responsável"),
  data_abertura: z.string().optional(),
  inscricao_estadual: z.string()
    .optional()
    .refine((val) => !val || val === "ISENTO" || /^\d+$/.test(val.replace(/\D/g, '')), {
      message: "Digite apenas números ou ISENTO"
    }),
  usuario: z.string().min(3, "Usuário deve ter pelo menos 3 caracteres"),
  senha: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

const editClientFormSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string()
    .optional()
    .refine((val) => !val || val === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
      message: "Email inválido"
    }),
  telefone: z.string().optional(),
  cnpj: z.string().min(14, "CNPJ deve ter pelo menos 14 caracteres"),
  regime_tributario: z.string().min(1, "Selecione um regime tributário"),
  cidade: z.string().min(2, "Cidade deve ter pelo menos 2 caracteres"),
  estado: z.string().min(2, "Estado deve ter pelo menos 2 caracteres"),
  setor: z.enum(["PESSOAL", "FISCAL", "CONTABIL", "PLANEJAMENTO"], {
    required_error: "Selecione um setor",
  }),
  data_abertura: z.string().optional(),
  inscricao_estadual: z.string()
    .optional()
    .refine((val) => !val || val === "ISENTO" || /^\d+$/.test(val.replace(/\D/g, '')), {
      message: "Digite apenas números ou ISENTO"
    }),
  admin_responsavel: z.string().optional(),
});

const regimesTributarios = [
  { value: "SIMPLES NACIONAL", label: "Simples Nacional" },
  { value: "Lucro Presumido", label: "Lucro Presumido" },
  { value: "Lucro Real", label: "Lucro Real" },
  { value: "MEI", label: "Microempreendedor Individual (MEI)" },
];

const estados = [
  { value: "AC", label: "Acre" },
  { value: "AL", label: "Alagoas" },
  { value: "AP", label: "Amapá" },
  { value: "AM", label: "Amazonas" },
  { value: "BA", label: "Bahia" },
  { value: "CE", label: "Ceará" },
  { value: "DF", label: "Distrito Federal" },
  { value: "ES", label: "Espírito Santo" },
  { value: "GO", label: "Goiás" },
  { value: "MA", label: "Maranhão" },
  { value: "MT", label: "Mato Grosso" },
  { value: "MS", label: "Mato Grosso do Sul" },
  { value: "MG", label: "Minas Gerais" },
  { value: "PA", label: "Pará" },
  { value: "PB", label: "Paraíba" },
  { value: "PR", label: "Paraná" },
  { value: "PE", label: "Pernambuco" },
  { value: "PI", label: "Piauí" },
  { value: "RJ", label: "Rio de Janeiro" },
  { value: "RN", label: "Rio Grande do Norte" },
  { value: "RS", label: "Rio Grande do Sul" },
  { value: "RO", label: "Rondônia" },
  { value: "RR", label: "Roraima" },
  { value: "SC", label: "Santa Catarina" },
  { value: "SP", label: "São Paulo" },
  { value: "SE", label: "Sergipe" },
  { value: "TO", label: "Tocantins" },
];

const setores = [
  { value: "PESSOAL", label: "Pessoal" },
  { value: "FISCAL", label: "Fiscal" },
  { value: "CONTABIL", label: "Contábil" },
  { value: "PLANEJAMENTO", label: "Planejamento" },
  { value: "TODOS", label: "Todos" },
];

interface Cliente {
  id: string;
  nome: string;
  email?: string;
  telefone?: string;
  cnpj?: string;
  regime_tributario?: string;
  cidade?: string;
  estado?: string;
  setor: Setor;
  admin_responsavel?: string;
  created_at: string;
  updated_at: string;
  data_abertura?: string;
  inscricao_estadual?: string;
}

export default function Clients() {
  const { user, refreshUser } = useAuth();
  const [query, setQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Cliente | null>(null);
  const [clients, setClients] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("todos");
  
  const form = useForm<z.infer<typeof clientFormSchema>>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      nome: "",
      email: "",
      telefone: "",
      cnpj: "",
      regime_tributario: "",
      cidade: "",
      estado: "",
      setor: "CONTABIL",
      admins_responsaveis: [],
      data_abertura: "",
      inscricao_estadual: "",
      usuario: "",
      senha: "",
    },
  });

  const editForm = useForm<z.infer<typeof editClientFormSchema>>({
    resolver: zodResolver(editClientFormSchema),
    defaultValues: {
      nome: "",
      email: "",
      telefone: "",
      cnpj: "",
      regime_tributario: "",
      cidade: "",
      estado: "",
      setor: "CONTABIL",
      data_abertura: "",
      inscricao_estadual: "",
      admin_responsavel: "",
    },
  });

  // Determinar setores disponíveis para seleção
  const getAvailableSetores = () => {
    const userSetor = (user?.setor as string) || '';
    const hasFullAccess = !!user?.isMasterAdmin || userSetor === 'TODOS' || userSetor === 'COORDENACAO';
    if (hasFullAccess) {
      // Master admin, setor "TODOS" ou "COORDENACAO" pode criar em qualquer setor
      return setores;
    } else if (userSetor) {
      // Usuário de setor específico só pode criar no próprio setor
      return setores.filter(s => s.value === userSetor);
    }
    return [];
  };

  // Determinar tabs de setor disponíveis para visualização
  const getAvailableTabs = () => {
    const userSetor = (user?.setor as string) || '';
    const hasFullAccess = !!user?.isMasterAdmin || userSetor === 'TODOS' || userSetor === 'COORDENACAO';
    if (hasFullAccess) {
      // Master admin, setor "TODOS" ou "COORDENACAO" pode ver todas as tabs
      return [
        { value: "todos", label: "Todos" },
        ...setores.filter(s => s.value !== 'TODOS').map(s => ({ value: s.value, label: s.label }))
      ];
    } else if (userSetor) {
      // Admin de setor específico só vê seu setor
      const userSetorItem = setores.find(s => s.value === userSetor);
      return userSetorItem ? [{ value: userSetorItem.value, label: userSetorItem.label }] : [];
    }
    return [];
  };

  // Função para buscar clientes do Supabase
  const fetchClients = async (force = false) => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Força uma nova consulta sem cache
      let query = supabase
        .from('clientes')
        .select('*');
      
      // Adicionar timestamp para evitar cache se forçado
      if (force) {
        query = query.order('updated_at', { ascending: false }).limit(1000);
      }
      
      // Se não tem acesso total, filtrar por setor específico
      const userSetor = (user.setor as string) || '';
      const hasFullAccess = !!user.isMasterAdmin || userSetor === 'TODOS' || userSetor === 'COORDENACAO';
      if (!hasFullAccess && userSetor) {
        query = query.eq('setor', userSetor as any);
      }
      
      const { data, error } = await query.order('nome');
      
      if (error) {
        console.error('Erro ao buscar clientes:', error);
        toast({
          title: "Erro",
          description: "Erro ao carregar clientes.",
          variant: "destructive",
        });
        return;
      }
      
      console.log('📊 Clientes carregados:', data?.length || 0);
      setClients((data || []) as any); // Type assertion para suporte aos novos setores
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao carregar clientes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Buscar clientes quando o componente montar ou o usuário mudar
  useEffect(() => {
    if (user) {
      fetchClients();
      // Definir tab inicial baseado no usuário
      const availableTabs = getAvailableTabs();
      if (availableTabs.length > 0) {
        setActiveTab(availableTabs[0].value);
      }
    }
  }, [user]);

  // Real-time subscription para clientes
  useEffect(() => {
    if (!user) return;

    console.log('📡 [Clients] Configurando realtime subscription para clientes...');
    
    const channel = supabase
      .channel('clients-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clientes'
        },
        (payload) => {
          console.log('🔄 [Clients] Mudança realtime detectada em clientes:', payload);
          // Forçar refresh após mudanças
          setTimeout(() => {
            fetchClients(true);
          }, 100);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cliente_telefones'
        },
        (payload) => {
          console.log('🔄 [Clients] Mudança realtime detectada em telefones:', payload);
          // Forçar refresh após mudanças em telefones
          setTimeout(() => {
            fetchClients(true);
          }, 100);
        }
      )
      .subscribe();

    console.log('✅ [Clients] Realtime subscription criada');

    return () => {
      console.log('🧹 [Clients] Limpando realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [user]);

  const onSubmit = async (values: z.infer<typeof clientFormSchema>) => {
    console.log('🚀 [CLIENTE_DEBUG] Iniciando criação de cliente...');
    console.log('🚀 [CLIENTE_DEBUG] Dados do formulário:', values);
    console.log('🚀 [CLIENTE_DEBUG] Usuário atual:', user);
    
    if (!user) {
      console.error('❌ [CLIENTE_DEBUG] Usuário não autenticado!');
      toast({
        title: "Erro",
        description: "Usuário não autenticado.",
        variant: "destructive",
      });
      return;
    }

    if (submitting) {
      console.warn('⚠️ [CLIENTE_DEBUG] Tentativa de duplo submit bloqueada');
      return; // Previne double submit
    }

    try {
      setSubmitting(true);
      console.log('🔄 [CLIENTE_DEBUG] Estado de submitting definido como true');
      
      // Preparar dados para criação do usuário
      const userEmail = values.email || `${values.usuario}@${values.nome.toLowerCase().replace(/\s+/g, '')}.com`;
      const userData = {
        email: userEmail,
        password: values.senha,
        username: values.usuario,
        fullName: values.nome,
        telefone: values.telefone,
        role: 'user'
      };
      
      console.log('📧 [CLIENTE_DEBUG] Dados do usuário para criação:', userData);
      
      // Primeiro, criar o usuário de autenticação usando edge function
      console.log('🔧 [CLIENTE_DEBUG] Chamando edge function create-user-admin...');
      const { data: authData, error: authError } = await supabase.functions.invoke('create-user-admin', {
        body: userData
      });

      console.log('📥 [CLIENTE_DEBUG] Resposta da edge function:', { authData, authError });

      if (authError) {
        console.error('❌ [CLIENTE_DEBUG] Erro na edge function:', authError);
        toast({
          title: "Erro",
          description: `Erro ao criar usuário: ${authError.message || authError}`,
          variant: "destructive",
        });
        return;
      }

      if (authData?.error && !authData?.userExists) {
        console.error('❌ [CLIENTE_DEBUG] Erro retornado pela edge function:', authData.error);
        toast({
          title: "Erro",
          description: `Erro ao criar usuário de acesso: ${authData.error}`,
          variant: "destructive",
        });
        return;
      }

      // Log success message if user already existed
      if (authData?.userExists) {
        console.log('✅ [CLIENTE_DEBUG] Usuário já existe, continuando com criação do cliente');
      } else {
        console.log('✅ [CLIENTE_DEBUG] Usuário criado com sucesso');
      }

      // Converter data de abertura para formato ISO se não estiver vazia
      let dataAberturaISO = null;
      if (values.data_abertura && values.data_abertura.trim() !== '') {
        console.log('📅 [CLIENTE_DEBUG] Processando data de abertura:', values.data_abertura);
        // Se já está no formato ISO, usar como está
        if (values.data_abertura.match(/^\d{4}-\d{2}-\d{2}$/)) {
          dataAberturaISO = values.data_abertura;
          console.log('📅 [CLIENTE_DEBUG] Data já em formato ISO:', dataAberturaISO);
        } else {
          // Tentar converter do formato DD/MM/AAAA
          const convertedDate = convertToISODate(values.data_abertura);
          if (convertedDate) {
            dataAberturaISO = convertedDate;
            console.log('📅 [CLIENTE_DEBUG] Data convertida para ISO:', dataAberturaISO);
          } else {
            console.warn('⚠️ [CLIENTE_DEBUG] Data de abertura em formato inválido:', values.data_abertura);
            dataAberturaISO = null;
          }
        }
      } else {
        console.log('📅 [CLIENTE_DEBUG] Nenhuma data de abertura fornecida');
      }

      // Aguardar um pouco para garantir sincronização
      console.log('⏳ [CLIENTE_DEBUG] Aguardando 500ms para sincronização...');
      await new Promise(resolve => setTimeout(resolve, 500));

      // Preparar dados do cliente
      const clientData = {
        nome: values.nome,
        email: values.email || null,
        telefone: values.telefone || null,
        cnpj: values.cnpj,
        regime_tributario: values.regime_tributario,
        cidade: values.cidade,
        estado: values.estado,
        setor: values.setor,
        admin_responsavel: values.admins_responsaveis[0] || user.id, // Usar o primeiro admin da lista ou o criador
        data_abertura: dataAberturaISO,
        inscricao_estadual: values.inscricao_estadual || null,
        razao_social: values.nome, // Usar nome como razão social se não especificado
        endereco: null,
        cep: null,
        situacao: 'ATIVO'
      };

      console.log('📋 [CLIENTE_DEBUG] Dados do cliente para criação:', clientData);

      // Obter user_id correto
      const userId = authData?.user?.id || authData?.user?.user?.id || authData?.userId;
      console.log('👤 [CLIENTE_DEBUG] User ID extraído:', userId);
      console.log('👤 [CLIENTE_DEBUG] Estrutura completa authData:', JSON.stringify(authData, null, 2));

      // Usar função RPC para criar cliente
      console.log('🔧 [CLIENTE_DEBUG] Chamando RPC create_client_after_user...');
      const { data, error } = await supabase.rpc('create_client_after_user', {
        client_data: clientData,
        user_id_param: userId
      });

      console.log('📥 [CLIENTE_DEBUG] Resposta do RPC:', { data, error });

      if (error) {
        console.error('❌ [CLIENTE_DEBUG] Erro ao criar cliente via RPC:', error);
        toast({
          title: "Erro",
          description: `Erro ao criar cliente: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      console.log('✅ [CLIENTE_DEBUG] Cliente criado com sucesso!');
      
      // Extrair o ID do cliente criado
      const new_client_id = data;
      
      // Criar atribuições de admin por setor para cada admin selecionado
      if (values.admins_responsaveis.length > 0 && new_client_id) {
        console.log('👥 [CLIENTE_DEBUG] Criando atribuições de admin por setor...');
        
        for (const adminId of values.admins_responsaveis) {
          try {
            const { error: assignmentError } = await supabase
              .from('cliente_admin_setores')
              .insert({
                cliente_id: new_client_id,
                setor: values.setor,
                admin_id: adminId
              });
              
            if (assignmentError) {
              console.warn('⚠️ [CLIENTE_DEBUG] Erro ao criar atribuição para admin:', adminId, assignmentError);
            } else {
              console.log('✅ [CLIENTE_DEBUG] Atribuição criada para admin:', adminId);
            }
          } catch (err) {
            console.warn('⚠️ [CLIENTE_DEBUG] Erro inesperado ao criar atribuição:', err);
          }
        }
      }
      
      toast({
        title: "Cliente criado com sucesso!",
        description: `${values.nome} foi adicionado no setor ${values.setor} com acesso ao sistema.`,
      });
      
      form.reset();
      setIsDialogOpen(false);
      
      console.log('🔄 [CLIENTE_DEBUG] Recarregando lista de clientes...');
      await fetchClients(); // Recarregar lista
      console.log('✅ [CLIENTE_DEBUG] Processo de criação do cliente finalizado com sucesso!');
      
    } catch (error) {
      console.error('💥 [CLIENTE_DEBUG] Erro inesperado no processo:', error);
      console.error('💥 [CLIENTE_DEBUG] Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
      toast({
        title: "Erro",
        description: "Erro inesperado ao criar cliente.",
        variant: "destructive",
      });
    } finally {
      console.log('🏁 [CLIENTE_DEBUG] Finalizando processo (setSubmitting false)');
      setSubmitting(false);
    }
  };

  const onEditSubmit = async (values: z.infer<typeof editClientFormSchema>) => {
    if (!editingClient || submitting) return;

    try {
      setSubmitting(true);
      
      // Converter data de abertura para formato ISO se não estiver vazia
      let dataAberturaISO = null;
      if (values.data_abertura && values.data_abertura.trim() !== '') {
        if (values.data_abertura.match(/^\d{4}-\d{2}-\d{2}$/)) {
          dataAberturaISO = values.data_abertura;
        } else {
          const convertedDate = convertToISODate(values.data_abertura);
          if (convertedDate) {
            dataAberturaISO = convertedDate;
          } else {
            dataAberturaISO = null;
          }
        }
      }

      const updateData = {
        nome: values.nome,
        email: values.email || null,
        telefone: values.telefone || null,
        cnpj: values.cnpj,
        regime_tributario: values.regime_tributario,
        cidade: values.cidade,
        estado: values.estado,
        setor: values.setor,
        data_abertura: dataAberturaISO,
        inscricao_estadual: values.inscricao_estadual || null,
        admin_responsavel: values.admin_responsavel || null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('clientes')
        .update(updateData)
        .eq('id', editingClient.id);

      if (error) {
        console.error('Erro ao atualizar cliente:', error);
        toast({
          title: "Erro",
          description: `Erro ao atualizar cliente: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      // Atualizar cliente no estado local imediatamente
      setClients(prevClients => 
        prevClients.map(client => 
          client.id === editingClient.id 
            ? { ...client, ...updateData, id: client.id, created_at: client.created_at }
            : client
        )
      );

      toast({
        title: "Cliente atualizado!",
        description: `${values.nome} foi atualizado com sucesso.`,
      });
      
      editForm.reset();
      setIsEditDialogOpen(false);
      setEditingClient(null);
      
      // Forçar refresh dos dados para garantir sincronização
      setTimeout(() => {
        fetchClients(true);
      }, 100);
      
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao atualizar cliente.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = (client: Cliente) => {
    setEditingClient(client);
    setIsEditDialogOpen(true);
  };
  
  // Estados para seleção de clientes para exclusão
  const [selectedClientsForDeletion, setSelectedClientsForDeletion] = useState<string[]>([]);
  const [showClientSelectionDialog, setShowClientSelectionDialog] = useState(false);
  const [clearClientsSearchQuery, setClearClientsSearchQuery] = useState("");
  
  // Função para limpar clientes selecionados
  const clearSelectedClients = async () => {
    if (!user || selectedClientsForDeletion.length === 0) return;

    try {
      const { error } = await supabase
        .from('clientes')
        .delete()
        .in('id', selectedClientsForDeletion);

      if (error) {
        console.error('Erro ao limpar clientes selecionados:', error);
        toast({
          title: "Erro",
          description: "Erro ao remover clientes selecionados.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Clientes removidos",
        description: `${selectedClientsForDeletion.length} cliente(s) removido(s) com sucesso.`,
      });
      
      setSelectedClientsForDeletion([]);
      setShowClientSelectionDialog(false);
      await fetchClients(); // Recarregar lista
    } catch (error) {
      console.error('Erro ao limpar clientes selecionados:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao remover clientes.",
        variant: "destructive",
      });
    }
  };
  
  useEffect(() => {
    document.title = "Clientes | Lista em ordem alfabética";
    const desc = "Lista de clientes com busca e ordenação alfabética.";
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = desc;
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = `${window.location.origin}/clients`;
  }, []);

  // Otimizar filtro de clientes com useMemo para evitar re-renders desnecessários
  const getFilteredClients = useCallback((setor?: string) => {
    let filteredClients = clients;
    
    // Filtrar por setor se especificado e não for "todos"
    if (setor && setor !== "todos") {
      filteredClients = clients.filter(c => c.setor === setor);
    }
    
    // Filtrar por busca se houver query
    if (query) {
      filteredClients = filteredClients.filter((c) => 
        c.nome.toLowerCase().includes(query.toLowerCase()) || 
        (c.email && c.email.toLowerCase().includes(query.toLowerCase())) ||
        (c.cnpj && c.cnpj.includes(query))
      );
    }
    
    return filteredClients;
  }, [clients, query]);

  const getFilteredClientsForClearing = useCallback(() => {
    let filteredClients = getFilteredClients(activeTab);
    
    // Filtrar por busca específica do dialog de limpeza
    if (clearClientsSearchQuery) {
      filteredClients = filteredClients.filter((c) => 
        c.nome.toLowerCase().includes(clearClientsSearchQuery.toLowerCase()) || 
        (c.email && c.email.toLowerCase().includes(clearClientsSearchQuery.toLowerCase())) ||
        (c.cnpj && c.cnpj.includes(clearClientsSearchQuery))
      );
    }
    
    return filteredClients;
  }, [getFilteredClients, activeTab, clearClientsSearchQuery]);

  // Handler otimizado para mudança de query
  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
  }, []);

  const handleClearQueryChange = useCallback((value: string) => {
    setClearClientsSearchQuery(value);
  }, []);

  const ClientPhoneDisplay = ({ clientId }: { clientId: string }) => {
    const { phones, getPrimaryPhone } = useClientPhones(clientId);
    const primaryPhone = getPrimaryPhone();
    
    if (!primaryPhone && phones.length === 0) {
      return null;
    }
    
    const formatPhoneNumber = (phone: string) => {
      const cleaned = phone.replace(/\D/g, '');
      if (cleaned.length === 11) {
        return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
      }
      if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
      }
      return phone;
    };
    
    if (primaryPhone) {
      return (
        <p>
          <span className="text-muted-foreground">Telefone:</span> {formatPhoneNumber(primaryPhone.telefone)}
          {phones.length > 1 && <span className="text-xs text-muted-foreground ml-1">+{phones.length - 1}</span>}
        </p>
      );
    }
    
    return null;
  };

  const ClientGrid = ({ clients }: { clients: Cliente[] }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {clients.map((c) => (
        <Card key={c.id} className="card-elevated hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-base">{c.nome}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            {c.cnpj && <p><span className="text-muted-foreground">CNPJ:</span> {c.cnpj}</p>}
            {c.inscricao_estadual && <p><span className="text-muted-foreground">Inscrição Estadual:</span> {c.inscricao_estadual}</p>}
            {c.data_abertura && <p><span className="text-muted-foreground">Data de Abertura:</span> {new Date(c.data_abertura).toLocaleDateString('pt-BR')}</p>}
            {c.email && <p><span className="text-muted-foreground">Email:</span> {c.email}</p>}
            <ClientPhoneDisplay clientId={c.id} />
            {c.cidade && c.estado && <p><span className="text-muted-foreground">Localização:</span> {c.cidade}/{c.estado}</p>}
            {c.regime_tributario && <p><span className="text-muted-foreground">Regime:</span> {c.regime_tributario}</p>}
            <p><span className="text-muted-foreground">Setor:</span> {c.setor}</p>
            <div className="pt-2 flex gap-2">
              <Button asChild size="sm" variant="default" aria-label={`Abrir documentos de ${c.nome}`}>
                <Link to={`/clients/${c.id}`}>Documentos</Link>
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => openEditDialog(c)}
                aria-label={`Editar ${c.nome}`}
              >
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const MainContent = () => {
    const availableTabs = getAvailableTabs();

    if (availableTabs.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Nenhum setor disponível.</p>
        </div>
      );
    }

    // Se só há uma tab, mostrar diretamente sem abas
    if (availableTabs.length === 1) {
      const tab = availableTabs[0];
      return (
        <div className="space-y-6">
          <div className="flex gap-3">
          <SearchInput
            placeholder="Buscar por nome, email ou CNPJ..." 
            value={query} 
            onChange={handleQueryChange}
          />
          </div>

          {loading ? (
            <div className="text-center py-8">
              <p>Carregando clientes...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {user?.setor && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Setor: {user.setor}</Badge>
                  {user.isMasterAdmin && <Badge variant="outline">Master Admin</Badge>}
                </div>
              )}
              
              {getFilteredClients(tab.value).length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    {query ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado."}
                  </p>
                </div>
              ) : (
                <ClientGrid clients={getFilteredClients(tab.value)} />
              )}
            </div>
          )}
        </div>
      );
    }

    // Múltiplas tabs disponíveis
    return (
      <div className="space-y-6">
        <div className="flex gap-3">
          <SearchInput
            placeholder="Buscar por nome, email ou CNPJ..." 
            value={query} 
            onChange={handleQueryChange}
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${availableTabs.length}, minmax(0, 1fr))` }}>
            {availableTabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {availableTabs.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="space-y-4">
              {loading ? (
                <div className="text-center py-8">
                  <p>Carregando clientes...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {user?.setor && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Setor: {user.setor}</Badge>
                      {user.isMasterAdmin && <Badge variant="outline">Master Admin</Badge>}
                    </div>
                  )}
                  
                  {getFilteredClients(tab.value).length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">
                        {query ? "Nenhum cliente encontrado." : `Nenhum cliente cadastrado no setor ${tab.label}.`}
                      </p>
                    </div>
                  ) : (
                    <ClientGrid clients={getFilteredClients(tab.value)} />
                  )}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    );
  };

  // Verificar se o usuário tem permissão para acessar clientes
  if (!user || user.role !== 'admin') {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Acesso negado. Apenas administradores podem ver clientes.</p>
      </div>
    );
  }

  // Verificar se admin tem setor definido (exceto master admin)
  if (!user.isMasterAdmin && !user.setor) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          Seu usuário não está categorizado em nenhum setor. Entre em contato com o administrador master.
        </p>
        <div className="mt-4 space-y-2">
          <p className="text-sm text-muted-foreground">Debug info:</p>
          <p className="text-sm">User ID: {user.id}</p>
          <p className="text-sm">Setor: {user.setor || 'null'}</p>
          <p className="text-sm">Master Admin: {user.isMasterAdmin ? 'true' : 'false'}</p>
          <Button 
            onClick={async () => {
              console.log('Forçando refresh dos dados do usuário...');
              await refreshUser();
            }}
            className="mt-4"
          >
            Atualizar Dados do Usuário
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Gestão de Clientes" />

      {/* Botões de Ação */}
      <div className="flex gap-2">
        <ImportExcel onImportComplete={fetchClients} />
        <Dialog open={showClientSelectionDialog} onOpenChange={(open) => {
          setShowClientSelectionDialog(open);
          if (!open) {
            // Limpar busca e seleções quando fechar o dialog
            setClearClientsSearchQuery("");
            setSelectedClientsForDeletion([]);
          }
        }}>
          <DialogTrigger asChild>
            <Button variant="destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Limpar Clientes
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Selecionar clientes para remover</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <SearchInput
                placeholder="Buscar por nome, email ou CNPJ..."
                value={clearClientsSearchQuery}
                onChange={handleClearQueryChange}
              />
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Selecione os clientes que deseja remover:
                </p>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setSelectedClientsForDeletion(getFilteredClientsForClearing().map(c => c.id))}
                  >
                    Selecionar Todos
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setSelectedClientsForDeletion([])}
                  >
                    Desmarcar Todos
                  </Button>
                </div>
              </div>
              <div className="grid gap-2 max-h-96 overflow-y-auto">
                {getFilteredClientsForClearing().map((client) => (
                  <div key={client.id} className="flex items-center space-x-2 p-2 border rounded">
                    <input
                      type="checkbox"
                      id={`client-${client.id}`}
                      checked={selectedClientsForDeletion.includes(client.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedClientsForDeletion(prev => [...prev, client.id]);
                        } else {
                          setSelectedClientsForDeletion(prev => prev.filter(id => id !== client.id));
                        }
                      }}
                      className="rounded"
                    />
                    <label htmlFor={`client-${client.id}`} className="flex-1 text-sm cursor-pointer">
                      <div className="font-medium">{client.nome}</div>
                      <div className="text-muted-foreground text-xs">
                        {client.cnpj && `CNPJ: ${client.cnpj}`}
                        {client.cidade && client.estado && ` • ${client.cidade}/${client.estado}`}
                      </div>
                    </label>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  {selectedClientsForDeletion.length} cliente(s) selecionado(s)
                </p>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowClientSelectionDialog(false)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={clearSelectedClients}
                    disabled={selectedClientsForDeletion.length === 0}
                  >
                    Remover Selecionados
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Cliente</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="nome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome da empresa" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email (opcional)</FormLabel>
                          <FormControl>
                            <Input placeholder="email@empresa.com ou contato@nomeempresa.com.br" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="telefone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone (opcional)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="(11) 99999-9999" 
                            value={field.value}
                            onChange={(e) => {
                              const formatted = formatTelefone(e.target.value);
                              field.onChange(formatted);
                            }}
                            maxLength={15}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cnpj"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CNPJ</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="XX.XXX.XXX/XXXX-XX" 
                            value={field.value}
                            onChange={(e) => {
                              const formatted = formatCNPJ(e.target.value);
                              field.onChange(formatted);
                            }}
                            maxLength={18}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="inscricao_estadual"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Inscrição Estadual (opcional)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Digite os números ou ISENTO" 
                            value={field.value}
                            onChange={(e) => {
                              const formatted = formatInscricaoEstadual(e.target.value);
                              field.onChange(formatted);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="data_abertura"
                    render={({ field }) => {
                      const [localValue, setLocalValue] = useState("");
                      
                      // Sincroniza valor local com o campo quando campo muda
                      useEffect(() => {
                        if (field.value) {
                          setLocalValue(convertFromISODate(field.value));
                        } else if (!localValue) {
                          setLocalValue("");
                        }
                      }, [field.value]);
                      
                      console.log('📅 DatePicker Field Debug:', {
                        fieldValue: field.value,
                        localValue: localValue,
                        convertedValue: convertFromISODate(field.value),
                        type: typeof field.value
                      });
                      
                      return (
                        <FormItem>
                          <FormLabel>Data de Abertura (opcional)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="DD/MM/AAAA" 
                              value={localValue}
                              onChange={(e) => {
                                console.log('📝 Input onChange:', {
                                  inputValue: e.target.value,
                                  currentLocalValue: localValue,
                                });
                                
                                const formatted = formatDate(e.target.value);
                                console.log('📝 After formatDate:', formatted);
                                
                                setLocalValue(formatted);
                                
                                // Só atualiza o campo se estiver completo
                                if (formatted.length === 10) {
                                  const isoDate = convertToISODate(formatted);
                                  console.log('📝 Converted to ISO (complete):', isoDate);
                                  field.onChange(isoDate);
                                }
                              }}
                              onBlur={() => {
                                console.log('📝 Input blurred with localValue:', localValue);
                                // No blur, tenta converter mesmo se incompleto
                                if (localValue.length === 10) {
                                  const isoDate = convertToISODate(localValue);
                                  field.onChange(isoDate);
                                } else if (localValue.length === 0) {
                                  field.onChange("");
                                }
                              }}
                              maxLength={10}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                  <FormField
                    control={form.control}
                    name="regime_tributario"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Regime Tributário</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o regime" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {regimesTributarios.map((regime) => (
                              <SelectItem key={regime.value} value={regime.value}>
                                {regime.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cidade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cidade</FormLabel>
                        <FormControl>
                          <Input placeholder="São Paulo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="estado"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o estado" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {estados.map((estado) => (
                              <SelectItem key={estado.value} value={estado.value}>
                                {estado.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="setor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Setor</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o setor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {getAvailableSetores().map((setor) => (
                              <SelectItem key={setor.value} value={setor.value}>
                                {setor.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="admins_responsaveis"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Admins Responsáveis</FormLabel>
                        <MultipleAdminSelect
                          value={field.value}
                          onChange={field.onChange}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Campos de acesso ao sistema */}
                <div className="border-t pt-4 mt-6">
                  <h3 className="text-lg font-medium mb-4">Acesso ao Sistema</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="usuario"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Usuário</FormLabel>
                          <FormControl>
                            <Input placeholder="nome_usuario" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="senha"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Senha</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Criando..." : "Salvar Cliente"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        
        {/* Dialog de Edição com Telefones */}
        <EditClientDialog
          client={editingClient}
          isOpen={isEditDialogOpen}
          onClose={() => {
            setIsEditDialogOpen(false);
            setEditingClient(null);
          }}
          onSubmit={onEditSubmit}
          submitting={submitting}
        />
      </div>

      <MainContent />
    </div>
  );
}