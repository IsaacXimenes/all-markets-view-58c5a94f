import { useState, useMemo } from 'react';
import { EstoqueLayout } from '@/components/layout/EstoqueLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { getNotasCompra, NotaCompra, ESTOQUE_SIA_LOJA_ID } from '@/utils/estoqueApi';
import { migrarProdutosNotaParaPendentes } from '@/utils/osApi';
import { useCadastroStore } from '@/store/cadastroStore';
import { useAuthStore } from '@/store/authStore';
import { getCores } from '@/utils/coresApi';
import { Clock, AlertTriangle, AlertCircle, Plus, Trash2, Package, CheckCircle, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/utils/formatUtils';
import { InputComMascara } from '@/components/ui/InputComMascara';
import { formatIMEI, unformatIMEI } from '@/utils/imeiMask';

interface NotaUrgenciaExtendida extends Omit<NotaCompra, 'statusUrgencia'> {
  statusUrgencia?: string;
  dataPagamentoFinanceiro?: string;
  lojaDestino?: string;
}

interface ProdutoInserido {
  id: string;
  imei: string;
  marca: string;
  modelo: string;
  cor: string;
  tipo: 'Novo' | 'Seminovo';
  valorUnitario: number;
  saudeBateria: number;
}

export default function EstoqueNotasUrgenciaPendentes() {
  const [notasBase] = useState(getNotasCompra());
  const { obterLojasTipoLoja, obterEstoquistas, obterColaboradoresAtivos, obterNomeLoja } = useCadastroStore();
  const user = useAuthStore(state => state.user);
  const lojas = obterLojasTipoLoja();
  const cores = getCores();
  const colaboradoresEstoque = obterEstoquistas();

  // Notas de urgência que estão aguardando produtos
  const notasUrgencia: NotaUrgenciaExtendida[] = useMemo(() => {
    return notasBase
      .filter(nota => nota.origem === 'Urgência')
      .map(nota => {
        const statusUrgencia = localStorage.getItem(`nota_statusUrgencia_${nota.id}`);
        const dataPagamento = localStorage.getItem(`nota_dataPagamentoFinanceiro_${nota.id}`);
        const lojaDestino = localStorage.getItem(`nota_lojaDestino_${nota.id}`);
        return {
          ...nota,
          statusUrgencia: statusUrgencia || 'Aguardando Financeiro',
          dataPagamentoFinanceiro: dataPagamento || undefined,
          lojaDestino: lojaDestino || undefined
        };
      })
      .filter(nota => nota.statusUrgencia === 'Pago - Aguardando Produtos');
  }, [notasBase]);

  // Modal de inserção de produtos
  const [dialogOpen, setDialogOpen] = useState(false);
  const [notaSelecionada, setNotaSelecionada] = useState<NotaUrgenciaExtendida | null>(null);
  const [produtosInseridos, setProdutosInseridos] = useState<ProdutoInserido[]>([]);
  const [responsavelEstoque, setResponsavelEstoque] = useState('');

  // Formulário de novo produto
  const [novoProduto, setNovoProduto] = useState<Partial<ProdutoInserido>>({
    imei: '',
    marca: 'Apple',
    modelo: '',
    cor: '',
    tipo: 'Seminovo',
    valorUnitario: 0,
    saudeBateria: 100
  });

  // Calcular SLA desde o pagamento
  const calcularSLAUrgencia = (dataPagamento: string | undefined): { dias: number; cor: 'normal' | 'amarelo' | 'vermelho' } => {
    if (!dataPagamento) return { dias: 0, cor: 'normal' };
    
    const hoje = new Date();
    const pagamento = new Date(dataPagamento);
    const diffTime = Math.abs(hoje.getTime() - pagamento.getTime());
    const dias = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let cor: 'normal' | 'amarelo' | 'vermelho' = 'normal';
    if (dias >= 5) {
      cor = 'vermelho';
    } else if (dias >= 3) {
      cor = 'amarelo';
    }
    
    return { dias, cor };
  };

  const getSLABadge = (dataPagamento: string | undefined) => {
    const { dias, cor } = calcularSLAUrgencia(dataPagamento);
    
    if (cor === 'vermelho') {
      return (
        <div className="flex items-center gap-1 bg-red-500/20 text-red-600 px-2 py-1 rounded text-xs font-medium">
          <AlertCircle className="h-3 w-3" />
          {dias} dias desde pgto
        </div>
      );
    }
    if (cor === 'amarelo') {
      return (
        <div className="flex items-center gap-1 bg-yellow-500/20 text-yellow-600 px-2 py-1 rounded text-xs font-medium">
          <AlertTriangle className="h-3 w-3" />
          {dias} dias desde pgto
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 text-green-600 bg-green-500/10 px-2 py-1 rounded text-xs font-medium">
        <Clock className="h-3 w-3" />
        {dias} dias desde pgto
      </div>
    );
  };

  const handleAbrirInserir = (nota: NotaUrgenciaExtendida) => {
    setNotaSelecionada(nota);
    setProdutosInseridos([]);
    setResponsavelEstoque(user?.colaborador?.nome || '');
    setNovoProduto({
      imei: '',
      marca: 'Apple',
      modelo: '',
      cor: '',
      tipo: 'Seminovo',
      valorUnitario: 0,
      saudeBateria: 100
    });
    setDialogOpen(true);
  };

  const handleAdicionarProduto = () => {
    if (!novoProduto.imei || !novoProduto.modelo || !novoProduto.cor || !novoProduto.valorUnitario) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    // Validar IMEI único
    const imeiLimpo = unformatIMEI(novoProduto.imei);
    if (produtosInseridos.some(p => unformatIMEI(p.imei) === imeiLimpo)) {
      toast.error('Este IMEI já foi adicionado');
      return;
    }

    const novoProdutoCompleto: ProdutoInserido = {
      id: `TEMP-${Date.now()}`,
      imei: imeiLimpo,
      marca: novoProduto.marca || 'Apple',
      modelo: novoProduto.modelo || '',
      cor: novoProduto.cor || '',
      tipo: novoProduto.tipo || 'Seminovo',
      valorUnitario: novoProduto.valorUnitario || 0,
      saudeBateria: novoProduto.saudeBateria || 100
    };

    setProdutosInseridos([...produtosInseridos, novoProdutoCompleto]);
    
    // Limpar formulário
    setNovoProduto({
      imei: '',
      marca: 'Apple',
      modelo: '',
      cor: '',
      tipo: 'Seminovo',
      valorUnitario: 0,
      saudeBateria: 100
    });

    toast.success('Produto adicionado à lista');
  };

  const handleRemoverProduto = (id: string) => {
    setProdutosInseridos(produtosInseridos.filter(p => p.id !== id));
  };

  const totalProdutosInseridos = useMemo(() => {
    return produtosInseridos.reduce((acc, p) => acc + p.valorUnitario, 0);
  }, [produtosInseridos]);

  const handleFinalizarInsercao = () => {
    if (!notaSelecionada || produtosInseridos.length === 0) {
      toast.error('Adicione ao menos um produto');
      return;
    }

    if (!responsavelEstoque) {
      toast.error('Selecione o responsável do estoque');
      return;
    }

    // Validar valor total não excede o valor da nota
    if (totalProdutosInseridos > notaSelecionada.valorTotal * 1.1) { // 10% de tolerância
      toast.error(`Valor total dos produtos (${formatCurrency(totalProdutosInseridos)}) excede o valor da nota (${formatCurrency(notaSelecionada.valorTotal)})`);
      return;
    }

    // Preparar produtos para migração com origem NEGOCIADO
    const produtosParaMigrar = produtosInseridos.map(p => ({
      marca: p.marca,
      modelo: p.modelo,
      cor: p.cor,
      imei: p.imei,
      tipo: p.tipo,
      tipoProduto: 'Aparelho' as const,
      quantidade: 1,
      valorUnitario: p.valorUnitario,
      valorTotal: p.valorUnitario,
      saudeBateria: p.saudeBateria
    }));

    // Migrar produtos para Aparelhos Pendentes com origem NEGOCIADO
    const lojaDestino = ESTOQUE_SIA_LOJA_ID;
    const produtosMigrados = migrarProdutosNotaParaPendentes(
      produtosParaMigrar,
      notaSelecionada.id,
      notaSelecionada.fornecedor,
      lojaDestino,
      responsavelEstoque,
      'NEGOCIADO' // NOVA ORIGEM!
    );

    // Atualizar status da nota
    localStorage.setItem(`nota_statusUrgencia_${notaSelecionada.id}`, 'Concluído');
    localStorage.setItem(`nota_status_${notaSelecionada.id}`, 'Concluído');
    
    // Adicionar timeline
    const storedTimeline = localStorage.getItem(`nota_timeline_${notaSelecionada.id}`);
    const timeline = storedTimeline ? JSON.parse(storedTimeline) : [];
    const newEntry = {
      id: `TL-${notaSelecionada.id}-${String(timeline.length + 1).padStart(3, '0')}`,
      dataHora: new Date().toISOString(),
      usuarioId: 'EST-001',
      usuarioNome: responsavelEstoque,
      tipoEvento: 'produtos_inseridos_urgencia',
      observacoes: `${produtosInseridos.length} produto(s) inserido(s) e enviado(s) para triagem. Total: ${formatCurrency(totalProdutosInseridos)}`
    };
    localStorage.setItem(`nota_timeline_${notaSelecionada.id}`, JSON.stringify([newEntry, ...timeline]));

    setDialogOpen(false);
    
    toast.success(`✅ ${produtosMigrados.length} produto(s) inserido(s) e enviado(s) para triagem!`, {
      duration: 5000,
      style: {
        background: '#22c55e',
        color: 'white',
        border: 'none'
      }
    });

    window.location.reload();
  };

  return (
    <EstoqueLayout title="Notas de Urgência - Aguardando Produtos">
      <div className="space-y-6">
        {/* Header Card */}
        <Card className="bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-950/50 dark:to-amber-900/30 border-orange-200 dark:border-orange-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Zap className="h-8 w-8 text-orange-600 opacity-70" />
              <div>
                <p className="text-sm text-orange-700 dark:text-orange-300">Notas de Urgência Aguardando</p>
                <p className="text-3xl font-bold text-orange-800 dark:text-orange-200">{notasUrgencia.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Notas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Notas Pagas - Aguardando Inserção de Produtos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {notasUrgencia.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Zap className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Nenhuma nota de urgência aguardando produtos</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Valor Total</TableHead>
                    <TableHead>SLA</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notasUrgencia.map(nota => (
                    <TableRow 
                      key={nota.id}
                      className={
                        calcularSLAUrgencia(nota.dataPagamentoFinanceiro).cor === 'vermelho' 
                          ? 'bg-red-500/10' 
                          : calcularSLAUrgencia(nota.dataPagamentoFinanceiro).cor === 'amarelo'
                          ? 'bg-yellow-500/10'
                          : ''
                      }
                    >
                      <TableCell className="font-mono text-xs font-medium">{nota.id}</TableCell>
                      <TableCell>{new Date(nota.data).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>{nota.fornecedor}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(nota.valorTotal)}</TableCell>
                      <TableCell>{getSLABadge(nota.dataPagamentoFinanceiro)}</TableCell>
                      <TableCell>
                        <Badge className="bg-orange-500 hover:bg-orange-600">
                          Aguardando Produtos
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button onClick={() => handleAbrirInserir(nota)} size="sm">
                          <Plus className="h-4 w-4 mr-1" />
                          Inserir Produtos
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Dialog de Inserção de Produtos */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-orange-500" />
                Inserir Produtos - Nota {notaSelecionada?.id}
              </DialogTitle>
            </DialogHeader>

            {notaSelecionada && (
              <div className="space-y-6">
                {/* Info da Nota */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
                  <div>
                    <Label className="text-xs text-muted-foreground">Fornecedor</Label>
                    <p className="font-medium">{notaSelecionada.fornecedor}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Valor Total da Nota</Label>
                    <p className="font-bold text-lg">{formatCurrency(notaSelecionada.valorTotal)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">SLA</Label>
                    {getSLABadge(notaSelecionada.dataPagamentoFinanceiro)}
                  </div>
                </div>

                {/* Formulário de Novo Produto */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Adicionar Produto</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <Label htmlFor="imei">IMEI *</Label>
                        <InputComMascara
                          mascara="imei"
                          value={novoProduto.imei || ''}
                          onChange={(formatted) => setNovoProduto({ ...novoProduto, imei: formatted })}
                          placeholder="00-000000-000000-0"
                        />
                      </div>
                      <div>
                        <Label htmlFor="marca">Marca</Label>
                        <Input
                          value={novoProduto.marca}
                          onChange={(e) => setNovoProduto({ ...novoProduto, marca: e.target.value })}
                          placeholder="Apple"
                        />
                      </div>
                      <div>
                        <Label htmlFor="modelo">Modelo *</Label>
                        <Input
                          value={novoProduto.modelo}
                          onChange={(e) => setNovoProduto({ ...novoProduto, modelo: e.target.value })}
                          placeholder="iPhone 15 Pro"
                        />
                      </div>
                      <div>
                        <Label htmlFor="cor">Cor *</Label>
                        <Select 
                          value={novoProduto.cor} 
                          onValueChange={(value) => setNovoProduto({ ...novoProduto, cor: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {cores.map(c => (
                              <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="tipo">Tipo</Label>
                        <Select 
                          value={novoProduto.tipo} 
                          onValueChange={(value: 'Novo' | 'Seminovo') => setNovoProduto({ ...novoProduto, tipo: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Novo">Novo</SelectItem>
                            <SelectItem value="Seminovo">Seminovo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="valorUnitario">Valor Unitário *</Label>
                        <InputComMascara
                          mascara="moeda"
                          value={novoProduto.valorUnitario?.toString() || ''}
                          onChange={(formatted, raw) => setNovoProduto({ ...novoProduto, valorUnitario: parseFloat(String(raw) || '0') })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="saudeBateria">Saúde Bateria (%)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={novoProduto.saudeBateria}
                          onChange={(e) => setNovoProduto({ ...novoProduto, saudeBateria: parseInt(e.target.value) || 100 })}
                        />
                      </div>
                      <div className="flex items-end">
                        <Button onClick={handleAdicionarProduto} className="w-full">
                          <Plus className="h-4 w-4 mr-1" />
                          Adicionar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Lista de Produtos Inseridos */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex justify-between items-center">
                      <span>Produtos Inseridos ({produtosInseridos.length})</span>
                      <span className="text-lg font-bold text-primary">
                        Total: {formatCurrency(totalProdutosInseridos)}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {produtosInseridos.length === 0 ? (
                      <p className="text-center py-4 text-muted-foreground">
                        Nenhum produto adicionado ainda
                      </p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>IMEI</TableHead>
                            <TableHead>Modelo</TableHead>
                            <TableHead>Cor</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead>Bateria</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {produtosInseridos.map(prod => (
                            <TableRow key={prod.id}>
                              <TableCell className="font-mono text-xs">{formatIMEI(prod.imei)}</TableCell>
                              <TableCell>{prod.marca} {prod.modelo}</TableCell>
                              <TableCell>{prod.cor}</TableCell>
                              <TableCell>
                                <Badge variant={prod.tipo === 'Novo' ? 'default' : 'secondary'}>
                                  {prod.tipo}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-semibold">{formatCurrency(prod.valorUnitario)}</TableCell>
                              <TableCell>{prod.saudeBateria}%</TableCell>
                              <TableCell>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleRemoverProduto(prod.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>

                {/* Responsável */}
                <div>
                  <Label htmlFor="responsavel">Responsável Estoque *</Label>
                  <Input
                    value={user?.colaborador?.nome || 'Não identificado'}
                    disabled
                    className="bg-muted"
                  />
                </div>

                {/* Comparação de Valores */}
                {produtosInseridos.length > 0 && (
                  <div className={`p-4 rounded-lg ${
                    totalProdutosInseridos > notaSelecionada.valorTotal * 1.1 
                      ? 'bg-red-500/10 border border-red-500/30' 
                      : 'bg-green-500/10 border border-green-500/30'
                  }`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-muted-foreground">Valor da Nota</p>
                        <p className="text-xl font-bold">{formatCurrency(notaSelecionada.valorTotal)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Diferença</p>
                        <p className={`text-lg font-semibold ${
                          totalProdutosInseridos > notaSelecionada.valorTotal ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {formatCurrency(totalProdutosInseridos - notaSelecionada.valorTotal)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Total Inserido</p>
                        <p className="text-xl font-bold">{formatCurrency(totalProdutosInseridos)}</p>
                      </div>
                    </div>
                  </div>
                )}

                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleFinalizarInsercao}
                    className="bg-green-600 hover:bg-green-700"
                    disabled={produtosInseridos.length === 0 || !responsavelEstoque}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Finalizar e Enviar para Triagem
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </EstoqueLayout>
  );
}
