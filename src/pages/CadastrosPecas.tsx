import { useState } from 'react';
import { CadastrosLayout } from '@/components/layout/CadastrosLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export interface PecaCadastro {
  id: string;
  marca: string;
  categoria: string;
  produto: string;
}

// Mock data
let pecasCadastro: PecaCadastro[] = [
  { id: 'PC-001', marca: 'Apple', categoria: 'Tela', produto: 'Tela LCD iPhone 14 Pro Max' },
  { id: 'PC-002', marca: 'Samsung', categoria: 'Bateria', produto: 'Bateria Galaxy S23 Ultra' },
  { id: 'PC-003', marca: 'Apple', categoria: 'Conector', produto: 'Conector de Carga iPhone 13' },
  { id: 'PC-004', marca: 'Motorola', categoria: 'Tela', produto: 'Tela LCD Moto G54' },
  { id: 'PC-005', marca: 'Xiaomi', categoria: 'Bateria', produto: 'Bateria Redmi Note 12' },
];

let nextId = 6;

export const getPecasCadastro = () => [...pecasCadastro];

export const addPecaCadastro = (data: Omit<PecaCadastro, 'id'>) => {
  const nova: PecaCadastro = { ...data, id: `PC-${String(nextId++).padStart(3, '0')}` };
  pecasCadastro.push(nova);
  return nova;
};

export const updatePecaCadastro = (id: string, data: Partial<PecaCadastro>) => {
  const index = pecasCadastro.findIndex(p => p.id === id);
  if (index !== -1) pecasCadastro[index] = { ...pecasCadastro[index], ...data };
};

export const deletePecaCadastro = (id: string) => {
  pecasCadastro = pecasCadastro.filter(p => p.id !== id);
};

export const exportPecasCadastroToCSV = (data: PecaCadastro[], filename: string) => {
  const headers = ['ID', 'Marca', 'Categoria', 'Produto'];
  const rows = data.map(p => [p.id, p.marca, p.categoria, p.produto]);
  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
};

export default function CadastrosPecas() {
  const { toast } = useToast();
  const [pecas, setPecas] = useState(getPecasCadastro());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPeca, setEditingPeca] = useState<PecaCadastro | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({
    marca: '',
    categoria: '',
    produto: ''
  });

  const resetForm = () => {
    setForm({ marca: '', categoria: '', produto: '' });
    setEditingPeca(null);
  };

  const handleOpenDialog = (peca?: PecaCadastro) => {
    if (peca) {
      setEditingPeca(peca);
      setForm({ marca: peca.marca, categoria: peca.categoria, produto: peca.produto });
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

    if (editingPeca) {
      updatePecaCadastro(editingPeca.id, form);
      toast({ title: 'Sucesso', description: 'Peça atualizada com sucesso' });
    } else {
      addPecaCadastro(form);
      toast({ title: 'Sucesso', description: 'Peça cadastrada com sucesso' });
    }

    setPecas(getPecasCadastro());
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    deletePecaCadastro(id);
    setPecas(getPecasCadastro());
    toast({ title: 'Sucesso', description: 'Peça removida com sucesso' });
  };

  const handleExport = () => {
    exportPecasCadastroToCSV(pecasFiltradas, 'pecas-cadastro.csv');
  };

  const pecasFiltradas = pecas.filter(p => 
    p.produto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.categoria.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <CadastrosLayout title="Cadastro de Peças">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-4 justify-between items-center">
          <div className="flex gap-2">
            <Input
              placeholder="Buscar peça..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-[250px]"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Peça
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
              {pecasFiltradas.map(peca => (
                <TableRow key={peca.id}>
                  <TableCell className="font-mono text-xs">{peca.id}</TableCell>
                  <TableCell>{peca.marca}</TableCell>
                  <TableCell>{peca.categoria}</TableCell>
                  <TableCell className="font-medium">{peca.produto}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(peca)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(peca.id)}>
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
            <DialogTitle>{editingPeca ? 'Editar Peça' : 'Nova Peça'}</DialogTitle>
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
