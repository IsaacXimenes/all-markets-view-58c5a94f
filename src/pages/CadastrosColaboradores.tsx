import { useState, useEffect } from 'react';
import { CadastrosLayout } from '@/components/layout/CadastrosLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useCadastroStore } from '@/store/cadastroStore';
import { ColaboradorMockado } from '@/types/mockData';
import { exportToCSV, formatCurrency } from '@/utils/formatUtils';
import { Plus, Pencil, Trash2, Download, User, Users, Shield, Package, Wrench, Bike } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const CARGOS = [
  'Gestor (a)',
  'Gestor (a) Geral',
  'Vendedor (a)',
  'Estoquista',
  'Técnico',
  'Motoboy',
  'Assistente Administrativo',
  'Socio Administrador'
];

export default function CadastrosColaboradores() {
  const { toast } = useToast();
  const { 
    colaboradores,
    lojas,
    inicializarDadosMockados, 
    adicionarColaborador, 
    atualizarColaborador, 
    deletarColaborador,
    obterNomeLoja
  } = useCadastroStore();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingColaborador, setEditingColaborador] = useState<ColaboradorMockado | null>(null);
  const [filtroLoja, setFiltroLoja] = useState<string>('todos');
  const [filtroCargo, setFiltroCargo] = useState<string>('todos');
  const [filtroNome, setFiltroNome] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('ativos');
  
  const [form, setForm] = useState({
    nome: '',
    cpf: '',
    email: '',
    telefone: '',
    loja_id: '',
    cargo: '',
    data_admissao: '',
    salario_fixo: 0,
    ajuda_custo: 0,
    comissao: 0,
    eh_gestor: false,
    eh_vendedor: false,
    eh_estoquista: false,
    ativo: true
  });

  // Inicializar dados ao carregar
  useEffect(() => {
    inicializarDadosMockados();
  }, [inicializarDadosMockados]);

  const resetForm = () => {
    setForm({
      nome: '',
      cpf: '',
      email: '',
      telefone: '',
      loja_id: '',
      cargo: '',
      data_admissao: '',
      salario_fixo: 0,
      ajuda_custo: 0,
      comissao: 0,
      eh_gestor: false,
      eh_vendedor: false,
      eh_estoquista: false,
      ativo: true
    });
    setEditingColaborador(null);
  };

  const handleOpenDialog = (colaborador?: ColaboradorMockado) => {
    if (colaborador) {
      setEditingColaborador(colaborador);
      setForm({
        nome: colaborador.nome,
        cpf: colaborador.cpf,
        email: colaborador.email,
        telefone: colaborador.telefone,
        loja_id: colaborador.loja_id,
        cargo: colaborador.cargo,
        data_admissao: colaborador.data_admissao,
        salario_fixo: colaborador.salario_fixo,
        ajuda_custo: colaborador.ajuda_custo,
        comissao: colaborador.comissao,
        eh_gestor: colaborador.eh_gestor,
        eh_vendedor: colaborador.eh_vendedor,
        eh_estoquista: colaborador.eh_estoquista,
        ativo: colaborador.ativo
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.nome || !form.loja_id || !form.cargo) {
      toast({ title: 'Erro', description: 'Nome, Loja e Cargo são obrigatórios', variant: 'destructive' });
      return;
    }

    if (editingColaborador) {
      atualizarColaborador(editingColaborador.id, form);
      toast({ title: 'Sucesso', description: 'Colaborador atualizado com sucesso' });
    } else {
      adicionarColaborador(form);
      toast({ title: 'Sucesso', description: 'Colaborador cadastrado com sucesso' });
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    deletarColaborador(id);
    toast({ title: 'Sucesso', description: 'Colaborador removido com sucesso' });
  };

  const handleExport = () => {
    const dadosExport = colaboradoresFiltrados.map(col => ({
      ID: col.id,
      Nome: col.nome,
      CPF: col.cpf,
      Email: col.email,
      Telefone: col.telefone,
      Loja: obterNomeLoja(col.loja_id),
      Cargo: col.cargo,
      'Data Admissão': col.data_admissao,
      'Salário Fixo': col.salario_fixo,
      'Ajuda de Custo': col.ajuda_custo,
      Comissão: col.comissao,
      'É Gestor': col.eh_gestor ? 'Sim' : 'Não',
      'É Vendedor': col.eh_vendedor ? 'Sim' : 'Não',
      'É Estoquista': col.eh_estoquista ? 'Sim' : 'Não',
      Status: col.ativo ? 'Ativo' : 'Inativo'
    }));
    exportToCSV(dadosExport, 'colaboradores.csv');
  };

  // Atualizar flags baseado no cargo
  const handleCargoChange = (cargo: string) => {
    const cargoLower = cargo.toLowerCase();
    setForm({ 
      ...form, 
      cargo,
      eh_gestor: cargoLower.includes('gestor') || cargoLower.includes('soci'),
      eh_vendedor: cargoLower.includes('vendedor'),
      eh_estoquista: cargoLower.includes('estoquista')
    });
  };

  // Ordem de hierarquia dos cargos
  const ordemHierarquia: Record<string, number> = {
    'Socio Administrador': 1,
    'Gestor (a) Geral': 2,
    'Gestor (a)': 3,
    'Assistente Administrativo': 4,
    'Vendedor (a)': 5,
    'Estoquista': 6,
    'Técnico': 7,
    'Motoboy': 8
  };

  const colaboradoresFiltrados = colaboradores
    .filter(col => {
      if (filtroStatus === 'ativos' && !col.ativo) return false;
      if (filtroStatus === 'inativos' && col.ativo) return false;
      if (filtroLoja !== 'todos' && col.loja_id !== filtroLoja) return false;
      if (filtroCargo !== 'todos' && col.cargo !== filtroCargo) return false;
      if (filtroNome && !col.nome.toLowerCase().includes(filtroNome.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      const ordemA = ordemHierarquia[a.cargo] || 99;
      const ordemB = ordemHierarquia[b.cargo] || 99;
      if (ordemA !== ordemB) return ordemA - ordemB;
      return a.nome.localeCompare(b.nome);
    });

  const getCargoBadgeClass = (cargo: string) => {
    const cargoLower = cargo.toLowerCase();
    if (cargoLower.includes('gestor') || cargoLower.includes('soci')) return 'bg-purple-500/10 text-purple-600 border-purple-500/30';
    if (cargoLower.includes('vendedor')) return 'bg-green-500/10 text-green-600 border-green-500/30';
    if (cargoLower.includes('estoquista')) return 'bg-blue-500/10 text-blue-600 border-blue-500/30';
    if (cargoLower.includes('técnico')) return 'bg-orange-500/10 text-orange-600 border-orange-500/30';
    if (cargoLower.includes('motoboy')) return 'bg-cyan-500/10 text-cyan-600 border-cyan-500/30';
    return 'bg-gray-500/10 text-gray-600 border-gray-500/30';
  };

  const getCargoIcon = (cargo: string) => {
    const cargoLower = cargo.toLowerCase();
    if (cargoLower.includes('gestor') || cargoLower.includes('soci')) return <Shield className="h-4 w-4" />;
    if (cargoLower.includes('vendedor')) return <User className="h-4 w-4" />;
    if (cargoLower.includes('estoquista')) return <Package className="h-4 w-4" />;
    if (cargoLower.includes('técnico')) return <Wrench className="h-4 w-4" />;
    if (cargoLower.includes('motoboy')) return <Bike className="h-4 w-4" />;
    return <Users className="h-4 w-4" />;
  };

  const formatarCPF = (cpf: string): string => {
    if (!cpf) return '-';
    const cpfLimpo = cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11 || cpfLimpo === '00000000000') return '-';
    return cpfLimpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  // Contadores
  const contadores = {
    gestores: colaboradores.filter(c => c.eh_gestor && c.ativo).length,
    vendedores: colaboradores.filter(c => c.eh_vendedor && c.ativo).length,
    estoquistas: colaboradores.filter(c => c.eh_estoquista && c.ativo).length,
    tecnicos: colaboradores.filter(c => c.cargo.toLowerCase().includes('técnico') && c.ativo).length,
    motoboys: colaboradores.filter(c => c.cargo.toLowerCase().includes('motoboy') && c.ativo).length,
    total: colaboradores.filter(c => c.ativo).length
  };

  return (
    <CadastrosLayout title="Cadastro de Colaboradores">
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
            <Select value={filtroLoja} onValueChange={setFiltroLoja}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Loja" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as Lojas</SelectItem>
                {lojas.filter(l => l.ativa).map(loja => (
                  <SelectItem key={loja.id} value={loja.id}>{loja.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filtroCargo} onValueChange={setFiltroCargo}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Cargo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Cargos</SelectItem>
                {CARGOS.map(cargo => (
                  <SelectItem key={cargo} value={cargo}>{cargo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativos">Ativos</SelectItem>
                <SelectItem value="inativos">Inativos</SelectItem>
                <SelectItem value="todos">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Colaborador
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
        </div>

        {/* Contadores */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/30">
            <Shield className="h-3 w-3 mr-1" /> Gestores: {contadores.gestores}
          </Badge>
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
            <User className="h-3 w-3 mr-1" /> Vendedores: {contadores.vendedores}
          </Badge>
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
            <Package className="h-3 w-3 mr-1" /> Estoquistas: {contadores.estoquistas}
          </Badge>
          <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30">
            <Wrench className="h-3 w-3 mr-1" /> Técnicos: {contadores.tecnicos}
          </Badge>
          <Badge variant="outline" className="bg-cyan-500/10 text-cyan-600 border-cyan-500/30">
            <Bike className="h-3 w-3 mr-1" /> Motoboys: {contadores.motoboys}
          </Badge>
          <Badge variant="outline" className="bg-muted">
            <Users className="h-3 w-3 mr-1" /> Total Ativos: {contadores.total}
          </Badge>
        </div>

        {/* Tabela */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Loja</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Data Admissão</TableHead>
                <TableHead>Salário</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {colaboradoresFiltrados.map(col => (
                <TableRow key={col.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {getCargoIcon(col.cargo)}
                      {col.nome}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-mono">{formatarCPF(col.cpf)}</TableCell>
                  <TableCell className="text-sm">{obterNomeLoja(col.loja_id)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getCargoBadgeClass(col.cargo)}>
                      {col.cargo}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{col.telefone || '-'}</TableCell>
                  <TableCell className="text-sm">
                    {col.data_admissao ? format(new Date(col.data_admissao), 'dd/MM/yyyy') : '-'}
                  </TableCell>
                  <TableCell className="text-sm">{formatCurrency(col.salario_fixo)}</TableCell>
                  <TableCell>
                    <Badge variant={col.ativo ? 'default' : 'secondary'}>
                      {col.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(col)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(col.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {colaboradoresFiltrados.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    Nenhum colaborador encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Dialog de Cadastro/Edição */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingColaborador ? 'Editar Colaborador' : 'Novo Colaborador'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Nome Completo *</Label>
              <Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>CPF</Label>
              <Input value={form.cpf} onChange={e => setForm({ ...form, cpf: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Loja *</Label>
              <Select value={form.loja_id} onValueChange={v => setForm({ ...form, loja_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {lojas.filter(l => l.ativa).map(loja => (
                    <SelectItem key={loja.id} value={loja.id}>{loja.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cargo *</Label>
              <Select value={form.cargo} onValueChange={handleCargoChange}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {CARGOS.map(cargo => (
                    <SelectItem key={cargo} value={cargo}>{cargo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data de Admissão</Label>
              <Input type="date" value={form.data_admissao} onChange={e => setForm({ ...form, data_admissao: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Salário Fixo</Label>
              <Input 
                type="number" 
                value={form.salario_fixo} 
                onChange={e => setForm({ ...form, salario_fixo: parseFloat(e.target.value) || 0 })} 
              />
            </div>
            <div className="space-y-2">
              <Label>Ajuda de Custo</Label>
              <Input 
                type="number" 
                value={form.ajuda_custo} 
                onChange={e => setForm({ ...form, ajuda_custo: parseFloat(e.target.value) || 0 })} 
              />
            </div>
            <div className="space-y-2">
              <Label>Comissão (%)</Label>
              <Input 
                type="number" 
                value={form.comissao} 
                onChange={e => setForm({ ...form, comissao: parseFloat(e.target.value) || 0 })} 
              />
            </div>

            {/* Flags */}
            <div className="md:col-span-2 space-y-4 pt-4 border-t">
              <Label className="text-base font-medium">Permissões</Label>
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                  <Switch checked={form.eh_gestor} onCheckedChange={v => setForm({ ...form, eh_gestor: v })} />
                  <Label>É Gestor</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.eh_vendedor} onCheckedChange={v => setForm({ ...form, eh_vendedor: v })} />
                  <Label>É Vendedor</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.eh_estoquista} onCheckedChange={v => setForm({ ...form, eh_estoquista: v })} />
                  <Label>É Estoquista</Label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.ativo ? 'ativo' : 'inativo'} onValueChange={v => setForm({ ...form, ativo: v === 'ativo' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
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
