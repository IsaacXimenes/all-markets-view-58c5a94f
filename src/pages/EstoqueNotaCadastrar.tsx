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
import { getProdutosCadastro, getFornecedores } from '@/utils/cadastrosApi';
import { getCores } from '@/utils/coresApi';
import { toast } from 'sonner';
import { InputComMascara } from '@/components/ui/InputComMascara';
import { formatIMEI, unformatIMEI } from '@/utils/imeiMask';

interface ProdutoLinha {
  marca: string;
  imei: string;
  modelo: string;
  cor: string;
  categoria: 'Novo' | 'Seminovo';
  tipo: 'Aparelho' | 'Acessórios' | 'Peças';
  quantidade: number;
  custoUnitario: number;
  custoTotal: number;
}

// Marcas disponíveis
const marcasDisponiveis = ['Apple', 'Samsung', 'Xiaomi', 'Motorola', 'LG', 'Huawei', 'OnePlus', 'Realme', 'ASUS', 'Nokia', 'Oppo', 'Vivo'];

// Gerar número de nota automático
const gerarNumeroNota = (notasExistentes: number): string => {
  const ano = new Date().getFullYear();
  const sequencial = String(notasExistentes + 1).padStart(5, '0');
  return `NE-${ano}-${sequencial}`;
};

export default function EstoqueNotaCadastrar() {
  const navigate = useNavigate();
  const fornecedores = getFornecedores();
  const produtosCadastro = getProdutosCadastro();
  const coresCadastradas = getCores();
  const notasExistentes = getNotasCompra();
  
  const [fornecedor, setFornecedor] = useState('');
  const [dataEntrada, setDataEntrada] = useState('');
  const [numeroNota, setNumeroNota] = useState('');
  
  // Pagamento
  const [formaPagamento, setFormaPagamento] = useState<'Dinheiro' | 'Pix' | ''>('');
  const [observacaoPagamento, setObservacaoPagamento] = useState('');
  
  const [produtos, setProdutos] = useState<ProdutoLinha[]>([
    {
      marca: 'Apple',
      imei: '',
      modelo: '',
      cor: '',
      categoria: 'Novo',
      tipo: 'Aparelho',
      quantidade: 1,
      custoUnitario: 0,
      custoTotal: 0
    }
  ]);

  // Gerar número da nota automaticamente
  useEffect(() => {
    setNumeroNota(gerarNumeroNota(notasExistentes.length));
  }, [notasExistentes.length]);

  // Modelos filtrados por marca
  const getModelosFiltrados = (marca: string) => {
    return produtosCadastro.filter(p => p.marca.toLowerCase() === marca.toLowerCase());
  };

  const adicionarProduto = () => {
    setProdutos([
      ...produtos,
      {
        marca: 'Apple',
        imei: '',
        modelo: '',
        cor: '',
        categoria: 'Novo',
        tipo: 'Aparelho',
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
    
    // Se mudar tipo para Aparelho, bloquear quantidade em 1
    if (campo === 'tipo' && valor === 'Aparelho') {
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
      if (p.tipo === 'Aparelho' && !p.imei) camposFaltando.push(`IMEI do Produto ${i + 1} (obrigatório para Aparelhos)`);
    });
    
    return camposFaltando;
  };

  const handleSalvar = () => {
    const camposFaltando = validarCampos();
    
    if (camposFaltando.length > 0) {
      toast.error('Campos obrigatórios não preenchidos', {
        description: camposFaltando.join(', ')
      });
      return;
    }

    const novaNota = addNotaCompra({
      data: dataEntrada,
      numeroNota,
      fornecedor,
      valorTotal: calcularValorTotal(),
      produtos: produtos.map(p => ({
        marca: p.marca,
        modelo: p.modelo,
        cor: p.cor,
        imei: p.imei || 'N/A',
        tipo: p.categoria,
        tipoProduto: p.tipo,
        quantidade: p.quantidade,
        valorUnitario: p.custoUnitario,
        valorTotal: p.custoTotal,
        saudeBateria: p.categoria === 'Novo' ? 100 : 85
      })),
      pagamento: formaPagamento ? {
        formaPagamento,
        parcelas: 1,
        valorParcela: calcularValorTotal(),
        dataVencimento: dataEntrada
      } : undefined
    });

    toast.success(`Nota ${novaNota.id} cadastrada com sucesso. Status: Pendente (aguardando Financeiro)`);
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
                <Select value={fornecedor} onValueChange={setFornecedor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {fornecedores.filter(f => f.status === 'Ativo').map(f => (
                      <SelectItem key={f.id} value={f.nome}>{f.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                    <TableHead>Tipo *</TableHead>
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
                      <TableCell>
                        <Select 
                          value={produto.tipo}
                          onValueChange={(value) => atualizarProduto(index, 'tipo', value)}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Aparelho">Aparelho</SelectItem>
                            <SelectItem value="Acessórios">Acessórios</SelectItem>
                            <SelectItem value="Peças">Peças</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={produto.marca}
                          onValueChange={(value) => atualizarProduto(index, 'marca', value)}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {marcasDisponiveis.map(marca => (
                              <SelectItem key={marca} value={marca}>{marca}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <InputComMascara 
                          mascara="imei"
                          value={produto.imei}
                          onChange={(formatted, raw) => handleIMEIChange(index, formatted, raw)}
                          className="w-36"
                          disabled={produto.tipo !== 'Aparelho'}
                        />
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
                            {getModelosFiltrados(produto.marca).map(p => (
                              <SelectItem key={p.id} value={p.produto}>{p.produto}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
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
                      <TableCell>
                        <Input 
                          type="number"
                          min="1"
                          value={produto.quantidade}
                          onChange={(e) => atualizarProduto(index, 'quantidade', parseInt(e.target.value) || 1)}
                          className="w-16"
                          disabled={produto.tipo === 'Aparelho'}
                        />
                      </TableCell>
                      <TableCell>
                        <InputComMascara
                          mascara="moeda"
                          value={produto.custoUnitario}
                          onChange={(formatted, raw) => handleCustoChange(index, formatted, raw)}
                          className="w-32"
                        />
                      </TableCell>
                      <TableCell className="font-semibold">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(produto.custoTotal)}
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
              <Label htmlFor="observacao">Observação</Label>
              <Textarea 
                id="observacao"
                value={observacaoPagamento}
                onChange={(e) => setObservacaoPagamento(e.target.value)}
                placeholder="Ex: Pagamento parcial, Aguardando confirmação, etc."
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
