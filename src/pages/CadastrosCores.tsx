import { useState } from 'react';
import { CadastrosLayout } from '@/components/layout/CadastrosLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Download, Edit, Plus, Trash2, Palette } from 'lucide-react';
import { getCores, addCor, updateCor, deleteCor, isValidHex, CorAparelho } from '@/utils/coresApi';
import { exportToCSV } from '@/utils/formatUtils';
import { toast } from 'sonner';

export default function CadastrosCores() {
  const [cores, setCores] = useState(getCores());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCor, setEditingCor] = useState<CorAparelho | null>(null);

  const [form, setForm] = useState({
    nome: '',
    hexadecimal: '#000000'
  });

  const resetForm = () => {
    setForm({
      nome: '',
      hexadecimal: '#000000'
    });
    setEditingCor(null);
  };

  const handleOpenDialog = (cor?: CorAparelho) => {
    if (cor) {
      setEditingCor(cor);
      setForm({
        nome: cor.nome,
        hexadecimal: cor.hexadecimal
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.nome || !form.hexadecimal) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (!isValidHex(form.hexadecimal)) {
      toast.error('Código hexadecimal inválido. Use o formato #RRGGBB');
      return;
    }

    if (editingCor) {
      updateCor(editingCor.id, { nome: form.nome, hexadecimal: form.hexadecimal });
      toast.success('Cor atualizada com sucesso!');
    } else {
      const novaCor = addCor({ nome: form.nome, hexadecimal: form.hexadecimal, status: 'Ativo' });
      toast.success(`Cor criada: ${novaCor.id}`);
    }

    setCores(getCores());
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta cor?')) {
      deleteCor(id);
      setCores(getCores());
      toast.success('Cor excluída com sucesso!');
    }
  };

  const handleExport = () => {
    const data = cores.map(c => ({
      ID: c.id,
      Nome: c.nome,
      'Código Hexadecimal': c.hexadecimal,
      Status: c.status
    }));
    exportToCSV(data, `cores-aparelhos-${new Date().toISOString().split('T')[0]}.csv`);
    toast.success('Cores exportadas com sucesso!');
  };

  return (
    <CadastrosLayout title="Cadastro de Cores - Aparelhos">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Cores Cadastradas
            </CardTitle>
            <div className="flex gap-2">
              <Button onClick={handleExport} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => handleOpenDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Cor
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {editingCor ? 'Editar Cor' : 'Nova Cor'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4">
                    <div>
                      <Label>Nome da Cor *</Label>
                      <Input
                        value={form.nome}
                        onChange={(e) => setForm({ ...form, nome: e.target.value })}
                        placeholder="Ex: Azul Pacífico"
                      />
                    </div>
                    <div>
                      <Label>Código Hexadecimal *</Label>
                      <div className="flex gap-2 items-center">
                        <Input
                          value={form.hexadecimal}
                          onChange={(e) => setForm({ ...form, hexadecimal: e.target.value.toUpperCase() })}
                          placeholder="#RRGGBB"
                          maxLength={7}
                        />
                        <input
                          type="color"
                          value={form.hexadecimal}
                          onChange={(e) => setForm({ ...form, hexadecimal: e.target.value.toUpperCase() })}
                          className="w-12 h-10 p-1 rounded border border-input cursor-pointer"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Preview</Label>
                      <div 
                        className="w-full h-16 rounded border border-input flex items-center justify-center text-sm font-medium"
                        style={{ 
                          backgroundColor: isValidHex(form.hexadecimal) ? form.hexadecimal : '#ccc',
                          color: isValidHex(form.hexadecimal) && 
                            parseInt(form.hexadecimal.replace('#', ''), 16) < 0x808080 ? '#fff' : '#000'
                        }}
                      >
                        {form.nome || 'Preview da Cor'}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSave}>
                      Salvar Cor
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Preview</TableHead>
                  <TableHead>Nome da Cor</TableHead>
                  <TableHead>Código Hexadecimal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cores.map((cor) => (
                  <TableRow key={cor.id}>
                    <TableCell className="font-mono text-xs">{cor.id}</TableCell>
                    <TableCell>
                      <div 
                        className="w-10 h-10 rounded border border-input shadow-sm"
                        style={{ backgroundColor: cor.hexadecimal }}
                        title={cor.hexadecimal}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{cor.nome}</TableCell>
                    <TableCell className="font-mono text-sm">{cor.hexadecimal}</TableCell>
                    <TableCell>
                      <Badge variant={cor.status === 'Ativo' ? 'default' : 'secondary'}>
                        {cor.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => handleOpenDialog(cor)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(cor.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {cores.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma cor cadastrada.
            </div>
          )}
        </CardContent>
      </Card>
    </CadastrosLayout>
  );
}
