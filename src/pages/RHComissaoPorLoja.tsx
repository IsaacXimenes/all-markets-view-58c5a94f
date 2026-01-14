import { useState, useEffect, useMemo } from 'react';
import { RHLayout } from '@/components/layout/RHLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Store, Percent, Plus, Pencil, Trash2, History } from 'lucide-react';
import { format } from 'date-fns';
import { 
  getComissoesPorLoja, 
  addComissaoPorLoja, 
  updateComissaoPorLoja, 
  deleteComissaoPorLoja,
  getHistoricoComissaoPorLoja,
  ComissaoPorLoja,
  HistoricoComissaoPorLoja
} from '@/utils/comissaoPorLojaApi';
import { getLojas, getCargos, getLojaById, getCargoNome } from '@/utils/cadastrosApi';

export default function RHComissaoPorLoja() {
  const [comissoes, setComissoes] = useState<ComissaoPorLoja[]>([]);
  const [lojas] = useState(() => getLojas().filter(l => l.status === 'Ativo'));
  const [cargos] = useState(() => getCargos());
  
  // Modal de criação/edição
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    lojaId: '',
    cargoId: '',
    percentualComissao: ''
  });
  
  // Modal de histórico
  const [showHistoricoModal, setShowHistoricoModal] = useState(false);
  const [historicoSelecionado, setHistoricoSelecionado] = useState<HistoricoComissaoPorLoja[]>([]);
  const [comissaoSelecionada, setComissaoSelecionada] = useState<{ loja: string; cargo: string } | null>(null);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = () => {
    setComissoes(getComissoesPorLoja());
  };

  const resetForm = () => {
    setForm({ lojaId: '', cargoId: '', percentualComissao: '' });
    setEditingId(null);
  };

  const handleOpenDialog = (comissao?: ComissaoPorLoja) => {
    if (comissao) {
      setEditingId(comissao.id);
      setForm({
        lojaId: comissao.lojaId,
        cargoId: comissao.cargoId,
        percentualComissao: comissao.percentualComissao.toString()
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    // Validações
    if (!form.lojaId) {
      toast.error('Selecione uma loja');
      return;
    }
    if (!form.cargoId) {
      toast.error('Selecione um cargo');
      return;
    }
    
    const percentual = parseFloat(form.percentualComissao.replace(',', '.'));
    if (isNaN(percentual) || percentual < 0 || percentual > 100) {
      toast.error('Comissão deve ser um valor entre 0 e 100');
      return;
    }

    try {
      if (editingId) {
        updateComissaoPorLoja(editingId, percentual, 'GESTOR-001', 'Gestor RH');
        toast.success('Comissão atualizada com sucesso');
      } else {
        addComissaoPorLoja(form.lojaId, form.cargoId, percentual, 'GESTOR-001', 'Gestor RH');
        toast.success('Comissão cadastrada com sucesso');
      }
      
      carregarDados();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      }
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta comissão?')) {
      deleteComissaoPorLoja(id, 'GESTOR-001', 'Gestor RH');
      toast.success('Comissão excluída com sucesso');
      carregarDados();
    }
  };

  const handleVerHistorico = (comissao: ComissaoPorLoja) => {
    const historico = getHistoricoComissaoPorLoja(comissao.id);
    setHistoricoSelecionado(historico);
    setComissaoSelecionada({
      loja: getLojaById(comissao.lojaId)?.nome || comissao.lojaId,
      cargo: getCargoNome(comissao.cargoId)
    });
    setShowHistoricoModal(true);
  };

  // Estatísticas
  const totalComissoes = comissoes.length;
  const mediaComissao = comissoes.length > 0 
    ? comissoes.reduce((acc, c) => acc + c.percentualComissao, 0) / comissoes.length 
    : 0;

  return (
    <RHLayout title="Comissão por Loja">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Store className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Comissões</p>
                <p className="text-2xl font-bold">{totalComissoes}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Percent className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Média Comissão</p>
                <p className="text-2xl font-bold">{mediaComissao.toFixed(2)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Store className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Lojas Configuradas</p>
                <p className="text-2xl font-bold">
                  {new Set(comissoes.map(c => c.lojaId)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Comissões */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5" />
              Comissões por Loja e Cargo
            </CardTitle>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Comissão por Loja
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Loja</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead className="text-center">Comissão</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comissoes.map((comissao) => {
                  const loja = getLojaById(comissao.lojaId);
                  const cargoNome = getCargoNome(comissao.cargoId);
                  
                  return (
                    <TableRow key={comissao.id}>
                      <TableCell className="font-mono text-xs">{comissao.id}</TableCell>
                      <TableCell className="font-medium">{loja?.nome || comissao.lojaId}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{cargoNome}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-semibold text-green-600">
                          {comissao.percentualComissao.toFixed(2)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenDialog(comissao)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleVerHistorico(comissao)}
                          >
                            <History className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(comissao.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {comissoes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhuma comissão por loja cadastrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Criação/Edição */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Editar Comissão por Loja' : 'Nova Comissão por Loja'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Loja *</Label>
              <Select 
                value={form.lojaId} 
                onValueChange={v => setForm({ ...form, lojaId: v })}
                disabled={!!editingId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma loja" />
                </SelectTrigger>
                <SelectContent>
                  {lojas.map(loja => (
                    <SelectItem key={loja.id} value={loja.id}>
                      {loja.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Cargo *</Label>
              <Select 
                value={form.cargoId} 
                onValueChange={v => setForm({ ...form, cargoId: v })}
                disabled={!!editingId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cargo" />
                </SelectTrigger>
                <SelectContent>
                  {cargos.map(cargo => (
                    <SelectItem key={cargo.id} value={cargo.id}>
                      {cargo.funcao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Comissão (%) *</Label>
              <div className="relative">
                <Input
                  type="text"
                  value={form.percentualComissao}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^\d.,]/g, '');
                    setForm({ ...form, percentualComissao: value });
                  }}
                  placeholder="Ex: 3.5"
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  %
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Digite um valor entre 0 e 100, com até 2 casas decimais
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingId ? 'Salvar Alterações' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Histórico */}
      <Dialog open={showHistoricoModal} onOpenChange={setShowHistoricoModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico de Alterações - {comissaoSelecionada?.loja} ({comissaoSelecionada?.cargo})
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            {historicoSelecionado.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma alteração registrada.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead className="text-right">Comissão Anterior</TableHead>
                    <TableHead className="text-right">Comissão Nova</TableHead>
                    <TableHead className="text-center">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historicoSelecionado.map((registro) => (
                    <TableRow key={registro.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(registro.createdAt), 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                      <TableCell>{registro.usuarioNome}</TableCell>
                      <TableCell className="text-right">
                        {registro.percentualAnterior !== null 
                          ? `${registro.percentualAnterior.toFixed(2)}%` 
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {registro.percentualNovo.toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={
                          registro.tipoAcao === 'Criação' ? 'default' :
                          registro.tipoAcao === 'Edição' ? 'secondary' : 'destructive'
                        }>
                          {registro.tipoAcao}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </RHLayout>
  );
}
