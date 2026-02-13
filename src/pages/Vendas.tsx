import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { VendasLayout } from '@/components/layout/VendasLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Download, Eye, TrendingUp, DollarSign, Percent, ShoppingCart, CreditCard, FileText, Image, Package, Check, AlertTriangle, X } from 'lucide-react';
import { getVendas, exportVendasToCSV, formatCurrency, Venda, ItemTradeIn, AnexoTradeIn } from '@/utils/vendasApi';
import { useCadastroStore } from '@/store/cadastroStore';
import { getStatusConferenciaByVendaId, StatusConferencia } from '@/utils/conferenciaGestorApi';
import { displayIMEI } from '@/utils/imeiMask';
import { getGarantiasByVendaId, calcularStatusExpiracao } from '@/utils/garantiasApi';
import { format, addMonths } from 'date-fns';

// Mock do usuário logado
const usuarioLogado = { id: 'COL-007', nome: 'Carlos Vendedor' };

export default function Vendas() {
  const navigate = useNavigate();
  const { obterLojasAtivas, obterColaboradoresAtivos, obterNomeLoja, obterNomeColaborador, obterLojasTipoLoja } = useCadastroStore();
  const [vendas] = useState<Venda[]>(getVendas());
  const lojas = obterLojasAtivas();
  const lojasTipoLoja = obterLojasTipoLoja();
  const colaboradores = obterColaboradoresAtivos();
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [lojaFiltro, setLojaFiltro] = useState('');
  const [modeloFiltro, setModeloFiltro] = useState('');
  const [imeiFiltro, setImeiFiltro] = useState('');
  const [vendedorFiltro, setVendedorFiltro] = useState('');
  const [filtroGarantia, setFiltroGarantia] = useState('');
  const [tipoPagamentoFiltro, setTipoPagamentoFiltro] = useState('');
  
  // Estado para modal de anexos do Trade-In
  const [tradeInAnexosModal, setTradeInAnexosModal] = useState<{
    open: boolean;
    tipo: 'termo' | 'fotos';
    tradeIn: ItemTradeIn | null;
    vendaId: string;
  }>({ open: false, tipo: 'fotos', tradeIn: null, vendaId: '' });
  const [fotoSelecionadaIndex, setFotoSelecionadaIndex] = useState(0);
  
  // Identificar permissões do usuário logado
  const colaboradorLogado = useMemo(() => {
    return colaboradores.find(c => c.id === usuarioLogado.id);
  }, [colaboradores]);
  
  const isGestor = colaboradorLogado?.eh_gestor || false;

  // Verifica se uma venda é Fiado
  const isFiadoVenda = (venda: Venda) => {
    return venda.pagamentos.some(p => p.isFiado === true);
  };

  const getLojaName = (id: string) => {
    return obterNomeLoja(id);
  };

  const getColaboradorNome = (id: string) => {
    return obterNomeColaborador(id);
  };

  const getResponsavelLoja = (lojaId: string) => {
    // Para o novo modelo, buscamos o gestor da loja
    const gestorLoja = colaboradores.find(c => c.loja_id === lojaId && c.eh_gestor);
    return gestorLoja?.nome || '-';
  };

  // Cálculos corretos para cada venda
  const calcularTotaisVenda = (venda: Venda) => {
    const valorCusto = venda.itens.reduce((acc, item) => acc + item.valorCusto * item.quantidade, 0);
    const valorRecomendado = venda.itens.reduce((acc, item) => acc + item.valorRecomendado * item.quantidade, 0);
    const valorVenda = venda.total;
    const lucro = valorVenda - valorCusto;
    const margem = valorCusto > 0 ? ((lucro / valorCusto) * 100) : 0;
    
    return { valorCusto, valorRecomendado, valorVenda, lucro, margem };
  };

  // Obter info de garantia para uma venda
  const getGarantiaInfo = (venda: Venda) => {
    const garantias = getGarantiasByVendaId(venda.id);
    
    // Se tem garantia registrada, usar
    if (garantias.length > 0) {
      const primeira = garantias[0];
      return {
        tipoGarantia: primeira.tipoGarantia,
        dataFimGarantia: primeira.dataFimGarantia,
        status: primeira.status
      };
    }
    
    // Se não, calcular baseado na venda
    const primeiroItem = venda.itens[0];
    if (primeiroItem) {
      const dataVenda = new Date(venda.dataHora);
      return {
        tipoGarantia: 'Garantia - Apple',
        dataFimGarantia: format(addMonths(dataVenda, 12), 'yyyy-MM-dd'),
        status: 'Ativa'
      };
    }
    
    return null;
  };

  // Aplicar filtragem por permissão: vendedor vê apenas suas vendas, gestor vê apenas da sua loja
  const vendasVisiveis = useMemo(() => {
    if (isGestor && colaboradorLogado) {
      // Gestor vê apenas vendas da sua loja
      return vendas.filter(v => v.lojaVenda === colaboradorLogado.loja_id);
    } else if (colaboradorLogado?.eh_vendedor && colaboradorLogado) {
      // Vendedor vê apenas suas próprias vendas
      return vendas.filter(v => v.vendedor === colaboradorLogado.id);
    }
    // Fallback: admin vê tudo
    return vendas;
  }, [vendas, colaboradorLogado, isGestor]);

  const vendasFiltradas = useMemo(() => {
    return vendasVisiveis.filter(v => {
      const dataVenda = new Date(v.dataHora);
      
      if (dataInicio) {
        const inicio = new Date(dataInicio);
        if (dataVenda < inicio) return false;
      }
      
      if (dataFim) {
        const fim = new Date(dataFim);
        fim.setHours(23, 59, 59, 999);
        if (dataVenda > fim) return false;
      }
      
      if (lojaFiltro && v.lojaVenda !== lojaFiltro) return false;
      
      if (vendedorFiltro && v.vendedor !== vendedorFiltro) return false;
      
      if (modeloFiltro) {
        const termoLower = modeloFiltro.toLowerCase();
        const temModelo = v.itens.some(item => 
          item.produto.toLowerCase().includes(termoLower)
        );
        const temAcessorio = v.acessorios?.some(a => 
          a.descricao.toLowerCase().includes(termoLower)
        );
        if (!temModelo && !temAcessorio) return false;
      }
      
      if (imeiFiltro) {
        const temImei = v.itens.some(item => 
          item.imei.includes(imeiFiltro)
        );
        if (!temImei) return false;
      }
      
      // Filtro de garantia
      if (filtroGarantia) {
        const garantiaInfo = getGarantiaInfo(v);
        if (!garantiaInfo) return false;
        
        const statusExp = calcularStatusExpiracao(garantiaInfo.dataFimGarantia);
        
        if (filtroGarantia === 'ativa') {
          if (statusExp.status === 'expirada') return false;
        } else if (filtroGarantia === 'expirada') {
          if (statusExp.status !== 'expirada') return false;
        } else if (filtroGarantia === 'em-tratativa') {
          if (garantiaInfo.status !== 'Em Tratativa') return false;
        }
      }

      // Filtro de tipo de pagamento
      if (tipoPagamentoFiltro) {
        const isFiado = isFiadoVenda(v);
        if (tipoPagamentoFiltro === 'fiado' && !isFiado) return false;
        if (tipoPagamentoFiltro === 'normal' && isFiado) return false;
      }
      
      return true;
    }).sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime());
  }, [vendasVisiveis, dataInicio, dataFim, lojaFiltro, vendedorFiltro, modeloFiltro, imeiFiltro, filtroGarantia, tipoPagamentoFiltro]);

  const totais = useMemo(() => {
    let totalVendas = 0;
    let totalLucro = 0;
    let totalMargem = 0;
    
    vendasFiltradas.forEach(v => {
      const calc = calcularTotaisVenda(v);
      totalVendas += calc.valorVenda;
      totalLucro += calc.lucro;
      totalMargem += calc.margem;
    });
    
    const margemMedia = vendasFiltradas.length > 0 ? totalMargem / vendasFiltradas.length : 0;
    
    return { totalVendas, totalLucro, margemMedia, quantidade: vendasFiltradas.length };
  }, [vendasFiltradas]);

  const handleExportCSV = () => {
    exportVendasToCSV(vendasFiltradas, 'vendas-export.csv');
  };

  // Função para cor do badge de garantia
  const getGarantiaBadgeClass = (dataFim: string) => {
    const status = calcularStatusExpiracao(dataFim);
    switch (status.status) {
      case 'expirada':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'urgente':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'atencao':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    }
  };

  return (
    <VendasLayout title="Gestão de Vendas">
      {/* Dashboard Cards - Sticky */}
      <div className="sticky top-0 z-10 bg-background pb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vendas do Período</p>
                  <p className="text-2xl font-bold">{totais.quantidade}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <DollarSign className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Vendas</p>
                  <p className="text-2xl font-bold">{formatCurrency(totais.totalVendas)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Lucro Total</p>
                  <p className="text-2xl font-bold">{formatCurrency(totais.totalLucro)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Percent className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Margem Média</p>
                  <p className="text-2xl font-bold">{totais.margemMedia.toFixed(2)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-8 3xl:grid-cols-9 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Data Início</label>
              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Data Fim</label>
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Loja de Venda</label>
              <Select value={lojaFiltro || 'all'} onValueChange={(val) => setLojaFiltro(val === 'all' ? '' : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as Lojas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Lojas</SelectItem>
                  {lojasTipoLoja.map(loja => (
                    <SelectItem key={loja.id} value={loja.id}>{loja.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Produto</label>
              <Input
                placeholder="Buscar produto..."
                value={modeloFiltro}
                onChange={(e) => setModeloFiltro(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">IMEI</label>
              <Input
                placeholder="WW-XXXXXX-YYYYYY-Z"
                value={imeiFiltro}
                onChange={(e) => setImeiFiltro(e.target.value.replace(/\D/g, ''))}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Resp. Venda</label>
              <Select value={vendedorFiltro || 'all'} onValueChange={(val) => setVendedorFiltro(val === 'all' ? '' : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {colaboradores.map(col => (
                    <SelectItem key={col.id} value={col.id}>{col.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Status Garantia</label>
              <Select value={filtroGarantia || 'all'} onValueChange={(val) => setFiltroGarantia(val === 'all' ? '' : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="ativa">Com Garantia Ativa</SelectItem>
                  <SelectItem value="expirada">Garantia Expirada</SelectItem>
                  <SelectItem value="em-tratativa">Em Tratativa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Tipo Pagamento</label>
              <Select value={tipoPagamentoFiltro || 'all'} onValueChange={(val) => setTipoPagamentoFiltro(val === 'all' ? '' : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="fiado">Fiado</SelectItem>
                  <SelectItem value="normal">À Vista / Cartão</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={() => navigate('/vendas/nova')} className="flex-1">
                <Plus className="h-4 w-4 mr-2" />
                Nova Venda
              </Button>
              <Button variant="outline" onClick={handleExportCSV}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Vendas */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 z-20 bg-background shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Produto</TableHead>
                  <TableHead>Loja</TableHead>
                  <TableHead>IMEI</TableHead>
                  <TableHead>ID Venda</TableHead>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Resp. Venda</TableHead>
                  <TableHead>Base de Troca</TableHead>
                  <TableHead className="text-right">V. Custo</TableHead>
                  <TableHead className="text-right">V. Venda</TableHead>
                  <TableHead className="text-right">Lucro</TableHead>
                  <TableHead className="text-right">Margem %</TableHead>
                  <TableHead>Resp. Garantia</TableHead>
                  <TableHead>Data Fim Garantia</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendasFiltradas.map((venda) => {
                  const calc = calcularTotaisVenda(venda);
                  const isPrejuizo = calc.lucro < 0;
                  const statusConferencia = getStatusConferenciaByVendaId(venda.id);
                  const garantiaInfo = getGarantiaInfo(venda);
                  const vendaIsFiado = isFiadoVenda(venda);
                  
                  // Pegar modelos e IMEIs dos itens - identificar vendas de acessórios
                  const isAcessorioOnly = venda.itens.length === 0 && (venda.acessorios?.length ?? 0) > 0;
                  const modelos = isAcessorioOnly 
                    ? venda.acessorios!.map(a => a.descricao).join(', ')
                    : venda.itens.map(i => i.produto).join(', ');
                  const imeis = venda.itens.map(i => displayIMEI(i.imei)).join(', ');
                  
                  const getStatusBadge = (status: StatusConferencia | null) => {
                    if (!status) return <Badge variant="outline">-</Badge>;
                    switch (status) {
                      case 'Conferência - Gestor':
                        return <Badge variant="destructive" className="whitespace-nowrap text-xs">Conf. Gestor</Badge>;
                      case 'Conferência - Financeiro':
                        return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white whitespace-nowrap text-xs">Conf. Financeiro</Badge>;
                      case 'Concluído':
                        return <Badge className="bg-green-600 hover:bg-green-700 text-white whitespace-nowrap text-xs">Concluído</Badge>;
                    }
                  };

                  const getRowBgClass = () => {
                    if (isPrejuizo) return 'bg-red-500/10';
                    if (vendaIsFiado) return 'bg-amber-500/10';
                    if (statusConferencia === 'Conferência - Gestor') return 'bg-red-500/10';
                    if (statusConferencia === 'Conferência - Financeiro') return 'bg-yellow-500/10';
                    if (statusConferencia === 'Concluído') return 'bg-green-500/10';
                    return '';
                  };
                  
                  return (
                    <TableRow key={venda.id} className={getRowBgClass()}>
                      <TableCell className="max-w-[200px] truncate sticky left-0 z-10 bg-background shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]" title={modelos}>
                        {isAcessorioOnly ? (
                          <div className="flex items-center gap-1.5">
                            <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 text-xs whitespace-nowrap">Acessório</Badge>
                            <span className="truncate">{modelos}</span>
                          </div>
                        ) : (
                          modelos || '-'
                        )}
                      </TableCell>
                      <TableCell>{getLojaName(venda.lojaVenda)}</TableCell>
                      <TableCell className="font-mono text-xs min-w-[160px]" title={imeis}>{imeis || '-'}</TableCell>
                      <TableCell className="font-medium">{venda.id}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {new Date(venda.dataHora).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell className="font-medium">{venda.clienteNome}</TableCell>
                      <TableCell>{getColaboradorNome(venda.vendedor)}</TableCell>
                      <TableCell>
                        {venda.tradeIns.length > 0 ? (
                          <TooltipProvider>
                            <div className="flex items-center gap-1.5">
                              {venda.tradeIns.some(t => t.tipoEntrega === 'Com o Cliente') ? (
                                <>
                                  <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 whitespace-nowrap text-xs">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    Com Cliente
                                  </Badge>
                                  {venda.tradeIns.filter(t => t.tipoEntrega === 'Com o Cliente').map(t => (
                                    <div key={t.id} className="flex items-center gap-1">
                                      {t.termoResponsabilidade && (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button 
                                              variant="ghost" 
                                              size="icon" 
                                              className="h-6 w-6"
                                              onClick={() => setTradeInAnexosModal({ open: true, tipo: 'termo', tradeIn: t, vendaId: venda.id })}
                                            >
                                              <FileText className="h-4 w-4 text-primary" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>Termo de Responsabilidade</TooltipContent>
                                        </Tooltip>
                                      )}
                                      {t.fotosAparelho && t.fotosAparelho.length > 0 && (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button 
                                              variant="ghost" 
                                              size="icon" 
                                              className="h-6 w-6 relative"
                                              onClick={() => {
                                                setFotoSelecionadaIndex(0);
                                                setTradeInAnexosModal({ open: true, tipo: 'fotos', tradeIn: t, vendaId: venda.id });
                                              }}
                                            >
                                              <Image className="h-4 w-4 text-primary" />
                                              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] rounded-full h-4 w-4 flex items-center justify-center">
                                                {t.fotosAparelho.length}
                                              </span>
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>{t.fotosAparelho.length} foto(s) anexada(s)</TooltipContent>
                                        </Tooltip>
                                      )}
                                    </div>
                                  ))}
                                </>
                              ) : (
                                <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 whitespace-nowrap text-xs">
                                  <Check className="h-3 w-3 mr-1" />
                                  Entregue
                                </Badge>
                              )}
                            </div>
                          </TooltipProvider>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(calc.valorCusto)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(calc.valorVenda)}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${isPrejuizo ? 'text-destructive' : 'text-green-600'}`}>
                        {formatCurrency(calc.lucro)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge 
                          variant={isPrejuizo ? "destructive" : calc.margem >= 40 ? "default" : "secondary"}
                        >
                          {calc.margem.toFixed(2)}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {garantiaInfo && (
                          <Badge variant="outline" className="whitespace-nowrap text-xs">
                            {garantiaInfo.tipoGarantia.replace('Garantia - ', '')}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {garantiaInfo && (
                          <Badge 
                            variant="outline" 
                            className={`whitespace-nowrap text-xs ${getGarantiaBadgeClass(garantiaInfo.dataFimGarantia)}`}
                          >
                            {format(new Date(garantiaInfo.dataFimGarantia), 'dd/MM/yyyy')}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => navigate(`/vendas/${venda.id}`)}
                          title="Ver detalhes"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Totalizador */}
      <Card className="mt-4">
        <CardContent className="p-4">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div className="flex gap-6">
              <div>
                <span className="text-sm text-muted-foreground">Vendas:</span>
                <span className="ml-2 font-bold">{totais.quantidade}</span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Total:</span>
                <span className="ml-2 font-bold">{formatCurrency(totais.totalVendas)}</span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Lucro:</span>
                <span className="ml-2 font-bold text-green-600">{formatCurrency(totais.totalLucro)}</span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Margem Média:</span>
                <span className="ml-2 font-bold">{totais.margemMedia.toFixed(2)}%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Visualização de Anexos do Trade-In */}
      <Dialog 
        open={tradeInAnexosModal.open} 
        onOpenChange={(open) => setTradeInAnexosModal(prev => ({ ...prev, open }))}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {tradeInAnexosModal.tipo === 'termo' ? (
                <>
                  <FileText className="h-5 w-5" />
                  Termo de Responsabilidade
                </>
              ) : (
                <>
                  <Image className="h-5 w-5" />
                  Fotos do Aparelho ({tradeInAnexosModal.tradeIn?.fotosAparelho?.length || 0})
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto">
            {tradeInAnexosModal.tipo === 'termo' && tradeInAnexosModal.tradeIn?.termoResponsabilidade && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-primary" />
                    <div>
                      <p className="font-medium">{tradeInAnexosModal.tradeIn.termoResponsabilidade.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        {(tradeInAnexosModal.tradeIn.termoResponsabilidade.tamanho / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = tradeInAnexosModal.tradeIn!.termoResponsabilidade!.dataUrl;
                      link.download = tradeInAnexosModal.tradeIn!.termoResponsabilidade!.nome;
                      link.click();
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Baixar
                  </Button>
                </div>
                
                {tradeInAnexosModal.tradeIn.termoResponsabilidade.tipo.startsWith('image/') && (
                  <div className="flex justify-center">
                    <img 
                      src={tradeInAnexosModal.tradeIn.termoResponsabilidade.dataUrl} 
                      alt="Termo de Responsabilidade"
                      className="max-w-full max-h-[400px] object-contain rounded-lg border"
                    />
                  </div>
                )}
                
                {tradeInAnexosModal.tradeIn.termoResponsabilidade.tipo === 'application/pdf' && (
                  <div className="flex flex-col items-center gap-4 p-8 bg-muted/30 rounded-lg">
                    <FileText className="h-16 w-16 text-muted-foreground" />
                    <p className="text-muted-foreground">Documento PDF - clique em Baixar para visualizar</p>
                  </div>
                )}
              </div>
            )}
            
            {tradeInAnexosModal.tipo === 'fotos' && tradeInAnexosModal.tradeIn?.fotosAparelho && (
              <div className="space-y-4">
                {/* Imagem principal */}
                <div className="flex justify-center bg-muted/30 rounded-lg p-4">
                  <img 
                    src={tradeInAnexosModal.tradeIn.fotosAparelho[fotoSelecionadaIndex]?.dataUrl} 
                    alt={`Foto ${fotoSelecionadaIndex + 1}`}
                    className="max-w-full max-h-[350px] object-contain rounded-lg"
                  />
                </div>
                
                {/* Miniaturas */}
                {tradeInAnexosModal.tradeIn.fotosAparelho.length > 1 && (
                  <div className="flex gap-2 justify-center overflow-x-auto pb-2">
                    {tradeInAnexosModal.tradeIn.fotosAparelho.map((foto, index) => (
                      <button
                        key={foto.id}
                        className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                          index === fotoSelecionadaIndex 
                            ? 'border-primary ring-2 ring-primary/30' 
                            : 'border-transparent hover:border-muted-foreground/30'
                        }`}
                        onClick={() => setFotoSelecionadaIndex(index)}
                      >
                        <img 
                          src={foto.dataUrl} 
                          alt={`Miniatura ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
                
                {/* Info da foto selecionada */}
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium text-sm">
                      {tradeInAnexosModal.tradeIn.fotosAparelho[fotoSelecionadaIndex]?.nome}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Foto {fotoSelecionadaIndex + 1} de {tradeInAnexosModal.tradeIn.fotosAparelho.length}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const foto = tradeInAnexosModal.tradeIn!.fotosAparelho![fotoSelecionadaIndex];
                      const link = document.createElement('a');
                      link.href = foto.dataUrl;
                      link.download = foto.nome;
                      link.click();
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Baixar
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Trade-In:</span> {tradeInAnexosModal.tradeIn?.modelo}
            </div>
            <Button 
              variant="outline" 
              onClick={() => setTradeInAnexosModal(prev => ({ ...prev, open: false }))}
            >
              <X className="h-4 w-4 mr-2" />
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </VendasLayout>
  );
}
