import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { EstoqueLayout } from '@/components/layout/EstoqueLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from '@/components/ui/command';
import { ArrowLeft, Plus, Trash2, AlertTriangle, Save, CheckCircle, Clock, Wrench, ChevronsUpDown, Check } from 'lucide-react';
import { 
  getNotaEntradaById, 
  cadastrarProdutosNota, 
  NotaEntrada,
  podeRealizarAcao 
} from '@/utils/notaEntradaFluxoApi';
import { getProdutosCadastro } from '@/utils/cadastrosApi';
import { encaminharParaAnaliseGarantia, MetadadosEstoque } from '@/utils/garantiasApi';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import { InputComMascara } from '@/components/ui/InputComMascara';
import { formatCurrency } from '@/utils/formatUtils';
import { getCores } from '@/utils/coresApi';
import { getAcessorios } from '@/utils/acessoriosApi';
import { formatIMEI } from '@/utils/imeiMask';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const categoriasAparelho = ['Novo', 'Seminovo'];

interface ProdutoLinha {
  tipoProduto: 'Aparelho' | 'Acessorio';
  marca: string;
  modelo: string;
  imei: string;
  cor: string;
  categoria: 'Novo' | 'Seminovo' | '';
  quantidade: number;
  custoUnitario: number;
  custoTotal: number;
  explodido?: boolean;
}

interface MarcacaoAssistencia {
  index: number;
  motivo: string;
  timestamp: string;
}

const marcasAparelhos = ['Apple', 'Samsung', 'Xiaomi', 'Motorola', 'LG', 'Huawei', 'OnePlus', 'Realme', 'ASUS', 'Nokia', 'Oppo', 'Vivo'];

export default function EstoqueNotaCadastrarProdutos() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [nota, setNota] = useState<NotaEntrada | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const produtosCadastro = getProdutosCadastro();
  const acessoriosCadastro = getAcessorios();
  
  const cores = getCores().filter(c => c.status === 'Ativo');
  
  const [produtos, setProdutos] = useState<ProdutoLinha[]>([{
    tipoProduto: 'Aparelho',
    marca: 'Apple',
    modelo: '',
    imei: '',
    cor: '',
    categoria: '',
    quantidade: 1,
    custoUnitario: 0,
    custoTotal: 0
  }]);

  // Estado para marcação de assistência
  const [produtosMarcadosAssistencia, setProdutosMarcadosAssistencia] = useState<MarcacaoAssistencia[]>([]);
  const [modalAssistenciaAberto, setModalAssistenciaAberto] = useState(false);
  const [indiceProdutoAssistencia, setIndiceProdutoAssistencia] = useState<number | null>(null);
  const [motivoAssistencia, setMotivoAssistencia] = useState('');
  const [confirmarAssistencia, setConfirmarAssistencia] = useState(false);

  // Estado para popover do autocomplete modelo
  const [openModeloPopover, setOpenModeloPopover] = useState<number | null>(null);

  useEffect(() => {
    if (id) {
      const notaData = getNotaEntradaById(id);
      setNota(notaData);
      setIsLoading(false);
    }
  }, [id]);

  const getModelosAparelhos = (marca: string) => {
    return produtosCadastro.filter(p => p.marca.toLowerCase() === marca.toLowerCase());
  };

  const qtdRestante = useMemo(() => {
    if (!nota) return 0;
    const qtdAdicionar = produtos.reduce((acc, p) => acc + p.quantidade, 0);
    return nota.qtdInformada - nota.qtdCadastrada - qtdAdicionar;
  }, [nota, produtos]);

  const adicionarProduto = () => {
    if (qtdRestante <= 0 && nota?.qtdInformada && nota.qtdInformada > 0) {
      toast.warning('Quantidade máxima atingida');
      return;
    }
    
    setProdutos([...produtos, {
      tipoProduto: 'Aparelho',
      marca: 'Apple',
      modelo: '',
      imei: '',
      cor: '',
      categoria: '',
      quantidade: 1,
      custoUnitario: 0,
      custoTotal: 0
    }]);
  };

  const removerProduto = (index: number) => {
    if (produtos.length > 1) {
      setProdutos(produtos.filter((_, i) => i !== index));
      // Remover marcação de assistência se existir
      setProdutosMarcadosAssistencia(prev => prev.filter(m => m.index !== index).map(m => ({
        ...m,
        index: m.index > index ? m.index - 1 : m.index
      })));
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
      if (valor === 'Aparelho') {
        novosProdutos[index].quantidade = 1;
      }
      // Remover marcação de assistência ao trocar tipo
      setProdutosMarcadosAssistencia(prev => prev.filter(m => m.index !== index));
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

  const handleImeiChange = (index: number, formatted: string, raw: string | number) => {
    atualizarProduto(index, 'imei', String(raw));
  };

  const calcularValorTotal = () => {
    return produtos.reduce((acc, prod) => acc + prod.custoTotal, 0);
  };

  // Assistência handlers
  const isMarcadoAssistencia = (index: number) => produtosMarcadosAssistencia.some(m => m.index === index);

  const abrirModalAssistencia = (index: number) => {
    setIndiceProdutoAssistencia(index);
    setMotivoAssistencia('');
    setConfirmarAssistencia(false);
    setModalAssistenciaAberto(true);
  };

  const confirmarEncaminhamento = () => {
    if (indiceProdutoAssistencia === null) return;
    if (!motivoAssistencia.trim()) {
      toast.error('Informe o motivo do encaminhamento');
      return;
    }
    if (!confirmarAssistencia) {
      toast.error('Confirme o encaminhamento');
      return;
    }

    setProdutosMarcadosAssistencia(prev => [
      ...prev,
      { index: indiceProdutoAssistencia, motivo: motivoAssistencia, timestamp: new Date().toISOString() }
    ]);
    setModalAssistenciaAberto(false);
    toast.success('Produto marcado para assistência');
  };

  const desmarcarAssistencia = (index: number) => {
    setProdutosMarcadosAssistencia(prev => prev.filter(m => m.index !== index));
    toast.info('Marcação de assistência removida');
  };

  const validarProdutos = (): boolean => {
    for (const p of produtos) {
      if (!p.modelo) {
        toast.error('Selecione o modelo de todos os produtos');
        return false;
      }
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
      if (p.custoUnitario <= 0) {
        toast.error('Informe o custo unitário de todos os produtos');
        return false;
      }
    }
    return true;
  };

  const handleSalvar = () => {
    if (!nota) return;
    
    if (!validarProdutos()) return;
    
    const resultado = cadastrarProdutosNota(
      nota.id,
      produtos.map(p => ({
        tipoProduto: p.tipoProduto,
        marca: p.marca,
        modelo: p.modelo,
        imei: p.imei,
        cor: p.cor,
        categoria: p.categoria as 'Novo' | 'Seminovo',
        quantidade: p.quantidade,
        custoUnitario: p.custoUnitario,
        custoTotal: p.custoTotal
      })),
      'Carlos Estoque'
    );
    
    if (resultado) {
      // Encaminhar produtos marcados para assistência via Análise de Tratativas
      produtosMarcadosAssistencia.forEach(marcacao => {
        const prod = produtos[marcacao.index];
        if (prod) {
          // Buscar o ID do produto recém-cadastrado na nota atualizada
          const notaAtualizada = getNotaEntradaById(nota.id);
          const produtoNotaCadastrado = notaAtualizada?.produtos.find(
            p => p.imei === prod.imei && p.modelo === prod.modelo
          );
          const produtoNotaId = produtoNotaCadastrado?.id || nota.id;

          const descricao = `${prod.marca} ${prod.modelo} - IMEI: ${prod.imei}`;
          const metadata: MetadadosEstoque = {
            notaEntradaId: nota.id,
            produtoNotaId,
            imeiAparelho: prod.imei || undefined,
            modeloAparelho: prod.modelo,
            marcaAparelho: prod.marca
          };
          encaminharParaAnaliseGarantia(produtoNotaId, 'Estoque', descricao, marcacao.motivo, metadata);
        }
      });

      const msgAssistencia = produtosMarcadosAssistencia.length > 0
        ? ` | ${produtosMarcadosAssistencia.length} encaminhado(s) para Análise de Tratativas`
        : '';
      toast.success(`${produtos.length} produto(s) cadastrado(s) com sucesso!${msgAssistencia}`);
      navigate('/estoque/notas-pendencias');
    } else {
      toast.error('Erro ao cadastrar produtos');
    }
  };

  if (isLoading) {
    return (
      <EstoqueLayout title="Carregando...">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Carregando nota...</p>
        </div>
      </EstoqueLayout>
    );
  }

  if (!nota) {
    return (
      <EstoqueLayout title="Nota não encontrada">
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">Nota não encontrada (ID: {id})</p>
          <Button onClick={() => navigate('/estoque/notas-pendencias')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Pendências
          </Button>
        </div>
      </EstoqueLayout>
    );
  }

  if (!podeRealizarAcao(nota, 'cadastrar_produtos', 'Estoque')) {
    return (
      <EstoqueLayout title="Ação não permitida">
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">
            Não é possível cadastrar produtos nesta nota (Status: {nota.status})
          </p>
          <Button onClick={() => navigate('/estoque/notas-pendencias')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Pendências
          </Button>
        </div>
      </EstoqueLayout>
    );
  }

  return (
    <EstoqueLayout title={`Cadastrar Produtos - ${nota.numeroNota}`}>
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/estoque/notas-pendencias')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Pendências
        </Button>

        {/* Informações da Nota */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Informações da Nota</span>
              <Badge variant="outline">{nota.status}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-muted-foreground">Nº da Nota</Label>
                <p className="font-medium">{nota.numeroNota}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Fornecedor</Label>
                <p className="font-medium">{nota.fornecedor}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Tipo de Pagamento</Label>
                <p className="font-medium">{nota.tipoPagamento}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Qtd Informada</Label>
                <p className="font-medium">{nota.qtdInformada}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mt-4 p-4 bg-muted/50 rounded-lg">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Qtd Informada</p>
                <p className="text-2xl font-bold">{nota.qtdInformada}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Qtd Cadastrada</p>
                <p className="text-2xl font-bold text-primary">{nota.qtdCadastrada}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Qtd Conferida</p>
                <p className="text-2xl font-bold text-primary">{nota.qtdConferida}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Produtos Já Cadastrados */}
        {nota.produtos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Produtos Já Cadastrados ({nota.produtos.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Marca</TableHead>
                      <TableHead>Modelo</TableHead>
                      <TableHead>IMEI</TableHead>
                      <TableHead>Cor</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Qtd</TableHead>
                      <TableHead>Custo Unit.</TableHead>
                      <TableHead>Custo Total</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nota.produtos.map(produto => (
                      <TableRow key={produto.id} className="bg-muted/30">
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {produto.tipoProduto}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{produto.marca}</TableCell>
                        <TableCell className="font-medium">{produto.modelo}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {produto.imei ? formatIMEI(produto.imei) : '-'}
                        </TableCell>
                        <TableCell>
                          {produto.cor ? (
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full border border-border" 
                                style={{ backgroundColor: cores.find(c => c.nome === produto.cor)?.hexadecimal || '#888' }}
                              />
                              <span className="text-sm">{produto.cor}</span>
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={produto.categoria === 'Novo' ? 'default' : 'secondary'} className="text-xs">
                            {produto.categoria || '-'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">{produto.quantidade}</TableCell>
                        <TableCell>{formatCurrency(produto.custoUnitario)}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(produto.custoTotal)}</TableCell>
                        <TableCell className="text-center">
                          {produto.statusConferencia === 'Conferido' ? (
                            <CheckCircle className="h-5 w-5 text-primary mx-auto" />
                          ) : (
                            <Clock className="h-5 w-5 text-muted-foreground mx-auto" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4 pt-4 border-t flex justify-end">
                <p className="text-lg">
                  <span className="text-muted-foreground">Total já cadastrado: </span>
                  <span className="font-bold">{formatCurrency(nota.produtos.reduce((acc, p) => acc + p.custoTotal, 0))}</span>
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Alerta de quantidade */}
        {nota.qtdInformada > 0 && qtdRestante <= 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Quantidade máxima atingida. Remova produtos para adicionar novos.
            </AlertDescription>
          </Alert>
        )}

        {/* Quadro de Produtos */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Produtos a Cadastrar</CardTitle>
                {nota.qtdInformada > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Restam {Math.max(0, qtdRestante)} produto(s) para cadastrar
                  </p>
                )}
              </div>
              <Button onClick={adicionarProduto} size="sm" disabled={qtdRestante <= 0 && nota.qtdInformada > 0}>
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
                    <TableHead className="text-muted-foreground">IMEI</TableHead>
                    <TableHead className="text-muted-foreground">Cor</TableHead>
                    <TableHead className="text-muted-foreground min-w-[120px]">Categoria</TableHead>
                    <TableHead>Qtd *</TableHead>
                    <TableHead className="min-w-[130px]">Custo Unit. *</TableHead>
                    <TableHead>Custo Total</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {produtos.map((produto, index) => (
                    <TableRow key={index} className={isMarcadoAssistencia(index) ? 'bg-orange-50 dark:bg-orange-950/20' : ''}>
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
                        {produto.tipoProduto === 'Aparelho' ? (
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
                        ) : (
                          <Input disabled placeholder="N/A" className="w-28 bg-muted" />
                        )}
                      </TableCell>
                      {/* Modelo - Autocomplete */}
                      <TableCell>
                        <Popover open={openModeloPopover === index} onOpenChange={(open) => setOpenModeloPopover(open ? index : null)}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" className="w-44 justify-between font-normal">
                              <span className="truncate">{produto.modelo || 'Selecione...'}</span>
                              <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56 p-0" style={{ zIndex: 100 }}>
                            <Command>
                              <CommandInput placeholder="Pesquisar modelo..." />
                              <CommandList className="max-h-48 overflow-y-auto">
                                <CommandEmpty>Nenhum modelo encontrado.</CommandEmpty>
                                {produto.tipoProduto === 'Acessorio'
                                  ? acessoriosCadastro.map(a => (
                                      <CommandItem
                                        key={a.id}
                                        value={a.descricao}
                                        onSelect={() => {
                                          atualizarProduto(index, 'modelo', a.descricao);
                                          setOpenModeloPopover(null);
                                        }}
                                      >
                                        <Check className={cn("mr-2 h-4 w-4", produto.modelo === a.descricao ? "opacity-100" : "opacity-0")} />
                                        {a.descricao}
                                      </CommandItem>
                                    ))
                                  : getModelosAparelhos(produto.marca).map(p => (
                                      <CommandItem
                                        key={p.id}
                                        value={p.produto}
                                        onSelect={() => {
                                          atualizarProduto(index, 'modelo', p.produto);
                                          setOpenModeloPopover(null);
                                        }}
                                      >
                                        <Check className={cn("mr-2 h-4 w-4", produto.modelo === p.produto ? "opacity-100" : "opacity-0")} />
                                        {p.produto}
                                      </CommandItem>
                                    ))
                                }
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                      {/* IMEI */}
                      <TableCell>
                        {produto.tipoProduto === 'Aparelho' ? (
                          <InputComMascara
                            mascara="imei"
                            value={produto.imei}
                            onChange={(formatted, raw) => handleImeiChange(index, formatted, raw)}
                            className="w-40"
                            placeholder="00-000000-000000-0"
                          />
                        ) : (
                          <Input disabled placeholder="N/A" className="w-40 bg-muted" />
                        )}
                      </TableCell>
                      {/* Cor */}
                      <TableCell>
                        {produto.tipoProduto === 'Aparelho' ? (
                          <Select
                            value={produto.cor}
                            onValueChange={(value) => atualizarProduto(index, 'cor', value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {cores.map(cor => (
                                <SelectItem key={cor.id} value={cor.nome}>
                                  <div className="flex items-center gap-2">
                                    <div 
                                      className="w-3 h-3 rounded-full border border-border" 
                                      style={{ backgroundColor: cor.hexadecimal }}
                                    />
                                    {cor.nome}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input disabled placeholder="N/A" className="w-32 bg-muted" />
                        )}
                      </TableCell>
                      {/* Categoria */}
                      <TableCell>
                        {produto.tipoProduto === 'Aparelho' ? (
                          <Select
                            value={produto.categoria}
                            onValueChange={(value) => atualizarProduto(index, 'categoria', value)}
                          >
                            <SelectTrigger className="w-20">
                              <SelectValue placeholder="Cat" />
                            </SelectTrigger>
                            <SelectContent>
                              {categoriasAparelho.map(cat => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input disabled placeholder="N/A" className="w-20 bg-muted" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          value={produto.quantidade}
                          onChange={(e) => atualizarProduto(index, 'quantidade', parseInt(e.target.value) || 1)}
                          className="w-16"
                          disabled={produto.tipoProduto === 'Aparelho'}
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
                          {isMarcadoAssistencia(index) ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => desmarcarAssistencia(index)}
                              title="Remover marcação de assistência"
                            >
                              <Badge className="text-[10px] px-1.5 py-0 bg-orange-500 hover:bg-orange-600 text-white cursor-pointer">
                                Assistência ✕
                              </Badge>
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => abrirModalAssistencia(index)}
                              disabled={produto.tipoProduto !== 'Aparelho' || !produto.imei.trim()}
                              title={
                                produto.tipoProduto !== 'Aparelho'
                                  ? 'Apenas aparelhos podem ser encaminhados'
                                  : !produto.imei.trim()
                                    ? 'Preencha o IMEI para habilitar'
                                    : 'Encaminhar para assistência'
                              }
                            >
                              <Wrench className="h-4 w-4 text-orange-500" />
                            </Button>
                          )}
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

            <div className="flex justify-between items-center mt-6 pt-4 border-t">
              <div className="text-lg">
                <span className="text-muted-foreground">Total dos produtos a adicionar: </span>
                <span className="font-bold">{formatCurrency(calcularValorTotal())}</span>
              </div>
              <Button onClick={handleSalvar} size="lg">
                <Save className="mr-2 h-4 w-4" />
                Salvar Produtos
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de Encaminhamento para Assistência */}
      <Dialog open={modalAssistenciaAberto} onOpenChange={setModalAssistenciaAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-orange-500" />
              Encaminhar para Assistência
            </DialogTitle>
          </DialogHeader>

          {indiceProdutoAssistencia !== null && produtos[indiceProdutoAssistencia] && (
            <div className="space-y-4">
              {/* Info do aparelho */}
              <div className="p-3 bg-muted/50 rounded-lg space-y-1">
                <p className="text-sm"><span className="text-muted-foreground">Marca:</span> <span className="font-medium">{produtos[indiceProdutoAssistencia].marca}</span></p>
                <p className="text-sm"><span className="text-muted-foreground">Modelo:</span> <span className="font-medium">{produtos[indiceProdutoAssistencia].modelo}</span></p>
                <p className="text-sm"><span className="text-muted-foreground">IMEI:</span> <span className="font-mono font-medium">{formatIMEI(produtos[indiceProdutoAssistencia].imei)}</span></p>
              </div>

              {/* Data/hora e responsável */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Data/Hora</Label>
                  <p className="text-sm font-medium">{format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Responsável</Label>
                  <p className="text-sm font-medium">{user?.colaborador?.nome || user?.username || 'Usuário'}</p>
                </div>
              </div>

              {/* Motivo */}
              <div className="space-y-2">
                <Label>Motivo do encaminhamento *</Label>
                <Textarea
                  value={motivoAssistencia}
                  onChange={(e) => setMotivoAssistencia(e.target.value)}
                  placeholder="Descreva o motivo pelo qual este aparelho deve ser encaminhado para assistência..."
                  rows={3}
                />
              </div>

              {/* Checkbox de confirmação */}
              <div className="flex items-start gap-2">
                <Checkbox
                  checked={confirmarAssistencia}
                  onCheckedChange={(checked) => setConfirmarAssistencia(checked as boolean)}
                />
                <Label className="text-sm leading-tight cursor-pointer" onClick={() => setConfirmarAssistencia(!confirmarAssistencia)}>
                  Confirmo que este aparelho deve ser encaminhado para Análise de Tratativas na Assistência
                </Label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAssistenciaAberto(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={confirmarEncaminhamento}
              disabled={!motivoAssistencia.trim() || !confirmarAssistencia}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Wrench className="mr-2 h-4 w-4" />
              Confirmar Encaminhamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </EstoqueLayout>
  );
}
