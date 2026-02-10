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
import { Download, TrendingUp, TrendingDown, DollarSign, Filter, Calendar } from 'lucide-react';
import { format, subDays, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getContas, getPagamentos, getDespesas, Pagamento, Despesa } from '@/utils/financeApi';
import { ContaFinanceira } from '@/utils/cadastrosApi';

export default function FinanceiroExtrato() {
  const [contas] = useState<ContaFinanceira[]>(getContas());
  const [pagamentos] = useState<Pagamento[]>(getPagamentos());
  const [despesas] = useState<Despesa[]>(getDespesas());

  // Filtros
  const [dataInicio, setDataInicio] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [dataFim, setDataFim] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [filtroConta, setFiltroConta] = useState('todas');
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'entrada' | 'saida'>('todos');

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

  // Dados para o gráfico (agrupado por dia)
  const dadosGrafico = useMemo(() => {
    const agrupado: Record<string, { data: string; dateISO: string; entradas: number; saidas: number }> = {};

    movimentacoesFiltradas.forEach(mov => {
      const dataFormatada = format(parseISO(mov.data), 'dd/MM');
      const dateISO = mov.data.slice(0, 10);
      if (!agrupado[dateISO]) {
        agrupado[dateISO] = { data: dataFormatada, dateISO, entradas: 0, saidas: 0 };
      }
      if (mov.tipo === 'entrada') {
        agrupado[dateISO].entradas += mov.valor;
      } else {
        agrupado[dateISO].saidas += mov.valor;
      }
    });

    return Object.values(agrupado)
      .sort((a, b) => a.dateISO.localeCompare(b.dateISO))
      .slice(-15)
      .map(({ dateISO, ...rest }) => rest);
  }, [movimentacoesFiltradas]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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
              <div className="flex items-end">
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
        {dadosGrafico.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Fluxo de Caixa
              </CardTitle>
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
        )}

        {/* Tabela de Movimentações */}
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
