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
import { ArrowLeft, Plus, Trash2, AlertTriangle, Save } from 'lucide-react';
import { 
  getNotaEntradaById, 
  cadastrarProdutosNota, 
  NotaEntrada,
  podeRealizarAcao 
} from '@/utils/notaEntradaFluxoApi';
import { getProdutosCadastro } from '@/utils/cadastrosApi';
import { toast } from 'sonner';
import { InputComMascara } from '@/components/ui/InputComMascara';
import { formatCurrency } from '@/utils/formatUtils';
import { getCores } from '@/utils/coresApi';

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
}

const marcasAparelhos = ['Apple', 'Samsung', 'Xiaomi', 'Motorola', 'LG', 'Huawei', 'OnePlus', 'Realme', 'ASUS', 'Nokia', 'Oppo', 'Vivo'];

export default function EstoqueNotaCadastrarProdutos() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [nota, setNota] = useState<NotaEntrada | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const produtosCadastro = getProdutosCadastro();
  
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
      toast.success(`${produtos.length} produto(s) cadastrado(s) com sucesso!`);
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
                    <TableHead className="text-muted-foreground">Categoria</TableHead>
                    <TableHead>Qtd *</TableHead>
                    <TableHead>Custo Unit. *</TableHead>
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removerProduto(index)}
                          disabled={produtos.length === 1}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
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
    </EstoqueLayout>
  );
}
