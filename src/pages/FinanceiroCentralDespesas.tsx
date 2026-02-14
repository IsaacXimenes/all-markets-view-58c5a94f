import { useState, useMemo, useEffect } from 'react';
import { FinanceiroLayout } from '@/components/layout/FinanceiroLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Download, Plus, Trash2, Calendar, ChevronDown, DollarSign, CalendarDays, AlertTriangle, CheckCircle, Clock, TrendingUp, Eye, XCircle, Paperclip } from 'lucide-react';
import { FileUploadComprovante } from '@/components/estoque/FileUploadComprovante';
import { getDespesas, addDespesa, deleteDespesa, updateDespesa, pagarDespesa, provisionarProximoPeriodo, provisionarRecorrenciaContinua, encerrarRecorrencia, atualizarStatusVencidos, CATEGORIAS_DESPESA, type Despesa } from '@/utils/financeApi';
import { getContasFinanceiras } from '@/utils/cadastrosApi';
import { useCadastroStore } from '@/store/cadastroStore';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import { InputComMascara } from '@/components/ui/InputComMascara';
import { formatCurrency, exportToCSV, parseMoeda } from '@/utils/formatUtils';
import { AutocompleteLoja } from '@/components/AutocompleteLoja';
import { AgendaEletronicaModal } from '@/components/gestao/AgendaEletronicaModal';
import { temAnotacaoImportante } from '@/utils/agendaGestaoApi';
import { getStatusRowClass } from '@/utils/statusColors';

const gerarListaCompetencias = () => {
  const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  const anoAtual = new Date().getFullYear();
  const competencias: string[] = [];
  for (let ano = anoAtual - 1; ano <= anoAtual + 1; ano++) {
    for (const mes of meses) {
      competencias.push(`${mes}-${ano}`);
    }
  }
  return competencias;
};

const getCompetenciaAtual = () => {
  const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  const now = new Date();
  return `${meses[now.getMonth()]}-${now.getFullYear()}`;
};

export default function FinanceiroCentralDespesas() {
  const { user } = useAuthStore();
  const { obterLojaById } = useCadastroStore();
  const contasFinanceiras = getContasFinanceiras().filter(c => c.status === 'Ativo');
  const competencias = useMemo(() => gerarListaCompetencias(), []);

  // Atualizar vencidos na inicialização
  useEffect(() => {
    const count = atualizarStatusVencidos();
    if (count > 0) {
      toast.warning(`${count} despesa(s) marcada(s) como vencida(s)`);
    }
  }, []);

  const [despesas, setDespesas] = useState(getDespesas());
  const refreshDespesas = () => setDespesas(getDespesas());

  // Filtros
  const [filtroCompetencia, setFiltroCompetencia] = useState(getCompetenciaAtual());
  const [filtroLoja, setFiltroLoja] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [buscaGlobal, setBuscaGlobal] = useState('');

  // Form
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({
    tipo: '' as '' | 'Fixa' | 'Variável',
    descricao: '',
    valor: '',
    lojaId: '',
    categoria: '',
    dataVencimento: new Date().toISOString().split('T')[0],
    diaVencimento: '' as string | number,
    competencia: '',
    conta: '',
    recorrente: false,
    periodicidade: '' as '' | 'Mensal' | 'Trimestral' | 'Anual',
    observacoes: ''
  });
  const [formDocumento, setFormDocumento] = useState<string>('');

  // Modals
  const [pagarModal, setPagarModal] = useState<Despesa | null>(null);
  const [provisionarModal, setProvisionarModal] = useState<Despesa | null>(null);
  const [detalheModal, setDetalheModal] = useState<Despesa | null>(null);
  const [agendaOpen, setAgendaOpen] = useState(false);
  const [agendaDespesaId, setAgendaDespesaId] = useState('');
  const [agendaTitulo, setAgendaTitulo] = useState('');

  // Lote
  const [selectedDespesas, setSelectedDespesas] = useState<string[]>([]);
  const [dialogLoteOpen, setDialogLoteOpen] = useState(false);
  const [novaCompetenciaLote, setNovaCompetenciaLote] = useState('');

  // Encerrar recorrência
  const [encerrarModal, setEncerrarModal] = useState<Despesa | null>(null);
  const [dataEncerramento, setDataEncerramento] = useState('');
  
  // Comprovante de pagamento
  const [comprovantePagamento, setComprovantePagamento] = useState<string>('');

  // Refresh key for agenda indicators
  const [agendaRefresh, setAgendaRefresh] = useState(0);

  // Filtrar despesas
  const despesasFiltradas = useMemo(() => {
    let result = despesas;
    if (filtroCompetencia && filtroCompetencia !== 'all') result = result.filter(d => d.competencia === filtroCompetencia);
    if (filtroLoja) result = result.filter(d => d.lojaId === filtroLoja);
    if (filtroCategoria && filtroCategoria !== 'all') result = result.filter(d => d.categoria === filtroCategoria);
    if (filtroStatus && filtroStatus !== 'all') result = result.filter(d => d.status === filtroStatus);
    if (filtroTipo && filtroTipo !== 'all') result = result.filter(d => d.tipo === filtroTipo);
    if (buscaGlobal) {
      const busca = buscaGlobal.toLowerCase();
      result = result.filter(d => d.descricao.toLowerCase().includes(busca) || d.categoria.toLowerCase().includes(busca));
    }
    return result;
  }, [despesas, filtroCompetencia, filtroLoja, filtroCategoria, filtroStatus, filtroTipo, buscaGlobal]);

  // Dashboard cards
  const totalRealizado = useMemo(() => despesasFiltradas.filter(d => d.status === 'Pago').reduce((a, d) => a + d.valor, 0), [despesasFiltradas]);
  const totalPrevisto = useMemo(() => despesasFiltradas.filter(d => d.status === 'À vencer' || d.status === 'Vencido').reduce((a, d) => a + d.valor, 0), [despesasFiltradas]);
  const totalPeriodo = totalRealizado + totalPrevisto;
  const qtdVencidas = useMemo(() => despesasFiltradas.filter(d => d.status === 'Vencido').length, [despesasFiltradas]);

  const resetForm = () => {
    setForm({ tipo: '', descricao: '', valor: '', lojaId: '', categoria: '', dataVencimento: new Date().toISOString().split('T')[0], diaVencimento: '', competencia: '', conta: '', recorrente: false, periodicidade: '', observacoes: '' });
    setFormDocumento('');
  };

  // Helper: inferir data de vencimento a partir de dia + competência
  const inferirDataVencimento = (dia: number, competencia: string): string => {
    const mesesMap: Record<string, number> = { JAN: 0, FEV: 1, MAR: 2, ABR: 3, MAI: 4, JUN: 5, JUL: 6, AGO: 7, SET: 8, OUT: 9, NOV: 10, DEZ: 11 };
    const [mesStr, anoStr] = competencia.split('-');
    const mes = mesesMap[mesStr] ?? new Date().getMonth();
    const ano = parseInt(anoStr) || new Date().getFullYear();
    // Limitar dia ao último dia do mês
    const ultimoDia = new Date(ano, mes + 1, 0).getDate();
    const diaReal = Math.min(dia, ultimoDia);
    return `${ano}-${String(mes + 1).padStart(2, '0')}-${String(diaReal).padStart(2, '0')}`;
  };

  const handleLancar = () => {
    const isRecorrente = form.tipo === 'Fixa' && form.recorrente;
    
    if (!form.tipo || !form.descricao || !form.valor || !form.lojaId || !form.categoria || !form.competencia || !form.conta) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    if (isRecorrente && !form.periodicidade) {
      toast.error('Selecione a periodicidade');
      return;
    }
    if (isRecorrente && (!form.diaVencimento || Number(form.diaVencimento) < 1 || Number(form.diaVencimento) > 31)) {
      toast.error('Informe o dia do vencimento (1 a 31)');
      return;
    }
    if (!isRecorrente && !form.dataVencimento) {
      toast.error('Informe a data de vencimento');
      return;
    }

    const competenciaNova = form.competencia;
    const diaVenc = isRecorrente ? Number(form.diaVencimento) : undefined;
    const dataVencimento = isRecorrente 
      ? inferirDataVencimento(diaVenc!, competenciaNova)
      : form.dataVencimento;

    const novaDespesa = addDespesa({
      tipo: form.tipo,
      descricao: form.descricao,
      valor: parseMoeda(form.valor),
      data: new Date().toISOString().split('T')[0],
      competencia: competenciaNova,
      conta: form.conta,
      observacoes: form.observacoes,
      lojaId: form.lojaId,
      status: 'À vencer',
      categoria: form.categoria,
      dataVencimento,
      dataPagamento: null,
      recorrente: isRecorrente,
      periodicidade: isRecorrente ? (form.periodicidade as 'Mensal' | 'Trimestral' | 'Anual') : null,
      pagoPor: null,
      diaVencimento: diaVenc,
      ...(formDocumento ? { documento: formDocumento } : {}),
    });
    // Auto-provisionamento contínuo para despesas recorrentes (12 meses)
    if (isRecorrente && form.periodicidade) {
      const criadas = provisionarRecorrenciaContinua(novaDespesa.id, 12);
      if (criadas.length > 0) {
        toast.success(`${criadas.length} despesa(s) futura(s) agendada(s) automaticamente`);
      }
    }
    refreshDespesas();
    // Ajustar filtro de competência para exibir a despesa recém-lançada
    if (filtroCompetencia !== 'all' && filtroCompetencia !== competenciaNova) {
      setFiltroCompetencia(competenciaNova);
    }
    setFormOpen(false);
    toast.success('Despesa lançada com sucesso');
    resetForm();
  };

  const handlePagar = () => {
    if (!pagarModal) return;
    pagarDespesa(pagarModal.id, user?.colaborador?.nome || 'Não identificado', comprovantePagamento || undefined);
    refreshDespesas();
    toast.success(`Despesa ${pagarModal.id} marcada como Paga`);
    if (pagarModal.recorrente) {
      setProvisionarModal(pagarModal);
    }
    setPagarModal(null);
    setComprovantePagamento('');
  };

  const handleProvisionar = (sim: boolean) => {
    if (sim && provisionarModal) {
      const nova = provisionarProximoPeriodo(provisionarModal.id);
      if (nova) {
        refreshDespesas();
        toast.success(`Despesa provisionada para ${nova.competencia}`);
      }
    }
    setProvisionarModal(null);
  };

  const handleDelete = (id: string) => {
    if (deleteDespesa(id)) {
      refreshDespesas();
      toast.success('Despesa excluída');
    }
  };

  const handleExport = () => {
    const data = despesasFiltradas.map(d => ({
      ID: d.id, Tipo: d.tipo, Categoria: d.categoria, Descrição: d.descricao,
      Loja: obterLojaById(d.lojaId)?.nome || d.lojaId,
      Vencimento: d.dataVencimento, Competência: d.competencia,
      Valor: formatCurrency(d.valor), Status: d.status, Conta: d.conta,
      Observações: d.observacoes || ''
    }));
    exportToCSV(data, `central-despesas-${new Date().toISOString().split('T')[0]}.csv`);
    toast.success('Despesas exportadas!');
  };

  const handleSelectDespesa = (id: string) => {
    setSelectedDespesas(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
    if (selectedDespesas.length === despesasFiltradas.length) setSelectedDespesas([]);
    else setSelectedDespesas(despesasFiltradas.map(d => d.id));
  };

  const handleAlterarCompetenciaLote = () => {
    if (!novaCompetenciaLote) { toast.error('Selecione a nova competência'); return; }
    selectedDespesas.forEach(id => updateDespesa(id, { competencia: novaCompetenciaLote }));
    refreshDespesas();
    setDialogLoteOpen(false);
    setSelectedDespesas([]);
    setNovaCompetenciaLote('');
    toast.success(`Competência alterada para ${selectedDespesas.length} despesa(s)`);
  };

  const getRowClass = (status: string) => getStatusRowClass(status);

  return (
    <FinanceiroLayout title="Central de Despesas">
      <div className="space-y-6">
        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <CheckCircle className="h-4 w-4 text-green-600" /> Total Realizado
              </div>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totalRealizado)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Clock className="h-4 w-4 text-yellow-600" /> Total Previsto
              </div>
              <p className="text-2xl font-bold text-yellow-600">{formatCurrency(totalPrevisto)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4" /> Custo Total do Período
              </div>
              <p className="text-2xl font-bold">{formatCurrency(totalPeriodo)}</p>
            </CardContent>
          </Card>
          <Card className={qtdVencidas > 0 ? 'border-red-300 dark:border-red-800' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <AlertTriangle className="h-4 w-4 text-red-600" /> Vencidas
              </div>
              <p className={`text-2xl font-bold ${qtdVencidas > 0 ? 'text-red-600' : ''}`}>{qtdVencidas}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
              <div>
                <Label className="text-xs">Competência</Label>
                <Select value={filtroCompetencia} onValueChange={setFiltroCompetencia}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="all">Todas</SelectItem>
                    {competencias.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Loja</Label>
                <AutocompleteLoja value={filtroLoja} onChange={setFiltroLoja} placeholder="Todas" />
              </div>
              <div>
                <Label className="text-xs">Categoria</Label>
                <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                  <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {CATEGORIAS_DESPESA.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="À vencer">À vencer</SelectItem>
                    <SelectItem value="Vencido">Vencido</SelectItem>
                    <SelectItem value="Pago">Pago</SelectItem>
                    <SelectItem value="Agendado">Agendado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="Fixa">Fixa</SelectItem>
                    <SelectItem value="Variável">Variável</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Busca</Label>
                <Input value={buscaGlobal} onChange={e => setBuscaGlobal(e.target.value)} placeholder="Pesquisar..." />
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setFiltroCompetencia(getCompetenciaAtual());
                    setFiltroLoja('');
                    setFiltroCategoria('');
                    setFiltroStatus('');
                    setFiltroTipo('');
                    setBuscaGlobal('');
                  }}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Formulário de Lançamento */}
        <Collapsible open={formOpen} onOpenChange={setFormOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" /> Nova Despesa
                </CardTitle>
                <ChevronDown className={`h-5 w-5 transition-transform ${formOpen ? 'rotate-180' : ''}`} />
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label>Tipo *</Label>
                    <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as 'Fixa' | 'Variável', recorrente: false, periodicidade: '' })}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Fixa">Fixa</SelectItem>
                        <SelectItem value="Variável">Variável</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Descrição *</Label>
                    <Input value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} placeholder="Ex: Aluguel, Marketing..." />
                  </div>
                  <div>
                    <Label>Valor (R$) *</Label>
                    <InputComMascara mascara="moeda" value={form.valor} onChange={valor => setForm({ ...form, valor })} placeholder="R$ 0,00" />
                  </div>
                  <div>
                    <Label>Loja *</Label>
                    <AutocompleteLoja value={form.lojaId} onChange={lojaId => setForm({ ...form, lojaId })} />
                  </div>
                  <div>
                    <Label>Categoria *</Label>
                    <Select value={form.categoria} onValueChange={v => setForm({ ...form, categoria: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>{CATEGORIAS_DESPESA.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  {form.tipo === 'Fixa' && form.recorrente ? (
                    <div>
                      <Label>Dia do Vencimento *</Label>
                      <Input 
                        type="number" 
                        min={1} 
                        max={31} 
                        value={form.diaVencimento} 
                        onChange={e => setForm({ ...form, diaVencimento: e.target.value })} 
                        placeholder="Ex: 10" 
                      />
                      <p className="text-xs text-muted-foreground mt-1">Dia do mês (1-31). A data completa é inferida pela competência.</p>
                    </div>
                  ) : (
                    <div>
                      <Label>Data de Vencimento *</Label>
                      <Input type="date" value={form.dataVencimento} onChange={e => setForm({ ...form, dataVencimento: e.target.value })} />
                    </div>
                  )}
                  <div>
                    <Label>Competência *</Label>
                    <Select value={form.competencia} onValueChange={v => setForm({ ...form, competencia: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent className="max-h-60">{competencias.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Conta de Origem *</Label>
                    <Select value={form.conta} onValueChange={v => setForm({ ...form, conta: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>{contasFinanceiras.map(c => <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  {form.tipo === 'Fixa' && (
                    <>
                      <div className="flex items-end gap-3">
                        <div className="flex items-center gap-2 pb-2">
                          <Checkbox checked={form.recorrente} onCheckedChange={v => setForm({ ...form, recorrente: !!v })} />
                          <Label className="cursor-pointer">Recorrente</Label>
                        </div>
                      </div>
                      {form.recorrente && (
                        <div>
                          <Label>Periodicidade *</Label>
                          <Select value={form.periodicidade} onValueChange={v => setForm({ ...form, periodicidade: v as 'Mensal' | 'Trimestral' | 'Anual' })}>
                            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Mensal">Mensal</SelectItem>
                              <SelectItem value="Trimestral">Trimestral</SelectItem>
                              <SelectItem value="Anual">Anual</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div>
                  <Label>Observações</Label>
                  <Textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} placeholder="Observações adicionais..." />
                </div>
                <div>
                  <Label>Documento/Anexo</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      type="file" 
                      accept="image/*,.pdf,.doc,.docx"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        setFormDocumento(file ? file.name : '');
                      }}
                    />
                    {formDocumento && (
                      <Badge variant="outline" className="gap-1 whitespace-nowrap">
                        <Paperclip className="h-3 w-3" />
                        {formDocumento}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Opcional. Anexe um documento de referência.</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={resetForm}>Limpar</Button>
                  <Button onClick={handleLancar} className="flex-1"><Plus className="h-4 w-4 mr-2" /> Lançar Despesa</Button>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Tabela */}
        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle>Despesas ({despesasFiltradas.length})</CardTitle>
            <div className="flex gap-2">
              {selectedDespesas.length > 0 && (
                <Button size="sm" variant="outline" onClick={() => setDialogLoteOpen(true)}>
                  <Calendar className="h-4 w-4 mr-2" /> Competência ({selectedDespesas.length})
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" /> CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Loja</TableHead>
                    <TableHead>Lançamento</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Dias p/ Venc.</TableHead>
                    <TableHead>Competência</TableHead>
                    <TableHead>Conta de Origem</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {despesasFiltradas.map(d => (
                    <TableRow key={d.id} className={getRowClass(d.status)}>
                      <TableCell className="font-mono text-xs">{d.id}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={d.tipo === 'Fixa' ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400' : 'bg-orange-500/10 text-orange-700 dark:text-orange-400'}>
                          {d.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{d.categoria}</TableCell>
                      <TableCell>{d.descricao}</TableCell>
                      <TableCell className="text-xs">{obterLojaById(d.lojaId)?.nome || '-'}</TableCell>
                      <TableCell className="text-xs">{new Date(d.data + 'T00:00:00').toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>{new Date(d.dataVencimento + 'T00:00:00').toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>
                        {(() => {
                          if (d.status === 'Pago' || d.status === 'Agendado') return <span className="text-muted-foreground">-</span>;
                          const hoje = new Date();
                          hoje.setHours(0, 0, 0, 0);
                          const venc = new Date(d.dataVencimento + 'T00:00:00');
                          const diffDias = Math.ceil((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
                          
                          let badgeClass = '';
                          let label = '';
                          
                          if (diffDias < 0) {
                            badgeClass = 'bg-red-500/10 text-red-700 dark:text-red-400';
                            label = `Vencido há ${Math.abs(diffDias)}d`;
                          } else if (diffDias === 0) {
                            badgeClass = 'bg-orange-500/10 text-orange-700 dark:text-orange-400';
                            label = 'Hoje';
                          } else if (diffDias <= 3) {
                            badgeClass = 'bg-red-500/10 text-red-700 dark:text-red-400';
                            label = `${diffDias}d`;
                          } else if (diffDias <= 9) {
                            badgeClass = 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400';
                            label = `${diffDias}d`;
                          } else {
                            badgeClass = 'bg-green-500/10 text-green-700 dark:text-green-400';
                            label = `${diffDias}d`;
                          }
                          
                          return <Badge variant="outline" className={badgeClass}>{label}</Badge>;
                        })()}
                      </TableCell>
                      <TableCell>{d.competencia}</TableCell>
                      <TableCell className="text-xs">{d.conta}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(d.valor)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className={
                            d.status === 'Pago' ? 'bg-green-500/10 text-green-700 dark:text-green-400' :
                            d.status === 'Vencido' ? 'bg-red-500/10 text-red-700 dark:text-red-400' :
                            d.status === 'Agendado' ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400' :
                            'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
                          }>
                            {d.status}
                          </Badge>
                          {(d.comprovante || d.documento) && (
                            <span title="Contém Anexo"><Paperclip className="h-3 w-3 text-muted-foreground" /></span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{d.pagoPor || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setDetalheModal(d)} title="Detalhes">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {d.status !== 'Pago' && (
                            <Button size="sm" variant="ghost" onClick={() => setPagarModal(d)} title="Pagar">
                              <DollarSign className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                          {d.recorrente && d.status !== 'Pago' && !(d as any).recorrenciaEncerrada && (
                            <Button size="sm" variant="ghost" onClick={() => { setEncerrarModal(d); setDataEncerramento(''); }} title="Encerrar Recorrência">
                              <XCircle className="h-4 w-4 text-orange-600" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(d.id)} title="Excluir">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <div className="relative">
                            <Button size="sm" variant="ghost" onClick={() => { setAgendaDespesaId(d.id); setAgendaTitulo(`Agenda - ${d.descricao}`); setAgendaOpen(true); }} title="Agenda">
                              <CalendarDays className="h-4 w-4" />
                            </Button>
                            {temAnotacaoImportante(`despesa_${d.id}`) && (
                              <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full" />
                            )}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {despesasFiltradas.length === 0 && (
                    <TableRow><TableCell colSpan={14} className="text-center text-muted-foreground py-8">Nenhuma despesa encontrada</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 pt-4 border-t text-right">
              <span className="text-lg font-bold">Total: {formatCurrency(despesasFiltradas.reduce((a, d) => a + d.valor, 0))}</span>
            </div>
          </CardContent>
        </Card>

        {/* Modal Pagar */}
        <Dialog open={!!pagarModal} onOpenChange={v => !v && setPagarModal(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Confirmar Pagamento</DialogTitle></DialogHeader>
            {pagarModal && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Despesa:</span><span className="font-medium">{pagarModal.descricao}</span>
                  <span className="text-muted-foreground">Valor:</span><span className="font-semibold">{formatCurrency(pagarModal.valor)}</span>
                  <span className="text-muted-foreground">Conta:</span><span>{pagarModal.conta}</span>
                  <span className="text-muted-foreground">Vencimento:</span><span>{new Date(pagarModal.dataVencimento + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                </div>
                <FileUploadComprovante
                  label="Comprovante de Pagamento"
                  value={comprovantePagamento}
                  onFileChange={({ comprovanteNome }) => setComprovantePagamento(comprovanteNome)}
                />
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setPagarModal(null)}>Cancelar</Button>
              <Button onClick={handlePagar} className="bg-green-600 hover:bg-green-700 text-white">
                <CheckCircle className="h-4 w-4 mr-2" /> Confirmar Pagamento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Provisionar */}
        <Dialog open={!!provisionarModal} onOpenChange={v => !v && setProvisionarModal(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Provisionar Próximo Período?</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground py-4">
              Esta despesa é recorrente ({provisionarModal?.periodicidade}). Deseja criar automaticamente a próxima despesa agendada?
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleProvisionar(false)}>Não</Button>
              <Button onClick={() => handleProvisionar(true)}>Sim, Provisionar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Competência em Lote */}
        <Dialog open={dialogLoteOpen} onOpenChange={setDialogLoteOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Alterar Competência em Lote</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">Alterar competência de {selectedDespesas.length} despesa(s).</p>
              <div>
                <Label>Nova Competência *</Label>
                <Select value={novaCompetenciaLote} onValueChange={setNovaCompetenciaLote}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent className="max-h-60">{competencias.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogLoteOpen(false)}>Cancelar</Button>
              <Button onClick={handleAlterarCompetenciaLote}>Alterar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Encerrar Recorrência */}
        <Dialog open={!!encerrarModal} onOpenChange={v => !v && setEncerrarModal(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Encerrar Recorrência</DialogTitle></DialogHeader>
            {encerrarModal && (
              <div className="space-y-4 py-4">
                <p className="text-sm text-muted-foreground">
                  Ao encerrar a recorrência de <strong>{encerrarModal.descricao}</strong>, nenhum novo lançamento será criado automaticamente a partir da data informada.
                  Os lançamentos já criados serão mantidos.
                </p>
                <div>
                  <Label>Data de Encerramento *</Label>
                  <Input type="date" value={dataEncerramento} onChange={e => setDataEncerramento(e.target.value)} />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEncerrarModal(null)}>Cancelar</Button>
              <Button
                variant="destructive"
                disabled={!dataEncerramento}
                onClick={() => {
                  if (encerrarModal && dataEncerramento) {
                    encerrarRecorrencia(encerrarModal.id, dataEncerramento);
                    refreshDespesas();
                    toast.success(`Recorrência de "${encerrarModal.descricao}" encerrada a partir de ${new Date(dataEncerramento + 'T00:00:00').toLocaleDateString('pt-BR')}`);
                    setEncerrarModal(null);
                  }
                }}
              >
                <XCircle className="h-4 w-4 mr-2" /> Encerrar Recorrência
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Detalhes */}
        <Dialog open={!!detalheModal} onOpenChange={v => !v && setDetalheModal(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Detalhes da Despesa
              </DialogTitle>
            </DialogHeader>
            {detalheModal && (
              <div className="space-y-5 py-2">
                {/* Cabeçalho com valor e status em destaque */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                  <div>
                    <p className="text-xs text-muted-foreground">Valor</p>
                    <p className="text-2xl font-bold">{formatCurrency(detalheModal.valor)}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <Badge variant="outline" className={
                      detalheModal.status === 'Pago' ? 'bg-green-500/10 text-green-700 dark:text-green-400' :
                      detalheModal.status === 'Vencido' ? 'bg-red-500/10 text-red-700 dark:text-red-400' :
                      detalheModal.status === 'Agendado' ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400' :
                      'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
                    }>{detalheModal.status}</Badge>
                    <div className="mt-1">
                      <Badge variant="outline" className={detalheModal.tipo === 'Fixa' ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400' : 'bg-orange-500/10 text-orange-700 dark:text-orange-400'}>
                        {detalheModal.tipo}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Informações Gerais */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Informações Gerais</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">ID</p>
                      <p className="text-sm font-mono">{detalheModal.id}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">Categoria</p>
                      <p className="text-sm font-medium">{detalheModal.categoria}</p>
                    </div>
                    <div className="col-span-2 space-y-0.5">
                      <p className="text-xs text-muted-foreground">Descrição</p>
                      <p className="text-sm font-medium">{detalheModal.descricao}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">Loja</p>
                      <p className="text-sm">{obterLojaById(detalheModal.lojaId)?.nome || '-'}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">Conta de Origem</p>
                      <p className="text-sm">{detalheModal.conta}</p>
                    </div>
                  </div>
                </div>

                <hr className="border-border" />

                {/* Datas */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Datas e Competência</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">Lançamento</p>
                      <p className="text-sm">{new Date(detalheModal.data + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">Vencimento</p>
                      <p className="text-sm font-medium">{new Date(detalheModal.dataVencimento + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">Competência</p>
                      <p className="text-sm">{detalheModal.competencia}</p>
                    </div>
                  </div>
                  {detalheModal.dataPagamento && (
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">Data Pagamento</p>
                        <p className="text-sm text-green-600 font-medium">{new Date(detalheModal.dataPagamento + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                  )}
                </div>

                <hr className="border-border" />

                {/* Responsável e Recorrência */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Responsável e Recorrência</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">Pago por</p>
                      <p className="text-sm">{detalheModal.pagoPor || '-'}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">Recorrente</p>
                      <p className="text-sm">{detalheModal.recorrente ? `Sim (${detalheModal.periodicidade})` : 'Não'}</p>
                    </div>
                  </div>
                </div>

                {/* Anexos */}
                {(detalheModal.comprovante || detalheModal.documento) && (
                  <>
                    <hr className="border-border" />
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Anexos</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {detalheModal.comprovante && (
                          <div className="space-y-0.5">
                            <p className="text-xs text-muted-foreground">Comprovante</p>
                            <p className="text-sm flex items-center gap-1"><Paperclip className="h-3 w-3" /> {detalheModal.comprovante}</p>
                          </div>
                        )}
                        {detalheModal.documento && (
                          <div className="space-y-0.5">
                            <p className="text-xs text-muted-foreground">Documento</p>
                            <p className="text-sm flex items-center gap-1"><Paperclip className="h-3 w-3" /> {detalheModal.documento}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Observações */}
                {detalheModal.observacoes && (
                  <>
                    <hr className="border-border" />
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Observações</h4>
                      <p className="text-sm bg-muted p-3 rounded-lg">{detalheModal.observacoes}</p>
                    </div>
                  </>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetalheModal(null)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Agenda Eletrônica */}
        <AgendaEletronicaModal
          open={agendaOpen}
          onOpenChange={setAgendaOpen}
          chaveContexto={`despesa_${agendaDespesaId}`}
          titulo={agendaTitulo}
          onAnotacaoRegistrada={() => setAgendaRefresh(k => k + 1)}
        />
      </div>
    </FinanceiroLayout>
  );
}
