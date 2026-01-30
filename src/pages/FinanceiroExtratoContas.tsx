import { useState, useMemo } from 'react';
import { FinanceiroLayout } from '@/components/layout/FinanceiroLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Wallet, TrendingUp, TrendingDown, Calendar, ArrowUpCircle, 
  ArrowDownCircle, X, Building2, Landmark, Eye
} from 'lucide-react';

import { getContasFinanceiras, ContaFinanceira } from '@/utils/cadastrosApi';
import { useCadastroStore } from '@/store/cadastroStore';
import { formatarMoeda } from '@/utils/formatUtils';
import { getVendasPorStatus } from '@/utils/fluxoVendasApi';
import { getDespesas } from '@/utils/financeApi';

const formatCurrency = formatarMoeda;

// Meses do ano
const meses = [
  { valor: 0, nome: 'Janeiro' },
  { valor: 1, nome: 'Fevereiro' },
  { valor: 2, nome: 'Março' },
  { valor: 3, nome: 'Abril' },
  { valor: 4, nome: 'Maio' },
  { valor: 5, nome: 'Junho' },
  { valor: 6, nome: 'Julho' },
  { valor: 7, nome: 'Agosto' },
  { valor: 8, nome: 'Setembro' },
  { valor: 9, nome: 'Outubro' },
  { valor: 10, nome: 'Novembro' },
  { valor: 11, nome: 'Dezembro' },
];

const anos = [2025, 2026, 2027];

interface Movimentacao {
  id: string;
  tipo: 'entrada' | 'saida';
  descricao: string;
  valor: number;
  data: string;
  contaId: string;
  vendaId?: string;
}

export default function FinanceiroExtratoContas() {
  const { obterNomeLoja, obterLojasAtivas } = useCadastroStore();
  const [contasFinanceiras] = useState<ContaFinanceira[]>(getContasFinanceiras());
  const lojas = obterLojasAtivas();
  
  // Estados para filtro de período
  const [mesSelecionado, setMesSelecionado] = useState<number>(new Date().getMonth());
  const [anoSelecionado, setAnoSelecionado] = useState<number>(new Date().getFullYear());
  const [filtroLoja, setFiltroLoja] = useState<string>('todas');
  
  // Modal de detalhes
  const [contaSelecionada, setContaSelecionada] = useState<ContaFinanceira | null>(null);
  const [showDetalhesModal, setShowDetalhesModal] = useState(false);

  // Calcular movimentações por conta
  const { movimentacoesPorConta, entradasPorConta, saidasPorConta } = useMemo(() => {
    const movimentacoes: Record<string, Movimentacao[]> = {};
    const entradas: Record<string, number> = {};
    const saidas: Record<string, number> = {};
    
    // Inicializar
    contasFinanceiras.forEach(conta => {
      movimentacoes[conta.id] = [];
      entradas[conta.id] = 0;
      saidas[conta.id] = 0;
    });
    
    // Processar vendas finalizadas (entradas)
    try {
      const vendasFinalizadas = getVendasPorStatus('Finalizado');
      
      vendasFinalizadas.forEach(venda => {
        const dataFinalizacaoRaw = localStorage.getItem(`data_finalizacao_${venda.id}`);
        if (!dataFinalizacaoRaw) return;
        
        const dataFinalizacao = new Date(dataFinalizacaoRaw);
        const mesVenda = dataFinalizacao.getMonth();
        const anoVenda = dataFinalizacao.getFullYear();
        
        if (mesVenda !== mesSelecionado || anoVenda !== anoSelecionado) return;
        
        // Buscar validações de pagamentos
        const validacaoRaw = localStorage.getItem(`validacao_pagamentos_financeiro_${venda.id}`);
        
        if (validacaoRaw) {
          const validacoes = JSON.parse(validacaoRaw);
          
          validacoes.forEach((validacao: any) => {
            if (!validacao.validadoFinanceiro) return;
            
            const pagamentoVenda = venda.pagamentos?.find((p: any) => p.meioPagamento === validacao.metodoPagamento);
            const contaId = validacao.contaDestinoId || pagamentoVenda?.contaDestino;
            const valor = pagamentoVenda?.valor || 0;
            
            if (contaId && valor > 0) {
              entradas[contaId] = (entradas[contaId] || 0) + valor;
              
              if (!movimentacoes[contaId]) movimentacoes[contaId] = [];
              movimentacoes[contaId].push({
                id: `${venda.id}-${validacao.metodoPagamento}`,
                tipo: 'entrada',
                descricao: `Venda #${venda.id} - ${validacao.metodoPagamento}`,
                valor,
                data: dataFinalizacaoRaw,
                contaId,
                vendaId: venda.id
              });
            }
          });
        }
      });
    } catch (e) {
      console.error('[ExtratoContas] Erro ao processar vendas:', e);
    }
    
    // Processar despesas (saídas)
    try {
      const despesas = getDespesas();
      
      despesas.forEach(despesa => {
        const dataDespesa = new Date(despesa.data);
        const mesDespesa = dataDespesa.getMonth();
        const anoDespesa = dataDespesa.getFullYear();
        
        if (mesDespesa !== mesSelecionado || anoDespesa !== anoSelecionado) return;
        
        // Encontrar conta pelo nome
        const contaEncontrada = contasFinanceiras.find(c => c.nome === despesa.conta);
        const contaId = contaEncontrada?.id;
        
        if (contaId) {
          saidas[contaId] = (saidas[contaId] || 0) + despesa.valor;
          
          if (!movimentacoes[contaId]) movimentacoes[contaId] = [];
          movimentacoes[contaId].push({
            id: despesa.id,
            tipo: 'saida',
            descricao: `Despesa: ${despesa.descricao}`,
            valor: despesa.valor,
            data: despesa.data,
            contaId
          });
        }
      });
    } catch (e) {
      console.error('[ExtratoContas] Erro ao processar despesas:', e);
    }
    
    return { 
      movimentacoesPorConta: movimentacoes, 
      entradasPorConta: entradas, 
      saidasPorConta: saidas 
    };
  }, [contasFinanceiras, mesSelecionado, anoSelecionado]);

  // Filtrar contas por loja
  const contasFiltradas = useMemo(() => {
    if (filtroLoja === 'todas') return contasFinanceiras;
    return contasFinanceiras.filter(c => c.lojaVinculada === filtroLoja);
  }, [contasFinanceiras, filtroLoja]);

  // Separar contas
  const { contasProprias, contasTerceirizadas, totais } = useMemo(() => {
    const proprias = contasFiltradas.filter(c => c.statusMaquina === 'Própria' && c.status === 'Ativo');
    const terceirizadas = contasFiltradas.filter(c => c.statusMaquina === 'Terceirizada' && c.status === 'Ativo');
    
    const totalEntradas = Object.values(entradasPorConta).reduce((acc, v) => acc + v, 0);
    const totalSaidas = Object.values(saidasPorConta).reduce((acc, v) => acc + v, 0);
    
    return {
      contasProprias: proprias,
      contasTerceirizadas: terceirizadas,
      totais: { totalEntradas, totalSaidas, saldo: totalEntradas - totalSaidas }
    };
  }, [contasFiltradas, entradasPorConta, saidasPorConta]);

  const mesNome = meses.find(m => m.valor === mesSelecionado)?.nome || '';

  // Abrir detalhes de uma conta
  const handleAbrirDetalhes = (conta: ContaFinanceira) => {
    setContaSelecionada(conta);
    setShowDetalhesModal(true);
  };

  // Render card de conta
  const renderContaCard = (conta: ContaFinanceira) => {
    const entradas = entradasPorConta[conta.id] || 0;
    const saidas = saidasPorConta[conta.id] || 0;
    const maxValor = Math.max(entradas, saidas, 1);
    const percentualEntrada = (entradas / maxValor) * 100;
    const percentualSaida = (saidas / maxValor) * 100;
    
    return (
      <Card 
        key={conta.id} 
        className="cursor-pointer hover:shadow-lg transition-all hover:border-primary"
        onClick={() => handleAbrirDetalhes(conta)}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="truncate">{conta.nome}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Eye className="h-4 w-4" />
            </Button>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Building2 className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{obterNomeLoja(conta.lojaVinculada)}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Linha de Entrada (Verde) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1 text-green-600">
                <ArrowUpCircle className="h-4 w-4" />
                <span>Entradas</span>
              </div>
              <span className="font-bold text-green-600">{formatCurrency(entradas)}</span>
            </div>
            <Progress 
              value={percentualEntrada} 
              className="h-2 [&>div]:bg-green-500"
            />
          </div>
          
          {/* Linha de Saída (Vermelha) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1 text-red-600">
                <ArrowDownCircle className="h-4 w-4" />
                <span>Saídas</span>
              </div>
              <span className="font-bold text-red-600">{formatCurrency(saidas)}</span>
            </div>
            <Progress 
              value={percentualSaida} 
              className="h-2 [&>div]:bg-red-500"
            />
          </div>
          
          {/* Saldo */}
          <div className="pt-2 border-t">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Saldo</span>
              <span className={`font-bold ${entradas - saidas >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(entradas - saidas)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <FinanceiroLayout title="Extrato por Conta">
      <div className="space-y-6">
        {/* Filtros */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">Período:</span>
              </div>
              
              <Select value={mesSelecionado.toString()} onValueChange={(v) => setMesSelecionado(parseInt(v))}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                  {meses.map(m => (
                    <SelectItem key={m.valor} value={m.valor.toString()}>{m.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={anoSelecionado.toString()} onValueChange={(v) => setAnoSelecionado(parseInt(v))}>
                <SelectTrigger className="w-24">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  {anos.map(a => (
                    <SelectItem key={a} value={a.toString()}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">Loja:</span>
              </div>
              
              <Select value={filtroLoja} onValueChange={setFiltroLoja}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Todas as Lojas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as Lojas</SelectItem>
                  {lojas.map(l => (
                    <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Cards de Resumo Geral */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="bg-green-50 dark:bg-green-950/20 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Entradas</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(totais.totalEntradas)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-red-50 dark:bg-red-950/20 border-red-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <TrendingDown className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Saídas</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(totais.totalSaidas)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className={totais.saldo >= 0 ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200' : 'bg-orange-50 dark:bg-orange-950/20 border-orange-200'}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${totais.saldo >= 0 ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-orange-100 dark:bg-orange-900/30'}`}>
                  <Wallet className={`h-6 w-6 ${totais.saldo >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Saldo do Período</p>
                  <p className={`text-2xl font-bold ${totais.saldo >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                    {formatCurrency(totais.saldo)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Seção: Contas Próprias */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-bold">Contas Próprias</h2>
            <Badge variant="secondary">{contasProprias.length}</Badge>
          </div>
          
          {contasProprias.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhuma conta própria encontrada
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {contasProprias.map(renderContaCard)}
            </div>
          )}
        </div>

        {/* Seção: Contas Terceirizadas */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-bold">Contas Terceirizadas</h2>
            <Badge variant="secondary">{contasTerceirizadas.length}</Badge>
          </div>
          
          {contasTerceirizadas.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhuma conta terceirizada encontrada
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {contasTerceirizadas.map(renderContaCard)}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Detalhes da Conta */}
      <Dialog open={showDetalhesModal} onOpenChange={setShowDetalhesModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Extrato: {contaSelecionada?.nome}
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowDetalhesModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          {contaSelecionada && (
            <div className="space-y-4">
              {/* Resumo da conta */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Entradas</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(entradasPorConta[contaSelecionada.id] || 0)}
                  </p>
                </div>
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Saídas</p>
                  <p className="text-xl font-bold text-red-600">
                    {formatCurrency(saidasPorConta[contaSelecionada.id] || 0)}
                  </p>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Saldo</p>
                  <p className={`text-xl font-bold ${
                    (entradasPorConta[contaSelecionada.id] || 0) - (saidasPorConta[contaSelecionada.id] || 0) >= 0 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {formatCurrency(
                      (entradasPorConta[contaSelecionada.id] || 0) - (saidasPorConta[contaSelecionada.id] || 0)
                    )}
                  </p>
                </div>
              </div>
              
              {/* Tabela de movimentações */}
              <div>
                <h4 className="font-medium mb-2">Movimentações em {mesNome}/{anoSelecionado}</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(movimentacoesPorConta[contaSelecionada.id] || [])
                      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
                      .map((mov) => (
                        <TableRow 
                          key={mov.id}
                          className={mov.tipo === 'entrada' ? 'bg-green-50/50 dark:bg-green-900/10' : 'bg-red-50/50 dark:bg-red-900/10'}
                        >
                          <TableCell>{new Date(mov.data).toLocaleDateString('pt-BR')}</TableCell>
                          <TableCell>{mov.descricao}</TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={mov.tipo === 'entrada' 
                                ? 'bg-green-500/10 text-green-600 border-green-500/30' 
                                : 'bg-red-500/10 text-red-600 border-red-500/30'
                              }
                            >
                              {mov.tipo === 'entrada' ? (
                                <><ArrowUpCircle className="h-3 w-3 mr-1" /> Entrada</>
                              ) : (
                                <><ArrowDownCircle className="h-3 w-3 mr-1" /> Saída</>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell className={`text-right font-semibold ${mov.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                            {mov.tipo === 'entrada' ? '+' : '-'}{formatCurrency(mov.valor)}
                          </TableCell>
                        </TableRow>
                      ))}
                    {(movimentacoesPorConta[contaSelecionada.id] || []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          Nenhuma movimentação no período
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </FinanceiroLayout>
  );
}
