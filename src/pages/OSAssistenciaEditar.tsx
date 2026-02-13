import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  getOrdemServicoById,
  updateOrdemServico,
  formatCurrency,
  PecaServico,
  TimelineOS,
  OrdemServico
} from '@/utils/assistenciaApi';
import { 
  getClientes, 
  getFornecedores
} from '@/utils/cadastrosApi';
import { getSolicitacoesByOS, addSolicitacao, SolicitacaoPeca } from '@/utils/solicitacaoPecasApi';
import { useCadastroStore } from '@/store/cadastroStore';
import { AutocompleteLoja } from '@/components/AutocompleteLoja';
import { AutocompleteColaborador } from '@/components/AutocompleteColaborador';
import { AutocompleteFornecedor } from '@/components/AutocompleteFornecedor';
import { Plus, Trash2, Save, ArrowLeft, History, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { applyIMEIMask } from '@/utils/imeiMask';
import { format } from 'date-fns';

interface PecaForm {
  id: string;
  peca: string;
  imei: string;
  valor: string;
  percentual: string;
  servicoTerceirizado: boolean;
  descricaoTerceirizado: string;
  fornecedorId: string;
  unidadeServico: string;
  pecaNoEstoque: boolean;
  pecaDeFornecedor: boolean;
}

interface PagamentoForm {
  id: string;
  meio: string;
  valor: string;
  parcelas: string;
}

type OSStatus = 'Em Aberto' | 'Serviço concluído' | 'Em serviço' | 'Aguardando Peça' | 'Solicitação Enviada' | 'Em Análise' | 'Peça Recebida' | 'Aguardando Aprovação do Gestor' | 'Rejeitado pelo Gestor' | 'Pagamento - Financeiro' | 'Pagamento Finalizado' | 'Pagamento Concluído' | 'Aguardando Chegada da Peça' | 'Peça em Estoque / Aguardando Reparo' | 'Aguardando Recebimento' | 'Em Execução' | 'Aguardando Pagamento' | 'Aguardando Conferência' | 'Concluído' | 'Finalizado' | 'Aguardando Análise' | 'Solicitação de Peça' | 'Pendente de Pagamento' | 'Aguardando Financeiro' | 'Liquidado';

export default function OSAssistenciaEditar() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  
  const clientes = getClientes();
  const { obterLojasTipoLoja, obterTecnicos, obterNomeLoja, obterNomeColaborador } = useCadastroStore();
  const lojas = obterLojasTipoLoja();
  const tecnicos = obterTecnicos();
  const fornecedores = getFornecedores().filter(f => f.status === 'Ativo');

  // State
  const [loading, setLoading] = useState(true);
  const [osOriginal, setOsOriginal] = useState<OrdemServico | null>(null);
  
  // Form state
  const [lojaId, setLojaId] = useState('');
  const [tecnicoId, setTecnicoId] = useState('');
  const [setor, setSetor] = useState<'GARANTIA' | 'ASSISTÊNCIA' | 'TROCA' | ''>('');
  const [clienteId, setClienteId] = useState('');
  const [descricao, setDescricao] = useState('');
  const [status, setStatus] = useState<OSStatus>('Em Aberto');
  
  // Aparelho
  const [modeloAparelho, setModeloAparelho] = useState('');
  const [imeiAparelho, setImeiAparelho] = useState('');
  
  // Peças
  const [pecas, setPecas] = useState<PecaForm[]>([]);

  // Avaliação Técnica
  const [valorCustoTecnicoLocal, setValorCustoTecnicoLocal] = useState<number>(0);
  const [valorVendaTecnicoLocal, setValorVendaTecnicoLocal] = useState<number>(0);

  // Timeline
  const [timeline, setTimeline] = useState<TimelineOS[]>([]);

  // Solicitações de Peças
  const [solicitacoesOS, setSolicitacoesOS] = useState<SolicitacaoPeca[]>([]);
  const [novaSolPeca, setNovaSolPeca] = useState('');
  const [novaSolQtd, setNovaSolQtd] = useState(1);
  const [novaSolJustificativa, setNovaSolJustificativa] = useState('');

  useEffect(() => {
    if (!id) {
      navigate('/os/assistencia');
      return;
    }

    const os = getOrdemServicoById(id);
    if (!os) {
      toast({
        title: 'Erro',
        description: 'Ordem de serviço não encontrada.',
        variant: 'destructive'
      });
      navigate('/os/assistencia');
      return;
    }

    setOsOriginal(os);
    setLojaId(os.lojaId);
    setTecnicoId(os.tecnicoId);
    setSetor(os.setor);
    setClienteId(os.clienteId);
    setDescricao(os.descricao);
    setStatus(os.status);
    setModeloAparelho(os.modeloAparelho || '');
    setImeiAparelho(os.imeiAparelho || '');
    setValorCustoTecnicoLocal(os.valorCustoTecnico || 0);
    setValorVendaTecnicoLocal(os.valorVendaTecnico || 0);
    setTimeline(os.timeline || []);

    // Carregar solicitações de peças vinculadas à OS
    const solicitacoes = getSolicitacoesByOS(id);
    setSolicitacoesOS(solicitacoes);

    // Converter peças
    if (os.pecas && os.pecas.length > 0) {
      setPecas(os.pecas.map((p: PecaServico) => ({
        id: p.id,
        peca: p.peca,
        imei: p.imei || '',
        valor: p.valor.toString(),
        percentual: p.percentual?.toString() || '',
        servicoTerceirizado: p.servicoTerceirizado || false,
        descricaoTerceirizado: p.descricaoTerceirizado || '',
        fornecedorId: p.fornecedorId || '',
        unidadeServico: p.unidadeServico || '',
        pecaNoEstoque: p.pecaNoEstoque || false,
        pecaDeFornecedor: p.pecaDeFornecedor || false
      })));
    } else {
      setPecas([createEmptyPeca()]);
    }

    setLoading(false);
  }, [id, navigate, toast]);

  const createEmptyPeca = (): PecaForm => ({
    id: `PC-NEW-${Date.now()}`,
    peca: '',
    imei: '',
    valor: '',
    percentual: '',
    servicoTerceirizado: false,
    descricaoTerceirizado: '',
    fornecedorId: '',
    unidadeServico: '',
    pecaNoEstoque: false,
    pecaDeFornecedor: false
  });


  const getClienteNome = (clienteId: string) => {
    return clientes.find(c => c.id === clienteId)?.nome || '-';
  };

  const getTecnicoNome = (tecnicoId: string) => {
    return obterNomeColaborador(tecnicoId);
  };

  // Peças handlers
  const addPeca = () => {
    setPecas([...pecas, createEmptyPeca()]);
  };

  const removePeca = (index: number) => {
    if (pecas.length > 1) {
      setPecas(pecas.filter((_, i) => i !== index));
    }
  };

  const updatePeca = (index: number, field: keyof PecaForm, value: any) => {
    const newPecas = [...pecas];
    newPecas[index] = { ...newPecas[index], [field]: value };
    setPecas(newPecas);
  };

  // Cálculos
  const calcularValorTotalPecas = () => {
    return pecas.reduce((acc, peca) => {
      const valor = parseFloat(peca.valor.replace(',', '.')) || 0;
      return acc + valor;
    }, 0);
  };

  const handleSave = () => {
    if (!lojaId || !tecnicoId || !setor || !clienteId || !status) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos obrigatórios.',
        variant: 'destructive'
      });
      return;
    }

    const pecasFormatadas: PecaServico[] = pecas
      .filter(p => p.peca.trim() !== '')
      .map(p => ({
        id: p.id,
        peca: p.peca,
        imei: p.imei || undefined,
        valor: parseFloat(p.valor.replace(',', '.')) || 0,
        percentual: p.percentual ? parseFloat(p.percentual) : 0,
        valorTotal: parseFloat(p.valor.replace(',', '.')) || 0,
        servicoTerceirizado: p.servicoTerceirizado,
        descricaoTerceirizado: p.descricaoTerceirizado || undefined,
        fornecedorId: p.fornecedorId || undefined,
        unidadeServico: p.unidadeServico || lojaId,
        pecaNoEstoque: p.pecaNoEstoque,
        pecaDeFornecedor: p.pecaDeFornecedor
      }));

    const valorTotal = calcularValorTotalPecas();

    // Adicionar evento na timeline se houver mudança de status
    let novaTimeline = [...timeline];
    if (osOriginal && osOriginal.status !== status) {
      novaTimeline.push({
        data: new Date().toISOString(),
        tipo: 'status',
        descricao: `Status alterado de "${osOriginal.status}" para "${status}"`,
        responsavel: getTecnicoNome(tecnicoId)
      });
    }

    // Forçar proximaAtuacao com base no status
    let proximaAtuacao = osOriginal?.proximaAtuacao;
    if (status === 'Serviço concluído') {
      proximaAtuacao = 'Vendedor: Registrar Pagamento';
    } else if (status === 'Em Aberto' || status === 'Em serviço' || status === 'Peça Recebida') {
      proximaAtuacao = 'Técnico: Avaliar/Executar';
    } else if (status === 'Aguardando Peça' || status === 'Solicitação Enviada') {
      proximaAtuacao = 'Gestor: Aprovar Peça';
    } else if (status === 'Pagamento Concluído') {
      proximaAtuacao = 'Logística: Enviar Peça';
    } else if (status === 'Aguardando Conferência') {
      proximaAtuacao = 'Financeiro: Conferir Lançamento';
    } else if (status === 'Finalizado') {
      proximaAtuacao = 'Concluído';
    }

    // Recarregar a OS para obter a timeline mais atualizada (proteger dados imutáveis)
    const osAtual = getOrdemServicoById(id!);
    const timelineAtualizada = osAtual ? [...osAtual.timeline] : [...timeline];
    if (osOriginal && osOriginal.status !== status) {
      timelineAtualizada.push({
        data: new Date().toISOString(),
        tipo: 'status',
        descricao: `Status alterado de "${osOriginal.status}" para "${status}"`,
        responsavel: getTecnicoNome(tecnicoId)
      });
    }

    const osAtualizada: Partial<OrdemServico> = {
      lojaId,
      tecnicoId,
      setor: setor as 'GARANTIA' | 'ASSISTÊNCIA' | 'TROCA',
      clienteId,
      descricao,
      status,
      modeloAparelho,
      imeiAparelho: imeiAparelho.replace(/-/g, ''),
      pecas: pecasFormatadas,
      valorTotal,
      timeline: timelineAtualizada,
      proximaAtuacao,
      valorCustoTecnico: valorCustoTecnicoLocal,
      valorVendaTecnico: valorVendaTecnicoLocal,
    };

    const result = updateOrdemServico(id!, osAtualizada);

    if (result) {
      toast({
        title: 'Sucesso',
        description: `OS ${id} atualizada com sucesso!`
      });
      navigate('/os/assistencia');
    } else {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a OS.',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <PageLayout title="Carregando...">
        <div className="flex items-center justify-center p-8">
          <span className="text-muted-foreground">Carregando dados da OS...</span>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title={`Editar OS ${id}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={() => navigate('/os/assistencia')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(`/os/assistencia/${id}`)}>
              Ver Detalhes
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Salvar Alterações
            </Button>
          </div>
        </div>

        {/* Info da OS */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              Informações da OS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Nº OS:</span>
                <p className="font-mono font-medium">{id}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Data/Hora:</span>
                <p className="font-medium">
                  {osOriginal && format(new Date(osOriginal.dataHora), 'dd/MM/yyyy HH:mm')}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Cliente:</span>
                <p className="font-medium">{getClienteNome(clienteId)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Origem:</span>
                <Badge variant="outline">
                  {osOriginal?.origemOS || 'Balcão'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Dados Básicos */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Dados do Atendimento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Loja *</Label>
                  <AutocompleteLoja
                    value={lojaId}
                    onChange={setLojaId}
                    filtrarPorTipo="Assistência"
                    placeholder="Selecione a loja..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Técnico *</Label>
                  <AutocompleteColaborador
                    value={tecnicoId}
                    onChange={setTecnicoId}
                    filtrarPorTipo="tecnicos"
                    placeholder="Selecione o técnico..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Setor *</Label>
                  <Select value={setor} onValueChange={(v) => setSetor(v as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GARANTIA">Garantia</SelectItem>
                      <SelectItem value="ASSISTÊNCIA">Assistência</SelectItem>
                      <SelectItem value="TROCA">Troca</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status *</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as OSStatus)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Em Aberto">Em Aberto</SelectItem>
                      <SelectItem value="Em serviço">Em serviço</SelectItem>
                      <SelectItem value="Aguardando Peça">Aguardando Peça</SelectItem>
                      <SelectItem value="Solicitação Enviada">Solicitação Enviada</SelectItem>
                      <SelectItem value="Em Análise">Em Análise</SelectItem>
                      <SelectItem value="Peça Recebida">Peça Recebida</SelectItem>
                      <SelectItem value="Pagamento Concluído">Pagamento Concluído</SelectItem>
                      <SelectItem value="Serviço concluído">Serviço concluído</SelectItem>
                      <SelectItem value="Aguardando Conferência">Aguardando Conferência</SelectItem>
                      <SelectItem value="Finalizado">Finalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descrição do Problema</Label>
                <Textarea 
                  value={descricao} 
                  onChange={(e) => setDescricao(e.target.value)}
                  rows={3}
                  placeholder="Descreva o problema relatado pelo cliente..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Aparelho */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Dados do Aparelho</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Modelo do Aparelho</Label>
                <Input 
                  value={modeloAparelho}
                  onChange={(e) => setModeloAparelho(e.target.value)}
                  placeholder="Ex: iPhone 13 Pro Max"
                />
              </div>

              <div className="space-y-2">
                <Label>IMEI do Aparelho</Label>
                <Input 
                  value={imeiAparelho}
                  onChange={(e) => setImeiAparelho(applyIMEIMask(e.target.value))}
                  placeholder="00000000-000000-0"
                  maxLength={17}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Peças/Serviços */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5" />
                Peças e Serviços
              </CardTitle>
              <Button variant="outline" size="sm" onClick={addPeca}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pecas.map((peca, index) => (
                <div key={peca.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Item {index + 1}</span>
                    {pecas.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => removePeca(index)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2 space-y-2">
                      <Label>Peça/Serviço</Label>
                      <Input 
                        value={peca.peca}
                        onChange={(e) => updatePeca(index, 'peca', e.target.value)}
                        placeholder="Nome da peça ou serviço"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>IMEI (se aplicável)</Label>
                      <Input 
                        value={peca.imei}
                        onChange={(e) => updatePeca(index, 'imei', applyIMEIMask(e.target.value))}
                        placeholder="IMEI"
                        maxLength={17}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Valor</Label>
                      <Input 
                        value={peca.valor}
                        onChange={(e) => updatePeca(index, 'valor', e.target.value)}
                        placeholder="0,00"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-6 pt-2">
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id={`estoque-${index}`}
                        checked={peca.pecaNoEstoque}
                        onCheckedChange={(checked) => updatePeca(index, 'pecaNoEstoque', checked)}
                      />
                      <Label htmlFor={`estoque-${index}`} className="text-sm">Peça do estoque</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id={`terceiro-${index}`}
                        checked={peca.servicoTerceirizado}
                        onCheckedChange={(checked) => updatePeca(index, 'servicoTerceirizado', checked)}
                      />
                      <Label htmlFor={`terceiro-${index}`} className="text-sm">Serviço terceirizado</Label>
                    </div>
                  </div>

                  {peca.servicoTerceirizado && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
                      <div className="space-y-2">
                        <Label>Fornecedor</Label>
                        <Select 
                          value={peca.fornecedorId} 
                          onValueChange={(v) => updatePeca(index, 'fornecedorId', v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {fornecedores.map(f => (
                              <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Descrição do serviço</Label>
                        <Input 
                          value={peca.descricaoTerceirizado}
                          onChange={(e) => updatePeca(index, 'descricaoTerceirizado', e.target.value)}
                          placeholder="Descrição"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-end">
                <div className="text-right">
                  <span className="text-muted-foreground text-sm">Total Peças/Serviços:</span>
                  <p className="text-xl font-bold">{formatCurrency(calcularValorTotalPecas())}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Avaliação Técnica */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Avaliação Técnica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor de Custo (R$)</Label>
                <Input 
                  type="number"
                  value={valorCustoTecnicoLocal || ''}
                  onChange={(e) => setValorCustoTecnicoLocal(parseFloat(e.target.value) || 0)}
                  placeholder="0,00"
                />
                <p className="text-xs text-muted-foreground">Custo de peças/insumos utilizados</p>
              </div>
              <div className="space-y-2">
                <Label>Valor de Venda (R$)</Label>
                <Input 
                  type="number"
                  value={valorVendaTecnicoLocal || ''}
                  onChange={(e) => setValorVendaTecnicoLocal(parseFloat(e.target.value) || 0)}
                  placeholder="0,00"
                />
                <p className="text-xs text-muted-foreground">Valor cobrado do cliente</p>
              </div>
            </div>
            <Button 
              className="w-full"
              onClick={() => {
                if (!valorCustoTecnicoLocal || !valorVendaTecnicoLocal) {
                  toast({ title: 'Preencha os valores de Custo e Venda antes de concluir.', variant: 'destructive' });
                  return;
                }
                setStatus('Serviço concluído');
                toast({ title: 'Status alterado para Serviço Concluído. Salve para confirmar.' });
              }}
            >
              Concluir Serviço
            </Button>
          </CardContent>
        </Card>

        {/* Solicitações de Peças */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5" />
              Solicitações de Peças
            </CardTitle>
          </CardHeader>
          <CardContent>
            {solicitacoesOS.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Peça</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead>Justificativa</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {solicitacoesOS.map((sol) => (
                    <TableRow key={sol.id}>
                      <TableCell className="font-medium">{sol.peca}</TableCell>
                      <TableCell>{sol.quantidade}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{sol.justificativa}</TableCell>
                      <TableCell>
                        {(() => {
                          switch (sol.status) {
                            case 'Pendente': return <Badge className="bg-yellow-500">Pendente</Badge>;
                            case 'Aprovada': return <Badge className="bg-green-500">Aprovada</Badge>;
                            case 'Rejeitada': return <Badge className="bg-red-500">Rejeitada</Badge>;
                            case 'Enviada': return <Badge className="bg-blue-500">Enviada</Badge>;
                            case 'Recebida': return <Badge className="bg-emerald-500">Recebida</Badge>;
                            case 'Cancelada': return <Badge className="bg-gray-500">Cancelada</Badge>;
                            default: return <Badge variant="secondary">{sol.status}</Badge>;
                          }
                        })()}
                      </TableCell>
                      <TableCell className="text-sm">{new Date(sol.dataSolicitacao).toLocaleDateString('pt-BR')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma solicitação de peça vinculada a esta OS.</p>
            )}

            {/* Adicionar nova solicitação */}
            <div className="mt-4 pt-4 border-t space-y-3">
              <p className="text-sm font-medium">Nova Solicitação</p>
              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Peça</Label>
                  <Input value={novaSolPeca} onChange={e => setNovaSolPeca(e.target.value)} placeholder="Nome da peça..." />
                </div>
                <div className="w-20 space-y-1">
                  <Label className="text-xs">Qtd</Label>
                  <Input type="number" min="1" value={novaSolQtd} onChange={e => setNovaSolQtd(parseInt(e.target.value) || 1)} />
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Justificativa</Label>
                  <Input value={novaSolJustificativa} onChange={e => setNovaSolJustificativa(e.target.value)} placeholder="Motivo..." />
                </div>
                <Button size="sm" onClick={() => {
                  if (!novaSolPeca || !novaSolJustificativa) {
                    toast({ title: 'Preencha peça e justificativa', variant: 'destructive' });
                    return;
                  }
                  const nova = addSolicitacao({
                    osId: id!,
                    peca: novaSolPeca,
                    quantidade: novaSolQtd,
                    justificativa: novaSolJustificativa,
                    modeloImei: osOriginal?.imeiAparelho || osOriginal?.modeloAparelho || '',
                    lojaSolicitante: lojaId
                  });
                  setSolicitacoesOS([...solicitacoesOS, nova]);
                  setNovaSolPeca('');
                  setNovaSolQtd(1);
                  setNovaSolJustificativa('');
                  toast({ title: 'Solicitação adicionada' });
                }}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        {timeline.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-5 w-5" />
                Histórico / Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {timeline.map((evento, index) => (
                  <div key={index} className="flex gap-3 items-start">
                    <div className="w-2 h-2 mt-2 rounded-full bg-primary flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm">{evento.descricao}</p>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        <span>{format(new Date(evento.data), 'dd/MM/yyyy HH:mm')}</span>
                        {evento.responsavel && <span>• {evento.responsavel}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => navigate('/os/assistencia')}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Salvar Alterações
          </Button>
        </div>
      </div>
    </PageLayout>
  );
}
