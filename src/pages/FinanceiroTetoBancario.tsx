import { useState, useMemo, useCallback } from 'react';
import { FinanceiroLayout } from '@/components/layout/FinanceiroLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Building2, Lock, AlertTriangle, AlertCircle, 
  DollarSign, TrendingUp, Calendar, Landmark, Banknote,
  Eye, FileText, Receipt, CheckCircle2, ArrowUpDown, ArrowUp, ArrowDown, X
} from 'lucide-react';
import { toast } from 'sonner';

import { getContasFinanceiras, ContaFinanceira } from '@/utils/cadastrosApi';
import { useCadastroStore } from '@/store/cadastroStore';
import { AutocompleteLoja } from '@/components/AutocompleteLoja';
import { Label } from '@/components/ui/label';
import { formatarMoeda } from '@/utils/formatUtils';
import { getVendasPorStatus } from '@/utils/fluxoVendasApi';
import { getVendas, Venda } from '@/utils/vendasApi';

const formatCurrency = formatarMoeda;

// Constantes do sistema
const TETO_BANCARIO = 120000; // R$ 120.000
const ALERTA_LIMITE = 100000; // R$ 100.000

// Interface para vendas agrupadas na aba NFE (mantida para modal de detalhes)
interface VendaAgrupada {
  vendaId: string;
  clienteNome: string;
  dataVenda: string;
  valorTotal: number;
  pagamentos: Array<{
    contaId: string;
    valor: number;
    metodo: string;
  }>;
  notaEmitida: boolean;
  dataEmissaoNota?: string;
  itens: Array<{
    produto: string;
    imei: string;
    valorVenda: number;
  }>;
}

// Interface para linha da tabela NFE (espelho de Conferência de Contas - 1 linha por método de pagamento)
interface LinhaNFE {
  vendaId: string;
  venda: VendaAgrupada;
  metodoPagamento: string;
  valor: number;
  contaDestinoId: string;
  contaDestinoNome: string;
  dataVenda: string;
  clienteNome: string;
  notaEmitida: boolean;
  tempoSLA: string;
  slaHoras: number;
}

// Função para calcular SLA em formato legível
const calcularSLANFE = (dataFinalizacao: string): { texto: string; horas: number } => {
  const dataInicio = new Date(dataFinalizacao);
  const dataFim = new Date();
  
  const diffMs = dataFim.getTime() - dataInicio.getTime();
  const diffHoras = diffMs / (1000 * 60 * 60);
  const diffMinutos = (diffMs % (1000 * 60 * 60)) / (1000 * 60);
  
  if (diffHoras >= 24) {
    const dias = Math.floor(diffHoras / 24);
    const horasRestantes = Math.floor(diffHoras % 24);
    return { 
      texto: `${dias}d ${horasRestantes}h`, 
      horas: diffHoras 
    };
  }
  
  return { 
    texto: `${Math.floor(diffHoras)}h ${Math.floor(diffMinutos)}m`, 
    horas: diffHoras 
  };
};

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

// Helper para localStorage de notas emitidas
const getNotasEmitidasPorConta = (mes: number, ano: number): Record<string, number> => {
  try {
    const key = `notas_emitidas_por_conta_${mes}_${ano}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
};

const setNotasEmitidasPorConta = (mes: number, ano: number, data: Record<string, number>) => {
  const key = `notas_emitidas_por_conta_${mes}_${ano}`;
  localStorage.setItem(key, JSON.stringify(data));
};

const isNotaEmitida = (vendaId: string): boolean => {
  return localStorage.getItem(`nota_emitida_${vendaId}`) === 'true';
};

const getDataEmissaoNota = (vendaId: string): string | undefined => {
  const data = localStorage.getItem(`data_emissao_nota_${vendaId}`);
  return data || undefined;
};

export default function FinanceiroTetoBancario() {
  const { obterNomeLoja, lojas } = useCadastroStore();
  const [contasFinanceiras] = useState<ContaFinanceira[]>(getContasFinanceiras());
  const [abaAtiva, setAbaAtiva] = useState('visao-geral');
  
  // Estados para filtro de período - iniciar no mês atual
  const [mesSelecionado, setMesSelecionado] = useState<number>(new Date().getMonth());
  const [anoSelecionado, setAnoSelecionado] = useState<number>(new Date().getFullYear());

  // Estados para aba NFE
  const [vendaSelecionada, setVendaSelecionada] = useState<VendaAgrupada | null>(null);
  const [modalDetalhesAberto, setModalDetalhesAberto] = useState(false);
  const [sheetConfirmacaoAberto, setSheetConfirmacaoAberto] = useState(false);
  const [etapaConfirmacao, setEtapaConfirmacao] = useState<1 | 2>(1);
  const [nfeOrdemData, setNfeOrdemData] = useState<'desc' | 'asc'>('desc');
  const [checkboxConfirmado, setCheckboxConfirmado] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [filtroLoja, setFiltroLoja] = useState('');
  const [filtroConta, setFiltroConta] = useState('');

  // Buscar notas emitidas por conta para o período
  const notasEmitidasPorConta = useMemo(() => {
    return getNotasEmitidasPorConta(mesSelecionado, anoSelecionado);
  }, [mesSelecionado, anoSelecionado, refreshKey]);

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
  }, [mesSelecionado, anoSelecionado, refreshKey]);

  // Separar contas por tipo de máquina + calcular total em dinheiro por loja
  const { contasProprias, contasTerceirizadas, totais, totalDinheiro, qtdVendasDinheiro, dinheiroPorLoja } = useMemo(() => {
    let proprias = contasFinanceiras.filter(c => c.statusMaquina === 'Própria' && c.status === 'Ativo');
    let terceirizadas = contasFinanceiras.filter(c => c.statusMaquina === 'Terceirizada' && c.status === 'Ativo');
    
    // Aplicar filtros de loja e conta
    if (filtroLoja) {
      proprias = proprias.filter(c => c.lojaVinculada === filtroLoja);
      terceirizadas = terceirizadas.filter(c => c.lojaVinculada === filtroLoja);
    }
    if (filtroConta) {
      proprias = proprias.filter(c => c.id === filtroConta);
      terceirizadas = terceirizadas.filter(c => c.id === filtroConta);
    }
    
    const totalProprias = proprias.reduce((acc, c) => acc + (saldosPorConta[c.id] || 0), 0);
    const totalTerceirizadas = terceirizadas.reduce((acc, c) => acc + (saldosPorConta[c.id] || 0), 0);
    const contasEmAlerta = proprias.filter(c => {
      const saldo = saldosPorConta[c.id] || 0;
      return saldo >= ALERTA_LIMITE && saldo < TETO_BANCARIO;
    }).length;
    const contasNoTeto = proprias.filter(c => (saldosPorConta[c.id] || 0) >= TETO_BANCARIO).length;
    
    // Calcular dinheiro por loja
    const dinheiroPorLoja: Record<string, { total: number; qtd: number }> = {};
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
          const lojaId = venda.lojaVenda || 'desconhecida';
          if (!dinheiroPorLoja[lojaId]) dinheiroPorLoja[lojaId] = { total: 0, qtd: 0 };
          const valorDinheiro = pagsDinheiro.reduce((a: number, p: any) => a + (p.valor || 0), 0);
          dinheiroPorLoja[lojaId].total += valorDinheiro;
          dinheiroPorLoja[lojaId].qtd++;
          totalDinheiro += valorDinheiro;
          qtdVendasDinheiro++;
        }
      });
    } catch (e) {
      console.error('[TetoBancario] Erro ao calcular dinheiro por loja:', e);
    }
    
    return {
      contasProprias: proprias,
      contasTerceirizadas: terceirizadas,
      totais: { totalProprias, totalTerceirizadas, contasEmAlerta, contasNoTeto },
      totalDinheiro,
      qtdVendasDinheiro,
      dinheiroPorLoja
    };
  }, [contasFinanceiras, saldosPorConta, mesSelecionado, anoSelecionado, filtroLoja, filtroConta]);

  // Buscar vendas finalizadas para aba NFE
  const vendasAgrupadas = useMemo((): VendaAgrupada[] => {
    const vendas: VendaAgrupada[] = [];
    
    try {
      const vendasFinalizadas = getVendasPorStatus('Finalizado');
      
      vendasFinalizadas.forEach(venda => {
        const dataFinalizacaoRaw = localStorage.getItem(`data_finalizacao_${venda.id}`);
        if (!dataFinalizacaoRaw) return;
        
        const dataFinalizacao = new Date(dataFinalizacaoRaw);
        if (dataFinalizacao.getMonth() !== mesSelecionado || dataFinalizacao.getFullYear() !== anoSelecionado) return;
        
        const pagamentos = venda.pagamentos?.map((p: any) => ({
          contaId: p.contaDestino,
          valor: p.valor || 0,
          metodo: p.meioPagamento
        })) || [];
        
        const valorTotal = pagamentos.reduce((sum: number, p: { valor: number }) => sum + p.valor, 0);
        
        vendas.push({
          vendaId: venda.id,
          clienteNome: venda.clienteNome,
          dataVenda: dataFinalizacaoRaw,
          valorTotal,
          pagamentos,
          notaEmitida: isNotaEmitida(venda.id),
          dataEmissaoNota: getDataEmissaoNota(venda.id),
          itens: venda.itens?.map((i: any) => ({
            produto: i.produto,
            imei: i.imei,
            valorVenda: i.valorVenda
          })) || []
        });
      });
      
      // Também adicionar vendas mockadas como vendas agrupadas para demonstração
      const vendasMockAgrupadas = new Map<string, VendaAgrupada>();
      vendasFinalizadasMock
        .filter(v => {
          const d = new Date(v.data);
          return d.getMonth() === mesSelecionado && d.getFullYear() === anoSelecionado;
        })
        .forEach(v => {
          if (!vendasMockAgrupadas.has(v.vendaId)) {
            vendasMockAgrupadas.set(v.vendaId, {
              vendaId: v.vendaId,
              clienteNome: `Cliente Mock ${v.vendaId}`,
              dataVenda: v.data,
              valorTotal: v.valor,
              pagamentos: [{
                contaId: v.contaDestinoId,
                valor: v.valor,
                metodo: 'Pix'
              }],
              notaEmitida: isNotaEmitida(v.vendaId),
              dataEmissaoNota: getDataEmissaoNota(v.vendaId),
              itens: [{ produto: 'iPhone Mock', imei: '000000000', valorVenda: v.valor }]
            });
          } else {
            const existing = vendasMockAgrupadas.get(v.vendaId)!;
            existing.valorTotal += v.valor;
            existing.pagamentos.push({
              contaId: v.contaDestinoId,
              valor: v.valor,
              metodo: 'Pix'
            });
          }
        });
      
      vendasMockAgrupadas.forEach(v => vendas.push(v));
    } catch (e) {
      console.error('[TetoBancario] Erro ao buscar vendas para NFE:', e);
    }
    
    // Ordenar por data mais recente
    return vendas.sort((a, b) => new Date(b.dataVenda).getTime() - new Date(a.dataVenda).getTime());
  }, [mesSelecionado, anoSelecionado, refreshKey]);

  // Função auxiliar para obter nome da conta (definida antes do useMemo que a usa)
  const obterNomeConta = useCallback((contaId: string) => {
    const conta = contasFinanceiras.find(c => c.id === contaId);
    if (!conta) return contaId;
    const nomeLoja = obterNomeLoja(conta.lojaVinculada);
    return `${nomeLoja} - ${conta.nome}`;
  }, [contasFinanceiras, obterNomeLoja, lojas]);

  // Criar linhas NFE (espelho de Conferência de Contas - 1 linha por método de pagamento)
  const linhasNFE = useMemo((): LinhaNFE[] => {
    const linhas: LinhaNFE[] = [];
    
    vendasAgrupadas.forEach(venda => {
      const slaResult = calcularSLANFE(venda.dataVenda);
      
      venda.pagamentos.forEach(pag => {
        const contaNome = obterNomeConta(pag.contaId);
        
        linhas.push({
          vendaId: venda.vendaId,
          venda,
          metodoPagamento: pag.metodo,
          valor: pag.valor,
          contaDestinoId: pag.contaId,
          contaDestinoNome: contaNome,
          dataVenda: venda.dataVenda,
          clienteNome: venda.clienteNome,
          notaEmitida: venda.notaEmitida,
          tempoSLA: slaResult.texto,
          slaHoras: slaResult.horas
        });
      });
    });
    
    // Ordenar: pendentes primeiro, depois por data conforme direção selecionada
    return linhas.sort((a, b) => {
      // Primeiro: pendentes (nota não emitida) no topo
      if (a.notaEmitida !== b.notaEmitida) {
        return a.notaEmitida ? 1 : -1;
      }
      // Depois por data conforme ordenação
      const diff = new Date(a.dataVenda).getTime() - new Date(b.dataVenda).getTime();
      return nfeOrdemData === 'desc' ? -diff : diff;
    });
  }, [vendasAgrupadas, obterNomeConta, nfeOrdemData]);

  // Filtrar linhas NFE por loja e conta
  const linhasNFEFiltradas = useMemo(() => {
    let result = linhasNFE;
    if (filtroLoja) {
      const contasIds = contasFinanceiras.filter(c => c.lojaVinculada === filtroLoja).map(c => c.id);
      result = result.filter(l => contasIds.includes(l.contaDestinoId));
    }
    if (filtroConta) {
      result = result.filter(l => l.contaDestinoId === filtroConta);
    }
    return result;
  }, [linhasNFE, filtroLoja, filtroConta, contasFinanceiras]);

  const mesNome = meses.find(m => m.valor === mesSelecionado)?.nome || '';

  // Funções da aba NFE
  const abrirDetalhes = (venda: VendaAgrupada) => {
    setVendaSelecionada(venda);
    setModalDetalhesAberto(true);
  };

  const abrirConfirmacao = (venda: VendaAgrupada) => {
    setVendaSelecionada(venda);
    setEtapaConfirmacao(1);
    setCheckboxConfirmado(false);
    setSheetConfirmacaoAberto(true);
  };

  const confirmarEmissaoNota = useCallback(() => {
    if (!vendaSelecionada || !checkboxConfirmado) return;
    
    // 1. Marcar venda como nota emitida
    localStorage.setItem(`nota_emitida_${vendaSelecionada.vendaId}`, 'true');
    localStorage.setItem(`data_emissao_nota_${vendaSelecionada.vendaId}`, new Date().toISOString());
    
    // 2. Atualizar valorNotasEmitidas por conta
    const notasAtuais = getNotasEmitidasPorConta(mesSelecionado, anoSelecionado);
    vendaSelecionada.pagamentos.forEach(pag => {
      if (pag.contaId && pag.valor > 0) {
        notasAtuais[pag.contaId] = (notasAtuais[pag.contaId] || 0) + pag.valor;
      }
    });
    setNotasEmitidasPorConta(mesSelecionado, anoSelecionado, notasAtuais);
    
    // 3. Fechar modal e atualizar lista
    setSheetConfirmacaoAberto(false);
    setVendaSelecionada(null);
    setRefreshKey(prev => prev + 1);
    
    toast.success('Nota fiscal gerada com sucesso!', {
      description: `Venda ${vendaSelecionada.vendaId} - ${formatCurrency(vendaSelecionada.valorTotal)}`
    });
  }, [vendaSelecionada, checkboxConfirmado, mesSelecionado, anoSelecionado]);


  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR');
  };

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

            </div>

            <Separator className="my-3" />

            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1.5 w-56">
                <Label className="text-xs text-muted-foreground">Filtrar por Loja</Label>
                <AutocompleteLoja
                  value={filtroLoja}
                  onChange={setFiltroLoja}
                  placeholder="Todas as lojas"
                />
              </div>
              <div className="space-y-1.5 w-56">
                <Label className="text-xs text-muted-foreground">Filtrar por Conta</Label>
                <Select value={filtroConta || '__all__'} onValueChange={(v) => setFiltroConta(v === '__all__' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as contas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todas as contas</SelectItem>
                    {contasFinanceiras.filter(c => c.status === 'Ativo').map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {(filtroLoja || filtroConta || mesSelecionado !== new Date().getMonth() || anoSelecionado !== new Date().getFullYear()) && (
                <Button variant="ghost" size="sm" onClick={() => { setFiltroLoja(''); setFiltroConta(''); setMesSelecionado(new Date().getMonth()); setAnoSelecionado(new Date().getFullYear()); }} className="gap-1">
                  <X className="h-4 w-4" />
                  Limpar filtros
                </Button>
              )}
              <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span>Exibindo vendas finalizadas de <strong>{mesNome}/{anoSelecionado}</strong></span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sistema de Abas */}
        <Tabs value={abaAtiva} onValueChange={setAbaAtiva}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="visao-geral" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="emissao-nfe" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Emissão - NFE
            </TabsTrigger>
          </TabsList>

          {/* Aba Visão Geral - Conteúdo original */}
          <TabsContent value="visao-geral" className="space-y-6 mt-6">
            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Landmark className="h-6 w-6 text-blue-600" />
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
              
              {/* Card de Dinheiro - Totalizador */}
              <Card className="bg-green-50 dark:bg-green-950/20 border-green-200">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <Banknote className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Caixa Dinheiro (Total)</p>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(totalDinheiro)}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {qtdVendasDinheiro} vendas no período
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Cards de Dinheiro por Loja */}
            {Object.keys(dinheiroPorLoja).length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Banknote className="h-5 w-5 text-green-600" />
                  <h2 className="text-lg font-bold">Caixa Dinheiro por Loja</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {Object.entries(dinheiroPorLoja)
                    .filter(([lojaId]) => !filtroLoja || lojaId === filtroLoja)
                    .map(([lojaId, dados]) => (
                    <Card key={lojaId} className="bg-green-50 dark:bg-green-950/20 border-green-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Banknote className="h-4 w-4 text-green-600" />
                          {obterNomeLoja(lojaId)}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Saldo em Dinheiro</span>
                            <span className="text-xl font-bold text-green-600">{formatCurrency(dados.total)}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs text-muted-foreground">
                            <span>Vendas em Dinheiro</span>
                            <Badge variant="outline">{dados.qtd}</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

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
                    const notasEmitidas = notasEmitidasPorConta[conta.id] || 0;
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

                            {/* NOVO: Notas Emitidas */}
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Notas Emitidas</span>
                              <span className="text-lg font-bold text-blue-600">
                                {formatCurrency(notasEmitidas)}
                              </span>
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
                <Landmark className="h-5 w-5 text-blue-600" />
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
                    const notasEmitidas = notasEmitidasPorConta[conta.id] || 0;

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
                            {/* NOVO: Notas Emitidas */}
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Notas Emitidas</span>
                              <span className="text-lg font-bold text-blue-600">
                                {formatCurrency(notasEmitidas)}
                              </span>
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
          </TabsContent>

          {/* Aba Emissão NFE - Espelho de Conferência de Contas (1 linha por método de pagamento) */}
          <TabsContent value="emissao-nfe" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Receipt className="h-5 w-5" />
                      Lançamentos para Emissão de NFE
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Vendas finalizadas - {mesNome}/{anoSelecionado} (1 linha por método de pagamento)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{vendasAgrupadas.length} vendas</Badge>
                    <Badge variant="secondary">{linhasNFEFiltradas.length} lançamentos</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {linhasNFEFiltradas.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma venda finalizada neste período</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[600px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID Venda</TableHead>
                          <TableHead>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-auto p-0 font-medium text-muted-foreground hover:text-foreground"
                              onClick={() => setNfeOrdemData(prev => prev === 'desc' ? 'asc' : 'desc')}
                            >
                              Data
                              {nfeOrdemData === 'desc' ? (
                                <ArrowDown className="ml-1 h-3 w-3" />
                              ) : (
                                <ArrowUp className="ml-1 h-3 w-3" />
                              )}
                            </Button>
                          </TableHead>
                          <TableHead>SLA</TableHead>
                          <TableHead>Método Pagamento</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead>Conta Destino</TableHead>
                          <TableHead>Situação</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-center">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {linhasNFEFiltradas.map((linha, idx) => (
                          <TableRow 
                            key={`${linha.vendaId}-${linha.metodoPagamento}-${idx}`}
                            className={linha.notaEmitida ? 'bg-green-500/10' : ''}
                          >
                            <TableCell className="font-mono font-medium">{linha.vendaId}</TableCell>
                            <TableCell>{formatDate(linha.dataVenda)}</TableCell>
                            <TableCell>
                              <span className={`text-xs px-2 py-1 rounded ${
                                linha.slaHoras >= 48 
                                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' 
                                  : linha.slaHoras >= 24 
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                    : 'bg-muted text-muted-foreground'
                              }`}>
                                {linha.tempoSLA}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-normal">
                                {linha.metodoPagamento}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-bold">
                              {formatCurrency(linha.valor)}
                            </TableCell>
                            <TableCell className="text-sm">
                              {linha.contaDestinoNome}
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-green-600 text-white">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Conferido
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {linha.notaEmitida ? (
                                <Badge className="bg-green-600 text-white">
                                  Nota Emitida
                                </Badge>
                              ) : (
                                <Badge variant="outline">
                                  Finalizado
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => abrirDetalhes(linha.venda)}
                                  title="Ver detalhes da venda"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {!linha.notaEmitida && (
                                  <Button 
                                    variant="default" 
                                    size="sm"
                                    onClick={() => abrirConfirmacao(linha.venda)}
                                  >
                                    <FileText className="h-4 w-4 mr-1" />
                                    Gerar Nota
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modal de Detalhes da Venda - Fullscreen */}
        <Dialog open={modalDetalhesAberto} onOpenChange={setModalDetalhesAberto}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Detalhes da Venda - {vendaSelecionada?.vendaId}
              </DialogTitle>
              <DialogDescription>
                Cliente: {vendaSelecionada?.clienteNome}
              </DialogDescription>
            </DialogHeader>

            {vendaSelecionada && (
              <div className="space-y-6">
                {/* Informações gerais */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground">Data</p>
                      <p className="font-bold">{formatDate(vendaSelecionada.dataVenda)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground">Valor Total</p>
                      <p className="font-bold text-lg">{formatCurrency(vendaSelecionada.valorTotal)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground">Status Nota</p>
                      {vendaSelecionada.notaEmitida ? (
                        <Badge className="bg-green-600 mt-1">Nota Emitida</Badge>
                      ) : (
                        <Badge variant="outline" className="mt-1">Pendente</Badge>
                      )}
                    </CardContent>
                  </Card>
                  {vendaSelecionada.dataEmissaoNota && (
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-xs text-muted-foreground">Data Emissão</p>
                        <p className="font-bold">{formatDate(vendaSelecionada.dataEmissaoNota)}</p>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Produtos */}
                <div>
                  <h3 className="font-semibold mb-3">Produtos Vendidos</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead>IMEI</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vendaSelecionada.itens.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{item.produto}</TableCell>
                          <TableCell className="font-mono">{item.imei}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.valorVenda)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Distribuição de Pagamentos */}
                <div>
                  <h3 className="font-semibold mb-3">Distribuição de Pagamentos por Conta</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Método</TableHead>
                        <TableHead>Conta Destino</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vendaSelecionada.pagamentos.map((pag, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{pag.metodo}</TableCell>
                          <TableCell>{obterNomeConta(pag.contaId)}</TableCell>
                          <TableCell className="text-right font-bold">{formatCurrency(pag.valor)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Sheet de Confirmação - 2 Etapas */}
        <Sheet open={sheetConfirmacaoAberto} onOpenChange={setSheetConfirmacaoAberto}>
          <SheetContent className="sm:max-w-lg">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {etapaConfirmacao === 1 ? 'Gerar Nota Fiscal' : 'Confirmar Emissão'}
              </SheetTitle>
              <SheetDescription>
                {etapaConfirmacao === 1 
                  ? 'Revise os dados antes de continuar'
                  : 'Confirme a geração da nota fiscal'
                }
              </SheetDescription>
            </SheetHeader>

            {vendaSelecionada && (
              <div className="py-6 space-y-6">
                {etapaConfirmacao === 1 ? (
                  <>
                    {/* Etapa 1: Resumo */}
                    <Card>
                      <CardContent className="pt-4 space-y-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">ID Venda</span>
                          <span className="font-mono font-bold">{vendaSelecionada.vendaId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Cliente</span>
                          <span className="font-medium">{vendaSelecionada.clienteNome}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Valor Total</span>
                          <span className="text-xl font-bold">{formatCurrency(vendaSelecionada.valorTotal)}</span>
                        </div>
                      </CardContent>
                    </Card>

                    <div>
                      <h4 className="font-medium mb-2">Pagamentos que serão vinculados:</h4>
                      <div className="space-y-2">
                        {vendaSelecionada.pagamentos.map((pag, idx) => (
                          <div key={idx} className="flex justify-between text-sm p-2 bg-muted rounded">
                            <span>{pag.metodo} → {obterNomeConta(pag.contaId)}</span>
                            <span className="font-bold">{formatCurrency(pag.valor)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <SheetFooter>
                      <Button 
                        className="w-full" 
                        onClick={() => setEtapaConfirmacao(2)}
                      >
                        Continuar para Confirmação
                      </Button>
                    </SheetFooter>
                  </>
                ) : (
                  <>
                    {/* Etapa 2: Confirmação Final */}
                    <div className="p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-orange-800 dark:text-orange-200">
                            Atenção: Esta ação não pode ser desfeita!
                          </p>
                          <p className="text-orange-700 dark:text-orange-300 mt-1">
                            Ao confirmar, a nota fiscal será marcada como emitida e os valores serão 
                            distribuídos para cada conta bancária correspondente.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 border rounded-lg">
                      <Checkbox 
                        id="confirmar-emissao"
                        checked={checkboxConfirmado}
                        onCheckedChange={(checked) => setCheckboxConfirmado(checked === true)}
                      />
                      <label 
                        htmlFor="confirmar-emissao" 
                        className="text-sm cursor-pointer leading-relaxed"
                      >
                        Confirmo que desejo gerar a nota fiscal para a venda{' '}
                        <strong>{vendaSelecionada.vendaId}</strong> no valor de{' '}
                        <strong>{formatCurrency(vendaSelecionada.valorTotal)}</strong>
                      </label>
                    </div>

                    <SheetFooter className="flex flex-col gap-2">
                      <Button 
                        variant="outline"
                        className="w-full"
                        onClick={() => setEtapaConfirmacao(1)}
                      >
                        Voltar
                      </Button>
                      <Button 
                        className="w-full"
                        disabled={!checkboxConfirmado}
                        onClick={confirmarEmissaoNota}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Confirmar Emissão
                      </Button>
                    </SheetFooter>
                  </>
                )}
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </FinanceiroLayout>
  );
}
