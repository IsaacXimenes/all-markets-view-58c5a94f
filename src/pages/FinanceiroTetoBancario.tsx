import { useState, useMemo } from 'react';
import { FinanceiroLayout } from '@/components/layout/FinanceiroLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Building2, Lock, AlertTriangle, AlertCircle, 
  DollarSign, TrendingUp, Calendar, Landmark, Banknote
} from 'lucide-react';

import { getContasFinanceiras, ContaFinanceira } from '@/utils/cadastrosApi';
import { useCadastroStore } from '@/store/cadastroStore';
import { formatarMoeda } from '@/utils/formatUtils';
import { getVendasPorStatus } from '@/utils/fluxoVendasApi';

const formatCurrency = formatarMoeda;

// Constantes do sistema
const TETO_BANCARIO = 120000; // R$ 120.000
const ALERTA_LIMITE = 100000; // R$ 100.000

// Dados mockados de vendas finalizadas por conta e período
const vendasFinalizadasMock = [
  // Outubro 2025
  { contaDestinoId: 'CTA-001', valor: 45000, data: '2025-10-05', vendaId: 'V-OUT-001' },
  { contaDestinoId: 'CTA-001', valor: 32000, data: '2025-10-12', vendaId: 'V-OUT-002' },
  { contaDestinoId: 'CTA-002', valor: 58000, data: '2025-10-08', vendaId: 'V-OUT-003' },
  { contaDestinoId: 'CTA-002', valor: 47000, data: '2025-10-18', vendaId: 'V-OUT-004' },
  { contaDestinoId: 'CTA-003', valor: 22000, data: '2025-10-15', vendaId: 'V-OUT-005' },
  { contaDestinoId: 'CTA-003', valor: 38000, data: '2025-10-22', vendaId: 'V-OUT-006' },
  { contaDestinoId: 'CTA-004', valor: 75000, data: '2025-10-10', vendaId: 'V-OUT-007' },
  { contaDestinoId: 'CTA-005', valor: 28000, data: '2025-10-25', vendaId: 'V-OUT-008' },
  { contaDestinoId: 'CTA-006', valor: 41000, data: '2025-10-20', vendaId: 'V-OUT-009' },
  { contaDestinoId: 'CTA-007', valor: 35000, data: '2025-10-28', vendaId: 'V-OUT-010' },
  { contaDestinoId: 'CTA-008', valor: 52000, data: '2025-10-14', vendaId: 'V-OUT-011' },

  // Novembro 2025
  { contaDestinoId: 'CTA-001', valor: 68000, data: '2025-11-03', vendaId: 'V-NOV-001' },
  { contaDestinoId: 'CTA-001', valor: 42000, data: '2025-11-15', vendaId: 'V-NOV-002' },
  { contaDestinoId: 'CTA-002', valor: 85000, data: '2025-11-08', vendaId: 'V-NOV-003' },
  { contaDestinoId: 'CTA-002', valor: 25000, data: '2025-11-22', vendaId: 'V-NOV-004' },
  { contaDestinoId: 'CTA-003', valor: 105000, data: '2025-11-12', vendaId: 'V-NOV-005' }, // Em alerta!
  { contaDestinoId: 'CTA-004', valor: 48000, data: '2025-11-18', vendaId: 'V-NOV-006' },
  { contaDestinoId: 'CTA-004', valor: 62000, data: '2025-11-25', vendaId: 'V-NOV-007' },
  { contaDestinoId: 'CTA-005', valor: 95000, data: '2025-11-10', vendaId: 'V-NOV-008' },
  { contaDestinoId: 'CTA-006', valor: 55000, data: '2025-11-20', vendaId: 'V-NOV-009' },
  { contaDestinoId: 'CTA-007', valor: 38000, data: '2025-11-28', vendaId: 'V-NOV-010' },
  { contaDestinoId: 'CTA-008', valor: 72000, data: '2025-11-16', vendaId: 'V-NOV-011' },

  // Dezembro 2025
  { contaDestinoId: 'CTA-001', valor: 88000, data: '2025-12-02', vendaId: 'V-DEZ-001' },
  { contaDestinoId: 'CTA-001', valor: 35000, data: '2025-12-12', vendaId: 'V-DEZ-002' },
  { contaDestinoId: 'CTA-002', valor: 125000, data: '2025-12-05', vendaId: 'V-DEZ-003' }, // Atingiu teto!
  { contaDestinoId: 'CTA-003', valor: 78000, data: '2025-12-08', vendaId: 'V-DEZ-004' },
  { contaDestinoId: 'CTA-003', valor: 45000, data: '2025-12-18', vendaId: 'V-DEZ-005' },
  { contaDestinoId: 'CTA-004', valor: 92000, data: '2025-12-10', vendaId: 'V-DEZ-006' },
  { contaDestinoId: 'CTA-005', valor: 115000, data: '2025-12-15', vendaId: 'V-DEZ-007' }, // Em alerta!
  { contaDestinoId: 'CTA-006', valor: 68000, data: '2025-12-20', vendaId: 'V-DEZ-008' },
  { contaDestinoId: 'CTA-007', valor: 82000, data: '2025-12-22', vendaId: 'V-DEZ-009' },
  { contaDestinoId: 'CTA-008', valor: 58000, data: '2025-12-28', vendaId: 'V-DEZ-010' },

  // Janeiro 2026
  { contaDestinoId: 'CTA-001', valor: 35000, data: '2026-01-05', vendaId: 'V001' },
  { contaDestinoId: 'CTA-001', valor: 42000, data: '2026-01-12', vendaId: 'V002' },
  { contaDestinoId: 'CTA-001', valor: 28000, data: '2026-01-18', vendaId: 'V003' },
  { contaDestinoId: 'CTA-002', valor: 55000, data: '2026-01-08', vendaId: 'V004' },
  { contaDestinoId: 'CTA-002', valor: 32000, data: '2026-01-20', vendaId: 'V005' },
  { contaDestinoId: 'CTA-003', valor: 18000, data: '2026-01-15', vendaId: 'V006' },
  { contaDestinoId: 'CTA-003', valor: 45000, data: '2026-01-25', vendaId: 'V007' },
  { contaDestinoId: 'CTA-004', valor: 22000, data: '2026-01-10', vendaId: 'V008' },
  { contaDestinoId: 'CTA-005', valor: 67000, data: '2026-01-22', vendaId: 'V009' },
  { contaDestinoId: 'CTA-006', valor: 38000, data: '2026-01-14', vendaId: 'V010' },
  { contaDestinoId: 'CTA-007', valor: 29000, data: '2026-01-28', vendaId: 'V011' },
  { contaDestinoId: 'CTA-008', valor: 41000, data: '2026-01-16', vendaId: 'V012' },
  
  // Fevereiro 2026
  { contaDestinoId: 'CTA-001', valor: 48000, data: '2026-02-03', vendaId: 'V013' },
  { contaDestinoId: 'CTA-001', valor: 52000, data: '2026-02-15', vendaId: 'V014' },
  { contaDestinoId: 'CTA-002', valor: 95000, data: '2026-02-10', vendaId: 'V015' },
  { contaDestinoId: 'CTA-002', valor: 28000, data: '2026-02-22', vendaId: 'V016' },
  { contaDestinoId: 'CTA-003', valor: 62000, data: '2026-02-18', vendaId: 'V017' },
  { contaDestinoId: 'CTA-003', valor: 55000, data: '2026-02-25', vendaId: 'V018' },
  { contaDestinoId: 'CTA-004', valor: 15000, data: '2026-02-28', vendaId: 'V019' },
  { contaDestinoId: 'CTA-005', valor: 88000, data: '2026-02-12', vendaId: 'V020' },
  { contaDestinoId: 'CTA-005', valor: 35000, data: '2026-02-20', vendaId: 'V021' },
  { contaDestinoId: 'CTA-006', valor: 42000, data: '2026-02-08', vendaId: 'V022' },
  { contaDestinoId: 'CTA-007', valor: 33000, data: '2026-02-14', vendaId: 'V023' },
  { contaDestinoId: 'CTA-008', valor: 27000, data: '2026-02-26', vendaId: 'V024' },
  
  // Março 2026
  { contaDestinoId: 'CTA-001', valor: 22000, data: '2026-03-01', vendaId: 'V025' },
  { contaDestinoId: 'CTA-001', valor: 38000, data: '2026-03-08', vendaId: 'V026' },
  { contaDestinoId: 'CTA-002', valor: 115000, data: '2026-03-05', vendaId: 'V027' }, // Acima do alerta!
  { contaDestinoId: 'CTA-003', valor: 72000, data: '2026-03-10', vendaId: 'V028' },
  { contaDestinoId: 'CTA-004', valor: 125000, data: '2026-03-12', vendaId: 'V029' }, // Atingiu teto!
  { contaDestinoId: 'CTA-005', valor: 45000, data: '2026-03-15', vendaId: 'V030' },
  { contaDestinoId: 'CTA-006', valor: 58000, data: '2026-03-18', vendaId: 'V031' },
  { contaDestinoId: 'CTA-007', valor: 102000, data: '2026-03-20', vendaId: 'V032' }, // Acima do alerta!
  { contaDestinoId: 'CTA-008', valor: 35000, data: '2026-03-22', vendaId: 'V033' },

  // Abril 2026
  { contaDestinoId: 'CTA-001', valor: 65000, data: '2026-04-02', vendaId: 'V034' },
  { contaDestinoId: 'CTA-002', valor: 48000, data: '2026-04-05', vendaId: 'V035' },
  { contaDestinoId: 'CTA-003', valor: 92000, data: '2026-04-08', vendaId: 'V036' },
  { contaDestinoId: 'CTA-004', valor: 38000, data: '2026-04-12', vendaId: 'V037' },
  { contaDestinoId: 'CTA-005', valor: 55000, data: '2026-04-15', vendaId: 'V038' },
];

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

export default function FinanceiroTetoBancario() {
  const { obterNomeLoja } = useCadastroStore();
  const [contasFinanceiras] = useState<ContaFinanceira[]>(getContasFinanceiras());
  
  // Estados para filtro de período - iniciar no mês atual
  const [mesSelecionado, setMesSelecionado] = useState<number>(new Date().getMonth());
  const [anoSelecionado, setAnoSelecionado] = useState<number>(new Date().getFullYear());

  // Calcular saldos e quantidade de vendas - combina dados mock + vendas reais finalizadas
  const { saldosPorConta, qtdVendasPorConta } = useMemo(() => {
    const saldos: Record<string, number> = {};
    const qtd: Record<string, number> = {};
    
    // 1. Processar dados mockados (histórico)
    vendasFinalizadasMock
      .filter(venda => {
        const dataVenda = new Date(venda.data);
        return dataVenda.getMonth() === mesSelecionado && 
               dataVenda.getFullYear() === anoSelecionado;
      })
      .forEach(venda => {
        saldos[venda.contaDestinoId] = (saldos[venda.contaDestinoId] || 0) + venda.valor;
        qtd[venda.contaDestinoId] = (qtd[venda.contaDestinoId] || 0) + 1;
      });
    
    // 2. Processar vendas reais finalizadas do localStorage
    try {
      const vendasFinalizadas = getVendasPorStatus('Finalizado');
      console.log('[TetoBancario] Vendas finalizadas encontradas:', vendasFinalizadas.length);
      
      vendasFinalizadas.forEach(venda => {
        // Buscar data de finalização
        const dataFinalizacaoRaw = localStorage.getItem(`data_finalizacao_${venda.id}`);
        console.log(`[TetoBancario] Venda ${venda.id} - data_finalizacao:`, dataFinalizacaoRaw);
        
        if (!dataFinalizacaoRaw) return;
        
        const dataFinalizacao = new Date(dataFinalizacaoRaw);
        const mesVenda = dataFinalizacao.getMonth();
        const anoVenda = dataFinalizacao.getFullYear();
        
        console.log(`[TetoBancario] Venda ${venda.id} - Mês: ${mesVenda}, Ano: ${anoVenda} | Filtro: ${mesSelecionado}/${anoSelecionado}`);
        
        // Filtrar pelo período selecionado
        if (mesVenda !== mesSelecionado || anoVenda !== anoSelecionado) {
          return;
        }
        
        // Buscar validações de pagamentos
        const validacaoRaw = localStorage.getItem(`validacao_pagamentos_financeiro_${venda.id}`);
        const historicoRaw = localStorage.getItem(`historico_conferencias_${venda.id}`);
        
        console.log(`[TetoBancario] Venda ${venda.id} - validacao:`, validacaoRaw ? 'OK' : 'NULL', '| historico:', historicoRaw ? 'OK' : 'NULL');
        
        if (validacaoRaw) {
          const validacoes = JSON.parse(validacaoRaw);
          const historico = historicoRaw ? JSON.parse(historicoRaw) : [];
          
          console.log(`[TetoBancario] Venda ${venda.id} - Validações:`, validacoes);
          console.log(`[TetoBancario] Venda ${venda.id} - Histórico:`, historico);
          
          // Para cada validação confirmada pelo financeiro
          validacoes.forEach((validacao: any) => {
            if (!validacao.validadoFinanceiro) return;

            // Buscar o valor do histórico ou dos pagamentos da venda
            const confHistorico = historico.find((h: any) => h.metodoPagamento === validacao.metodoPagamento);
            const pagamentoVenda = venda.pagamentos?.find((p: any) => p.meioPagamento === validacao.metodoPagamento);
            const contaId = validacao.contaDestinoId || pagamentoVenda?.contaDestino;
            const valor = confHistorico?.valor || pagamentoVenda?.valor || 0;

            console.log(`[TetoBancario] Venda ${venda.id} - Método: ${validacao.metodoPagamento}, Conta: ${contaId}, Valor: ${valor}`);

            if (contaId && valor > 0) {
              saldos[contaId] = (saldos[contaId] || 0) + valor;
              qtd[contaId] = (qtd[contaId] || 0) + 1;
            }
          });
        } else {
          // Fallback de segurança: se a venda foi finalizada e tem data_finalizacao,
          // mas não houver validação salva, usamos os pagamentos da própria venda.
          venda.pagamentos?.forEach((p: any) => {
            const contaId = p.contaDestino;
            const valor = p.valor || 0;
            if (!contaId || valor <= 0) return;
            saldos[contaId] = (saldos[contaId] || 0) + valor;
            qtd[contaId] = (qtd[contaId] || 0) + 1;
          });
        }
      });
    } catch (e) {
      console.error('[TetoBancario] Erro ao processar vendas reais:', e);
    }
    
    console.log('[TetoBancario] Saldos finais:', saldos);
    console.log('[TetoBancario] Qtd vendas finais:', qtd);
    
    return { saldosPorConta: saldos, qtdVendasPorConta: qtd };
  }, [mesSelecionado, anoSelecionado]);

  // Separar contas por tipo de máquina + calcular total em dinheiro
  const { contasProprias, contasTerceirizadas, totais, totalDinheiro, qtdVendasDinheiro } = useMemo(() => {
    const proprias = contasFinanceiras.filter(c => c.statusMaquina === 'Própria' && c.status === 'Ativo');
    const terceirizadas = contasFinanceiras.filter(c => c.statusMaquina === 'Terceirizada' && c.status === 'Ativo');
    
    const totalProprias = proprias.reduce((acc, c) => acc + (saldosPorConta[c.id] || 0), 0);
    const totalTerceirizadas = terceirizadas.reduce((acc, c) => acc + (saldosPorConta[c.id] || 0), 0);
    const contasEmAlerta = proprias.filter(c => {
      const saldo = saldosPorConta[c.id] || 0;
      return saldo >= ALERTA_LIMITE && saldo < TETO_BANCARIO;
    }).length;
    const contasNoTeto = proprias.filter(c => (saldosPorConta[c.id] || 0) >= TETO_BANCARIO).length;
    
    // Calcular total em dinheiro
    let totalDinheiro = 0;
    let qtdVendasDinheiro = 0;
    try {
      const vendasFinalizadas = getVendasPorStatus('Finalizado');
      vendasFinalizadas.forEach(venda => {
        const dataFinalizacaoRaw = localStorage.getItem(`data_finalizacao_${venda.id}`);
        if (!dataFinalizacaoRaw) return;
        
        const dataFinalizacao = new Date(dataFinalizacaoRaw);
        if (dataFinalizacao.getMonth() !== mesSelecionado || dataFinalizacao.getFullYear() !== anoSelecionado) return;
        
        const pagsDinheiro = venda.pagamentos?.filter((p: any) => 
          p.meioPagamento.toLowerCase().includes('dinheiro')
        ) || [];
        
        if (pagsDinheiro.length > 0) {
          qtdVendasDinheiro++;
          totalDinheiro += pagsDinheiro.reduce((a: number, p: any) => a + (p.valor || 0), 0);
        }
      });
    } catch (e) {
      console.error('[TetoBancario] Erro ao calcular dinheiro:', e);
    }
    
    return {
      contasProprias: proprias,
      contasTerceirizadas: terceirizadas,
      totais: { totalProprias, totalTerceirizadas, contasEmAlerta, contasNoTeto },
      totalDinheiro,
      qtdVendasDinheiro
    };
  }, [contasFinanceiras, saldosPorConta, mesSelecionado, anoSelecionado]);

  const mesNome = meses.find(m => m.valor === mesSelecionado)?.nome || '';

  return (
    <FinanceiroLayout title="Teto Bancário">
      <div className="space-y-6">
        {/* Filtros de Período */}
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

              <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span>Exibindo vendas finalizadas de <strong>{mesNome}/{anoSelecionado}</strong></span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Lock className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Contas Próprias</p>
                  <p className="text-2xl font-bold">{contasProprias.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total: {formatCurrency(totais.totalProprias)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Landmark className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Contas Terceirizadas</p>
                  <p className="text-2xl font-bold">{contasTerceirizadas.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total: {formatCurrency(totais.totalTerceirizadas)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className={totais.contasEmAlerta > 0 ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <AlertTriangle className={`h-6 w-6 ${totais.contasEmAlerta > 0 ? 'text-orange-600' : 'text-orange-400'}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Em Alerta (&ge;100k)</p>
                  <p className={`text-2xl font-bold ${totais.contasEmAlerta > 0 ? 'text-orange-600' : ''}`}>
                    {totais.contasEmAlerta}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Acima de {formatCurrency(ALERTA_LIMITE)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className={totais.contasNoTeto > 0 ? 'border-red-500 bg-red-50 dark:bg-red-950/20' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <AlertCircle className={`h-6 w-6 ${totais.contasNoTeto > 0 ? 'text-red-600' : 'text-red-400'}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">No Teto (&ge;120k)</p>
                  <p className={`text-2xl font-bold ${totais.contasNoTeto > 0 ? 'text-red-600' : ''}`}>
                    {totais.contasNoTeto}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Atingiram {formatCurrency(TETO_BANCARIO)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Card de Dinheiro */}
          <Card className="bg-green-50 dark:bg-green-950/20 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Banknote className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Caixa Dinheiro</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(totalDinheiro)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {qtdVendasDinheiro} vendas no período
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Seção: Contas Próprias */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-bold">Contas Próprias</h2>
              <Badge variant="secondary">{contasProprias.length}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Teto: {formatCurrency(TETO_BANCARIO)} | Alerta: {formatCurrency(ALERTA_LIMITE)}
            </p>
          </div>
          
          {contasProprias.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhuma conta própria cadastrada
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {contasProprias.map(conta => {
                const saldoAtual = saldosPorConta[conta.id] || 0;
                const qtdVendas = qtdVendasPorConta[conta.id] || 0;
                const percentual = Math.min(100, (saldoAtual / TETO_BANCARIO) * 100);
                const emAlerta = saldoAtual >= ALERTA_LIMITE && saldoAtual < TETO_BANCARIO;
                const atingiuTeto = saldoAtual >= TETO_BANCARIO;
                
                return (
                  <Card 
                    key={conta.id} 
                    className={`transition-all ${
                      atingiuTeto 
                        ? 'border-2 border-red-500 bg-red-50 dark:bg-red-950/20' 
                        : emAlerta 
                          ? 'border-2 border-orange-500 bg-orange-50 dark:bg-orange-950/20' 
                          : ''
                    }`}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span className="truncate">{conta.nome}</span>
                        <div className="flex items-center gap-1">
                          {atingiuTeto && <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />}
                          {emAlerta && <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0" />}
                        </div>
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">{obterNomeLoja(conta.lojaVinculada)}</p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {/* Valor das vendas no período */}
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Vendas no Período</span>
                          <span className={`text-lg font-bold ${
                            atingiuTeto ? 'text-red-600' : emAlerta ? 'text-orange-600' : 'text-green-600'
                          }`}>
                            {formatCurrency(saldoAtual)}
                          </span>
                        </div>

                        {/* Quantidade de vendas */}
                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                          <span>Qtd. Vendas</span>
                          <Badge variant="outline">{qtdVendas}</Badge>
                        </div>
                        
                        {/* Barra de progresso */}
                        <div className="space-y-1">
                          <Progress 
                            value={percentual} 
                            className={`h-3 ${atingiuTeto ? '[&>div]:bg-red-500' : emAlerta ? '[&>div]:bg-orange-500' : '[&>div]:bg-green-500'}`}
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{percentual.toFixed(1)}% do teto</span>
                            <span>Teto: {formatCurrency(TETO_BANCARIO)}</span>
                          </div>
                        </div>
                        
                        {/* Alertas visuais */}
                        {emAlerta && (
                          <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded text-xs text-orange-700 dark:text-orange-300 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                            <span>Atenção: Próximo do limite!</span>
                          </div>
                        )}
                        {atingiuTeto && (
                          <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                            <span>Teto bancário atingido!</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
          
          {/* Total das contas próprias */}
          {contasProprias.length > 0 && (
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Total Contas Próprias ({mesNome}/{anoSelecionado})</span>
                  <span className="text-xl font-bold">{formatCurrency(totais.totalProprias)}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <Separator className="my-6" />

        {/* Seção: Contas Terceirizadas */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-bold">Contas Terceirizadas</h2>
            <Badge variant="secondary">{contasTerceirizadas.length}</Badge>
            <span className="text-xs text-muted-foreground">(Sem limite de teto)</span>
          </div>
          
          {contasTerceirizadas.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhuma conta terceirizada cadastrada
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {contasTerceirizadas.map(conta => {
                const montanteTotal = saldosPorConta[conta.id] || 0;
                const qtdVendas = qtdVendasPorConta[conta.id] || 0;

                return (
                  <Card key={conta.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base truncate">{conta.nome}</CardTitle>
                      <p className="text-xs text-muted-foreground">{obterNomeLoja(conta.lojaVinculada)}</p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Vendas no Período</span>
                          <span className="text-xl font-bold">{formatCurrency(montanteTotal)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                          <span>Qtd. Vendas</span>
                          <Badge variant="outline">{qtdVendas}</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
          
          {/* Total das contas terceirizadas */}
          {contasTerceirizadas.length > 0 && (
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Total Contas Terceirizadas ({mesNome}/{anoSelecionado})</span>
                  <span className="text-xl font-bold">{formatCurrency(totais.totalTerceirizadas)}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </FinanceiroLayout>
  );
}
