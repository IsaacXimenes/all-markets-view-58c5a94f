import { useState, useMemo } from 'react';
import { FinanceiroLayout } from '@/components/layout/FinanceiroLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Download, TrendingUp, TrendingDown, DollarSign, Filter, Calendar, ArrowLeftRight, X } from 'lucide-react';
import { format, subDays, addDays, startOfDay, endOfDay, isWithinInterval, parseISO, eachDayOfInterval, subYears, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getContas, getPagamentos, getDespesas, Pagamento, Despesa } from '@/utils/financeApi';
import { ContaFinanceira } from '@/utils/cadastrosApi';

export default function FinanceiroExtrato() {
  const [contas] = useState<ContaFinanceira[]>(getContas());
  const [pagamentos] = useState<Pagamento[]>(getPagamentos());
  const [despesas] = useState<Despesa[]>(getDespesas());

  // Filtros
  const [graficoDataInicio, setGraficoDataInicio] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [graficoDataFim, setGraficoDataFim] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dataInicio, setDataInicio] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [dataFim, setDataFim] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [filtroConta, setFiltroConta] = useState('todas');
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'entrada' | 'saida'>('todos');

  // Períodos comparativos - Entradas (independente)
  const [entAInicio, setEntAInicio] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [entAFim, setEntAFim] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [entBInicio, setEntBInicio] = useState(format(subYears(subDays(new Date(), 30), 1), 'yyyy-MM-dd'));
  const [entBFim, setEntBFim] = useState(format(subYears(new Date(), 1), 'yyyy-MM-dd'));

  // Períodos comparativos - Saídas (independente)
  const [saiAInicio, setSaiAInicio] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [saiAFim, setSaiAFim] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [saiBInicio, setSaiBInicio] = useState(format(subYears(subDays(new Date(), 30), 1), 'yyyy-MM-dd'));
  const [saiBFim, setSaiBFim] = useState(format(subYears(new Date(), 1), 'yyyy-MM-dd'));

  // Montar lista de movimentações
  const movimentacoes = useMemo(() => {
    const lista: {
      id: string;
      data: string;
      descricao: string;
      tipo: 'entrada' | 'saida';
      categoria: string;
      conta: string;
      valor: number;
    }[] = [];

    // Adicionar pagamentos como entradas
    pagamentos.forEach(pag => {
      lista.push({
        id: pag.id,
        data: pag.data,
        descricao: pag.descricao,
        tipo: 'entrada',
        categoria: pag.meioPagamento,
        conta: pag.conta,
        valor: pag.valor
      });
    });

    // Adicionar despesas como saídas
    despesas.forEach(desp => {
      lista.push({
        id: desp.id,
        data: desp.data,
        descricao: desp.descricao,
        tipo: 'saida',
        categoria: desp.tipo,
        conta: desp.conta || '-',
        valor: desp.valor
      });
    });

    // Ordenar por data (mais recente primeiro)
    return lista.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }, [pagamentos, despesas]);

  // Aplicar filtros
  const movimentacoesFiltradas = useMemo(() => {
    return movimentacoes.filter(mov => {
      // Filtro de data
      const dataMovimento = parseISO(mov.data);
      if (!isWithinInterval(dataMovimento, { 
        start: parseISO(dataInicio), 
        end: parseISO(dataFim) 
      })) {
        return false;
      }

      // Filtro de conta
      if (filtroConta !== 'todas' && mov.conta !== filtroConta) {
        return false;
      }

      // Filtro de tipo
      if (filtroTipo !== 'todos' && mov.tipo !== filtroTipo) {
        return false;
      }

      return true;
    });
  }, [movimentacoes, dataInicio, dataFim, filtroConta, filtroTipo]);

  // Cálculos do resumo
  const resumo = useMemo(() => {
    const entradas = movimentacoesFiltradas
      .filter(m => m.tipo === 'entrada')
      .reduce((acc, m) => acc + m.valor, 0);
    
    const saidas = movimentacoesFiltradas
      .filter(m => m.tipo === 'saida')
      .reduce((acc, m) => acc + m.valor, 0);

    return {
      entradas,
      saidas,
      saldo: entradas - saidas
    };
  }, [movimentacoesFiltradas]);

  // Dados para o gráfico (datas corridas, filtro independente por data início/fim)
  const dadosGrafico = useMemo(() => {
    const inicio = parseISO(graficoDataInicio);
    const fim = parseISO(graficoDataFim);
    
    // Indexar movimentações por data
    const agrupado: Record<string, { entradas: number; saidas: number }> = {};
    movimentacoes.forEach(mov => {
      const dataMov = parseISO(mov.data);
      if (dataMov < startOfDay(inicio) || dataMov > endOfDay(fim)) return;
      const dateISO = mov.data.slice(0, 10);
      if (!agrupado[dateISO]) {
        agrupado[dateISO] = { entradas: 0, saidas: 0 };
      }
      if (mov.tipo === 'entrada') {
        agrupado[dateISO].entradas += mov.valor;
      } else {
        agrupado[dateISO].saidas += mov.valor;
      }
    });

    // Gerar todas as datas corridas do intervalo
    const dias = eachDayOfInterval({ start: startOfDay(inicio), end: endOfDay(fim) });
    return dias.map(dia => {
      const dateISO = format(dia, 'yyyy-MM-dd');
      const valores = agrupado[dateISO] || { entradas: 0, saidas: 0 };
      return {
        data: format(dia, 'dd/MM'),
        entradas: valores.entradas,
        saidas: valores.saidas,
      };
    });
  }, [movimentacoes, graficoDataInicio, graficoDataFim]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Dados comparativos de Entradas
  const dadosComparacaoEntradas = useMemo(() => {
    const inicioA = parseISO(entAInicio);
    const fimA = parseISO(entAFim);
    const inicioB = parseISO(entBInicio);
    const fimB = parseISO(entBFim);
    const diasA = differenceInDays(fimA, inicioA) + 1;
    const diasB = differenceInDays(fimB, inicioB) + 1;
    const maxDias = Math.max(diasA, diasB);

    const resultado: { dia: string; periodoA: number; periodoB: number }[] = [];
    for (let i = 0; i < maxDias; i++) {
      const diaA = i < diasA ? format(addDays(inicioA, i), 'yyyy-MM-dd') : null;
      const diaB = i < diasB ? format(addDays(inicioB, i), 'yyyy-MM-dd') : null;
      let valA = 0, valB = 0;
      movimentacoes.forEach(m => {
        if (m.tipo !== 'entrada') return;
        const d = m.data.slice(0, 10);
        if (diaA && d === diaA) valA += m.valor;
        if (diaB && d === diaB) valB += m.valor;
      });
      resultado.push({ dia: `Dia ${i + 1}`, periodoA: valA, periodoB: valB });
    }
    return resultado;
  }, [movimentacoes, entAInicio, entAFim, entBInicio, entBFim]);

  // Dados comparativos de Saídas
  const dadosComparacaoSaidas = useMemo(() => {
    const inicioA = parseISO(saiAInicio);
    const fimA = parseISO(saiAFim);
    const inicioB = parseISO(saiBInicio);
    const fimB = parseISO(saiBFim);
    const diasA = differenceInDays(fimA, inicioA) + 1;
    const diasB = differenceInDays(fimB, inicioB) + 1;
    const maxDias = Math.max(diasA, diasB);

    const resultado: { dia: string; periodoA: number; periodoB: number }[] = [];
    for (let i = 0; i < maxDias; i++) {
      const diaA = i < diasA ? format(addDays(inicioA, i), 'yyyy-MM-dd') : null;
      const diaB = i < diasB ? format(addDays(inicioB, i), 'yyyy-MM-dd') : null;
      let valA = 0, valB = 0;
      movimentacoes.forEach(m => {
        if (m.tipo !== 'saida') return;
        const d = m.data.slice(0, 10);
        if (diaA && d === diaA) valA += m.valor;
        if (diaB && d === diaB) valB += m.valor;
      });
      resultado.push({ dia: `Dia ${i + 1}`, periodoA: valA, periodoB: valB });
    }
    return resultado;
  }, [movimentacoes, saiAInicio, saiAFim, saiBInicio, saiBFim]);

  // Variação percentual
  const variacaoEntradas = useMemo(() => {
    const totalA = dadosComparacaoEntradas.reduce((s, d) => s + d.periodoA, 0);
    const totalB = dadosComparacaoEntradas.reduce((s, d) => s + d.periodoB, 0);
    return { totalA, totalB, variacao: totalB > 0 ? ((totalA - totalB) / totalB) * 100 : 0 };
  }, [dadosComparacaoEntradas]);

  const variacaoSaidas = useMemo(() => {
    const totalA = dadosComparacaoSaidas.reduce((s, d) => s + d.periodoA, 0);
    const totalB = dadosComparacaoSaidas.reduce((s, d) => s + d.periodoB, 0);
    return { totalA, totalB, variacao: totalB > 0 ? ((totalA - totalB) / totalB) * 100 : 0 };
  }, [dadosComparacaoSaidas]);

  const handleAnoAnteriorEntradas = () => {
    setEntBInicio(format(subYears(parseISO(entAInicio), 1), 'yyyy-MM-dd'));
    setEntBFim(format(subYears(parseISO(entAFim), 1), 'yyyy-MM-dd'));
  };

  const handleAnoAnteriorSaidas = () => {
    setSaiBInicio(format(subYears(parseISO(saiAInicio), 1), 'yyyy-MM-dd'));
    setSaiBFim(format(subYears(parseISO(saiAFim), 1), 'yyyy-MM-dd'));
  };

  const getContaNome = (id: string) => {
    const conta = contas.find(c => c.id === id);
    return conta?.nome || id;
  };

  const handleExportCSV = () => {
    const headers = ['Data', 'Descrição', 'Tipo', 'Categoria', 'Conta', 'Valor'];
    const rows = movimentacoesFiltradas.map(m => [
      format(parseISO(m.data), 'dd/MM/yyyy'),
      m.descricao,
      m.tipo === 'entrada' ? 'Entrada' : 'Saída',
      m.categoria,
      getContaNome(m.conta),
      m.tipo === 'entrada' ? m.valor.toFixed(2) : (-m.valor).toFixed(2)
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `extrato_${dataInicio}_${dataFim}.csv`;
    link.click();
    
    toast.success('Extrato exportado com sucesso!');
  };

  return (
    <FinanceiroLayout title="Extrato Financeiro">
      <div className="space-y-6">
        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div>
                <Label>Data Início</Label>
                <Input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </div>
              <div>
                <Label>Data Fim</Label>
                <Input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                />
              </div>
              <div>
                <Label>Conta</Label>
                <Select value={filtroConta} onValueChange={setFiltroConta}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as contas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    {contas.map(conta => (
                      <SelectItem key={conta.id} value={conta.id}>{conta.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={filtroTipo} onValueChange={(v) => setFiltroTipo(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="entrada">Entradas</SelectItem>
                    <SelectItem value="saida">Saídas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                {(filtroConta !== 'todas' || filtroTipo !== 'todos' || dataInicio !== format(subDays(new Date(), 30), 'yyyy-MM-dd') || dataFim !== format(new Date(), 'yyyy-MM-dd')) && (
                  <Button variant="ghost" size="sm" onClick={() => { setFiltroConta('todas'); setFiltroTipo('todos'); setDataInicio(format(subDays(new Date(), 30), 'yyyy-MM-dd')); setDataFim(format(new Date(), 'yyyy-MM-dd')); }} className="gap-1">
                    <X className="h-4 w-4" />
                    Limpar
                  </Button>
                )}
                <Button onClick={handleExportCSV} variant="outline" className="gap-2 w-full">
                  <Download className="h-4 w-4" />
                  Exportar CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resumo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Entradas</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(resumo.entradas)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Saídas</p>
                  <p className="text-2xl font-bold text-destructive">{formatCurrency(resumo.saidas)}</p>
                </div>
                <TrendingDown className="h-8 w-8 text-destructive" />
              </div>
            </CardContent>
          </Card>

          <Card className={`${resumo.saldo >= 0 ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900' : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900'}`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Saldo do Período</p>
                  <p className={`text-2xl font-bold ${resumo.saldo >= 0 ? 'text-blue-600' : 'text-destructive'}`}>
                    {formatCurrency(resumo.saldo)}
                  </p>
                </div>
                <DollarSign className={`h-8 w-8 ${resumo.saldo >= 0 ? 'text-blue-500' : 'text-destructive'}`} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Fluxo de Caixa
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Label className="text-xs whitespace-nowrap">De</Label>
                  <Input
                    type="date"
                    value={graficoDataInicio}
                    onChange={(e) => setGraficoDataInicio(e.target.value)}
                    className="h-7 text-xs w-[130px]"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <Label className="text-xs whitespace-nowrap">Até</Label>
                  <Input
                    type="date"
                    value={graficoDataFim}
                    onChange={(e) => setGraficoDataFim(e.target.value)}
                    className="h-7 text-xs w-[130px]"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dadosGrafico}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="data" />
                    <YAxis 
                      tickFormatter={(value) => 
                        value.toLocaleString('pt-BR', { notation: 'compact', compactDisplay: 'short' })
                      }
                    />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      labelFormatter={(label) => `Data: ${label}`}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="entradas" name="Entradas" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="saidas" name="Saídas" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>


        {/* Gráficos Comparativos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Comparativo de Entradas */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                Comparativo de Entradas
              </CardTitle>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Período A</Label>
                  <div className="flex items-center gap-1">
                    <Input type="date" value={entAInicio} onChange={(e) => setEntAInicio(e.target.value)} className="h-7 text-xs" />
                    <Input type="date" value={entAFim} onChange={(e) => setEntAFim(e.target.value)} className="h-7 text-xs" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Período B</Label>
                    <Button variant="ghost" size="sm" onClick={handleAnoAnteriorEntradas} className="h-5 text-[10px] px-1.5 text-muted-foreground hover:text-foreground">
                      Ano Anterior
                    </Button>
                  </div>
                  <div className="flex items-center gap-1">
                    <Input type="date" value={entBInicio} onChange={(e) => setEntBInicio(e.target.value)} className="h-7 text-xs" />
                    <Input type="date" value={entBFim} onChange={(e) => setEntBFim(e.target.value)} className="h-7 text-xs" />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dadosComparacaoEntradas}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => v.toLocaleString('pt-BR', { notation: 'compact', compactDisplay: 'short' })} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Line type="monotone" dataKey="periodoA" name="Período A" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="periodoB" name="Período B" stroke="#6ee7b7" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Comparativo de Saídas */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-600" />
                Comparativo de Saídas
              </CardTitle>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Período A</Label>
                  <div className="flex items-center gap-1">
                    <Input type="date" value={saiAInicio} onChange={(e) => setSaiAInicio(e.target.value)} className="h-7 text-xs" />
                    <Input type="date" value={saiAFim} onChange={(e) => setSaiAFim(e.target.value)} className="h-7 text-xs" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Período B</Label>
                    <Button variant="ghost" size="sm" onClick={handleAnoAnteriorSaidas} className="h-5 text-[10px] px-1.5 text-muted-foreground hover:text-foreground">
                      Ano Anterior
                    </Button>
                  </div>
                  <div className="flex items-center gap-1">
                    <Input type="date" value={saiBInicio} onChange={(e) => setSaiBInicio(e.target.value)} className="h-7 text-xs" />
                    <Input type="date" value={saiBFim} onChange={(e) => setSaiBFim(e.target.value)} className="h-7 text-xs" />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dadosComparacaoSaidas}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => v.toLocaleString('pt-BR', { notation: 'compact', compactDisplay: 'short' })} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Line type="monotone" dataKey="periodoA" name="Período A" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="periodoB" name="Período B" stroke="#fca5a5" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cards de Variação Percentual */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Variação de Entradas</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    A: {formatCurrency(variacaoEntradas.totalA)} → B: {formatCurrency(variacaoEntradas.totalB)}
                  </p>
                  <p className={`text-2xl font-bold mt-1 ${variacaoEntradas.variacao >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {variacaoEntradas.variacao >= 0 ? '+' : ''}{variacaoEntradas.variacao.toFixed(2)}%
                  </p>
                </div>
                {variacaoEntradas.variacao >= 0 ? (
                  <TrendingUp className="h-8 w-8 text-green-500" />
                ) : (
                  <TrendingDown className="h-8 w-8 text-red-500" />
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Variação de Saídas</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    A: {formatCurrency(variacaoSaidas.totalA)} → B: {formatCurrency(variacaoSaidas.totalB)}
                  </p>
                  <p className={`text-2xl font-bold mt-1 ${variacaoSaidas.variacao <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {variacaoSaidas.variacao >= 0 ? '+' : ''}{variacaoSaidas.variacao.toFixed(2)}%
                  </p>
                </div>
                {variacaoSaidas.variacao <= 0 ? (
                  <TrendingDown className="h-8 w-8 text-green-500" />
                ) : (
                  <TrendingUp className="h-8 w-8 text-red-500" />
                )}
              </div>
            </CardContent>
          </Card>
        </div>


        <Card>
          <CardHeader>
            <CardTitle>Movimentações ({movimentacoesFiltradas.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Conta</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movimentacoesFiltradas.map(mov => (
                    <TableRow key={mov.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(parseISO(mov.data), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {mov.descricao}
                      </TableCell>
                      <TableCell>
                        <Badge variant={mov.tipo === 'entrada' ? 'default' : 'destructive'}>
                          {mov.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{mov.categoria}</Badge>
                      </TableCell>
                      <TableCell>{getContaNome(mov.conta)}</TableCell>
                      <TableCell className={`text-right font-bold ${mov.tipo === 'entrada' ? 'text-green-600' : 'text-destructive'}`}>
                        {mov.tipo === 'entrada' ? '+' : '-'}{formatCurrency(mov.valor)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {movimentacoesFiltradas.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhuma movimentação encontrada para o período selecionado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </FinanceiroLayout>
  );
}
