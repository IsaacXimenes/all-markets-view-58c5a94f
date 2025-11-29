import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EstoqueLayout } from '@/components/layout/EstoqueLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { getFornecedores, addNotaCompra } from '@/utils/estoqueApi';
import { toast } from 'sonner';

interface ProdutoLinha {
  marca: string;
  imei: string;
  modelo: string;
  cor: string;
  categoria: 'Novo' | 'Seminovo';
  quantidade: number;
  custoUnitario: number;
  custoTotal: number;
}

export default function EstoqueNotaCadastrar() {
  const navigate = useNavigate();
  const fornecedores = getFornecedores();
  
  const [fornecedor, setFornecedor] = useState('');
  const [dataEntrada, setDataEntrada] = useState('');
  const [numeroNota, setNumeroNota] = useState('');
  const [produtos, setProdutos] = useState<ProdutoLinha[]>([
    {
      marca: 'Apple',
      imei: '',
      modelo: '',
      cor: '',
      categoria: 'Novo',
      quantidade: 1,
      custoUnitario: 0,
      custoTotal: 0
    }
  ]);

  const adicionarProduto = () => {
    setProdutos([
      ...produtos,
      {
        marca: 'Apple',
        imei: '',
        modelo: '',
        cor: '',
        categoria: 'Novo',
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
    
    // Calcular custo total automaticamente
    if (campo === 'quantidade' || campo === 'custoUnitario') {
      novosProdutos[index].custoTotal = novosProdutos[index].quantidade * novosProdutos[index].custoUnitario;
    }
    
    setProdutos(novosProdutos);
  };

  const calcularValorTotal = () => {
    return produtos.reduce((acc, prod) => acc + prod.custoTotal, 0);
  };

  const handleSalvar = () => {
    if (!fornecedor || !dataEntrada || !numeroNota) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (produtos.some(p => !p.modelo || !p.cor || p.custoUnitario <= 0)) {
      toast.error('Preencha todos os dados dos produtos');
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
        quantidade: p.quantidade,
        valorUnitario: p.custoUnitario,
        valorTotal: p.custoTotal,
        saudeBateria: p.categoria === 'Novo' ? 100 : 85
      }))
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
                  placeholder="Ex: 12345"
                />
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
                    {fornecedores.map(f => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
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
                    <TableHead>Marca</TableHead>
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
                        <Input 
                          value={produto.marca}
                          onChange={(e) => atualizarProduto(index, 'marca', e.target.value)}
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          value={produto.imei}
                          onChange={(e) => atualizarProduto(index, 'imei', e.target.value)}
                          placeholder="Opcional"
                          className="w-32"
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          value={produto.modelo}
                          onChange={(e) => atualizarProduto(index, 'modelo', e.target.value)}
                          placeholder="Ex: iPhone 15 Pro"
                          className="w-40"
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          value={produto.cor}
                          onChange={(e) => atualizarProduto(index, 'cor', e.target.value)}
                          placeholder="Ex: Preto"
                          className="w-28"
                        />
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
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number"
                          step="0.01"
                          min="0"
                          value={produto.custoUnitario}
                          onChange={(e) => atualizarProduto(index, 'custoUnitario', parseFloat(e.target.value) || 0)}
                          className="w-28"
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

        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="text-muted-foreground">Seção "Pagamento"</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">Preenchido pelo Financeiro</p>
            <div className="space-y-3 opacity-50">
              <Input placeholder="Forma de Pagamento" disabled />
              <Input placeholder="Parcelas" disabled />
              <Input placeholder="Responsável Financeiro" disabled />
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
