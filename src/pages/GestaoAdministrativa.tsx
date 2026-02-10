import { useState, useMemo } from 'react';
import { GestaoAdministrativaLayout } from '@/components/layout/GestaoAdministrativaLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Eye, Edit3, DollarSign, CheckCircle2, Clock, AlertTriangle, ShieldAlert, TrendingUp, Calendar, Info, CalendarIcon, CalendarDays, Store } from 'lucide-react';
import { useCadastroStore } from '@/store/cadastroStore';
import { useAuthStore } from '@/store/authStore';
import { AutocompleteLoja } from '@/components/AutocompleteLoja';
import { AutocompleteColaborador } from '@/components/AutocompleteColaborador';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, parseISO, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  consolidarVendasPorDia,
  getVendasPorDiaMetodo,
  getVendasDoDia,
  toggleConferencia,
  registrarAjuste,
  calcularResumoConferencia,
  formatarDataExibicao,
  getCompetenciasDisponiveis,
  METODOS_PAGAMENTO,
  ConferenciaDiaria,
  VendaDrillDown,
  AjusteDivergencia
} from '@/utils/gestaoAdministrativaApi';
import { Venda } from '@/utils/vendasApi';
import { AgendaEletronicaModal } from '@/components/gestao/AgendaEletronicaModal';
import { temAnotacaoImportante } from '@/utils/agendaGestaoApi';

export default function GestaoAdministrativa() {
  const { lojas, colaboradores } = useCadastroStore();
  const { user } = useAuthStore();
  
  // Verificar se é gestor - busca no cadastro ou fallback pelo cargo do authStore
  const colaboradorLogado = colaboradores.find(c => c.id === user?.colaborador?.id);
  const ehGestor = colaboradorLogado?.eh_gestor ?? user?.colaborador?.cargo?.toLowerCase().includes('gestor') ?? false;
  
  // Estados de filtros - competência derivada das datas
  const [competencia, setCompetencia] = useState(format(new Date(), 'yyyy-MM'));
  const [lojaId, setLojaId] = useState<string>('');
  const [vendedorId, setVendedorId] = useState<string>('');
  const [dataInicio, setDataInicio] = useState<Date | undefined>(
    startOfWeek(new Date(), { weekStartsOn: 0 })
  );
  const [dataFim, setDataFim] = useState<Date | undefined>(
    endOfWeek(new Date(), { weekStartsOn: 0 })
  );
  
  // Modal de confirmação do checkbox
  const [modalConfirmacaoCheck, setModalConfirmacaoCheck] = useState<{
    open: boolean;
    conf: ConferenciaDiaria | null;
    metodo: string;
    valor: number;
    acao: 'Marcar' | 'Desmarcar';
  }>({ open: false, conf: null, metodo: '', valor: 0, acao: 'Marcar' });
  
  // Estados de modais
  const [modalDetalhesOpen, setModalDetalhesOpen] = useState(false);
  const [modalAjusteOpen, setModalAjusteOpen] = useState(false);
  const [conferenciaSelecionada, setConferenciaSelecionada] = useState<ConferenciaDiaria | null>(null);
  const [metodoDrillDown, setMetodoDrillDown] = useState<string | null>(null);
  const [vendasDrillDown, setVendasDrillDown] = useState<VendaDrillDown[]>([]);
  const [vendasDoDia, setVendasDoDia] = useState<Venda[]>([]);
  
  // Estados do modal de ajuste
  const [ajusteMetodo, setAjusteMetodo] = useState('');
  const [ajusteValor, setAjusteValor] = useState('');
  const [ajusteJustificativa, setAjusteJustificativa] = useState('');
  
  // Forçar re-render após ações
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Agenda Eletrônica
  const [agendaOpen, setAgendaOpen] = useState(false);
  const [agendaLojaId, setAgendaLojaId] = useState('');
  const [agendaLojaNome, setAgendaLojaNome] = useState('');
  const [agendaData, setAgendaData] = useState('');
  
  // Lojas ativas
  const lojasAtivas = useMemo(() => {
    return lojas.filter(l => l.tipo === 'Loja' && l.ativa !== false);
  }, [lojas]);

  // Consolidar dados
  const conferencias = useMemo(() => {
    return consolidarVendasPorDia(competencia, lojaId || 'todas', vendedorId || 'todos', lojasAtivas.map(l => l.id));
  }, [competencia, lojaId, vendedorId, refreshKey, lojasAtivas]);
  
  // Filtrar por período
  const conferenciasFiltradas = useMemo(() => {
    if (!dataInicio && !dataFim) return conferencias;
    return conferencias.filter(conf => {
      const dataConf = parseISO(conf.data);
      if (dataInicio && dataConf < dataInicio) return false;
      if (dataFim && dataConf > dataFim) return false;
      return true;
    });
  }, [conferencias, dataInicio, dataFim]);

  const conferenciasPorLoja = useMemo(() => {
    const mapa = new Map<string, { lojaId: string; lojaNome: string; conferencias: ConferenciaDiaria[] }>();
    // Inicializar todas as lojas ativas (mesmo sem conferências)
    for (const loja of lojasAtivas) {
      mapa.set(loja.id, { lojaId: loja.id, lojaNome: loja.nome, conferencias: [] });
    }
    // Distribuir conferências nas lojas
    for (const conf of conferenciasFiltradas) {
      if (mapa.has(conf.lojaId)) {
        mapa.get(conf.lojaId)!.conferencias.push(conf);
      } else {
        const loja = lojas.find(l => l.id === conf.lojaId);
        mapa.set(conf.lojaId, { lojaId: conf.lojaId, lojaNome: loja?.nome || conf.lojaId, conferencias: [conf] });
      }
    }
    return Array.from(mapa.values());
  }, [conferenciasFiltradas, lojas, lojasAtivas]);
  
  const resumo = useMemo(() => {
    return calcularResumoConferencia(conferenciasFiltradas);
  }, [conferenciasFiltradas]);
  
  // Derivar competência automaticamente da data início
  const handleDataInicioChange = (date: Date | undefined) => {
    setDataInicio(date);
    if (date) {
      setCompetencia(format(date, 'yyyy-MM'));
    }
  };

  const handleAbrirAgenda = (lId: string, lNome: string, data: string) => {
    setAgendaLojaId(lId);
    setAgendaLojaNome(lNome);
    setAgendaData(data);
    setAgendaOpen(true);
  };

  // Handlers
  const handleToggleConferencia = (conf: ConferenciaDiaria, metodo: string) => {
    if (!ehGestor) {
      toast.error('Apenas gestores podem conferir valores');
      return;
    }
    
    const valorBruto = conf.totaisPorMetodo[metodo]?.bruto || 0;
    if (valorBruto === 0) return;
    
    const estaConferido = conf.totaisPorMetodo[metodo]?.conferido || false;
    setModalConfirmacaoCheck({
      open: true,
      conf,
      metodo,
      valor: valorBruto,
      acao: estaConferido ? 'Desmarcar' : 'Marcar'
    });
  };
  
  const handleConfirmarCheck = () => {
    const { conf, metodo, acao } = modalConfirmacaoCheck;
    if (!conf) return;
    
    toggleConferencia(
      competencia,
      conf.data,
      conf.lojaId,
      metodo,
      user?.colaborador?.id || '',
      user?.colaborador?.nome || 'Usuário',
      modalConfirmacaoCheck.valor
    );
    
    setRefreshKey(k => k + 1);
    setModalConfirmacaoCheck({ open: false, conf: null, metodo: '', valor: 0, acao: 'Marcar' });
    toast.success(`${metodo} ${acao === 'Desmarcar' ? 'desmarcado' : 'conferido'} com sucesso`);
  };
  
  const handleAbrirDrillDown = (conf: ConferenciaDiaria, metodo: string) => {
    const vendas = getVendasPorDiaMetodo(conf.data, conf.lojaId, metodo);
    setVendasDrillDown(vendas);
    setMetodoDrillDown(metodo);
    setConferenciaSelecionada(conf);
    setModalDetalhesOpen(true);
  };
  
  const handleAbrirDetalhesDia = (conf: ConferenciaDiaria) => {
    const vendas = getVendasDoDia(conf.data, conf.lojaId);
    setVendasDoDia(vendas);
    setMetodoDrillDown(null);
    setConferenciaSelecionada(conf);
    setModalDetalhesOpen(true);
  };
  
  const handleAbrirModalAjuste = (conf: ConferenciaDiaria) => {
    setConferenciaSelecionada(conf);
    setAjusteMetodo('');
    setAjusteValor('');
    setAjusteJustificativa('');
    setModalAjusteOpen(true);
  };
  
  const handleSalvarAjuste = () => {
    if (!ajusteMetodo || !ajusteValor || !ajusteJustificativa.trim()) {
      toast.error('Preencha todos os campos');
      return;
    }
    
    const valor = parseFloat(ajusteValor.replace(/[^\d,-]/g, '').replace(',', '.'));
    if (isNaN(valor)) {
      toast.error('Valor inválido');
      return;
    }
    
    registrarAjuste(
      competencia,
      conferenciaSelecionada!.data,
      conferenciaSelecionada!.lojaId,
      {
        metodoPagamento: ajusteMetodo,
        valorDiferenca: valor,
        justificativa: ajusteJustificativa.trim(),
        registradoPor: user?.colaborador?.id || '',
        registradoPorNome: user?.colaborador?.nome || 'Usuário'
      }
    );
    
    setRefreshKey(k => k + 1);
    setModalAjusteOpen(false);
    toast.success('Ajuste registrado com sucesso');
  };
  
  const getStatusBadge = (status: ConferenciaDiaria['statusConferencia']) => {
    switch (status) {
      case 'Conferido':
        return <Badge className="bg-green-500/20 text-green-700 border-green-500/30">🟢 Conferido</Badge>;
      case 'Parcial':
        return <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30">🟡 Parcial</Badge>;
      default:
        return <Badge className="bg-red-500/20 text-red-700 border-red-500/30">🔴 Não Conferido</Badge>;
    }
  };
  
  const getRowClass = (status: ConferenciaDiaria['statusConferencia'], hasValue: boolean) => {
    if (!hasValue) return '';
    switch (status) {
      case 'Conferido':
        return 'bg-green-500/10';
      case 'Parcial':
        return 'bg-yellow-500/10';
      default:
        return 'bg-red-500/10';
    }
  };
  
  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };
  
  const getVendedorNome = (vendedorId: string) => {
    const colaborador = colaboradores.find(c => c.id === vendedorId);
    return colaborador?.nome || vendedorId;
  };
  
  const getLojaNome = (lojaId: string) => {
    const loja = lojas.find(l => l.id === lojaId);
    return loja?.nome || lojaId;
  };
  
  // Verificar permissão
  if (!ehGestor) {
    return (
      <GestaoAdministrativaLayout title="Gestão Administrativa">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Acesso Restrito</AlertTitle>
          <AlertDescription>
            Este módulo é restrito a usuários com perfil de gestor. Entre em contato com o administrador do sistema.
          </AlertDescription>
        </Alert>
      </GestaoAdministrativaLayout>
    );
  }
  
  return (
    <GestaoAdministrativaLayout title="Conferência de Caixa">
      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="space-y-2">
          <Label>Data Início</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dataInicio && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dataInicio ? format(dataInicio, 'dd/MM/yyyy') : 'Selecione'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent mode="single" selected={dataInicio} onSelect={handleDataInicioChange} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label>Data Fim</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dataFim && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dataFim ? format(dataFim, 'dd/MM/yyyy') : 'Selecione'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent mode="single" selected={dataFim} onSelect={setDataFim} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
        </div>
        
        <div className="space-y-2">
          <Label>Loja</Label>
          <AutocompleteLoja
            value={lojaId}
            onChange={setLojaId}
            placeholder="Todas as Lojas"
            apenasLojasTipoLoja
          />
        </div>
        
        <div className="space-y-2">
          <Label>Vendedor</Label>
          <AutocompleteColaborador
            value={vendedorId}
            onChange={setVendedorId}
            placeholder="Todos os Vendedores"
            filtrarPorTipo="vendedoresEGestores"
          />
        </div>
      </div>
      
      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Total Bruto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(resumo.totalBruto)}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Conferido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(resumo.totalConferido)}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              Pendente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600">{formatCurrency(resumo.totalPendente)}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              Dias Abertos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{resumo.diasNaoConferidos}</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Quadros por Loja */}
      <div className="space-y-6">
        {conferenciasPorLoja.map(({ lojaId: lId, lojaNome, conferencias: confsLoja }) => (
          <Card key={lId}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" /> Conferência Diária - {lojaNome}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-28">Data</TableHead>
                    <TableHead>Método de Pagamento</TableHead>
                    <TableHead className="w-28">Status</TableHead>
                    <TableHead className="text-right w-32">Valor</TableHead>
                    <TableHead className="text-center w-24">Conferido</TableHead>
                    <TableHead className="text-center w-28">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {confsLoja.map(conf => {
                    const hasValue = conf.vendasTotal > 0;
                    const metodosCount = METODOS_PAGAMENTO.length;
                    
                    return METODOS_PAGAMENTO.map((metodo, idx) => {
                      const dados = conf.totaisPorMetodo[metodo];
                      const valor = dados?.bruto || 0;
                      const temValor = valor > 0;
                      const metodoStatus = temValor ? (dados?.conferido ? 'Conferido' : 'Pendente') : null;
                      
                      const rowClass = temValor
                        ? dados?.conferido ? 'bg-green-500/10' : 'bg-red-500/10'
                        : '';
                      
                      return (
                        <TableRow key={`${conf.id}-${metodo}`} className={cn(rowClass, idx === metodosCount - 1 && 'border-b-2 border-border')}>
                          {/* Data - rowSpan na primeira linha do dia */}
                          {idx === 0 && (
                            <TableCell className="font-medium align-top" rowSpan={metodosCount}>
                              <div className="flex flex-col">
                                <span>{formatarDataExibicao(conf.data)}</span>
                                <span className="text-xs text-muted-foreground capitalize">
                                  {format(parseISO(conf.data), 'EEEE', { locale: ptBR })}
                                </span>
                                {hasValue && (
                                  <span className="text-xs font-semibold mt-1">{formatCurrency(conf.vendasTotal)}</span>
                                )}
                              </div>
                            </TableCell>
                          )}
                          
                          {/* Método de Pagamento */}
                          <TableCell>{metodo}</TableCell>
                          
                          {/* Status */}
                          <TableCell>
                            {temValor ? (
                              metodoStatus === 'Conferido'
                                ? <Badge className="bg-green-500/20 text-green-700 border-green-500/30">Conferido</Badge>
                                : <Badge className="bg-red-500/20 text-red-700 border-red-500/30">Pendente</Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                          
                          {/* Valor */}
                          <TableCell className="text-right font-medium">
                            {temValor ? formatCurrency(valor) : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          
                          {/* Checkbox Conferido */}
                          <TableCell className="text-center">
                            {temValor ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex justify-center">
                                      <Checkbox
                                        checked={dados?.conferido || false}
                                        onCheckedChange={() => handleToggleConferencia(conf, metodo)}
                                      />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {dados?.conferido ? (
                                      <p>Conferido por {dados.conferidoPor} em {dados.dataConferencia ? format(new Date(dados.dataConferencia), 'dd/MM HH:mm') : '-'}</p>
                                    ) : (
                                      <p>Clique para marcar como conferido</p>
                                    )}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          
                          {/* Ações */}
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              {temValor && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => handleAbrirDrillDown(conf, metodo)}
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Ver vendas de {metodo}</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              
                              {idx === 0 && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 relative"
                                        onClick={() => handleAbrirAgenda(lId, lojaNome, conf.data)}
                                      >
                                        <CalendarDays className="h-4 w-4" />
                                        {temAnotacaoImportante(`conferencia_${lId}_${conf.data}`) && (
                                          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-destructive" />
                                        )}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Agenda Eletrônica</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    });
                  })}
                </TableBody>
              </Table>
              {confsLoja.length === 0 && (
                <div className="text-center py-4 text-muted-foreground text-sm">Nenhuma conferência registrada para este período.</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Modal de Detalhes/Drill-Down */}
      <Dialog open={modalDetalhesOpen} onOpenChange={setModalDetalhesOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {metodoDrillDown ? (
                <>Vendas do Dia {conferenciaSelecionada && formatarDataExibicao(conferenciaSelecionada.data)} - {metodoDrillDown}</>
              ) : (
                <>Todas as Vendas do Dia {conferenciaSelecionada && formatarDataExibicao(conferenciaSelecionada.data)}</>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {metodoDrillDown ? (
            // Drill-down por método de pagamento
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID Venda</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendasDrillDown.map(v => (
                    <TableRow key={`${v.id}-${v.valor}`}>
                      <TableCell className="font-mono">{v.id}</TableCell>
                      <TableCell>{v.clienteNome}</TableCell>
                      <TableCell>{getVendedorNome(v.vendedorId)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(v.valor)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="border-t pt-4 mt-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Bruto:</span>
                  <span className="text-xl font-bold">
                    {formatCurrency(vendasDrillDown.reduce((acc, v) => acc + v.valor, 0))}
                  </span>
                </div>
              </div>
            </>
          ) : (
            // Todas as vendas do dia
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Hora</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Pagamentos</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendasDoDia.map(v => (
                    <TableRow key={v.id}>
                      <TableCell className="font-mono">{v.id}</TableCell>
                      <TableCell>{format(new Date(v.dataHora), 'HH:mm')}</TableCell>
                      <TableCell>{v.clienteNome}</TableCell>
                      <TableCell>{getVendedorNome(v.vendedor)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {v.pagamentos.map(p => (
                            <Badge key={p.id} variant="outline" className="text-xs mr-1">
                              {p.meioPagamento}: {formatCurrency(p.valor)}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(v.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="border-t pt-4 mt-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total do Dia:</span>
                  <span className="text-xl font-bold">
                    {formatCurrency(vendasDoDia.reduce((acc, v) => acc + v.total, 0))}
                  </span>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Modal de Ajuste */}
      <Dialog open={modalAjusteOpen} onOpenChange={setModalAjusteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5" />
              Registrar Divergência - {conferenciaSelecionada && formatarDataExibicao(conferenciaSelecionada.data)}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Método de Pagamento</Label>
              <Select value={ajusteMetodo} onValueChange={setAjusteMetodo}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o método" />
                </SelectTrigger>
                <SelectContent>
                  {METODOS_PAGAMENTO.map(metodo => (
                    <SelectItem key={metodo} value={metodo}>
                      {metodo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Valor da Diferença (R$)</Label>
              <Input
                type="text"
                placeholder="Ex: 50,00 ou -25,00"
                value={ajusteValor}
                onChange={(e) => setAjusteValor(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Use valores positivos para valores a mais no caixa, negativos para valores a menos.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Justificativa</Label>
              <Textarea
                placeholder="Descreva o motivo da divergência..."
                value={ajusteJustificativa}
                onChange={(e) => setAjusteJustificativa(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAjusteOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSalvarAjuste}>
              Salvar Ajuste
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Modal de Confirmação do Checkbox */}
      <Dialog open={modalConfirmacaoCheck.open} onOpenChange={(open) => !open && setModalConfirmacaoCheck({ open: false, conf: null, metodo: '', valor: 0, acao: 'Marcar' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{modalConfirmacaoCheck.acao === 'Marcar' ? 'Confirmar Conferência' : 'Desmarcar Conferência'}</DialogTitle>
            <DialogDescription>
              {modalConfirmacaoCheck.acao === 'Marcar' 
                ? 'Tem certeza que deseja marcar este método como conferido?' 
                : 'Tem certeza que deseja desmarcar este método? A ação será registrada no log.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Data:</span>
              <span className="font-medium">{modalConfirmacaoCheck.conf ? formatarDataExibicao(modalConfirmacaoCheck.conf.data) : '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Método:</span>
              <span className="font-medium">{modalConfirmacaoCheck.metodo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valor:</span>
              <span className="font-medium">{formatCurrency(modalConfirmacaoCheck.valor)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ação:</span>
              <Badge variant={modalConfirmacaoCheck.acao === 'Marcar' ? 'default' : 'destructive'}>
                {modalConfirmacaoCheck.acao}
              </Badge>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalConfirmacaoCheck({ open: false, conf: null, metodo: '', valor: 0, acao: 'Marcar' })}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmarCheck} variant={modalConfirmacaoCheck.acao === 'Desmarcar' ? 'destructive' : 'default'}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AgendaEletronicaModal
        open={agendaOpen}
        onOpenChange={setAgendaOpen}
        chaveContexto={`conferencia_${agendaLojaId}_${agendaData}`}
        titulo="Agenda Eletrônica"
        subtitulo={`${agendaLojaNome} — ${agendaData ? formatarDataExibicao(agendaData) : ''}`}
      />
    </GestaoAdministrativaLayout>
  );
}
