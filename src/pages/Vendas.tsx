import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { VendasLayout } from '@/components/layout/VendasLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Download, Eye, TrendingUp, DollarSign, Percent, ShoppingCart, CreditCard } from 'lucide-react';
import { getVendas, exportVendasToCSV, formatCurrency, Venda } from '@/utils/vendasApi';
import { getLojas, getColaboradores, Loja, Colaborador } from '@/utils/cadastrosApi';
import { getStatusConferenciaByVendaId, StatusConferencia } from '@/utils/conferenciaGestorApi';
import { getGarantiasByVendaId, calcularStatusExpiracao } from '@/utils/garantiasApi';
import { format, addMonths } from 'date-fns';

export default function Vendas() {
  const navigate = useNavigate();
  const [vendas] = useState<Venda[]>(getVendas());
  const [lojas] = useState<Loja[]>(getLojas());
  const [colaboradores] = useState<Colaborador[]>(getColaboradores());
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [lojaFiltro, setLojaFiltro] = useState('');
  const [modeloFiltro, setModeloFiltro] = useState('');
  const [imeiFiltro, setImeiFiltro] = useState('');
  const [vendedorFiltro, setVendedorFiltro] = useState('');
  const [filtroGarantia, setFiltroGarantia] = useState('');
  const [tipoPagamentoFiltro, setTipoPagamentoFiltro] = useState('');

  // Verifica se uma venda é Fiado
  const isFiadoVenda = (venda: Venda) => {
    return venda.pagamentos.some(p => p.isFiado === true);
  };

  const getLojaName = (id: string) => {
    const loja = lojas.find(l => l.id === id);
    return loja?.nome || id;
  };

  const getColaboradorNome = (id: string) => {
    const col = colaboradores.find(c => c.id === id);
    return col?.nome || id;
  };

  const getResponsavelLoja = (lojaId: string) => {
    const loja = lojas.find(l => l.id === lojaId);
    if (!loja) return '-';
    const responsavel = colaboradores.find(c => c.id === loja.responsavel);
    return responsavel?.nome || loja.responsavel;
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

  const vendasFiltradas = useMemo(() => {
    return vendas.filter(v => {
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
        const temModelo = v.itens.some(item => 
          item.produto.toLowerCase().includes(modeloFiltro.toLowerCase())
        );
        if (!temModelo) return false;
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
    });
  }, [vendas, dataInicio, dataFim, lojaFiltro, vendedorFiltro, modeloFiltro, imeiFiltro, filtroGarantia, tipoPagamentoFiltro]);

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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-4">
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
                  {lojas.map(loja => (
                    <SelectItem key={loja.id} value={loja.id}>{loja.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Modelo</label>
              <Input
                placeholder="Buscar modelo..."
                value={modeloFiltro}
                onChange={(e) => setModeloFiltro(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">IMEI</label>
              <Input
                placeholder="Buscar IMEI..."
                value={imeiFiltro}
                onChange={(e) => setImeiFiltro(e.target.value)}
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
                  <TableHead>ID Venda</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>IMEI</TableHead>
                  <TableHead>Resp. Venda</TableHead>
                  <TableHead>Loja</TableHead>
                  <TableHead>Resp. Loja</TableHead>
                  <TableHead className="text-right">V. Custo</TableHead>
                  <TableHead className="text-right">V. Recomendado</TableHead>
                  <TableHead className="text-right">V. Venda</TableHead>
                  <TableHead className="text-right">Lucro</TableHead>
                  <TableHead className="text-right">Margem %</TableHead>
                  <TableHead>Resp. Garantia</TableHead>
                  <TableHead>Data Fim Garantia</TableHead>
                  <TableHead>Status</TableHead>
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
                  
                  // Pegar modelos e IMEIs dos itens
                  const modelos = venda.itens.map(i => i.produto).join(', ');
                  const imeis = venda.itens.map(i => i.imei).join(', ');
                  
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
                    if (isPrejuizo) return 'bg-destructive/10';
                    if (vendaIsFiado) return 'bg-amber-50 dark:bg-amber-950/20';
                    if (statusConferencia === 'Conferência - Gestor') return 'bg-red-50 dark:bg-red-950/20';
                    if (statusConferencia === 'Conferência - Financeiro') return 'bg-yellow-50 dark:bg-yellow-950/20';
                    if (statusConferencia === 'Concluído') return 'bg-green-50 dark:bg-green-950/20';
                    return '';
                  };
                  
                  return (
                    <TableRow key={venda.id} className={getRowBgClass()}>
                      <TableCell className="font-medium">{venda.id}</TableCell>
                      <TableCell>
                        {vendaIsFiado ? (
                          <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 whitespace-nowrap">
                            <CreditCard className="h-3 w-3 mr-1" />
                            Fiado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="whitespace-nowrap text-xs">
                            Normal
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {new Date(venda.dataHora).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell className="font-medium">{venda.clienteNome}</TableCell>
                      <TableCell className="max-w-[150px] truncate" title={modelos}>{modelos || '-'}</TableCell>
                      <TableCell className="font-mono text-xs max-w-[120px] truncate" title={imeis}>{imeis || '-'}</TableCell>
                      <TableCell>{getColaboradorNome(venda.vendedor)}</TableCell>
                      <TableCell>{getLojaName(venda.lojaVenda)}</TableCell>
                      <TableCell className="text-muted-foreground">{getResponsavelLoja(venda.lojaVenda)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(calc.valorCusto)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(calc.valorRecomendado)}
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
                        {getStatusBadge(statusConferencia)}
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
    </VendasLayout>
  );
}
