import { useState, useMemo } from 'react';
import { CadastrosLayout } from '@/components/layout/CadastrosLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Shield, Search } from 'lucide-react';
import { 
  getPlanosGarantia, 
  addPlanoGarantia, 
  updatePlanoGarantia, 
  deletePlanoGarantia, 
  PlanoGarantia,
  formatCurrency 
} from '@/utils/planosGarantiaApi';
import { getProdutosCadastro } from '@/utils/cadastrosApi';

export default function CadastrosPlanosGarantia() {
  const [planos, setPlanos] = useState<PlanoGarantia[]>(getPlanosGarantia());
  const [produtos] = useState(getProdutosCadastro());
  const [busca, setBusca] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<PlanoGarantia | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Formulário
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<'Apple' | 'Thiago Imports'>('Thiago Imports');
  const [meses, setMeses] = useState(12);
  const [valor, setValor] = useState('');
  const [modelos, setModelos] = useState<string[]>([]);
  const [descricao, setDescricao] = useState('');
  const [status, setStatus] = useState<'Ativo' | 'Inativo'>('Ativo');

  // Modelos únicos disponíveis
  const modelosDisponiveis = useMemo(() => {
    const modelosSet = new Set<string>();
    produtos.forEach(p => modelosSet.add(p.produto));
    return Array.from(modelosSet).sort();
  }, [produtos]);

  // Planos filtrados
  const planosFiltrados = useMemo(() => {
    if (!busca) return planos;
    const buscaLower = busca.toLowerCase();
    return planos.filter(p => 
      p.nome.toLowerCase().includes(buscaLower) ||
      p.tipo.toLowerCase().includes(buscaLower)
    );
  }, [planos, busca]);

  const limparFormulario = () => {
    setNome('');
    setTipo('Thiago Imports');
    setMeses(12);
    setValor('');
    setModelos([]);
    setDescricao('');
    setStatus('Ativo');
    setEditando(null);
  };

  const handleOpenModal = (plano?: PlanoGarantia) => {
    if (plano) {
      setEditando(plano);
      setNome(plano.nome);
      setTipo(plano.tipo);
      setMeses(plano.meses);
      setValor(plano.valor.toString());
      setModelos(plano.modelos);
      setDescricao(plano.descricao);
      setStatus(plano.status);
    } else {
      limparFormulario();
    }
    setShowModal(true);
  };

  const handleSalvar = () => {
    if (!nome || !tipo) {
      toast.error('Nome e tipo são obrigatórios');
      return;
    }

    const valorNum = parseFloat(valor.replace(',', '.')) || 0;

    if (editando) {
      const atualizado = updatePlanoGarantia(editando.id, {
        nome,
        tipo,
        meses,
        valor: valorNum,
        modelos,
        descricao,
        status
      });
      if (atualizado) {
        setPlanos(getPlanosGarantia());
        toast.success('Plano atualizado com sucesso!');
      }
    } else {
      addPlanoGarantia({
        nome,
        tipo,
        meses,
        valor: valorNum,
        modelos,
        descricao,
        status
      });
      setPlanos(getPlanosGarantia());
      toast.success('Plano cadastrado com sucesso!');
    }

    setShowModal(false);
    limparFormulario();
  };

  const handleDelete = (id: string) => {
    deletePlanoGarantia(id);
    setPlanos(getPlanosGarantia());
    setShowDeleteConfirm(null);
    toast.success('Plano excluído com sucesso!');
  };

  const toggleModelo = (modelo: string) => {
    if (modelos.includes(modelo)) {
      setModelos(modelos.filter(m => m !== modelo));
    } else {
      setModelos([...modelos, modelo]);
    }
  };

  return (
    <CadastrosLayout title="Planos de Garantia">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar plano..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={() => handleOpenModal()} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Plano
          </Button>
        </div>

        {/* Tabela */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Planos de Garantia ({planosFiltrados.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-center">Meses</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Modelos</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {planosFiltrados.map(plano => (
                    <TableRow key={plano.id}>
                      <TableCell className="font-mono text-sm">{plano.id}</TableCell>
                      <TableCell className="font-medium">{plano.nome}</TableCell>
                      <TableCell>
                        <Badge variant={plano.tipo === 'Apple' ? 'default' : 'secondary'}>
                          {plano.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{plano.meses}</TableCell>
                      <TableCell className="text-right font-medium">
                        {plano.valor === 0 ? (
                          <span className="text-muted-foreground">Gratuito</span>
                        ) : (
                          formatCurrency(plano.valor)
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        {plano.modelos.length === 0 ? (
                          <span className="text-muted-foreground text-sm">Todos</span>
                        ) : (
                          <span className="text-sm truncate" title={plano.modelos.join(', ')}>
                            {plano.modelos.slice(0, 2).join(', ')}
                            {plano.modelos.length > 2 && ` +${plano.modelos.length - 2}`}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={plano.status === 'Ativo' ? 'outline' : 'secondary'}>
                          {plano.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenModal(plano)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowDeleteConfirm(plano.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {planosFiltrados.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Nenhum plano encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de Cadastro/Edição */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editando ? 'Editar Plano de Garantia' : 'Novo Plano de Garantia'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nome do Plano *</Label>
                <Input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Proteção Thiago Gold"
                />
              </div>
              <div>
                <Label>Tipo *</Label>
                <Select value={tipo} onValueChange={(v) => setTipo(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Apple">Apple</SelectItem>
                    <SelectItem value="Thiago Imports">Thiago Imports</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Duração (Meses)</Label>
                <Input
                  type="number"
                  min={0}
                  max={60}
                  value={meses}
                  onChange={(e) => setMeses(parseInt(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label>Valor (R$)</Label>
                <Input
                  value={valor}
                  onChange={(e) => setValor(e.target.value.replace(/[^\d,]/g, ''))}
                  placeholder="0,00"
                />
              </div>
              <div className="col-span-2">
                <Label>Descrição</Label>
                <Textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descrição do plano..."
                  rows={2}
                />
              </div>
            </div>

            <div>
              <Label>Modelos Compatíveis (deixe vazio para todos)</Label>
              <div className="mt-2 flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 border rounded-lg">
                {modelosDisponiveis.map(modelo => (
                  <Badge
                    key={modelo}
                    variant={modelos.includes(modelo) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleModelo(modelo)}
                  >
                    {modelo}
                  </Badge>
                ))}
              </div>
              {modelos.length > 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  {modelos.length} modelo(s) selecionado(s)
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSalvar}>
              {editando ? 'Salvar' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <p>Tem certeza que deseja excluir este plano de garantia?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => showDeleteConfirm && handleDelete(showDeleteConfirm)}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CadastrosLayout>
  );
}
