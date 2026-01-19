import { useState, useEffect } from 'react';
import { CadastrosLayout } from '@/components/layout/CadastrosLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useCadastroStore } from '@/store/cadastroStore';
import { TipoLoja, LojaMockada } from '@/types/mockData';
import { exportToCSV } from '@/utils/formatUtils';
import { Plus, Pencil, Trash2, Download, Store, Warehouse, Wrench, Wallet, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const TIPOS_LOJA: TipoLoja[] = ['Loja', 'Estoque', 'Assistência', 'Financeiro', 'Administrativo'];

export default function CadastrosLojas() {
  const { toast } = useToast();
  const { 
    lojas, 
    inicializarDadosMockados, 
    adicionarLoja, 
    atualizarLoja, 
    deletarLoja,
    obterColaboradoresPorLoja
  } = useCadastroStore();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLoja, setEditingLoja] = useState<LojaMockada | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroNome, setFiltroNome] = useState('');
  
  const [form, setForm] = useState({
    nome: '',
    tipo: 'Loja' as TipoLoja,
    endereco: '',
    telefone: '',
    email: '',
    ativa: true
  });

  // Inicializar dados ao carregar
  useEffect(() => {
    inicializarDadosMockados();
  }, [inicializarDadosMockados]);

  const resetForm = () => {
    setForm({
      nome: '',
      tipo: 'Loja',
      endereco: '',
      telefone: '',
      email: '',
      ativa: true
    });
    setEditingLoja(null);
  };

  const handleOpenDialog = (loja?: LojaMockada) => {
    if (loja) {
      setEditingLoja(loja);
      setForm({
        nome: loja.nome,
        tipo: loja.tipo,
        endereco: loja.endereco,
        telefone: loja.telefone,
        email: loja.email,
        ativa: loja.ativa
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.nome) {
      toast({ title: 'Erro', description: 'Nome é obrigatório', variant: 'destructive' });
      return;
    }

    if (editingLoja) {
      atualizarLoja(editingLoja.id, form);
      toast({ title: 'Sucesso', description: 'Loja atualizada com sucesso' });
    } else {
      adicionarLoja(form);
      toast({ title: 'Sucesso', description: 'Loja cadastrada com sucesso' });
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    const colaboradores = obterColaboradoresPorLoja(id);
    if (colaboradores.length > 0) {
      toast({ 
        title: 'Ação não permitida', 
        description: `Esta loja possui ${colaboradores.length} colaborador(es) vinculado(s)`, 
        variant: 'destructive' 
      });
      return;
    }
    
    deletarLoja(id);
    toast({ title: 'Sucesso', description: 'Loja removida com sucesso' });
  };

  const handleExport = () => {
    const dadosExport = lojasFiltradas.map(loja => ({
      ID: loja.id,
      Nome: loja.nome,
      Tipo: loja.tipo,
      Endereço: loja.endereco,
      Telefone: loja.telefone,
      Email: loja.email,
      Status: loja.ativa ? 'Ativa' : 'Inativa',
      'Data Criação': loja.data_criacao
    }));
    exportToCSV(dadosExport, 'lojas.csv');
  };

  const lojasFiltradas = lojas.filter(loja => {
    if (filtroTipo !== 'todos' && loja.tipo !== filtroTipo) return false;
    if (filtroNome && !loja.nome.toLowerCase().includes(filtroNome.toLowerCase())) return false;
    return true;
  });

  const getTipoIcon = (tipo: TipoLoja) => {
    switch (tipo) {
      case 'Loja': return <Store className="h-4 w-4" />;
      case 'Estoque': return <Warehouse className="h-4 w-4" />;
      case 'Assistência': return <Wrench className="h-4 w-4" />;
      case 'Financeiro': return <Wallet className="h-4 w-4" />;
      case 'Administrativo': return <Building2 className="h-4 w-4" />;
    }
  };

  const getTipoBadgeClass = (tipo: TipoLoja) => {
    switch (tipo) {
      case 'Loja': return 'bg-green-500/10 text-green-600 border-green-500/30';
      case 'Estoque': return 'bg-blue-500/10 text-blue-600 border-blue-500/30';
      case 'Assistência': return 'bg-orange-500/10 text-orange-600 border-orange-500/30';
      case 'Financeiro': return 'bg-purple-500/10 text-purple-600 border-purple-500/30';
      case 'Administrativo': return 'bg-gray-500/10 text-gray-600 border-gray-500/30';
    }
  };

  return (
    <CadastrosLayout title="Cadastro de Lojas">
      <div className="space-y-4">
        {/* Filtros e Ações */}
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div className="flex gap-2 flex-wrap">
            <Input 
              placeholder="Buscar por nome..." 
              value={filtroNome}
              onChange={(e) => setFiltroNome(e.target.value)}
              className="w-60"
            />
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Tipos</SelectItem>
                {TIPOS_LOJA.map(tipo => (
                  <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Loja
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
        </div>

        {/* Contadores por tipo */}
        <div className="flex flex-wrap gap-2">
          {TIPOS_LOJA.map(tipo => {
            const count = lojas.filter(l => l.tipo === tipo).length;
            return (
              <Badge 
                key={tipo} 
                variant="outline" 
                className={`${getTipoBadgeClass(tipo)} cursor-pointer`}
                onClick={() => setFiltroTipo(tipo === filtroTipo ? 'todos' : tipo)}
              >
                {getTipoIcon(tipo)}
                <span className="ml-1">{tipo}: {count}</span>
              </Badge>
            );
          })}
          <Badge variant="outline" className="bg-muted">
            Total: {lojas.length}
          </Badge>
        </div>

        {/* Tabela */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Colaboradores</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lojasFiltradas.map(loja => {
                const colaboradores = obterColaboradoresPorLoja(loja.id);
                
                return (
                  <TableRow key={loja.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {getTipoIcon(loja.tipo)}
                        {loja.nome}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getTipoBadgeClass(loja.tipo)}>
                        {loja.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell>{loja.telefone || '-'}</TableCell>
                    <TableCell className="text-xs">{loja.email || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{colaboradores.length}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={loja.ativa ? 'default' : 'secondary'}>
                        {loja.ativa ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(loja)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(loja.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {lojasFiltradas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhuma loja encontrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Dialog de Cadastro/Edição */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingLoja ? 'Editar Loja' : 'Nova Loja'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Nome da Loja *</Label>
              <Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select value={form.tipo} onValueChange={v => setForm({ ...form, tipo: v as TipoLoja })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS_LOJA.map(tipo => (
                    <SelectItem key={tipo} value={tipo}>
                      <div className="flex items-center gap-2">
                        {getTipoIcon(tipo)}
                        {tipo}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Endereço</Label>
              <Input value={form.endereco} onChange={e => setForm({ ...form, endereco: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.ativa ? 'ativa' : 'inativa'} onValueChange={v => setForm({ ...form, ativa: v === 'ativa' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativa">Ativa</SelectItem>
                  <SelectItem value="inativa">Inativa</SelectItem>
                </SelectContent>
              </Select>
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
