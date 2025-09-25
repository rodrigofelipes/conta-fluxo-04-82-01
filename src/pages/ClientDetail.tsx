import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/ui/page-header";
import { DocumentEmailDialog } from "@/components/DocumentEmailDialog";
import { Filter, Mail } from "lucide-react";
import { ClientBox, getBox, addRequest, addSent } from "@/state/clientBox";
import { findClientById } from "@/utils/clientUtils";
import { toast } from "sonner";
import { useAuth } from "@/state/auth";

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [box, setBox] = useState<ClientBox | null>(null);
  const [reqCategory, setReqCategory] = useState("");
  const [reqRef, setReqRef] = useState("");
  const [reqNote, setReqNote] = useState("");

  const [sendCategory, setSendCategory] = useState("");
  const [sendRef, setSendRef] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [filtroSetor, setFiltroSetor] = useState<string>("todos");


  useEffect(() => {
    if (!id) return;
    setBox(getBox(id));
    
    // Buscar cliente no Supabase
    const loadClient = async () => {
      setLoading(true);
      const clientData = await findClientById(id);
      setClient(clientData);
      setLoading(false);
    };
    
    loadClient();
  }, [id]);

  useEffect(() => {
    if (!client) return;
    const title = `Cliente: ${client.name} • Documentos`;
    document.title = title;
    const desc = `Documentos do cliente ${client.name}: recebidos, solicitações e envio.`;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", desc);
    let link = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", window.location.href);
  }, [client]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <p>Carregando cliente...</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="space-y-6">
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle>Cliente não encontrado</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline"><Link to="/clients">Voltar</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Verificar se o usuário tem permissão para acessar este cliente
  if (!user || user.role !== 'admin') {
    return (
      <div className="space-y-6">
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle>Acesso negado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">Você não tem permissão para acessar este cliente.</p>
            <Button asChild variant="outline"><Link to="/clients">Voltar</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }


  const handleCreateRequest = () => {
    if (!id) return;
    if (!reqCategory || !reqRef) {
      toast("Preencha Categoria e Mês/Ano");
      return;
    }
    const next = addRequest(id, { category: reqCategory, ref: reqRef, note: reqNote });
    setBox(next);
    setReqCategory("");
    setReqRef("");
    setReqNote("");
    toast.success("Solicitação criada para o cliente");
  };

  const handleSendFiles = async () => {
    if (!id || files.length === 0) return;
    let next = box ?? getBox(id);
    for (const f of files) {
      next = await addSent(id, f, { category: sendCategory || "Outros", ref: sendRef || "-" });
    }
    setBox(next);
    setFiles([]);
    setSendCategory("");
    setSendRef("");
    toast.success("Arquivo(s) enviados ao cliente");
  };

  // Função para filtrar documentos por setor
  const getFilteredDocuments = () => {
    if (!box || !box.received) return [];
    
    if (filtroSetor === "todos") {
      return box.received;
    }
    
    // Mapear filtros para categorias de documentos
    const setorMapping: { [key: string]: string[] } = {
      "pessoal": ["pessoal", "rg", "cpf", "comprovante"],
      "fiscal": ["fiscal", "nf", "icms", "iss", "imposto"],
      "contabil": ["contabil", "balancete", "dre", "razão", "balanço"],
      "planejamento": ["planejamento", "estratégico", "relatório", "plano"]
    };
    
    const keywords = setorMapping[filtroSetor] || [];
    
    return box.received.filter(doc => 
      keywords.some(keyword => 
        doc.category.toLowerCase().includes(keyword.toLowerCase())
      )
    );
  };

  // Verificar se usuário pode usar o filtro
  const canUseFilter = user?.isMasterAdmin || user?.setor === 'TODOS';


  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <PageHeader 
          title={`Cliente: ${client.name}`}
          subtitle={
            <div className="space-y-1 text-white/80">
              {client.cnpj && <p>CNPJ: {client.cnpj}</p>}
              {client.inscricaoEstadual && <p>Inscrição Estadual: {client.inscricaoEstadual}</p>}
              {client.dataAbertura && <p>Data de Abertura: {new Date(client.dataAbertura).toLocaleDateString('pt-BR')}</p>}
              {client.regime && <p>Regime: {client.regime}</p>}
              {client.city && client.state && <p>Localização: {client.city}/{client.state}</p>}
              {user?.setor && (
                <Badge variant="secondary" className="mt-2 bg-white/20 text-white border-white/20">Setor: {user.setor}</Badge>
              )}
            </div>
          }
          className="flex-1"
        />
        <Button asChild variant="outline"><Link to="/clients">Voltar</Link></Button>
      </header>

      <div className="space-y-6">
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="card-elevated lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Documentos</CardTitle>
              {canUseFilter && (
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={filtroSetor} onValueChange={setFiltroSetor}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="pessoal">Pessoal</SelectItem>
                      <SelectItem value="fiscal">Fiscal</SelectItem>
                      <SelectItem value="contabil">Contábil</SelectItem>
                      <SelectItem value="planejamento">Planejamento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {(() => {
                const filteredDocs = getFilteredDocuments();
                return filteredDocs.length > 0 ? (
                  <div className="space-y-2">
                    {filtroSetor !== "todos" && (
                      <Badge variant="outline" className="mb-2">
                        Filtrado por: {filtroSetor.charAt(0).toUpperCase() + filtroSetor.slice(1)} 
                        ({filteredDocs.length} documento{filteredDocs.length !== 1 ? 's' : ''})
                      </Badge>
                    )}
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead>Ref.</TableHead>
                          <TableHead>Tamanho</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDocs.map((d) => (
                          <TableRow key={d.id}>
                            <TableCell>{d.name}</TableCell>
                            <TableCell>{d.category}</TableCell>
                            <TableCell>{d.ref}</TableCell>
                            <TableCell>{(d.size / 1024).toFixed(1)} KB</TableCell>
                            <TableCell>{new Date(d.createdAt).toLocaleString()}</TableCell>
                            <TableCell>
                              <DocumentEmailDialog 
                                documentId={d.id}
                                documentName={d.name}
                                clientEmail={client.email}
                                clientName={client.name}
                                trigger={
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <Mail className="h-4 w-4" />
                                  </Button>
                                }
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {filtroSetor === "todos" 
                      ? "Nenhum documento recebido."
                      : `Nenhum documento ${filtroSetor} encontrado.`
                    }
                  </p>
                );
              })()}
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Solicitar Documentos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Input placeholder="Ex.: RG, CPF, NF-e, Balancete" value={reqCategory} onChange={(e) => setReqCategory(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Mês/Ano</Label>
                <Input placeholder="MM/AAAA" value={reqRef} onChange={(e) => setReqRef(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Observação (opcional)</Label>
                <Input placeholder="Detalhes do que precisa" value={reqNote} onChange={(e) => setReqNote(e.target.value)} />
              </div>
              <Button variant="hero" onClick={handleCreateRequest}>Solicitar</Button>
            </CardContent>
          </Card>
        </section>

        <Card className="card-elevated">
          <CardHeader>
            <CardTitle>Enviar arquivos para o cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Input placeholder="Ex.: Impostos" value={sendCategory} onChange={(e) => setSendCategory(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Mês/Ano</Label>
                <Input placeholder="MM/AAAA" value={sendRef} onChange={(e) => setSendRef(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Arquivos</Label>
                <Input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} />
              </div>
            </div>
            <Button variant="hero-static" onClick={handleSendFiles}>Enviar</Button>
          </CardContent>
        </Card>

        <Separator />

        {client.regime && (
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>{client.regime}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">Documentos relacionados ao regime de {client.regime}</p>
              <div className="space-y-2">
                <Label>Solicitar documento</Label>
                <Input placeholder={
                  client.regime === 'Lucro Real' ? 'Ex.: Balancete, DRE' :
                  client.regime === 'Lucro Presumido' ? 'Ex.: Faturamento mensal' :
                  client.regime === 'Simples Nacional' ? 'Ex.: DAS, Faturamento' :
                  client.regime === 'Microempreendedor' ? 'Ex.: DAS MEI, Relatório' :
                  'Ex.: Documento específico do regime'
                } />
                <Button variant="outline" size="sm">Solicitar</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}