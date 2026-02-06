import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { EstoqueLayout } from '@/components/layout/EstoqueLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Lock, AlertCircle, Info, FileText, Zap, Plus, Trash2 } from 'lucide-react';
import { getNotasCompra } from '@/utils/estoqueApi';
import { 
  criarNotaEntrada, 
  TipoPagamentoNota, 
  definirAtuacaoInicial,
  AtuacaoAtual 
} from '@/utils/notaEntradaFluxoApi';
import { toast } from 'sonner';
import { InputComMascara } from '@/components/ui/InputComMascara';
import { AutocompleteFornecedor } from '@/components/AutocompleteFornecedor';
import { formatCurrency } from '@/utils/formatUtils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BufferAnexos, AnexoTemporario } from '@/components/estoque/BufferAnexos';
import { getProdutosCadastro } from '@/utils/cadastrosApi';

interface ProdutoLinha {
  tipoProduto: 'Aparelho' | 'Acessorio';
  marca: string;
  modelo: string;
  imei: string;
  cor: string;
  categoria: string;
  quantidade: number;
  custoUnitario: number;
  custoTotal: number;
  explodido?: boolean;
}

const marcasAparelhos = ['Apple', 'Samsung', 'Xiaomi', 'Motorola', 'LG', 'Huawei', 'OnePlus', 'Realme', 'ASUS', 'Nokia', 'Oppo', 'Vivo'];

const produtoLinhaVazia = (): ProdutoLinha => ({
  tipoProduto: 'Aparelho',
  marca: 'Apple',
  modelo: '',
  imei: '',
  cor: '',
  categoria: '',
  quantidade: 1,
  custoUnitario: 0,
  custoTotal: 0,
  explodido: false
});

export default function EstoqueNotaCadastrar() {
  const navigate = useNavigate();
  const produtosCadastro = getProdutosCadastro();
  
  // Informações da Nota
  const [fornecedor, setFornecedor] = useState('');
  const [dataEntrada, setDataEntrada] = useState('');
  const [valorTotal, setValorTotal] = useState<number>(0);
  
  // Flag de Urgência
  const [urgente, setUrgente] = useState(false);
  
  // Pagamento
  const [formaPagamento, setFormaPagamento] = useState<'Dinheiro' | 'Pix' | ''>('');
  const [tipoPagamento, setTipoPagamento] = useState<TipoPagamentoNota | ''>('');
  const [observacaoPagamento, setObservacaoPagamento] = useState('');
  
  // Atuação Atual (somente leitura, calculado automaticamente)
  const [atuacaoAtual, setAtuacaoAtual] = useState<AtuacaoAtual | ''>('');
  
  // Buffer de anexos temporários
  const [anexos, setAnexos] = useState<AnexoTemporario[]>([]);

  // Produtos
  const [produtos, setProdutos] = useState<ProdutoLinha[]>([produtoLinhaVazia()]);

  // Campos simplificados (oculta IMEI, Cor, Categoria)
  const camposSimplificados = useMemo(() => {
    return tipoPagamento === 'Pagamento 100% Antecipado' || tipoPagamento === 'Pagamento Parcial';
  }, [tipoPagamento]);

  // Atualizar atuação automaticamente quando tipo de pagamento muda
  useEffect(() => {
    if (tipoPagamento) {
      setAtuacaoAtual(definirAtuacaoInicial(tipoPagamento));
    } else {
      setAtuacaoAtual('');
    }
  }, [tipoPagamento]);

  // Valor total calculado dos produtos
  const valorTotalProdutos = useMemo(() => {
    return produtos.reduce((acc, p) => acc + p.custoTotal, 0);
  }, [produtos]);

  const getModelosAparelhos = (marca: string) => {
    return produtosCadastro.filter(p => p.marca.toLowerCase() === marca.toLowerCase());
  };

  const handleValorTotalChange = (formatted: string, raw: string | number) => {
    const valor = typeof raw === 'number' ? raw : parseFloat(String(raw)) || 0;
    setValorTotal(valor);
  };

  const adicionarProduto = () => {
    setProdutos([...produtos, produtoLinhaVazia()]);
  };

  const removerProduto = (index: number) => {
    if (produtos.length > 1) {
      setProdutos(produtos.filter((_, i) => i !== index));
    }
  };

  const atualizarProduto = (index: number, campo: keyof ProdutoLinha, valor: any) => {
    const novosProdutos = [...produtos];
    novosProdutos[index] = { ...novosProdutos[index], [campo]: valor };

    if (campo === 'tipoProduto') {
      novosProdutos[index].marca = valor === 'Aparelho' ? 'Apple' : '';
      novosProdutos[index].modelo = '';
      novosProdutos[index].imei = '';
      novosProdutos[index].cor = '';
      novosProdutos[index].categoria = '';
    }

    if (campo === 'marca') {
      novosProdutos[index].modelo = '';
    }

    if (campo === 'quantidade' || campo === 'custoUnitario') {
      novosProdutos[index].custoTotal = novosProdutos[index].quantidade * novosProdutos[index].custoUnitario;
    }

    setProdutos(novosProdutos);
  };

  const handleCustoChange = (index: number, formatted: string, raw: string | number) => {
    const valor = typeof raw === 'number' ? raw : parseFloat(String(raw)) || 0;
    atualizarProduto(index, 'custoUnitario', valor);
  };

  const validarCampos = (): string[] => {
    const camposFaltando: string[] = [];
    
    if (!fornecedor) camposFaltando.push('Fornecedor');
    if (!dataEntrada) camposFaltando.push('Data de Entrada');
    if (!tipoPagamento) camposFaltando.push('Tipo de Pagamento');
    
    return camposFaltando;
  };

  const validarProdutos = (): boolean => {
    // Pelo menos verificar campos obrigatórios simplificados
    for (const p of produtos) {
      if (!p.modelo) {
        toast.error('Selecione o modelo de todos os produtos');
        return false;
      }
      if (p.custoUnitario <= 0) {
        toast.error('Informe o custo unitário de todos os produtos');
        return false;
      }
      // Se Pagamento Pós, exigir campos completos
      if (!camposSimplificados) {
        if (p.tipoProduto === 'Aparelho' && !p.imei) {
          toast.error('Informe o IMEI de todos os aparelhos');
          return false;
        }
        if (p.tipoProduto === 'Aparelho' && !p.cor) {
          toast.error('Selecione a cor de todos os aparelhos');
          return false;
        }
        if (p.tipoProduto === 'Aparelho' && !p.categoria) {
          toast.error('Selecione a categoria de todos os aparelhos');
          return false;
        }
      }
    }
    return true;
  };

  const temProdutosPreenchidos = useMemo(() => {
    return produtos.some(p => p.modelo && p.custoUnitario > 0);
  }, [produtos]);

  const handleSalvar = () => {
    const camposFaltando = validarCampos();
    
    if (camposFaltando.length > 0) {
      toast.error('Campos obrigatórios não preenchidos', {
        description: camposFaltando.join(', ')
      });
      return;
    }

    // Validar que a data não seja no futuro
    const dataInformada = new Date(dataEntrada + 'T12:00:00');
    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);
    
    if (dataInformada > hoje) {
      toast.error('Data inválida', {
        description: 'A data de entrada não pode ser no futuro'
      });
      return;
    }

    // Se tem produtos preenchidos, validá-los
    if (temProdutosPreenchidos && !validarProdutos()) return;

    // Usar valor total dos produtos se houver, senão o informado manualmente
    const valorFinal = temProdutosPreenchidos && valorTotalProdutos > 0 ? valorTotalProdutos : valorTotal;

    // Criar nota via API
    const novaNota = criarNotaEntrada({
      data: dataEntrada,
      fornecedor,
      tipoPagamento: tipoPagamento as TipoPagamentoNota,
      valorTotal: valorFinal || undefined,
      formaPagamento: formaPagamento || undefined,
      responsavel: 'Usuário Estoque',
      observacoes: observacaoPagamento || undefined,
      urgente: urgente,
      produtos: temProdutosPreenchidos ? produtos.filter(p => p.modelo && p.custoUnitario > 0).map(p => ({
        tipoProduto: p.tipoProduto,
        marca: p.marca,
        modelo: p.modelo,
        imei: p.imei || undefined,
        cor: p.cor || undefined,
        categoria: (p.categoria as 'Novo' | 'Seminovo') || undefined,
        quantidade: p.quantidade,
        custoUnitario: p.custoUnitario,
        custoTotal: p.custoTotal
      })) : undefined
    });

    // Mensagem de sucesso
    const atuacao = definirAtuacaoInicial(tipoPagamento as TipoPagamentoNota);
    const prodMsg = temProdutosPreenchidos ? ' com produtos registrados' : '';
    toast.success(`Nota ${novaNota.id} lançada com sucesso${prodMsg}!`, {
      description: `Atuação inicial: ${atuacao}. ${atuacao === 'Estoque' ? 'Acesse Notas Pendências para cadastrar/conferir produtos.' : 'Aguardando ação do Financeiro.'}`
    });
    
    navigate('/estoque/notas-pendencias');
  };

  const getAtuacaoBadge = (atuacao: AtuacaoAtual | '') => {
    if (!atuacao) return null;
    
    switch (atuacao) {
      case 'Estoque':
        return <Badge className="bg-primary/20 text-primary border-primary/30">Estoque</Badge>;
      case 'Financeiro':
        return <Badge className="bg-accent text-accent-foreground border-accent">Financeiro</Badge>;
      case 'Encerrado':
        return <Badge variant="secondary">Encerrado</Badge>;
      default:
        return null;
    }
  };

  return (
    <EstoqueLayout title="Cadastrar Nova Nota de Compra">
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/estoque/notas-compra')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Notas de Compra
        </Button>

        {/* Alerta informativo */}
        <Alert className="border-primary/30 bg-primary/5">
          <Info className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm">
            <strong>Lançamento Inicial:</strong> Registre a nota e, opcionalmente, os produtos. 
            {camposSimplificados 
              ? ' Para pagamentos Antecipado/Parcial, campos simplificados (sem IMEI, Cor, Categoria).'
              : ' Para Pagamento Pós, todos os campos de produto são obrigatórios.'}
          </AlertDescription>
        </Alert>

        {/* Informações da Nota */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Informações da Nota
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dataEntrada">Data de Entrada *</Label>
                <Input 
                  id="dataEntrada" 
                  type="date"
                  value={dataEntrada}
                  onChange={(e) => setDataEntrada(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="fornecedor">Fornecedor *</Label>
                <AutocompleteFornecedor
                  value={fornecedor}
                  onChange={setFornecedor}
                  placeholder="Selecione um fornecedor"
                />
              </div>
            </div>
            
            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="text-sm text-muted-foreground">
                <strong>Nº da Nota:</strong> Será gerado automaticamente ao salvar (formato: NE-{new Date().getFullYear()}-XXXXX)
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="valorTotal">Valor Total da Nota</Label>
                <InputComMascara
                  mascara="moeda"
                  value={valorTotal}
                  onChange={handleValorTotalChange}
                  placeholder="R$ 0,00"
                />
                <p className="text-xs text-muted-foreground mt-1">Valor previsto da nota fiscal</p>
              </div>
              <div className="flex items-center gap-3 mt-6">
                <Checkbox
                  id="urgente"
                  checked={urgente}
                  onCheckedChange={(checked) => setUrgente(checked as boolean)}
                />
                <div className="flex items-center gap-2">
                  <Zap className={`h-4 w-4 ${urgente ? 'text-destructive' : 'text-muted-foreground'}`} />
                  <Label htmlFor="urgente" className={`cursor-pointer ${urgente ? 'text-destructive font-medium' : ''}`}>
                    Solicitação de Urgência
                  </Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quadro de Produtos - HABILITADO */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Produtos
                  {camposSimplificados && (
                    <Badge variant="outline" className="text-xs">Simplificado</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {camposSimplificados 
                    ? 'Campos simplificados: IMEI, Cor e Categoria serão preenchidos na conferência'
                    : 'Todos os campos habilitados para Pagamento Pós'}
                </CardDescription>
              </div>
              <Button onClick={adicionarProduto} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Produto
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo Produto *</TableHead>
                    <TableHead>Marca *</TableHead>
                    <TableHead>Modelo *</TableHead>
                    {!camposSimplificados && <TableHead>IMEI</TableHead>}
                    {!camposSimplificados && <TableHead>Cor</TableHead>}
                    {!camposSimplificados && <TableHead className="min-w-[120px]">Categoria</TableHead>}
                    <TableHead>Qtd *</TableHead>
                    <TableHead className="min-w-[130px]">Custo Unit. *</TableHead>
                    <TableHead>Custo Total</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {produtos.map((produto, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Select 
                          value={produto.tipoProduto}
                          onValueChange={(value) => atualizarProduto(index, 'tipoProduto', value)}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Aparelho">Aparelho</SelectItem>
                            <SelectItem value="Acessorio">Acessório</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={produto.marca}
                          onValueChange={(value) => atualizarProduto(index, 'marca', value)}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {marcasAparelhos.map(marca => (
                              <SelectItem key={marca} value={marca}>{marca}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={produto.modelo}
                          onValueChange={(value) => atualizarProduto(index, 'modelo', value)}
                        >
                          <SelectTrigger className="w-44">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {getModelosAparelhos(produto.marca).map(p => (
                              <SelectItem key={p.id} value={p.produto}>{p.produto}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      {!camposSimplificados && (
                        <TableCell>
                          {produto.tipoProduto === 'Aparelho' ? (
                            <InputComMascara
                              mascara="imei"
                              value={produto.imei}
                              onChange={(formatted, raw) => atualizarProduto(index, 'imei', String(raw))}
                              className="w-40"
                              placeholder="00-000000-000000-0"
                            />
                          ) : (
                            <Input disabled placeholder="N/A" className="w-40 bg-muted" />
                          )}
                        </TableCell>
                      )}
                      {!camposSimplificados && (
                        <TableCell>
                          {produto.tipoProduto === 'Aparelho' ? (
                            <Input
                              value={produto.cor}
                              onChange={(e) => atualizarProduto(index, 'cor', e.target.value)}
                              className="w-32"
                              placeholder="Cor"
                            />
                          ) : (
                            <Input disabled placeholder="N/A" className="w-32 bg-muted" />
                          )}
                        </TableCell>
                      )}
                      {!camposSimplificados && (
                        <TableCell>
                          {produto.tipoProduto === 'Aparelho' ? (
                            <Select
                              value={produto.categoria || 'selecione'}
                              onValueChange={(value) => atualizarProduto(index, 'categoria', value === 'selecione' ? '' : value)}
                            >
                              <SelectTrigger className="w-24">
                                <SelectValue placeholder="Cat" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="selecione">Selecione</SelectItem>
                                <SelectItem value="Novo">Novo</SelectItem>
                                <SelectItem value="Seminovo">Seminovo</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input disabled placeholder="N/A" className="w-24 bg-muted" />
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          value={produto.quantidade}
                          onChange={(e) => atualizarProduto(index, 'quantidade', parseInt(e.target.value) || 1)}
                          className="w-16"
                        />
                      </TableCell>
                      <TableCell>
                        <InputComMascara 
                          mascara="moeda"
                          value={produto.custoUnitario}
                          onChange={(formatted, raw) => handleCustoChange(index, formatted, raw)}
                          className="w-28"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(produto.custoTotal)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removerProduto(index)}
                            disabled={produtos.length === 1}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <div className="mt-4 pt-4 border-t flex justify-end">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Valor Total dos Produtos</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(valorTotalProdutos || valorTotal)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seção Pagamento */}
        <Card>
          <CardHeader>
            <CardTitle>Pagamento *</CardTitle>
            <CardDescription>
              O tipo de pagamento define o fluxo da nota e a atuação inicial
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Forma de Pagamento */}
              <div>
                <Label className="mb-3 block">Forma de Pagamento</Label>
                <RadioGroup 
                  value={formaPagamento} 
                  onValueChange={(v) => setFormaPagamento(v as 'Dinheiro' | 'Pix')}
                  className="flex gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Dinheiro" id="dinheiro" />
                    <Label htmlFor="dinheiro" className="font-normal cursor-pointer">Dinheiro</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Pix" id="pix" />
                    <Label htmlFor="pix" className="font-normal cursor-pointer">Pix</Label>
                  </div>
                </RadioGroup>
              </div>
              
              {/* Tipo de Pagamento - OBRIGATÓRIO */}
              <div>
                <Label className="mb-3 block">Tipo de Pagamento *</Label>
                <Select 
                  value={tipoPagamento} 
                  onValueChange={(v) => setTipoPagamento(v as TipoPagamentoNota)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pagamento Pos">
                      <div className="flex flex-col">
                        <span className="font-medium">Pagamento Pós</span>
                        <span className="text-xs text-muted-foreground">100% após conferência do estoque</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="Pagamento Parcial">
                      <div className="flex flex-col">
                        <span className="font-medium">Pagamento Parcial</span>
                        <span className="text-xs text-muted-foreground">Adiantamento + restante após conferência</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="Pagamento 100% Antecipado">
                      <div className="flex flex-col">
                        <span className="font-medium">Pagamento 100% Antecipado</span>
                        <span className="text-xs text-muted-foreground">Pagamento total antes da conferência</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Atuação Atual - SOMENTE LEITURA */}
              <div>
                <Label className="mb-3 block flex items-center gap-2">
                  Atuação Atual
                  <Lock className="h-3 w-3 text-muted-foreground" />
                </Label>
                <div className="h-10 px-3 py-2 border rounded-md bg-muted flex items-center gap-2">
                  {atuacaoAtual ? (
                    <>
                      {getAtuacaoBadge(atuacaoAtual)}
                      <span className="text-sm text-muted-foreground">
                        (definido automaticamente)
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground text-sm">
                      Selecione o tipo de pagamento
                    </span>
                  )}
                </div>
                {atuacaoAtual && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {atuacaoAtual === 'Estoque' 
                      ? 'Estoque cadastra e confere primeiro' 
                      : 'Financeiro realiza pagamento primeiro'}
                  </p>
                )}
              </div>
            </div>
            
            {/* Descrição do fluxo baseado no tipo */}
            {tipoPagamento && (
              <Alert className="mt-4">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  {tipoPagamento === 'Pagamento Pos' && (
                    <>
                      <strong>Fluxo Pagamento Pós:</strong> Estoque cadastra produtos → Estoque realiza conferência → 
                      Ao atingir 100% conferência → Financeiro realiza pagamento total → Nota encerrada
                    </>
                  )}
                  {tipoPagamento === 'Pagamento Parcial' && (
                    <>
                      <strong>Fluxo Pagamento Parcial:</strong> Financeiro realiza primeiro pagamento → 
                      Estoque cadastra produtos e confere → Ao atingir 100% conferência → 
                      Financeiro realiza pagamento restante → Nota encerrada
                    </>
                  )}
                  {tipoPagamento === 'Pagamento 100% Antecipado' && (
                    <>
                      <strong>Fluxo 100% Antecipado:</strong> Financeiro realiza pagamento total → 
                      Estoque cadastra produtos e confere → Ao atingir 100% conferência → Nota encerrada automaticamente
                    </>
                  )}
                </AlertDescription>
              </Alert>
            )}
            
            <div>
              <Label htmlFor="observacao">Observação</Label>
              <Textarea 
                id="observacao"
                value={observacaoPagamento}
                onChange={(e) => setObservacaoPagamento(e.target.value)}
                placeholder="Informações adicionais sobre o pagamento..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Buffer de Anexos */}
        <BufferAnexos 
          anexos={anexos}
          onAnexosChange={setAnexos}
          maxFiles={10}
          maxSizeMB={5}
        />

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => navigate('/estoque/notas-compra')}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar}>
            Salvar Lançamento Inicial
          </Button>
        </div>
      </div>
    </EstoqueLayout>
  );
}
