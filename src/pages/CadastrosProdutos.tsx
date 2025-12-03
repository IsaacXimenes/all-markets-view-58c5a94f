import { useState } from 'react';
import { CadastrosLayout } from '@/components/layout/CadastrosLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { getProdutosCadastro, addProdutoCadastro, updateProdutoCadastro, deleteProdutoCadastro, exportToCSV, ProdutoCadastro } from '@/utils/cadastrosApi';
import { Plus, Pencil, Trash2, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function CadastrosProdutos() {
  const { toast } = useToast();
  const [produtos, setProdutos] = useState(getProdutosCadastro());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduto, setEditingProduto] = useState<ProdutoCadastro | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({
    marca: '',
    categoria: '',
    produto: ''
  });

  const resetForm = () => {
    setForm({ marca: '', categoria: '', produto: '' });
    setEditingProduto(null);
  };

  const handleOpenDialog = (produto?: ProdutoCadastro) => {
    if (produto) {
      setEditingProduto(produto);
      setForm({ marca: produto.marca, categoria: produto.categoria, produto: produto.produto });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.marca || !form.categoria || !form.produto) {
      toast({ title: 'Erro', description: 'Todos os campos são obrigatórios', variant: 'destructive' });
      return;
    }

    if (editingProduto) {
      updateProdutoCadastro(editingProduto.id, form);
      toast({ title: 'Sucesso', description: 'Produto atualizado com sucesso' });
    } else {
      addProdutoCadastro(form);
      toast({ title: 'Sucesso', description: 'Produto cadastrado com sucesso' });
    }

    setProdutos(getProdutosCadastro());
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    deleteProdutoCadastro(id);
    setProdutos(getProdutosCadastro());
    toast({ title: 'Sucesso', description: 'Produto removido com sucesso' });
  };

  const handleExport = () => {
    exportToCSV(produtosFiltrados, 'produtos-cadastro.csv');
  };

  const produtosFiltrados = produtos.filter(p => 
    p.produto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.categoria.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <CadastrosLayout title="Cadastro de Produtos">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-4 justify-between items-center">
          <div className="flex gap-2">
            <Input
              placeholder="Buscar produto..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-[250px]"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Produto
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Marca</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {produtosFiltrados.map(produto => (
                <TableRow key={produto.id}>
                  <TableCell className="font-mono text-xs">{produto.id}</TableCell>
                  <TableCell>{produto.marca}</TableCell>
                  <TableCell>{produto.categoria}</TableCell>
                  <TableCell className="font-medium">{produto.produto}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(produto)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(produto.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProduto ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Marca *</Label>
              <Input value={form.marca} onChange={e => setForm({ ...form, marca: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Input value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Produto *</Label>
              <Input value={form.produto} onChange={e => setForm({ ...form, produto: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CadastrosLayout>
  );
}
