import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { CreditCard, Plus, X, AlertTriangle, DollarSign, TrendingUp, Percent, Store } from 'lucide-react';
import { getContasFinanceiras, getMaquinasCartao, ContaFinanceira, MaquinaCartao } from '@/utils/cadastrosApi';
import { Pagamento } from '@/utils/vendasApi';
import { formatarMoeda, moedaMask, parseMoeda } from '@/utils/formatUtils';
import { calcularValoresVenda, getTaxaCredito, TAXA_DEBITO, MAX_PARCELAS } from '@/config/taxasCartao';
import { calcularComissaoVenda, ResultadoComissaoVenda, LOJA_ONLINE_ID } from '@/utils/calculoComissaoVenda';

export interface PagamentoQuadroProps {
  valorTotalProdutos: number;
  custoTotalProdutos: number; // Custo total dos produtos para cálculo de lucro
  lojaVendaId?: string; // ID da loja para cálculo de comissão
  onPagamentosChange: (pagamentos: Pagamento[]) => void;
  onValoresChange?: (valores: { 
    valorProdutos: number; 
    valorTaxas: number;
    valorLiquido: number;
    lucroResidual: number;
    comissaoVenda?: ResultadoComissaoVenda;
  }) => void;
  pagamentosIniciais?: Pagamento[];
}

interface NovoPagamentoState extends Partial<Pagamento> {
  maquinaId?: string;
  taxaCartao?: number;
  valorLiquido?: number;
}

// Função para obter parcelamentos da máquina ou usar valores padrão
const getParcelamentosMaquina = (maquina: MaquinaCartao | undefined): { parcelas: number; taxa: number }[] => {
  if (maquina?.parcelamentos && maquina.parcelamentos.length > 0) {
    return maquina.parcelamentos.sort((a, b) => a.parcelas - b.parcelas);
  }
  // Valores padrão se a máquina não tiver parcelamentos configurados
  return Array.from({ length: MAX_PARCELAS }, (_, i) => ({
    parcelas: i + 1,
    taxa: getTaxaCredito(i + 1)
  }));
};

// Função para obter taxa de uma parcela específica da máquina
const getTaxaMaquina = (maquina: MaquinaCartao | undefined, parcelas: number, meioPagamento: string): number => {
  if (meioPagamento === 'Cartão Débito') {
    return maquina?.taxas?.debito ?? TAXA_DEBITO;
  }
  if (meioPagamento === 'Cartão Crédito') {
    const parcelamentos = getParcelamentosMaquina(maquina);
    const parcelamento = parcelamentos.find(p => p.parcelas === parcelas);
    return parcelamento?.taxa ?? getTaxaCredito(parcelas);
  }
  return 0;
};

export function PagamentoQuadro({ 
  valorTotalProdutos, 
  custoTotalProdutos,
  lojaVendaId,
  onPagamentosChange, 
  onValoresChange,
  pagamentosIniciais = []
}: PagamentoQuadroProps) {
  const [contasFinanceiras] = useState<ContaFinanceira[]>(getContasFinanceiras());
  const [maquinasCartao] = useState<MaquinaCartao[]>(getMaquinasCartao().filter(m => m.status === 'Ativo'));
  
  const [pagamentos, setPagamentos] = useState<Pagamento[]>(pagamentosIniciais);
  const [showPagamentoModal, setShowPagamentoModal] = useState(false);
  const [novoPagamento, setNovoPagamento] = useState<NovoPagamentoState>({});

  // Sincronizar pagamentos iniciais
  useEffect(() => {
    if (pagamentosIniciais.length > 0 && pagamentos.length === 0) {
      setPagamentos(pagamentosIniciais);
    }
  }, [pagamentosIniciais]);

  // Notificar mudanças nos pagamentos
  useEffect(() => {
    onPagamentosChange(pagamentos);
  }, [pagamentos, onPagamentosChange]);

  // Calcular valores totais com nova lógica
  const totalPagamentos = useMemo(() => pagamentos.reduce((acc, p) => acc + p.valor, 0), [pagamentos]);
  
  // Calcular taxas totais de todos os pagamentos
  const totalTaxas = useMemo(() => pagamentos.reduce((acc, p) => acc + (p.taxaCartao || 0), 0), [pagamentos]);
  
  // Valor Líquido = Total Pagamentos - Taxas
  const valorLiquido = useMemo(() => totalPagamentos - totalTaxas, [totalPagamentos, totalTaxas]);
  
  // Lucro Residual = Valor Líquido - Custo Total dos Produtos
  const lucroResidual = useMemo(() => valorLiquido - custoTotalProdutos, [valorLiquido, custoTotalProdutos]);
  
  const valorPendente = useMemo(() => valorTotalProdutos - totalPagamentos, [valorTotalProdutos, totalPagamentos]);

  // Cálculo da comissão de venda baseado na loja
  const comissaoVenda = useMemo((): ResultadoComissaoVenda | undefined => {
    if (!lojaVendaId || lucroResidual <= 0) return undefined;
    try {
      return calcularComissaoVenda({ lojaVendaId, lucroResidual });
    } catch {
      return undefined;
    }
  }, [lojaVendaId, lucroResidual]);

  // Notificar valores para componente pai
  useEffect(() => {
    onValoresChange?.({ 
      valorProdutos: valorTotalProdutos, 
      valorTaxas: totalTaxas,
      valorLiquido,
      lucroResidual,
      comissaoVenda
    });
  }, [valorTotalProdutos, totalTaxas, valorLiquido, lucroResidual, comissaoVenda, onValoresChange]);

  const getContaNome = (id: string) => {
    const conta = contasFinanceiras.find(c => c.id === id);
    return conta?.nome || id;
  };

  const handleOpenPagamentoModal = () => {
    setNovoPagamento({});
    setShowPagamentoModal(true);
  };

  const handleMeioPagamentoChange = (v: string) => {
    if (v === 'Cartão Débito') {
      setNovoPagamento({ 
        ...novoPagamento, 
        meioPagamento: v, 
        parcelas: 1, 
        isFiado: false, 
        fiadoDataBase: undefined, 
        fiadoNumeroParcelas: undefined, 
        maquinaId: '', 
        taxaCartao: undefined, 
        valorLiquido: undefined 
      });
    } else if (v === 'Cartão Crédito') {
      setNovoPagamento({ 
        ...novoPagamento, 
        meioPagamento: v, 
        parcelas: novoPagamento.parcelas || 1, 
        isFiado: false, 
        fiadoDataBase: undefined, 
        fiadoNumeroParcelas: undefined, 
        maquinaId: '', 
        taxaCartao: undefined, 
        valorLiquido: undefined 
      });
    } else if (v === 'Fiado') {
      const contaPessoal = contasFinanceiras.find(c => 
        c.nome.toLowerCase().includes('pessoal') && c.nome.toLowerCase().includes('thiago')
      );
      setNovoPagamento({ 
        ...novoPagamento, 
        meioPagamento: v, 
        parcelas: undefined, 
        isFiado: true, 
        fiadoDataBase: 5, 
        fiadoNumeroParcelas: 1, 
        contaDestino: contaPessoal?.id || '', 
        maquinaId: undefined, 
        taxaCartao: 0, 
        valorLiquido: novoPagamento.valor 
      });
    } else {
      // Pix, Dinheiro, Transferência - sem taxa
      setNovoPagamento({ 
        ...novoPagamento, 
        meioPagamento: v, 
        parcelas: undefined, 
        isFiado: false, 
        fiadoDataBase: undefined, 
        fiadoNumeroParcelas: undefined, 
        maquinaId: undefined, 
        taxaCartao: 0, 
        valorLiquido: novoPagamento.valor 
      });
    }
  };

  // Nova lógica: calcular taxa a partir do valor final (bruto) usando taxas da máquina
  const calcularTaxaDoValorFinal = (valorFinal: number, parcelas: number, meioPagamento: string, maquinaId?: string) => {
    const maquina = maquinasCartao.find(m => m.id === maquinaId);
    const taxaPercent = getTaxaMaquina(maquina, parcelas, meioPagamento);
    const taxaCartao = valorFinal * (taxaPercent / 100);
    const valorLiquido = valorFinal - taxaCartao;
    return {
      taxaPercent,
      taxaCartao,
      valorLiquido
    };
  };

  const handleValorChange = (valorFormatado: string) => {
    const valorNum = parseMoeda(valorFormatado);
    
    if (novoPagamento.meioPagamento === 'Cartão Crédito' || novoPagamento.meioPagamento === 'Cartão Débito') {
      const { taxaCartao, valorLiquido } = calcularTaxaDoValorFinal(
        valorNum, 
        novoPagamento.parcelas || 1, 
        novoPagamento.meioPagamento || '',
        novoPagamento.maquinaId
      );
      setNovoPagamento({ ...novoPagamento, valor: valorNum, taxaCartao, valorLiquido });
    } else {
      setNovoPagamento({ ...novoPagamento, valor: valorNum, taxaCartao: 0, valorLiquido: valorNum });
    }
  };

  const handleMaquinaChange = (maquinaId: string) => {
    if (novoPagamento.valor && (novoPagamento.meioPagamento === 'Cartão Crédito' || novoPagamento.meioPagamento === 'Cartão Débito')) {
      const { taxaCartao, valorLiquido } = calcularTaxaDoValorFinal(
        novoPagamento.valor, 
        novoPagamento.parcelas || 1, 
        novoPagamento.meioPagamento || '',
        maquinaId
      );
      // Reset parcelas para 1 ao mudar máquina, para garantir que seja uma parcela válida
      setNovoPagamento({ ...novoPagamento, maquinaId, parcelas: 1, taxaCartao, valorLiquido });
    } else {
      setNovoPagamento({ ...novoPagamento, maquinaId, parcelas: 1 });
    }
  };

  const handleParcelasChange = (parcelas: number) => {
    if (novoPagamento.valor && novoPagamento.meioPagamento === 'Cartão Crédito') {
      const { taxaCartao, valorLiquido } = calcularTaxaDoValorFinal(
        novoPagamento.valor, 
        parcelas, 
        novoPagamento.meioPagamento,
        novoPagamento.maquinaId
      );
      setNovoPagamento({ ...novoPagamento, parcelas, taxaCartao, valorLiquido });
    } else {
      setNovoPagamento({ ...novoPagamento, parcelas });
    }
  };

  const handleAddPagamento = () => {
    if (!novoPagamento.meioPagamento || !novoPagamento.valor || !novoPagamento.contaDestino) {
      toast.error('Todos os campos são obrigatórios');
      return;
    }
    
    // Validar máquina para cartão
    if ((novoPagamento.meioPagamento === 'Cartão Crédito' || novoPagamento.meioPagamento === 'Cartão Débito') && !novoPagamento.maquinaId) {
      toast.error('Selecione a máquina de cartão');
      return;
    }
    
    // Validar parcelas para cartão crédito
    if (novoPagamento.meioPagamento === 'Cartão Crédito' && !novoPagamento.parcelas) {
      toast.error('Selecione o número de parcelas');
      return;
    }

    // Validar campos para Fiado
    if (novoPagamento.meioPagamento === 'Fiado' && (!novoPagamento.fiadoDataBase || !novoPagamento.fiadoNumeroParcelas)) {
      toast.error('Preencha os campos de data base e número de parcelas');
      return;
    }
    
    const parcelas = novoPagamento.meioPagamento === 'Cartão Crédito' 
      ? novoPagamento.parcelas 
      : novoPagamento.meioPagamento === 'Cartão Débito' 
        ? 1 
        : undefined;
    
    const valorParcela = parcelas && parcelas > 0 ? novoPagamento.valor! / parcelas : undefined;
    
    const pagamento: Pagamento = {
      id: `PAG-${Date.now()}`,
      meioPagamento: novoPagamento.meioPagamento!,
      valor: novoPagamento.valor!,
      contaDestino: novoPagamento.contaDestino!,
      parcelas,
      valorParcela,
      descricao: novoPagamento.descricao,
      isFiado: novoPagamento.meioPagamento === 'Fiado',
      fiadoDataBase: novoPagamento.fiadoDataBase,
      fiadoNumeroParcelas: novoPagamento.fiadoNumeroParcelas,
      taxaCartao: novoPagamento.taxaCartao || 0,
      valorComTaxa: novoPagamento.valor, // Valor bruto é o que foi pago
      maquinaId: novoPagamento.maquinaId
    };
    
    setPagamentos([...pagamentos, pagamento]);
    setShowPagamentoModal(false);
    setNovoPagamento({});
    toast.success('Pagamento adicionado');
  };

  const handleRemovePagamento = (pagamentoId: string) => {
    setPagamentos(pagamentos.filter(p => p.id !== pagamentoId));
    toast.success('Pagamento removido');
  };

  const isPrejuizo = lucroResidual < 0;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Pagamentos
            </span>
            <Button variant="outline" onClick={handleOpenPagamentoModal}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Pagamento
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pagamentos.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              Nenhum pagamento adicionado.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Meio de Pagamento</TableHead>
                  <TableHead>Conta de Destino</TableHead>
                  <TableHead className="text-center">Parcelas</TableHead>
                  <TableHead className="text-right">Valor Final</TableHead>
                  <TableHead className="text-right">Taxa</TableHead>
                  <TableHead className="text-right">Valor Líquido</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagamentos.map(pag => {
                  const valorLiquidoPag = pag.valor - (pag.taxaCartao || 0);
                  return (
                    <TableRow key={pag.id}>
                      <TableCell className="font-medium">{pag.meioPagamento}</TableCell>
                      <TableCell>{getContaNome(pag.contaDestino)}</TableCell>
                      <TableCell className="text-center">
                        {pag.parcelas && pag.parcelas > 1 ? (
                          <span className="text-sm">
                            {pag.parcelas}x {formatarMoeda((pag.valor - (pag.taxaCartao || 0)) / pag.parcelas)}
                          </span>
                        ) : pag.parcelas === 1 ? (
                          <span className="text-sm text-muted-foreground">1x</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatarMoeda(pag.valor)}</TableCell>
                      <TableCell className="text-right text-orange-600">
                        {pag.taxaCartao ? `-${formatarMoeda(pag.taxaCartao)}` : '-'}
                      </TableCell>
                      <TableCell className="text-right text-green-600 font-medium">
                        {formatarMoeda(valorLiquidoPag)}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate text-sm text-muted-foreground">
                        {pag.descricao || '-'}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleRemovePagamento(pag.id)}
                        >
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          
          {/* 4 Cards Proeminentes - Com Comissão */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Valor com Taxas da Máquina */}
            <Card className="bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Percent className="h-5 w-5 text-orange-600" />
                  <span className="text-sm font-medium text-orange-700 dark:text-orange-300">Taxas da Máquina</span>
                </div>
                <p className="text-2xl font-bold text-orange-600">
                  {formatarMoeda(totalTaxas)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Taxa descontada do valor final
                </p>
              </CardContent>
            </Card>
            
            {/* Card 2: Valor Total */}
            <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Valor Total</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">
                  {formatarMoeda(totalPagamentos)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Valor bruto pago pelo cliente
                </p>
              </CardContent>
            </Card>
            
            {/* Card 3: Lucro Residual */}
            <Card className={`border-2 ${isPrejuizo ? 'bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-800' : 'bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-800'}`}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className={`h-5 w-5 ${isPrejuizo ? 'text-red-600' : 'text-green-600'}`} />
                  <span className={`text-sm font-medium ${isPrejuizo ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'}`}>
                    {isPrejuizo ? 'Prejuízo' : 'Lucro Residual'}
                  </span>
                </div>
                <p className={`text-2xl font-bold ${isPrejuizo ? 'text-red-600' : 'text-green-600'}`}>
                  {formatarMoeda(lucroResidual)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Líquido - Custo
                </p>
              </CardContent>
            </Card>
            
            {/* Card 4: Comissão da Venda */}
            <Card className="bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Store className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Comissão da Venda</span>
                </div>
                <p className="text-2xl font-bold text-purple-600">
                  {comissaoVenda ? formatarMoeda(comissaoVenda.valorComissao) : '-'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {comissaoVenda 
                    ? `${comissaoVenda.percentualComissao}% - ${lojaVendaId === LOJA_ONLINE_ID ? 'Online' : 'Loja Física'}`
                    : 'Selecione uma loja'
                  }
                </p>
              </CardContent>
            </Card>
          </div>
          
          {valorPendente > 0 && (
            <div className="mt-4 p-3 bg-destructive/10 rounded-lg flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">Valor Pendente: {formatarMoeda(valorPendente)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Pagamento */}
      <Dialog open={showPagamentoModal} onOpenChange={setShowPagamentoModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar Pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Meio de Pagamento *</label>
              <Select 
                value={novoPagamento.meioPagamento || ''} 
                onValueChange={handleMeioPagamentoChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pix">Pix</SelectItem>
                  <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="Cartão Crédito">Cartão Crédito</SelectItem>
                  <SelectItem value="Cartão Débito">Cartão Débito</SelectItem>
                  <SelectItem value="Transferência">Transferência</SelectItem>
                  <SelectItem value="Fiado">Fiado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Valor Final (Bruto) *</label>
              <p className="text-xs text-muted-foreground mb-1">Valor efetivamente pago pelo cliente (taxa será descontada)</p>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                <Input 
                  type="text"
                  value={novoPagamento.valor ? moedaMask(novoPagamento.valor) : ''}
                  onChange={(e) => handleValorChange(e.target.value)}
                  className="pl-10"
                  placeholder="0,00"
                />
              </div>
            </div>
            
            {/* Seleção de Máquina para Cartão */}
            {(novoPagamento.meioPagamento === 'Cartão Crédito' || novoPagamento.meioPagamento === 'Cartão Débito') && (
              <div>
                <label className="text-sm font-medium">Máquina de Cartão *</label>
                <Select 
                  value={novoPagamento.maquinaId || ''} 
                  onValueChange={handleMaquinaChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a máquina" />
                  </SelectTrigger>
                  <SelectContent>
                    {maquinasCartao.map(maq => (
                      <SelectItem key={maq.id} value={maq.id}>{maq.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* Parcelas - Cartão Crédito - DINÂMICO COM BASE NA MÁQUINA */}
            {novoPagamento.meioPagamento === 'Cartão Crédito' && novoPagamento.maquinaId && (
              <div>
                <label className="text-sm font-medium">Número de Parcelas *</label>
                <Select 
                  value={String(novoPagamento.parcelas || 1)} 
                  onValueChange={(v) => handleParcelasChange(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {(() => {
                      const maquina = maquinasCartao.find(m => m.id === novoPagamento.maquinaId);
                      const parcelamentos = getParcelamentosMaquina(maquina);
                      return parcelamentos.map(({ parcelas: num, taxa }) => (
                        <SelectItem key={num} value={String(num)}>
                          {num}x {taxa > 0 ? `(${taxa.toFixed(1)}% taxa)` : '(sem taxa)'}
                        </SelectItem>
                      ));
                    })()}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Mensagem para selecionar máquina antes de parcelas */}
            {novoPagamento.meioPagamento === 'Cartão Crédito' && !novoPagamento.maquinaId && (
              <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                Selecione a máquina de cartão para ver as opções de parcelamento disponíveis.
              </div>
            )}
            
            {/* Exibir cálculos em tempo real - NOVA LÓGICA */}
            {(novoPagamento.meioPagamento === 'Cartão Crédito' || novoPagamento.meioPagamento === 'Cartão Débito') && 
              novoPagamento.maquinaId && novoPagamento.valor && (
              <div className="space-y-2 p-4 bg-muted rounded-lg">
                <div className="flex justify-between text-sm">
                  <span>Valor Final (Bruto):</span>
                  <span className="font-medium">{formatarMoeda(novoPagamento.valor)}</span>
                </div>
                <div className="flex justify-between text-sm text-orange-600">
                  <span>
                    Taxa da Máquina ({(() => {
                      const maquina = maquinasCartao.find(m => m.id === novoPagamento.maquinaId);
                      const taxa = getTaxaMaquina(maquina, novoPagamento.parcelas || 1, novoPagamento.meioPagamento || '');
                      return `${taxa.toFixed(1)}%`;
                    })()}):
                  </span>
                  <span className="font-medium">-{formatarMoeda(novoPagamento.taxaCartao || 0)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-green-600">
                  <span>Valor Líquido:</span>
                  <span>{formatarMoeda(novoPagamento.valorLiquido || 0)}</span>
                </div>
                {novoPagamento.meioPagamento === 'Cartão Crédito' && novoPagamento.parcelas && novoPagamento.parcelas > 1 && (
                  <p className="text-xs text-muted-foreground">
                    Cliente paga: {novoPagamento.parcelas}x de {formatarMoeda(novoPagamento.valor / novoPagamento.parcelas)}
                  </p>
                )}
              </div>
            )}
            
            {novoPagamento.meioPagamento === 'Cartão Débito' && !novoPagamento.maquinaId && (
              <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                Cartão de Débito: taxa de {TAXA_DEBITO}% aplicada. Selecione a máquina.
              </div>
            )}

            {/* Campos específicos para Fiado */}
            {novoPagamento.meioPagamento === 'Fiado' && (
              <>
                <div>
                  <label className="text-sm font-medium">Data Base para Pagamento *</label>
                  <Select 
                    value={String(novoPagamento.fiadoDataBase || 5)} 
                    onValueChange={(v) => setNovoPagamento({ ...novoPagamento, fiadoDataBase: Number(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o dia" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 5, 10, 15, 20, 25, 28].map(dia => (
                        <SelectItem key={dia} value={String(dia)}>Dia {dia}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Dia do mês em que as parcelas vencerão
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Número de Parcelas *</label>
                  <Select 
                    value={String(novoPagamento.fiadoNumeroParcelas || 1)} 
                    onValueChange={(v) => setNovoPagamento({ ...novoPagamento, fiadoNumeroParcelas: Number(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 10 }, (_, i) => i + 1).map(num => (
                        <SelectItem key={num} value={String(num)}>{num}x</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {novoPagamento.valor && novoPagamento.fiadoNumeroParcelas && novoPagamento.fiadoNumeroParcelas > 1 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {novoPagamento.fiadoNumeroParcelas}x de {formatarMoeda(novoPagamento.valor / novoPagamento.fiadoNumeroParcelas)}
                    </p>
                  )}
                </div>
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg text-sm text-yellow-700 dark:text-yellow-300 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  As parcelas serão geradas automaticamente na tela "Conferências - Fiado" no módulo Financeiro.
                </div>
              </>
            )}
            
            <div>
              <label className="text-sm font-medium">Conta de Destino *</label>
              <Select 
                value={novoPagamento.contaDestino || ''} 
                onValueChange={(v) => setNovoPagamento({ ...novoPagamento, contaDestino: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent>
                  {contasFinanceiras.filter(c => c.status === 'Ativo').map(conta => (
                    <SelectItem key={conta.id} value={conta.id}>{conta.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Descrição (opcional)</label>
              <Textarea 
                value={novoPagamento.descricao || ''}
                onChange={(e) => setNovoPagamento({ ...novoPagamento, descricao: e.target.value })}
                placeholder="Observações sobre o pagamento..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPagamentoModal(false)}>Cancelar</Button>
            <Button onClick={handleAddPagamento}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default PagamentoQuadro;
