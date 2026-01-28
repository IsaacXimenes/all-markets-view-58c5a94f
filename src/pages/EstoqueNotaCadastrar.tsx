import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { EstoqueLayout } from '@/components/layout/EstoqueLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { addNotaCompra, getNotasCompra } from '@/utils/estoqueApi';
import { getProdutosCadastro } from '@/utils/cadastrosApi';
import { getCores } from '@/utils/coresApi';
import { getAcessorios } from '@/utils/acessoriosApi';
import { toast } from 'sonner';
import { InputComMascara } from '@/components/ui/InputComMascara';
import { formatIMEI, unformatIMEI } from '@/utils/imeiMask';
import { AutocompleteFornecedor } from '@/components/AutocompleteFornecedor';

interface ProdutoLinha {
  tipoProduto: 'Aparelho' | 'Acessório';
  marca: string;
  imei: string;
  modelo: string;
  cor: string;
  categoria: 'Novo' | 'Seminovo';
  quantidade: number;
  custoUnitario: number;
  custoTotal: number;
}

// Marcas de aparelhos
const marcasAparelhos = ['Apple', 'Samsung', 'Xiaomi', 'Motorola', 'LG', 'Huawei', 'OnePlus', 'Realme', 'ASUS', 'Nokia', 'Oppo', 'Vivo'];

// Gerar número de nota automático
const gerarNumeroNota = (notasExistentes: number): string => {
  const ano = new Date().getFullYear();
  const sequencial = String(notasExistentes + 1).padStart(5, '0');
  return `NE-${ano}-${sequencial}`;
};

export default function EstoqueNotaCadastrar() {
  const navigate = useNavigate();
  const produtosCadastro = getProdutosCadastro();
  const coresCadastradas = getCores();
  const acessoriosCadastrados = getAcessorios();
  const notasExistentes = getNotasCompra();
  
  const [fornecedor, setFornecedor] = useState('');
  const [dataEntrada, setDataEntrada] = useState('');
  const [numeroNota, setNumeroNota] = useState('');
  
  // Pagamento
  const [formaPagamento, setFormaPagamento] = useState<'Dinheiro' | 'Pix' | ''>('');
  const [tipoPagamento, setTipoPagamento] = useState<'Pós-Conferência' | 'Parcial' | '100% Antecipado'>('Pós-Conferência');
  const [observacaoPagamento, setObservacaoPagamento] = useState('');
  
  const [produtos, setProdutos] = useState<ProdutoLinha[]>([
    {
      tipoProduto: 'Aparelho',
      marca: 'Apple',
      imei: '',
      modelo: '',
      cor: '',
      categoria: 'Novo', // Categoria "NOVO" pré-selecionada
      quantidade: 1,
      custoUnitario: 0,
      custoTotal: 0
    }
  ]);

  // Gerar número da nota automaticamente
  useEffect(() => {
    setNumeroNota(gerarNumeroNota(notasExistentes.length));
  }, [notasExistentes.length]);

  // Extrair categorias únicas de acessórios cadastrados (usadas como "marca")
  const marcasAcessorios = useMemo(() => {
    const categorias = new Set(acessoriosCadastrados.map(a => a.categoria));
    return Array.from(categorias);
  }, [acessoriosCadastrados]);

  // Modelos de aparelhos filtrados por marca
  const getModelosAparelhos = (marca: string) => {
    return produtosCadastro.filter(p => p.marca.toLowerCase() === marca.toLowerCase());
  };

  // Acessórios filtrados por categoria
  const getModelosAcessorios = (categoria: string) => {
    return acessoriosCadastrados.filter(a => a.categoria.toLowerCase() === categoria.toLowerCase());
  };

  const adicionarProduto = () => {
    setProdutos([
      ...produtos,
      {
        tipoProduto: 'Aparelho',
        marca: 'Apple',
        imei: '',
        modelo: '',
        cor: '',
        categoria: 'Novo', // Categoria "NOVO" pré-selecionada
        quantidade: 1,
        custoUnitario: 0,
        custoTotal: 0
      }
    ]);
  };

  const removerProduto = (index: number) => {
    if (produtos.length > 1) {
      setProdutos(produtos.filter((_, i) => i !== index));
    }
  };

  const atualizarProduto = (index: number, campo: keyof ProdutoLinha, valor: any) => {
    const novosProdutos = [...produtos];
    novosProdutos[index] = { ...novosProdutos[index], [campo]: valor };
    
    // Ao mudar tipo de produto, resetar marca e modelo
    if (campo === 'tipoProduto') {
      novosProdutos[index].marca = valor === 'Aparelho' ? 'Apple' : (marcasAcessorios[0] || '');
      novosProdutos[index].modelo = '';
      novosProdutos[index].imei = '';
      // Se for Aparelho, quantidade fixa em 1
      if (valor === 'Aparelho') {
        novosProdutos[index].quantidade = 1;
      }
    }
    
    // Ao mudar marca, resetar modelo
    if (campo === 'marca') {
      novosProdutos[index].modelo = '';
    }
    
    // Se mudar tipo para Aparelho, bloquear quantidade em 1
    if (campo === 'tipoProduto' && valor === 'Aparelho') {
      novosProdutos[index].quantidade = 1;
    }
    
    // Calcular custo total automaticamente
    if (campo === 'quantidade' || campo === 'custoUnitario') {
      novosProdutos[index].custoTotal = novosProdutos[index].quantidade * novosProdutos[index].custoUnitario;
    }
    
    setProdutos(novosProdutos);
  };

  const handleIMEIChange = (index: number, formatted: string, raw: string | number) => {
    atualizarProduto(index, 'imei', String(raw));
  };

  const handleCustoChange = (index: number, formatted: string, raw: string | number) => {
    const valor = typeof raw === 'number' ? raw : parseFloat(String(raw)) || 0;
    atualizarProduto(index, 'custoUnitario', valor);
  };

  const calcularValorTotal = () => {
    return produtos.reduce((acc, prod) => acc + prod.custoTotal, 0);
  };

  const validarCampos = (): string[] => {
    const camposFaltando: string[] = [];
    
    if (!fornecedor) camposFaltando.push('Fornecedor');
    if (!dataEntrada) camposFaltando.push('Data de Entrada');
    if (!numeroNota) camposFaltando.push('Número da Nota');
    if (!formaPagamento) camposFaltando.push('Forma de Pagamento');
    
    produtos.forEach((p, i) => {
      if (!p.modelo) camposFaltando.push(`Modelo do Produto ${i + 1}`);
      if (!p.cor) camposFaltando.push(`Cor do Produto ${i + 1}`);
      if (p.custoUnitario <= 0) camposFaltando.push(`Custo Unitário do Produto ${i + 1}`);
      if (p.tipoProduto === 'Aparelho' && !p.imei) camposFaltando.push(`IMEI do Produto ${i + 1} (obrigatório para Aparelhos)`);
    });
    
    return camposFaltando;
  };

  // Correção: usar a data exata informada sem ajuste de timezone
  const formatarDataParaSalvar = (dataStr: string): string => {
    // A data vem no formato YYYY-MM-DD do input date
    // Retornar no mesmo formato para evitar problemas de timezone
    return dataStr;
  };

  // Função para expandir produtos com quantidade > 1 em registros individuais
  const expandirProdutos = (produtosOriginais: ProdutoLinha[], notaId: string) => {
    const produtosExpandidos: any[] = [];

    produtosOriginais.forEach((p, prodIndex) => {
      if (p.tipoProduto === 'Aparelho' || p.quantidade <= 1) {
        // Aparelhos sempre têm quantidade 1 com IMEI específico
        produtosExpandidos.push({
          id: `PROD-${notaId}-${String(prodIndex + 1).padStart(3, '0')}`,
          marca: p.marca,
          modelo: p.modelo,
          cor: p.cor,
          imei: p.imei || '',
          tipo: p.categoria,
          tipoProduto: p.tipoProduto,
          quantidade: 1,
          valorUnitario: p.custoUnitario,
          valorTotal: p.custoUnitario,
          saudeBateria: p.categoria === 'Novo' ? 100 : 85,
          statusConferencia: 'Pendente'
        });
      } else {
        // Acessórios com quantidade > 1: gerar N registros individuais
        for (let i = 0; i < p.quantidade; i++) {
          produtosExpandidos.push({
            id: `PROD-${notaId}-${String(prodIndex + 1).padStart(3, '0')}-${String(i + 1).padStart(3, '0')}`,
            marca: p.marca,
            modelo: p.modelo,
            cor: p.cor,
            imei: '', // Acessórios não têm IMEI
            tipo: p.categoria,
            tipoProduto: p.tipoProduto,
            quantidade: 1,
            valorUnitario: p.custoUnitario,
            valorTotal: p.custoUnitario,
            saudeBateria: 100,
            statusConferencia: 'Pendente'
          });
        }
      }
    });

    return produtosExpandidos;
  };

  const handleSalvar = () => {
    const camposFaltando = validarCampos();
    
    if (camposFaltando.length > 0) {
      toast.error('Campos obrigatórios não preenchidos', {
        description: camposFaltando.join(', ')
      });
      return;
    }

    // Validar que a data não seja no futuro
    const dataInformada = new Date(dataEntrada + 'T12:00:00'); // Usar meio-dia para evitar problemas de timezone
    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);
    
    if (dataInformada > hoje) {
      toast.error('Data inválida', {
        description: 'A data de entrada não pode ser no futuro'
      });
      return;
    }

    // Gerar ID temporário para expansão
    const tempNotaId = `NC-${new Date().getFullYear()}-${String(notasExistentes.length + 1).padStart(5, '0')}`;
    
    // Expandir produtos com quantidade > 1
    const produtosExpandidos = expandirProdutos(produtos, tempNotaId);

    const novaNota = addNotaCompra({
      data: formatarDataParaSalvar(dataEntrada),
      numeroNota,
      fornecedor,
      valorTotal: calcularValorTotal(),
      tipoPagamento,
      produtos: produtosExpandidos,
      pagamento: formaPagamento ? {
        formaPagamento,
        parcelas: 1,
        valorParcela: calcularValorTotal(),
        dataVencimento: formatarDataParaSalvar(dataEntrada)
      } : undefined
    });

    // Mensagem informativa sobre individualização
    if (produtosExpandidos.length > produtos.length) {
      toast.success(`Nota ${novaNota.id} cadastrada!`, {
        description: `${produtosExpandidos.length} registros individuais criados. Tipo: ${tipoPagamento}`
      });
    } else {
      toast.success(`Nota ${novaNota.id} cadastrada. Tipo: ${tipoPagamento}`);
    }
    navigate('/estoque/notas-compra');
  };

  return (
    <EstoqueLayout title="Cadastrar Nova Nota de Compra">
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/estoque/notas-compra')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Notas de Compra
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Informações da Nota</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="numeroNota">Nº da Nota *</Label>
                <Input 
                  id="numeroNota" 
                  value={numeroNota}
                  onChange={(e) => setNumeroNota(e.target.value)}
                  placeholder="Ex: NE-2026-00001"
                />
                <p className="text-xs text-muted-foreground mt-1">Gerado automaticamente, editável</p>
              </div>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Produtos</CardTitle>
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
                    <TableHead>IMEI</TableHead>
                    <TableHead>Modelo *</TableHead>
                    <TableHead>Cor *</TableHead>
                    <TableHead>Categoria *</TableHead>
                    <TableHead>Qtd *</TableHead>
                    <TableHead>Custo Unit. *</TableHead>
                    <TableHead>Custo Total</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {produtos.map((produto, index) => (
                    <TableRow key={index}>
                      {/* Tipo de Produto */}
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
                            <SelectItem value="Acessório">Acessório</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      {/* Marca - filtrada por tipo de produto */}
                      <TableCell>
                        <Select 
                          value={produto.marca}
                          onValueChange={(value) => atualizarProduto(index, 'marca', value)}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {produto.tipoProduto === 'Aparelho' 
                              ? marcasAparelhos.map(marca => (
                                  <SelectItem key={marca} value={marca}>{marca}</SelectItem>
                                ))
                              : marcasAcessorios.map(marca => (
                                  <SelectItem key={marca} value={marca}>{marca}</SelectItem>
                                ))
                            }
                          </SelectContent>
                        </Select>
                      </TableCell>
                      {/* IMEI - apenas para aparelhos */}
                      <TableCell>
                        <InputComMascara 
                          mascara="imei"
                          value={produto.imei}
                          onChange={(formatted, raw) => handleIMEIChange(index, formatted, raw)}
                          className="w-36"
                          disabled={produto.tipoProduto !== 'Aparelho'}
                        />
                      </TableCell>
                      {/* Modelo - filtrado por tipo e marca */}
                      <TableCell>
                        <Select 
                          value={produto.modelo}
                          onValueChange={(value) => atualizarProduto(index, 'modelo', value)}
                        >
                          <SelectTrigger className="w-44">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {produto.tipoProduto === 'Aparelho'
                              ? getModelosAparelhos(produto.marca).map(p => (
                                  <SelectItem key={p.id} value={p.produto}>{p.produto}</SelectItem>
                                ))
                              : getModelosAcessorios(produto.marca).map(a => (
                                  <SelectItem key={a.id} value={a.descricao}>{a.descricao}</SelectItem>
                                ))
                            }
                          </SelectContent>
                        </Select>
                      </TableCell>
                      {/* Cor */}
                      <TableCell>
                        <Select 
                          value={produto.cor}
                          onValueChange={(value) => atualizarProduto(index, 'cor', value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {coresCadastradas.map(c => (
                              <SelectItem key={c.id} value={c.nome}>
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-3 h-3 rounded-full border" 
                                    style={{ backgroundColor: c.hexadecimal }}
                                  />
                                  {c.nome}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      {/* Categoria - NOVO pré-selecionado */}
                      <TableCell>
                        <Select 
                          value={produto.categoria}
                          onValueChange={(value) => atualizarProduto(index, 'categoria', value)}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Novo">Novo</SelectItem>
                            <SelectItem value="Seminovo">Seminovo</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      {/* Quantidade */}
                      <TableCell>
                        <Input 
                          type="number"
                          min="1"
                          value={produto.quantidade}
                          onChange={(e) => atualizarProduto(index, 'quantidade', parseInt(e.target.value) || 1)}
                          className="w-16"
                          disabled={produto.tipoProduto === 'Aparelho'}
                        />
                      </TableCell>
                      {/* Custo Unitário */}
                      <TableCell>
                        <InputComMascara
                          mascara="moeda"
                          value={produto.custoUnitario}
                          onChange={(formatted, raw) => handleCustoChange(index, formatted, raw)}
                          className="w-32"
                        />
                      </TableCell>
                      {/* Custo Total */}
                      <TableCell className="font-semibold">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(produto.custoTotal)}
                      </TableCell>
                      {/* Remover */}
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
            
            <div className="mt-4 pt-4 border-t flex justify-end">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Valor Total da Nota</p>
                <p className="text-2xl font-bold">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calcularValorTotal())}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seção Pagamento - Agora habilitada */}
        <Card>
          <CardHeader>
            <CardTitle>Pagamento *</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="mb-3 block">Forma de Pagamento *</Label>
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
              
              <div>
                <Label className="mb-3 block">Tipo de Pagamento *</Label>
                <Select 
                  value={tipoPagamento} 
                  onValueChange={(v) => setTipoPagamento(v as 'Pós-Conferência' | 'Parcial' | '100% Antecipado')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pós-Conferência">
                      <div className="flex flex-col">
                        <span>Pós-Conferência</span>
                        <span className="text-xs text-muted-foreground">Pagamento após validação do estoque</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="Parcial">
                      <div className="flex flex-col">
                        <span>Parcial</span>
                        <span className="text-xs text-muted-foreground">Pagamento adiantado + restante após conferência</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="100% Antecipado">
                      <div className="flex flex-col">
                        <span>100% Antecipado</span>
                        <span className="text-xs text-muted-foreground">Pagamento total antes da conferência</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
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

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => navigate('/estoque/notas-compra')}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar}>
            Salvar Nota
          </Button>
        </div>
      </div>
    </EstoqueLayout>
  );
}
