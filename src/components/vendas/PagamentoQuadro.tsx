import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { CreditCard, Plus, X, AlertTriangle } from 'lucide-react';
import { getContasFinanceiras, getMaquinasCartao, ContaFinanceira, MaquinaCartao } from '@/utils/cadastrosApi';
import { Pagamento } from '@/utils/vendasApi';
import { formatarMoeda, moedaMask, parseMoeda } from '@/utils/formatUtils';

export interface PagamentoQuadroProps {
  valorTotalProdutos: number;
  onPagamentosChange: (pagamentos: Pagamento[]) => void;
  onValoresChange?: (valores: { valorProdutos: number; valorTaxas: number }) => void;
  pagamentosIniciais?: Pagamento[];
}

interface NovoPagamentoState extends Partial<Pagamento> {
  maquinaId?: string;
  taxaCartao?: number;
  valorComTaxa?: number;
}

export function PagamentoQuadro({ 
  valorTotalProdutos, 
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

  // Calcular valores totais
  const totalPagamentos = useMemo(() => pagamentos.reduce((acc, p) => acc + p.valor, 0), [pagamentos]);
  const totalTaxas = useMemo(() => pagamentos.reduce((acc, p) => acc + (p.taxaCartao || 0), 0), [pagamentos]);
  const valorPendente = useMemo(() => valorTotalProdutos - totalPagamentos, [valorTotalProdutos, totalPagamentos]);

  // Notificar valores para componente pai
  useEffect(() => {
    onValoresChange?.({ valorProdutos: valorTotalProdutos, valorTaxas: totalTaxas });
  }, [valorTotalProdutos, totalTaxas, onValoresChange]);

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
        valorComTaxa: undefined 
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
        valorComTaxa: undefined 
      });
    } else if (v === 'Fiado') {
      // Auto-preencher conta "Pessoal - Thiago"
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
        taxaCartao: undefined, 
        valorComTaxa: undefined 
      });
    } else {
      setNovoPagamento({ 
        ...novoPagamento, 
        meioPagamento: v, 
        parcelas: undefined, 
        isFiado: false, 
        fiadoDataBase: undefined, 
        fiadoNumeroParcelas: undefined, 
        maquinaId: undefined, 
        taxaCartao: undefined, 
        valorComTaxa: undefined 
      });
    }
  };

  const calcularTaxa = (valor: number, maquinaId: string, parcelas: number, meioPagamento: string) => {
    const maquina = maquinasCartao.find(m => m.id === maquinaId);
    if (!maquina || !valor) return { taxaCartao: 0, valorComTaxa: valor };
    
    const taxaPercent = meioPagamento === 'Cartão Débito' 
      ? maquina.taxas.debito 
      : (maquina.taxas.credito[parcelas] || parcelas * 2);
    
    const taxaCartao = valor * (taxaPercent / 100);
    return { taxaCartao, valorComTaxa: valor + taxaCartao };
  };

  const handleValorChange = (valorFormatado: string) => {
    const valorNum = parseMoeda(valorFormatado);
    
    if (novoPagamento.maquinaId) {
      const { taxaCartao, valorComTaxa } = calcularTaxa(
        valorNum, 
        novoPagamento.maquinaId, 
        novoPagamento.parcelas || 1, 
        novoPagamento.meioPagamento || ''
      );
      setNovoPagamento({ ...novoPagamento, valor: valorNum, taxaCartao, valorComTaxa });
    } else {
      setNovoPagamento({ ...novoPagamento, valor: valorNum });
    }
  };

  const handleMaquinaChange = (maquinaId: string) => {
    if (novoPagamento.valor) {
      const { taxaCartao, valorComTaxa } = calcularTaxa(
        novoPagamento.valor, 
        maquinaId, 
        novoPagamento.parcelas || 1, 
        novoPagamento.meioPagamento || ''
      );
      setNovoPagamento({ ...novoPagamento, maquinaId, taxaCartao, valorComTaxa });
    } else {
      setNovoPagamento({ ...novoPagamento, maquinaId });
    }
  };

  const handleParcelasChange = (parcelas: number) => {
    if (novoPagamento.maquinaId && novoPagamento.valor) {
      const { taxaCartao, valorComTaxa } = calcularTaxa(
        novoPagamento.valor, 
        novoPagamento.maquinaId, 
        parcelas, 
        novoPagamento.meioPagamento || ''
      );
      setNovoPagamento({ ...novoPagamento, parcelas, taxaCartao, valorComTaxa });
    } else {
      setNovoPagamento({ ...novoPagamento, parcelas });
    }
  };

  const handleAddPagamento = () => {
    if (!novoPagamento.meioPagamento || !novoPagamento.valor || !novoPagamento.contaDestino) {
      toast({ title: "Erro", description: "Todos os campos são obrigatórios", variant: "destructive" });
      return;
    }
    
    // Validar máquina para cartão
    if ((novoPagamento.meioPagamento === 'Cartão Crédito' || novoPagamento.meioPagamento === 'Cartão Débito') && !novoPagamento.maquinaId) {
      toast({ title: "Erro", description: "Selecione a máquina de cartão", variant: "destructive" });
      return;
    }
    
    // Validar parcelas para cartão crédito
    if (novoPagamento.meioPagamento === 'Cartão Crédito' && !novoPagamento.parcelas) {
      toast({ title: "Erro", description: "Selecione o número de parcelas", variant: "destructive" });
      return;
    }

    // Validar campos para Fiado
    if (novoPagamento.meioPagamento === 'Fiado' && (!novoPagamento.fiadoDataBase || !novoPagamento.fiadoNumeroParcelas)) {
      toast({ title: "Erro", description: "Preencha os campos de data base e número de parcelas", variant: "destructive" });
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
      taxaCartao: novoPagamento.taxaCartao,
      valorComTaxa: novoPagamento.valorComTaxa,
      maquinaId: novoPagamento.maquinaId
    };
    
    setPagamentos([...pagamentos, pagamento]);
    setShowPagamentoModal(false);
    setNovoPagamento({});
  };

  const handleRemovePagamento = (pagamentoId: string) => {
    setPagamentos(pagamentos.filter(p => p.id !== pagamentoId));
  };

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
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Taxa</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagamentos.map(pag => (
                  <TableRow key={pag.id}>
                    <TableCell className="font-medium">{pag.meioPagamento}</TableCell>
                    <TableCell>{getContaNome(pag.contaDestino)}</TableCell>
                    <TableCell className="text-center">
                      {pag.parcelas && pag.parcelas > 1 ? (
                        <span className="text-sm">
                          {pag.parcelas}x {formatarMoeda(pag.valorParcela || 0)}
                        </span>
                      ) : pag.parcelas === 1 ? (
                        <span className="text-sm text-muted-foreground">1x</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{formatarMoeda(pag.valor)}</TableCell>
                    <TableCell className="text-right text-orange-600">
                      {pag.taxaCartao ? `+${formatarMoeda(pag.taxaCartao)}` : '-'}
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
                ))}
              </TableBody>
            </Table>
          )}
          
          {/* Resumo de valores */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Valor dos Produtos</p>
              <p className="text-xl font-bold">{formatarMoeda(valorTotalProdutos)}</p>
            </div>
            {totalTaxas > 0 && (
              <div className="p-3 bg-orange-100 dark:bg-orange-950/30 rounded-lg">
                <p className="text-sm text-muted-foreground">Valor das Taxas</p>
                <p className="text-xl font-bold text-orange-600">+{formatarMoeda(totalTaxas)}</p>
              </div>
            )}
            <div className="p-3 bg-blue-100 dark:bg-blue-950/30 rounded-lg">
              <p className="text-sm text-muted-foreground">Total Pagamentos</p>
              <p className="text-lg font-medium text-blue-600">{formatarMoeda(totalPagamentos)}</p>
            </div>
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
        <DialogContent>
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
              <label className="text-sm font-medium">Valor dos Produtos *</label>
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
            
            {/* Parcelas - Cartão Crédito */}
            {novoPagamento.meioPagamento === 'Cartão Crédito' && (
              <div>
                <label className="text-sm font-medium">Número de Parcelas *</label>
                <Select 
                  value={String(novoPagamento.parcelas || 1)} 
                  onValueChange={(v) => handleParcelasChange(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(num => (
                      <SelectItem key={num} value={String(num)}>{num}x</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* Exibir taxas calculadas */}
            {(novoPagamento.meioPagamento === 'Cartão Crédito' || novoPagamento.meioPagamento === 'Cartão Débito') && 
              novoPagamento.maquinaId && novoPagamento.valor && (
              <div className="space-y-2 p-3 bg-muted rounded-lg">
                <div className="flex justify-between text-sm">
                  <span>Valor dos Produtos:</span>
                  <span className="font-medium">{formatarMoeda(novoPagamento.valor)}</span>
                </div>
                <div className="flex justify-between text-sm text-orange-600">
                  <span>Taxa da Máquina ({((novoPagamento.taxaCartao || 0) / novoPagamento.valor * 100).toFixed(1)}%):</span>
                  <span className="font-medium">+{formatarMoeda(novoPagamento.taxaCartao || 0)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>Valor Final para o Cliente:</span>
                  <span className="text-primary">{formatarMoeda(novoPagamento.valorComTaxa || novoPagamento.valor)}</span>
                </div>
                {novoPagamento.meioPagamento === 'Cartão Crédito' && novoPagamento.parcelas && novoPagamento.parcelas > 1 && (
                  <p className="text-xs text-muted-foreground">
                    {novoPagamento.parcelas}x de {formatarMoeda((novoPagamento.valorComTaxa || novoPagamento.valor) / novoPagamento.parcelas)}
                  </p>
                )}
              </div>
            )}
            
            {novoPagamento.meioPagamento === 'Cartão Débito' && !novoPagamento.maquinaId && (
              <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                Cartão de Débito: taxa aplicada automaticamente. Selecione a máquina.
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
