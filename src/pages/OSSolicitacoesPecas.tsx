import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { EstoqueLayout } from '@/components/layout/EstoqueLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  getSolicitacoes, 
  aprovarSolicitacao, 
  rejeitarSolicitacao,
  criarLote,
  enviarLote,
  getLotes,
  calcularSLASolicitacao,
  formatCurrency,
  SolicitacaoPeca,
  LotePecas
} from '@/utils/solicitacaoPecasApi';
import { getLojas, getFornecedores, getColaboradoresByPermissao, addFornecedor } from '@/utils/cadastrosApi';
import { getOrdemServicoById, updateOrdemServico } from '@/utils/assistenciaApi';
import { Eye, Check, X, Package, Clock, AlertTriangle, Layers, Send, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function OSSolicitacoesPecas() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [solicitacoes, setSolicitacoes] = useState(getSolicitacoes());
  const [lotes, setLotes] = useState(getLotes());
  const lojas = getLojas();
  const fornecedores = getFornecedores().filter(f => f.status === 'Ativo');
  const colaboradores = getColaboradoresByPermissao('Assistência');

  // Filtros
  const [filtroLoja, setFiltroLoja] = useState('todos');
  const [filtroPeca, setFiltroPeca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');

  // Modal aprovar
  const [aprovarOpen, setAprovarOpen] = useState(false);
  const [solicitacaoSelecionada, setSolicitacaoSelecionada] = useState<SolicitacaoPeca | null>(null);
  const [formAprovar, setFormAprovar] = useState({
    fornecedorId: '',
    valorPeca: '',
    responsavelCompra: '',
    dataRecebimento: '',
    dataEnvio: ''
  });

  // Modal novo fornecedor
  const [novoFornecedorOpen, setNovoFornecedorOpen] = useState(false);
  const [novoFornecedorNome, setNovoFornecedorNome] = useState('');

  // Seleção para lote
  const [selecionadas, setSelecionadas] = useState<string[]>([]);

  // Filtrar solicitações
  const solicitacoesFiltradas = useMemo(() => {
    return solicitacoes.filter(s => {
      if (filtroLoja !== 'todos' && s.lojaSolicitante !== filtroLoja) return false;
      if (filtroPeca && !s.peca.toLowerCase().includes(filtroPeca.toLowerCase())) return false;
      if (filtroStatus !== 'todos' && s.status !== filtroStatus) return false;
      return true;
    }).sort((a, b) => new Date(b.dataSolicitacao).getTime() - new Date(a.dataSolicitacao).getTime());
  }, [solicitacoes, filtroLoja, filtroPeca, filtroStatus]);

  const getLojaNome = (lojaId: string) => lojas.find(l => l.id === lojaId)?.nome || lojaId;
  const getFornecedorNome = (fornId: string) => fornecedores.find(f => f.id === fornId)?.nome || fornId;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pendente':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Pendente</Badge>;
      case 'Aprovada':
        return <Badge className="bg-blue-500 hover:bg-blue-600">Aprovada</Badge>;
      case 'Rejeitada':
        return <Badge className="bg-red-500 hover:bg-red-600">Rejeitada</Badge>;
      case 'Enviada':
        return <Badge className="bg-purple-500 hover:bg-purple-600">Enviada</Badge>;
      case 'Recebida':
        return <Badge className="bg-green-500 hover:bg-green-600">Recebida</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getSLABadge = (dataSolicitacao: string) => {
    const dias = calcularSLASolicitacao(dataSolicitacao);
    if (dias >= 7) {
      return (
        <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 inline-flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          {dias} dias
        </span>
      );
    } else if (dias >= 4) {
      return (
        <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 inline-flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {dias} dias
        </span>
      );
    }
    return (
      <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 inline-flex items-center gap-1">
        {dias} dias
      </span>
    );
  };

  const handleAbrirAprovar = (solicitacao: SolicitacaoPeca) => {
    setSolicitacaoSelecionada(solicitacao);
    setFormAprovar({
      fornecedorId: '',
      valorPeca: '',
      responsavelCompra: '',
      dataRecebimento: '',
      dataEnvio: ''
    });
    setAprovarOpen(true);
  };

  const handleAprovar = () => {
    if (!solicitacaoSelecionada) return;
    if (!formAprovar.fornecedorId || !formAprovar.valorPeca || !formAprovar.responsavelCompra) {
      toast({ title: 'Erro', description: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }

    const resultado = aprovarSolicitacao(solicitacaoSelecionada.id, {
      fornecedorId: formAprovar.fornecedorId,
      valorPeca: parseFloat(formAprovar.valorPeca.replace(/\D/g, '')) / 100,
      responsavelCompra: formAprovar.responsavelCompra,
      dataRecebimento: formAprovar.dataRecebimento,
      dataEnvio: formAprovar.dataEnvio
    });

    if (resultado) {
      // Atualizar OS
      const os = getOrdemServicoById(solicitacaoSelecionada.osId);
      if (os) {
        updateOrdemServico(os.id, {
          timeline: [...os.timeline, {
            data: new Date().toISOString(),
            tipo: 'peca',
            descricao: `Solicitação de peça aprovada – ${solicitacaoSelecionada.peca} x ${solicitacaoSelecionada.quantidade}`,
            responsavel: 'Gestora Matriz'
          }]
        });
      }

      setSolicitacoes(getSolicitacoes());
      setAprovarOpen(false);
      toast({ title: 'Sucesso', description: 'Solicitação aprovada!' });
    }
  };

  const handleRejeitar = (solicitacao: SolicitacaoPeca) => {
    const resultado = rejeitarSolicitacao(solicitacao.id);
    if (resultado) {
      setSolicitacoes(getSolicitacoes());
      toast({ title: 'Solicitação rejeitada', description: `${solicitacao.peca} foi rejeitada.` });
    }
  };

  const handleSelecionarParaLote = (id: string, checked: boolean) => {
    if (checked) {
      setSelecionadas([...selecionadas, id]);
    } else {
      setSelecionadas(selecionadas.filter(s => s !== id));
    }
  };

  const handleCriarLote = () => {
    if (selecionadas.length === 0) {
      toast({ title: 'Erro', description: 'Selecione ao menos uma solicitação aprovada', variant: 'destructive' });
      return;
    }

    // Agrupar por fornecedor
    const solicitacoesParaLote = solicitacoes.filter(s => selecionadas.includes(s.id) && s.status === 'Aprovada');
    const fornecedoresUnicos = [...new Set(solicitacoesParaLote.map(s => s.fornecedorId))];

    if (fornecedoresUnicos.length > 1) {
      toast({ title: 'Erro', description: 'Selecione apenas solicitações do mesmo fornecedor', variant: 'destructive' });
      return;
    }

    if (fornecedoresUnicos.length === 0 || !fornecedoresUnicos[0]) {
      toast({ title: 'Erro', description: 'Nenhuma solicitação aprovada selecionada', variant: 'destructive' });
      return;
    }

    const novoLote = criarLote(fornecedoresUnicos[0], selecionadas);
    if (novoLote) {
      setSolicitacoes(getSolicitacoes());
      setLotes(getLotes());
      setSelecionadas([]);
      toast({ title: 'Sucesso', description: `Lote ${novoLote.id} criado com ${selecionadas.length} solicitações!` });
    }
  };

  const handleEnviarLote = (loteId: string) => {
    const resultado = enviarLote(loteId);
    if (resultado) {
      setSolicitacoes(getSolicitacoes());
      setLotes(getLotes());
      toast({ title: 'Sucesso', description: `Lote ${loteId} enviado! Nota ${resultado.nota.id} criada no Financeiro.` });
    }
  };

  const handleAdicionarFornecedor = () => {
    if (!novoFornecedorNome.trim()) return;
    const novo = addFornecedor({
      nome: novoFornecedorNome,
      cnpj: '',
      telefone: '',
      endereco: '',
      responsavel: '',
      status: 'Ativo'
    });
    setNovoFornecedorNome('');
    setNovoFornecedorOpen(false);
    setFormAprovar({ ...formAprovar, fornecedorId: novo.id });
    toast({ title: 'Sucesso', description: `Fornecedor ${novo.nome} adicionado!` });
  };

  const formatCurrencyInput = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const amount = parseInt(numbers || '0') / 100;
    return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Stats
  const totalPendentes = solicitacoes.filter(s => s.status === 'Pendente').length;
  const totalAprovadas = solicitacoes.filter(s => s.status === 'Aprovada').length;
  const totalEnviadas = solicitacoes.filter(s => s.status === 'Enviada').length;
  const totalRecebidas = solicitacoes.filter(s => s.status === 'Recebida').length;
  const lotesPendentes = lotes.filter(l => l.status === 'Pendente');

  return (
    <EstoqueLayout title="Solicitações de Peças">
      {/* Dashboard Cards */}
      <div className="sticky top-0 z-10 bg-background pb-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-600">{totalPendentes}</div>
              <div className="text-xs text-muted-foreground">Pendentes</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{totalAprovadas}</div>
              <div className="text-xs text-muted-foreground">Aprovadas</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">{totalEnviadas}</div>
              <div className="text-xs text-muted-foreground">Enviadas</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{totalRecebidas}</div>
              <div className="text-xs text-muted-foreground">Recebidas</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{lotesPendentes.length}</div>
              <div className="text-xs text-muted-foreground">Lotes Pendentes</div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs defaultValue="solicitacoes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="solicitacoes">Solicitações</TabsTrigger>
          <TabsTrigger value="lotes">Lotes Pendentes ({lotesPendentes.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="solicitacoes" className="space-y-4">
          {/* Filtros */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label>Loja Solicitante</Label>
                  <Select value={filtroLoja} onValueChange={setFiltroLoja}>
                    <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todas</SelectItem>
                      {lojas.map(l => (
                        <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Peça</Label>
                  <Input
                    placeholder="Buscar peça..."
                    value={filtroPeca}
                    onChange={e => setFiltroPeca(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                    <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="Pendente">Pendente</SelectItem>
                      <SelectItem value="Aprovada">Aprovada</SelectItem>
                      <SelectItem value="Enviada">Enviada</SelectItem>
                      <SelectItem value="Recebida">Recebida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2 md:col-span-2">
                  <Button 
                    onClick={handleCriarLote} 
                    disabled={selecionadas.length === 0}
                    className="flex-1"
                  >
                    <Layers className="h-4 w-4 mr-2" />
                    Criar Lote ({selecionadas.length})
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabela */}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Loja</TableHead>
                  <TableHead>OS</TableHead>
                  <TableHead>Peça</TableHead>
                  <TableHead>Qtd</TableHead>
                  <TableHead>Justificativa</TableHead>
                  <TableHead>SLA</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {solicitacoesFiltradas.map(sol => (
                  <TableRow 
                    key={sol.id}
                    className={cn(
                      sol.status === 'Pendente' && 'bg-yellow-50 dark:bg-yellow-900/10',
                      sol.status === 'Aprovada' && 'bg-blue-50 dark:bg-blue-900/10'
                    )}
                  >
                    <TableCell>
                      {sol.status === 'Aprovada' && !sol.loteId && (
                        <Checkbox 
                          checked={selecionadas.includes(sol.id)}
                          onCheckedChange={(checked) => handleSelecionarParaLote(sol.id, checked as boolean)}
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(sol.dataSolicitacao).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-xs">{getLojaNome(sol.lojaSolicitante)}</TableCell>
                    <TableCell>
                      <Button 
                        variant="link" 
                        className="p-0 h-auto text-xs font-mono"
                        onClick={() => navigate(`/os/assistencia/${sol.osId}`)}
                      >
                        {sol.osId}
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium">{sol.peca}</TableCell>
                    <TableCell>{sol.quantidade}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                      {sol.justificativa}
                    </TableCell>
                    <TableCell>{getSLABadge(sol.dataSolicitacao)}</TableCell>
                    <TableCell>{getStatusBadge(sol.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {sol.status === 'Pendente' && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-green-600"
                              onClick={() => handleAbrirAprovar(sol)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-red-600"
                              onClick={() => handleRejeitar(sol)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => navigate(`/os/assistencia/${sol.osId}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {solicitacoesFiltradas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      Nenhuma solicitação encontrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="lotes" className="space-y-4">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Lote</TableHead>
                  <TableHead>Data Criação</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Qtd Solicitações</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lotesPendentes.map(lote => (
                  <TableRow key={lote.id}>
                    <TableCell className="font-mono text-xs">{lote.id}</TableCell>
                    <TableCell className="text-xs">
                      {new Date(lote.dataCriacao).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>{getFornecedorNome(lote.fornecedorId)}</TableCell>
                    <TableCell>{lote.solicitacoes.length}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(lote.valorTotal)}</TableCell>
                    <TableCell>
                      <Badge className="bg-yellow-500">Pendente</Badge>
                    </TableCell>
                    <TableCell>
                      <Button 
                        size="sm"
                        onClick={() => handleEnviarLote(lote.id)}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Enviar Lote
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {lotesPendentes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum lote pendente
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal Aprovar */}
      <Dialog open={aprovarOpen} onOpenChange={setAprovarOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Aprovar Solicitação</DialogTitle>
          </DialogHeader>
          
          {solicitacaoSelecionada && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{solicitacaoSelecionada.peca}</p>
                <p className="text-sm text-muted-foreground">
                  OS: {solicitacaoSelecionada.osId} | Qtd: {solicitacaoSelecionada.quantidade}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{solicitacaoSelecionada.justificativa}</p>
              </div>

              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label>Fornecedor *</Label>
                  <div className="flex gap-2">
                    <Select value={formAprovar.fornecedorId} onValueChange={v => setFormAprovar({...formAprovar, fornecedorId: v})}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {fornecedores.map(f => (
                          <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={() => setNovoFornecedorOpen(true)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Valor da Peça (R$) *</Label>
                  <Input
                    value={formAprovar.valorPeca}
                    onChange={e => setFormAprovar({...formAprovar, valorPeca: formatCurrencyInput(e.target.value)})}
                    placeholder="R$ 0,00"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Responsável pela Compra *</Label>
                  <Select value={formAprovar.responsavelCompra} onValueChange={v => setFormAprovar({...formAprovar, responsavelCompra: v})}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {colaboradores.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data Recebimento</Label>
                    <Input
                      type="date"
                      value={formAprovar.dataRecebimento}
                      onChange={e => setFormAprovar({...formAprovar, dataRecebimento: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data Envio Loja</Label>
                    <Input
                      type="date"
                      value={formAprovar.dataEnvio}
                      onChange={e => setFormAprovar({...formAprovar, dataEnvio: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setAprovarOpen(false)}>Cancelar</Button>
            <Button onClick={handleAprovar}>
              <Check className="h-4 w-4 mr-2" />
              Salvar Aprovação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Novo Fornecedor */}
      <Dialog open={novoFornecedorOpen} onOpenChange={setNovoFornecedorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Fornecedor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Fornecedor</Label>
              <Input
                value={novoFornecedorNome}
                onChange={e => setNovoFornecedorNome(e.target.value)}
                placeholder="Nome do fornecedor..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovoFornecedorOpen(false)}>Cancelar</Button>
            <Button onClick={handleAdicionarFornecedor}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </EstoqueLayout>
  );
}
