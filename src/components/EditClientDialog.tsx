import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AdminSelect } from '@/components/AdminSelect';
import { ClientPhoneManager } from '@/components/ClientPhoneManager';
import type { Setor } from '@/state/auth';

// Limpar cache

const formatCNPJ = (value: string) => {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length <= 2) return cleaned;
  if (cleaned.length <= 5) return `${cleaned.slice(0, 2)}.${cleaned.slice(2)}`;
  if (cleaned.length <= 8) return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5)}`;
  if (cleaned.length <= 12) return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8)}`;
  return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8, 12)}-${cleaned.slice(12, 14)}`;
};

const formatDate = (value: string) => {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length <= 2) return cleaned;
  if (cleaned.length <= 4) return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
  return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
};

const convertToISODate = (dateStr: string) => {
  if (!dateStr || dateStr.length !== 10) return '';
  const [day, month, year] = dateStr.split('/');
  if (!day || !month || !year || year.length !== 4) return '';
  
  const dayNum = parseInt(day, 10);
  const monthNum = parseInt(month, 10);
  const yearNum = parseInt(year, 10);
  
  if (dayNum < 1 || dayNum > 31) return '';
  if (monthNum < 1 || monthNum > 12) return '';
  if (yearNum < 1900 || yearNum > 2100) return '';
  
  const testDate = new Date(yearNum, monthNum - 1, dayNum);
  if (testDate.getFullYear() !== yearNum || 
      testDate.getMonth() !== monthNum - 1 || 
      testDate.getDate() !== dayNum) {
    return '';
  }
  
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

const convertFromISODate = (isoDate: string) => {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-');
  if (!year || !month || !day) return '';
  return `${day}/${month}/${year}`;
};

const formatInscricaoEstadual = (value: string) => {
  const upperValue = value.toUpperCase();
  if (upperValue === 'ISENTO') return 'ISENTO';
  const isentoPrefix = 'ISENTO';
  if (isentoPrefix.startsWith(upperValue) && upperValue.length > 0) return upperValue;
  const cleaned = value.replace(/\D/g, '');
  return cleaned;
};

const editClientFormSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string()
    .optional()
    .refine((val) => !val || val === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
      message: "Email inválido"
    }),
  cnpj: z.string().min(14, "CNPJ deve ter pelo menos 14 caracteres"),
  regime_tributario: z.string().min(1, "Selecione um regime tributário"),
  cidade: z.string().min(2, "Cidade deve ter pelo menos 2 caracteres"),
  estado: z.string().min(2, "Estado deve ter pelo menos 2 caracteres"),
  setor: z.enum(["PESSOAL", "FISCAL", "CONTABIL", "PLANEJAMENTO", "TODOS"], {
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

interface EditClientDialogProps {
  client: Cliente | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: z.infer<typeof editClientFormSchema>) => Promise<void>;
  submitting: boolean;
}

export const EditClientDialog: React.FC<EditClientDialogProps> = ({
  client,
  isOpen,
  onClose,
  onSubmit,
  submitting
}) => {
  const form = useForm<z.infer<typeof editClientFormSchema>>({
    resolver: zodResolver(editClientFormSchema),
    defaultValues: {
      nome: "",
      email: "",
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

  // Populate form when client changes
  useEffect(() => {
    if (client) {
      form.reset({
        nome: client.nome,
        email: client.email || "",
        cnpj: client.cnpj || "",
        regime_tributario: client.regime_tributario || "",
        cidade: client.cidade || "",
        estado: client.estado || "",
        setor: client.setor as "PESSOAL" | "FISCAL" | "CONTABIL" | "PLANEJAMENTO" | "TODOS",
        data_abertura: client.data_abertura ? convertFromISODate(client.data_abertura) : "",
        inscricao_estadual: client.inscricao_estadual || "",
        admin_responsavel: client.admin_responsavel || "",
      });
    }
  }, [client, form]);

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Cliente</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                      <Input placeholder="email@empresa.com" {...field} />
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
                  
                  useEffect(() => {
                    if (field.value) {
                      setLocalValue(field.value);
                    } else if (!localValue) {
                      setLocalValue("");
                    }
                  }, [field.value]);
                  
                  return (
                    <FormItem>
                      <FormLabel>Data de Abertura (opcional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="DD/MM/AAAA" 
                          value={localValue}
                          onChange={(e) => {
                            const formatted = formatDate(e.target.value);
                            setLocalValue(formatted);
                            
                            if (formatted.length === 10) {
                              const isoDate = convertToISODate(formatted);
                              field.onChange(isoDate);
                            }
                          }}
                          onBlur={() => {
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                name="admin_responsavel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Admin Responsável (opcional)</FormLabel>
                    <FormControl>
                      <AdminSelect 
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Selecionar admin responsável..."
                      />
                    </FormControl>
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o setor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {setores.map((setor) => (
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
            </div>

            {/* Seção de Telefones */}
            {client && (
              <div className="border rounded-lg p-4">
                <ClientPhoneManager clienteId={client.id} />
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
