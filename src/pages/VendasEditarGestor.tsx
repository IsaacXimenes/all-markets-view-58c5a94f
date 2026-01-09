import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { VendasLayout } from '@/components/layout/VendasLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { 
  ArrowLeft, User, Package, CreditCard, Shield, Lock, Save, X, AlertTriangle,
  FileText, Check, Pencil
} from 'lucide-react';
import { format, addMonths, addDays } from 'date-fns';
import { 
  getVendaById, 
  updateVenda, 
  registrarEdicaoVenda, 
  formatCurrency, 
  Venda, 
  ItemVenda, 
  ItemTradeIn, 
  Pagamento 
} from '@/utils/vendasApi';
import { 
  getLojas, 
  getColaboradores, 
  getContasFinanceiras,
  getMaquinasCartao,
  MaquinaCartao
} from '@/utils/cadastrosApi';
import { calcularComissaoVenda, getComissaoColaborador } from '@/utils/comissoesApi';
import { displayIMEI } from '@/utils/imeiMask';

export default function VendasEditarGestor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [vendaOriginal, setVendaOriginal] = useState<Venda | null>(null);
  const [itens, setItens] = useState<ItemVenda[]>([]);
  const [tradeIns, setTradeIns] = useState<ItemTradeIn[]>([]);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [alteracoesDetectadas, setAlteracoesDetectadas] = useState<{ campo: string; valorAnterior: any; valorNovo: any }[]>([]);
  
  const lojas = getLojas();
  const colaboradores = getColaboradores();
  const contasFinanceiras = getContasFinanceiras();
  const maquinasCartao = getMaquinasCartao().filter(m => m.status === 'Ativo');

  useEffect(() => {
    if (id) {
      const venda = getVendaById(id);
      if (venda) {
        setVendaOriginal(venda);
        setItens([...venda.itens]);
        setTradeIns([...venda.tradeIns]);
        setPagamentos([...venda.pagamentos]);
      }
    }
  }, [id]);

  const getLojaNome = (id: string) => lojas.find(l => l.id === id)?.nome || id;
  const getColaboradorNome = (id: string) => colaboradores.find(c => c.id === id)?.nome || id;
  const getContaNome = (id: string) => contasFinanceiras.find(c => c.id === id)?.nome || id;

  // Cálculos
  const subtotal = useMemo(() => itens.reduce((acc, item) => acc + item.valorVenda, 0), [itens]);
  const totalTradeIn = useMemo(() => tradeIns.reduce((acc, t) => acc + t.valorCompraUsado, 0), [tradeIns]);
  const totalPagamentos = useMemo(() => pagamentos.reduce((acc, p) => acc + p.valor, 0), [pagamentos]);
  const total = subtotal - totalTradeIn + (vendaOriginal?.taxaEntrega || 0);
  const valorCustoTotal = useMemo(() => itens.reduce((acc, item) => acc + item.valorCusto, 0), [itens]);
  const lucro = total - valorCustoTotal;
  const margem = valorCustoTotal > 0 ? ((lucro / valorCustoTotal) * 100) : 0;
  const valorPendente = total - totalPagamentos;

  // Comissão
  const comissaoVendedor = vendaOriginal && lucro > 0 
    ? calcularComissaoVenda(vendaOriginal.vendedor, lucro) 
    : 0;

  // Atualizar valor de item
  const handleUpdateItemValor = (itemId: string, novoValor: number) => {
    setItens(prev => prev.map(item => 
      item.id === itemId ? { ...item, valorVenda: novoValor } : item
    ));
  };

  // Atualizar valor de trade-in
  const handleUpdateTradeInValor = (tradeId: string, novoValor: number) => {
    setTradeIns(prev => prev.map(t => 
      t.id === tradeId ? { ...t, valorCompraUsado: novoValor } : t
    ));
  };

  // Atualizar pagamento
  const handleUpdatePagamento = (pagId: string, field: string, value: any) => {
    setPagamentos(prev => prev.map(p => 
      p.id === pagId ? { ...p, [field]: value } : p
    ));
  };

  // Detectar alterações
  const detectarAlteracoes = (): { campo: string; valorAnterior: any; valorNovo: any }[] => {
    if (!vendaOriginal) return [];
    
    const alteracoes: { campo: string; valorAnterior: any; valorNovo: any }[] = [];

    // Verificar itens
    vendaOriginal.itens.forEach((itemOriginal, i) => {
      const itemAtual = itens.find(it => it.id === itemOriginal.id);
      if (itemAtual && itemAtual.valorVenda !== itemOriginal.valorVenda) {
        alteracoes.push({
          campo: `Valor de ${itemOriginal.produto}`,
          valorAnterior: itemOriginal.valorVenda,
          valorNovo: itemAtual.valorVenda
        });
      }
    });

    // Verificar trade-ins
    vendaOriginal.tradeIns.forEach((tradeOriginal, i) => {
      const tradeAtual = tradeIns.find(t => t.id === tradeOriginal.id);
      if (tradeAtual && tradeAtual.valorCompraUsado !== tradeOriginal.valorCompraUsado) {
        alteracoes.push({
          campo: `Valor Trade-In ${tradeOriginal.modelo}`,
          valorAnterior: tradeOriginal.valorCompraUsado,
          valorNovo: tradeAtual.valorCompraUsado
        });
      }
    });

    // Verificar total (recalculado)
    if (total !== vendaOriginal.total) {
      alteracoes.push({
        campo: 'Total da Venda',
        valorAnterior: vendaOriginal.total,
        valorNovo: total
      });
    }

    // Verificar lucro
    if (lucro !== vendaOriginal.lucro) {
      alteracoes.push({
        campo: 'Lucro',
        valorAnterior: vendaOriginal.lucro,
        valorNovo: lucro
      });
    }

    // Verificar comissão
    const comissaoOriginal = vendaOriginal.comissaoVendedor || 0;
    if (comissaoVendedor !== comissaoOriginal) {
      alteracoes.push({
        campo: 'Comissão do Vendedor',
        valorAnterior: comissaoOriginal,
        valorNovo: comissaoVendedor
      });
    }

    return alteracoes;
  };

  // Validações
  const validarVenda = (): string[] => {
    const erros: string[] = [];
    
    if (itens.length === 0) {
      erros.push('Deve haver pelo menos um item na venda.');
    }
    
    if (Math.abs(valorPendente) > 0.01) {
      erros.push(`O total de pagamentos (${formatCurrency(totalPagamentos)}) deve ser igual ao valor final (${formatCurrency(total)}).`);
    }
    
    return erros;
  };

  // Preparar salvamento
  const handlePrepararSalvar = () => {
    const erros = validarVenda();
    if (erros.length > 0) {
      toast({
        title: "Erros de validação",
        description: erros.join(' '),
        variant: "destructive"
      });
      return;
    }

    const alteracoes = detectarAlteracoes();
    if (alteracoes.length === 0) {
      toast({
        title: "Sem alterações",
        description: "Nenhuma alteração foi detectada."
      });
      return;
    }

    setAlteracoesDetectadas(alteracoes);
    setShowConfirmModal(true);
  };

  // Confirmar salvamento
  const handleConfirmarSalvar = () => {
    if (!vendaOriginal) return;

    // Registrar alterações na timeline
    registrarEdicaoVenda(
      vendaOriginal.id,
      'GESTOR-001', // Em produção, seria o ID do usuário logado
      'Gestor',     // Em produção, seria o nome do usuário logado
      alteracoesDetectadas
    );

    // Atualizar venda
    updateVenda(vendaOriginal.id, {
      itens,
      tradeIns,
      pagamentos,
      subtotal,
      totalTradeIn,
      total,
      lucro,
      margem,
      comissaoVendedor
    });

    toast({
      title: "Venda atualizada",
      description: `${alteracoesDetectadas.length} alteração(ões) registrada(s) com sucesso.`
    });

    setShowConfirmModal(false);
    navigate('/vendas/conferencia-gestor');
  };

  if (!vendaOriginal) {
    return (
      <VendasLayout title="Editar Venda">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Venda não encontrada.</p>
          <Button onClick={() => navigate('/vendas/conferencia-gestor')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </VendasLayout>
    );
  }

  return (
    <VendasLayout title={`Editar Venda ${vendaOriginal.id}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate('/vendas/conferencia-gestor')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <Badge variant="secondary" className="text-sm px-3 py-1">
            <Pencil className="h-3 w-3 mr-1" />
            Modo Edição Gestor
          </Badge>
        </div>
      </div>

      <div className="space-y-6">
        {/* Card Bloqueado - Informações da Venda */}
        <Card className="bg-muted/30 border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-muted-foreground">
              <Lock className="h-5 w-5" />
              Informações da Venda (Bloqueado)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 opacity-70">
              <div>
                <p className="text-sm text-muted-foreground">Loja</p>
                <p className="font-medium">{getLojaNome(vendaOriginal.lojaVenda)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vendedor</p>
                <p className="font-medium">{getColaboradorNome(vendaOriginal.vendedor)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Data/Hora</p>
                <p className="font-medium">{new Date(vendaOriginal.dataHora).toLocaleString('pt-BR')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Origem</p>
                <Badge variant="outline">{vendaOriginal.origemVenda}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card Bloqueado - Cliente */}
        <Card className="bg-muted/30 border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-muted-foreground">
              <Lock className="h-5 w-5" />
              <User className="h-5 w-5" />
              Cliente (Bloqueado)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 opacity-70">
              <div>
                <p className="text-sm text-muted-foreground">Nome</p>
                <p className="font-medium">{vendaOriginal.clienteNome}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">CPF</p>
                <p className="font-medium">{vendaOriginal.clienteCpf}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Telefone</p>
                <p className="font-medium">{vendaOriginal.clienteTelefone}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">E-mail</p>
                <p className="font-medium">{vendaOriginal.clienteEmail}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card Editável - Itens da Venda */}
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Itens da Venda
              <Badge variant="outline" className="ml-2 text-primary border-primary">Editável</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>IMEI</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead className="text-right">Valor Recomendado</TableHead>
                  <TableHead className="text-right">Valor de Venda</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itens.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.produto}</TableCell>
                    <TableCell className="font-mono text-sm">{displayIMEI(item.imei)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(item.valorCusto)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(item.valorRecomendado)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min={0}
                        step={100}
                        value={item.valorVenda}
                        onChange={(e) => handleUpdateItemValor(item.id, parseFloat(e.target.value) || 0)}
                        className="w-32 text-right"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Card Editável - Base de Troca */}
        {tradeIns.length > 0 && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Base de Troca
                <Badge variant="outline" className="ml-2 text-primary border-primary">Editável</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Modelo</TableHead>
                    <TableHead>IMEI</TableHead>
                    <TableHead>Condição</TableHead>
                    <TableHead className="text-right">Valor de Compra Usado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tradeIns.map(trade => (
                    <TableRow key={trade.id}>
                      <TableCell className="font-medium">{trade.modelo}</TableCell>
                      <TableCell className="font-mono text-sm">{trade.imei}</TableCell>
                      <TableCell>
                        <Badge variant={trade.condicao === 'Novo' ? 'default' : 'secondary'}>
                          {trade.condicao}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min={0}
                          step={100}
                          value={trade.valorCompraUsado}
                          onChange={(e) => handleUpdateTradeInValor(trade.id, parseFloat(e.target.value) || 0)}
                          className="w-32 text-right"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Card Editável - Pagamentos */}
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Pagamentos
              <Badge variant="outline" className="ml-2 text-primary border-primary">Editável</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Meio de Pagamento</TableHead>
                  <TableHead>Conta de Destino</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagamentos.map(pag => (
                  <TableRow key={pag.id}>
                    <TableCell className="font-medium">{pag.meioPagamento}</TableCell>
                    <TableCell>{getContaNome(pag.contaDestino)}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min={0}
                        step={100}
                        value={pag.valor}
                        onChange={(e) => handleUpdatePagamento(pag.id, 'valor', parseFloat(e.target.value) || 0)}
                        className="w-32 text-right"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {Math.abs(valorPendente) > 0.01 && (
              <div className="mt-4 p-3 bg-destructive/10 rounded-lg flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">
                  {valorPendente > 0 
                    ? `Faltam ${formatCurrency(valorPendente)} para fechar o pagamento` 
                    : `Pagamento excede em ${formatCurrency(Math.abs(valorPendente))}`
                  }
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resumo Financeiro */}
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Resumo Financeiro (Recalculado)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Subtotal</p>
                <p className="text-xl font-bold">{formatCurrency(subtotal)}</p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-950/30 rounded-lg">
                <p className="text-sm text-muted-foreground">Base de Troca</p>
                <p className="text-xl font-bold text-green-600">-{formatCurrency(totalTradeIn)}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <p className="text-sm text-muted-foreground">Total da Venda</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(total)}</p>
              </div>
              <div className={`p-3 rounded-lg ${lucro < 0 ? 'bg-destructive/20' : 'bg-green-100 dark:bg-green-950/30'}`}>
                <p className="text-sm text-muted-foreground">{lucro < 0 ? 'Prejuízo' : 'Lucro'}</p>
                <p className={`text-lg font-bold ${lucro < 0 ? 'text-destructive' : 'text-green-600'}`}>
                  {formatCurrency(lucro)}
                </p>
              </div>
              <div className="p-3 bg-orange-100 dark:bg-orange-950/30 rounded-lg">
                <p className="text-sm text-muted-foreground">Comissão</p>
                <p className="text-lg font-bold text-orange-600">{formatCurrency(comissaoVendedor)}</p>
                <p className="text-xs text-muted-foreground">
                  ({getComissaoColaborador(vendaOriginal.vendedor).comissao}% do lucro)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Botões de Ação */}
        <div className="flex gap-4 justify-end">
          <Button variant="outline" onClick={() => navigate('/vendas/conferencia-gestor')}>
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button onClick={handlePrepararSalvar}>
            <Save className="h-4 w-4 mr-2" />
            Salvar Alterações
          </Button>
        </div>
      </div>

      {/* Modal de Confirmação */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-primary" />
              Confirmar Alterações
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              As seguintes alterações serão registradas na timeline da venda:
            </p>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {alteracoesDetectadas.map((alt, idx) => (
                <div key={idx} className="p-3 bg-muted rounded-lg">
                  <p className="font-medium flex items-center gap-2">
                    <Pencil className="h-4 w-4 text-primary" />
                    {alt.campo}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-sm">
                    <span className="text-muted-foreground">
                      Anterior: {typeof alt.valorAnterior === 'number' 
                        ? formatCurrency(alt.valorAnterior) 
                        : alt.valorAnterior}
                    </span>
                    <span>→</span>
                    <span className="font-medium text-primary">
                      Novo: {typeof alt.valorNovo === 'number' 
                        ? formatCurrency(alt.valorNovo) 
                        : alt.valorNovo}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmarSalvar}>
              <Check className="h-4 w-4 mr-2" />
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </VendasLayout>
  );
}
