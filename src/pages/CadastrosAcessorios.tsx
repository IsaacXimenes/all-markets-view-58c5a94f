import { useState } from 'react';
import { CadastrosLayout } from '@/components/layout/CadastrosLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export interface AcessorioCadastro {
  id: string;
  marca: string;
  categoria: string;
  produto: string;
  limiteMinimo: number;
}

// Mock data
let acessoriosCadastro: AcessorioCadastro[] = [
  { id: 'AC-001', marca: 'Apple', categoria: 'Cabos', produto: 'Cabo USB-C Lightning', limiteMinimo: 10 },
  { id: 'AC-002', marca: 'Samsung', categoria: 'Capas', produto: 'Capa Galaxy S23 Ultra Silicone', limiteMinimo: 5 },
  { id: 'AC-003', marca: 'Apple', categoria: 'Películas', produto: 'Película Vidro iPhone 14 Pro Max', limiteMinimo: 15 },
  { id: 'AC-004', marca: 'JBL', categoria: 'Fones', produto: 'Fone Bluetooth JBL Tune 510', limiteMinimo: 3 },
  { id: 'AC-005', marca: 'Anker', categoria: 'Carregadores', produto: 'Carregador USB-C 20W', limiteMinimo: 8 },
];

let nextId = 6;

export const getAcessoriosCadastro = () => [...acessoriosCadastro];

export const addAcessorioCadastro = (data: Omit<AcessorioCadastro, 'id'>) => {
  const novo: AcessorioCadastro = { ...data, id: `AC-${String(nextId++).padStart(3, '0')}` };
  acessoriosCadastro.push(novo);
  return novo;
};

export const updateAcessorioCadastro = (id: string, data: Partial<AcessorioCadastro>) => {
  const index = acessoriosCadastro.findIndex(a => a.id === id);
  if (index !== -1) acessoriosCadastro[index] = { ...acessoriosCadastro[index], ...data };
};

export const deleteAcessorioCadastro = (id: string) => {
  acessoriosCadastro = acessoriosCadastro.filter(a => a.id !== id);
};

export const exportAcessoriosCadastroToCSV = (data: AcessorioCadastro[], filename: string) => {
  const headers = ['ID', 'Marca', 'Categoria', 'Produto', 'Limite Mínimo'];
  const rows = data.map(a => [a.id, a.marca, a.categoria, a.produto, a.limiteMinimo.toString()]);
  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
};

// Função para buscar limite mínimo de um produto por nome/modelo
// Utilizada pelo módulo de Estoque para sincronização de alertas
export const getLimiteMinimo = (produtoOuModelo: string): number | null => {
  const termo = produtoOuModelo.toLowerCase().trim();
  
  // Buscar por produto exato ou por correspondência parcial (modelo)
  const acessorio = acessoriosCadastro.find(a => 
    a.produto.toLowerCase() === termo ||
    a.produto.toLowerCase().includes(termo) ||
    termo.includes(a.produto.toLowerCase())
  );
  
  return acessorio ? acessorio.limiteMinimo : null;
};

// Função para verificar se um produto está abaixo do limite mínimo
export const verificarEstoqueBaixo = (produtoOuModelo: string, quantidadeAtual: number): boolean => {
  const limite = getLimiteMinimo(produtoOuModelo);
  if (limite === null) return false;
  return quantidadeAtual <= limite;
};

// Função para obter todos os limites mínimos como mapa
export const getLimitesMinimosMap = (): Map<string, number> => {
  const mapa = new Map<string, number>();
  acessoriosCadastro.forEach(a => {
    mapa.set(a.produto.toLowerCase(), a.limiteMinimo);
  });
  return mapa;
};

export default function CadastrosAcessorios() {
  const { toast } = useToast();
  const [acessorios, setAcessorios] = useState(getAcessoriosCadastro());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAcessorio, setEditingAcessorio] = useState<AcessorioCadastro | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({
    marca: '',
    categoria: '',
    produto: '',
    limiteMinimo: ''
  });

  const resetForm = () => {
    setForm({ marca: '', categoria: '', produto: '', limiteMinimo: '' });
    setEditingAcessorio(null);
  };

  const handleOpenDialog = (acessorio?: AcessorioCadastro) => {
    if (acessorio) {
      setEditingAcessorio(acessorio);
      setForm({ marca: acessorio.marca, categoria: acessorio.categoria, produto: acessorio.produto, limiteMinimo: acessorio.limiteMinimo.toString() });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.marca || !form.categoria || !form.produto || !form.limiteMinimo) {
      toast({ title: 'Erro', description: 'Todos os campos são obrigatórios', variant: 'destructive' });
      return;
    }

    const limite = parseInt(form.limiteMinimo);
    if (isNaN(limite) || limite < 0) {
      toast({ title: 'Erro', description: 'Limite mínimo deve ser um número válido', variant: 'destructive' });
      return;
    }

    const dadosParaSalvar = {
      marca: form.marca,
      categoria: form.categoria,
      produto: form.produto,
      limiteMinimo: limite
    };

    if (editingAcessorio) {
      updateAcessorioCadastro(editingAcessorio.id, dadosParaSalvar);
      toast({ title: 'Sucesso', description: 'Acessório atualizado com sucesso' });
    } else {
      addAcessorioCadastro(dadosParaSalvar);
      toast({ title: 'Sucesso', description: 'Acessório cadastrado com sucesso' });
    }

    setAcessorios(getAcessoriosCadastro());
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    deleteAcessorioCadastro(id);
    setAcessorios(getAcessoriosCadastro());
    toast({ title: 'Sucesso', description: 'Acessório removido com sucesso' });
  };

  const handleExport = () => {
    exportAcessoriosCadastroToCSV(acessoriosFiltrados, 'acessorios-cadastro.csv');
  };

  const acessoriosFiltrados = acessorios.filter(a => 
    a.produto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.categoria.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <CadastrosLayout title="Cadastro de Acessórios">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-4 justify-between items-center">
          <div className="flex gap-2">
            <Input
              placeholder="Buscar acessório..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-[250px]"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Acessório
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
                <TableHead className="text-center">Limite Mín.</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {acessoriosFiltrados.map(acessorio => (
                <TableRow key={acessorio.id}>
                  <TableCell className="font-mono text-xs">{acessorio.id}</TableCell>
                  <TableCell>{acessorio.marca}</TableCell>
                  <TableCell>{acessorio.categoria}</TableCell>
                  <TableCell className="font-medium">{acessorio.produto}</TableCell>
                  <TableCell className="text-center font-semibold">{acessorio.limiteMinimo}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(acessorio)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(acessorio.id)}>
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
            <DialogTitle>{editingAcessorio ? 'Editar Acessório' : 'Novo Acessório'}</DialogTitle>
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
            <div className="space-y-2">
              <Label>Limite Mínimo *</Label>
              <Input 
                type="number" 
                min="0"
                value={form.limiteMinimo} 
                onChange={e => setForm({ ...form, limiteMinimo: e.target.value })} 
                placeholder="Ex: 5"
              />
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
