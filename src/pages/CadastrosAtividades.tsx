import { useState } from 'react';
import { CadastrosLayout } from '@/components/layout/CadastrosLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, Edit, Plus, Trash2, ListChecks } from 'lucide-react';
import { getAtividades, addAtividade, updateAtividade, deleteAtividade, AtividadeCadastro } from '@/utils/atividadesGestoresApi';
import { useCadastroStore } from '@/store/cadastroStore';
import { exportToCSV } from '@/utils/formatUtils';
import { toast } from 'sonner';

export default function CadastrosAtividades() {
  const [atividades, setAtividades] = useState(getAtividades());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AtividadeCadastro | null>(null);
  const { lojas } = useCadastroStore();
  const lojasAtivas = lojas.filter(l => l.ativa);

  const [form, setForm] = useState({
    nome: '',
    tipoHorario: 'fixo' as 'fixo' | 'aberto',
    horarioPrevisto: '',
    pontuacaoBase: 1,
    lojasAtribuidas: 'todas' as string[] | 'todas',
    ativa: true,
  });

  const resetForm = () => {
    setForm({ nome: '', tipoHorario: 'fixo', horarioPrevisto: '', pontuacaoBase: 1, lojasAtribuidas: 'todas', ativa: true });
    setEditing(null);
  };

  const handleOpenDialog = (atv?: AtividadeCadastro) => {
    if (atv) {
      setEditing(atv);
      setForm({
        nome: atv.nome,
        tipoHorario: atv.tipoHorario,
        horarioPrevisto: atv.horarioPrevisto || '',
        pontuacaoBase: atv.pontuacaoBase,
        lojasAtribuidas: atv.lojasAtribuidas,
        ativa: atv.ativa,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.nome) {
      toast.error('Preencha o nome da atividade');
      return;
    }
    if (form.tipoHorario === 'fixo' && !form.horarioPrevisto) {
      toast.error('Informe o horário previsto para atividades de horário fixo');
      return;
    }

    if (editing) {
      updateAtividade(editing.id, {
        nome: form.nome,
        tipoHorario: form.tipoHorario,
        horarioPrevisto: form.tipoHorario === 'fixo' ? form.horarioPrevisto : undefined,
        pontuacaoBase: form.pontuacaoBase,
        lojasAtribuidas: form.lojasAtribuidas,
        ativa: form.ativa,
      });
      toast.success('Atividade atualizada!');
    } else {
      addAtividade({
        nome: form.nome,
        tipoHorario: form.tipoHorario,
        horarioPrevisto: form.tipoHorario === 'fixo' ? form.horarioPrevisto : undefined,
        pontuacaoBase: form.pontuacaoBase,
        lojasAtribuidas: form.lojasAtribuidas,
        ativa: form.ativa,
      });
      toast.success('Atividade criada!');
    }

    setAtividades(getAtividades());
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta atividade?')) {
      deleteAtividade(id);
      setAtividades(getAtividades());
      toast.success('Atividade excluída!');
    }
  };

  const handleExport = () => {
    const data = atividades.map(a => ({
      ID: a.id,
      Nome: a.nome,
      'Tipo Horário': a.tipoHorario === 'fixo' ? 'Fixo' : 'Aberto',
      'Horário Previsto': a.horarioPrevisto || '-',
      'Pontuação Base': a.pontuacaoBase,
      'Lojas': a.lojasAtribuidas === 'todas' ? 'Todas' : (a.lojasAtribuidas as string[]).length + ' lojas',
      Status: a.ativa ? 'Ativa' : 'Inativa',
    }));
    exportToCSV(data, `atividades-gestores-${new Date().toISOString().split('T')[0]}.csv`);
    toast.success('Exportado!');
  };

  const toggleLojaAtribuida = (lojaId: string) => {
    if (form.lojasAtribuidas === 'todas') {
      setForm({ ...form, lojasAtribuidas: [lojaId] });
    } else {
      const lojasList = form.lojasAtribuidas as string[];
      if (lojasList.includes(lojaId)) {
        const newList = lojasList.filter(l => l !== lojaId);
        setForm({ ...form, lojasAtribuidas: newList.length === 0 ? 'todas' : newList });
      } else {
        setForm({ ...form, lojasAtribuidas: [...lojasList, lojaId] });
      }
    }
  };

  const getLojasLabel = (lojasAtribuidas: string[] | 'todas') => {
    if (lojasAtribuidas === 'todas') return 'Todas';
    return `${lojasAtribuidas.length} loja(s)`;
  };

  return (
    <CadastrosLayout title="Cadastro de Atividades - Gestores">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5" />
              Atividades Cadastradas
            </CardTitle>
            <div className="flex gap-2">
              <Button onClick={handleExport} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => handleOpenDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Atividade
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{editing ? 'Editar Atividade' : 'Nova Atividade'}</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4">
                    <div>
                      <Label>Nome da Atividade *</Label>
                      <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Abertura de Caixa" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Tipo de Horário *</Label>
                        <Select value={form.tipoHorario} onValueChange={(v) => setForm({ ...form, tipoHorario: v as 'fixo' | 'aberto' })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fixo">Fixo</SelectItem>
                            <SelectItem value="aberto">Aberto</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {form.tipoHorario === 'fixo' && (
                        <div>
                          <Label>Horário Previsto *</Label>
                          <Input type="time" value={form.horarioPrevisto} onChange={(e) => setForm({ ...form, horarioPrevisto: e.target.value })} />
                        </div>
                      )}
                    </div>
                    <div>
                      <Label>Pontuação Base</Label>
                      <Input type="number" min={0.5} step={0.5} value={form.pontuacaoBase} onChange={(e) => setForm({ ...form, pontuacaoBase: Number(e.target.value) })} />
                    </div>
                    <div>
                      <Label>Lojas Atribuídas</Label>
                      <div className="flex items-center gap-2 mb-2">
                        <Checkbox
                          checked={form.lojasAtribuidas === 'todas'}
                          onCheckedChange={(checked) => setForm({ ...form, lojasAtribuidas: checked ? 'todas' : [] })}
                        />
                        <span className="text-sm">Todas as lojas</span>
                      </div>
                      {form.lojasAtribuidas !== 'todas' && (
                        <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded p-2">
                          {lojasAtivas.map(loja => (
                            <div key={loja.id} className="flex items-center gap-2">
                              <Checkbox
                                checked={(form.lojasAtribuidas as string[]).includes(loja.id)}
                                onCheckedChange={() => toggleLojaAtribuida(loja.id)}
                              />
                              <span className="text-sm">{loja.nome}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={form.ativa} onCheckedChange={(checked) => setForm({ ...form, ativa: !!checked })} />
                      <Label>Atividade Ativa</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSave}>Salvar</Button>
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
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo Horário</TableHead>
                  <TableHead>Horário Previsto</TableHead>
                  <TableHead>Pontuação</TableHead>
                  <TableHead>Lojas</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {atividades.map(atv => (
                  <TableRow key={atv.id}>
                    <TableCell className="font-medium">{atv.nome}</TableCell>
                    <TableCell>
                      <Badge variant={atv.tipoHorario === 'fixo' ? 'default' : 'secondary'}>
                        {atv.tipoHorario === 'fixo' ? 'Fixo' : 'Aberto'}
                      </Badge>
                    </TableCell>
                    <TableCell>{atv.horarioPrevisto || '-'}</TableCell>
                    <TableCell>{atv.pontuacaoBase}</TableCell>
                    <TableCell>{getLojasLabel(atv.lojasAtribuidas)}</TableCell>
                    <TableCell>
                      <Badge variant={atv.ativa ? 'default' : 'secondary'}>
                        {atv.ativa ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => handleOpenDialog(atv)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(atv.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {atividades.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">Nenhuma atividade cadastrada.</div>
          )}
        </CardContent>
      </Card>
    </CadastrosLayout>
  );
}
