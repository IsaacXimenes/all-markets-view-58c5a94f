import { useState, useEffect } from 'react';
import { CadastrosLayout } from '@/components/layout/CadastrosLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCadastroStore } from '@/store/cadastroStore';
import { AutocompleteLoja } from '@/components/AutocompleteLoja';
import { ColaboradorMockado, RodizioColaborador } from '@/types/mockData';
import { TimelineEntry } from '@/utils/timelineApi';
import { exportToCSV, formatCurrency } from '@/utils/formatUtils';
import { Plus, Pencil, Trash2, Download, User, Users, Shield, Package, Wrench, Bike, ArrowLeftRight, History, Clock, RefreshCw, X } from 'lucide-react';
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
    obterNomeLoja,
    adicionarRodizio,
    encerrarRodizio,
    obterRodizioAtivoDoColaborador,
    obterHistoricoRodiziosColaborador,
    obterTimelineColaborador,
    colaboradorEmRodizio
  } = useCadastroStore();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingColaborador, setEditingColaborador] = useState<ColaboradorMockado | null>(null);
  const [filtroLoja, setFiltroLoja] = useState<string>('todos');
  const [filtroCargo, setFiltroCargo] = useState<string>('todos');
  const [filtroNome, setFiltroNome] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('ativos');
  
  // Modal de Rodízio
  const [isRodizioModalOpen, setIsRodizioModalOpen] = useState(false);
  const [colaboradorRodizio, setColaboradorRodizio] = useState<ColaboradorMockado | null>(null);
  const [formRodizio, setFormRodizio] = useState({
    loja_destino_id: '',
    data_inicio: '',
    data_fim: '',
    observacao: ''
  });
  
  // Modal de Histórico/Timeline
  const [isHistoricoModalOpen, setIsHistoricoModalOpen] = useState(false);
  const [colaboradorHistorico, setColaboradorHistorico] = useState<ColaboradorMockado | null>(null);
  const [timelineColaborador, setTimelineColaborador] = useState<TimelineEntry[]>([]);
  const [rodiziosColaborador, setRodiziosColaborador] = useState<RodizioColaborador[]>([]);
  
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

  const resetFormRodizio = () => {
    setFormRodizio({
      loja_destino_id: '',
      data_inicio: '',
      data_fim: '',
      observacao: ''
    });
    setColaboradorRodizio(null);
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

  const handleOpenRodizio = (colaborador: ColaboradorMockado) => {
    setColaboradorRodizio(colaborador);
    setFormRodizio({
      loja_destino_id: '',
      data_inicio: new Date().toISOString().split('T')[0],
      data_fim: '',
      observacao: ''
    });
    setIsRodizioModalOpen(true);
  };

  const handleOpenHistorico = (colaborador: ColaboradorMockado) => {
    setColaboradorHistorico(colaborador);
    setTimelineColaborador(obterTimelineColaborador(colaborador.id));
    setRodiziosColaborador(obterHistoricoRodiziosColaborador(colaborador.id));
    setIsHistoricoModalOpen(true);
  };

  const handleSaveRodizio = () => {
    if (!colaboradorRodizio) return;
    
    if (!formRodizio.loja_destino_id || !formRodizio.data_inicio || !formRodizio.data_fim) {
      toast({ title: 'Erro', description: 'Loja destino e datas são obrigatórios', variant: 'destructive' });
      return;
    }
    
    if (formRodizio.data_fim < formRodizio.data_inicio) {
      toast({ title: 'Erro', description: 'Data fim deve ser posterior à data início', variant: 'destructive' });
      return;
    }
    
    if (formRodizio.loja_destino_id === colaboradorRodizio.loja_id) {
      toast({ title: 'Erro', description: 'A loja destino deve ser diferente da loja atual', variant: 'destructive' });
      return;
    }
    
    // Verificar se já existe rodízio ativo
    const rodizioAtivo = obterRodizioAtivoDoColaborador(colaboradorRodizio.id);
    if (rodizioAtivo) {
      toast({ title: 'Erro', description: 'Este colaborador já possui um rodízio ativo', variant: 'destructive' });
      return;
    }
    
    adicionarRodizio({
      colaborador_id: colaboradorRodizio.id,
      loja_origem_id: colaboradorRodizio.loja_id,
      loja_destino_id: formRodizio.loja_destino_id,
      data_inicio: formRodizio.data_inicio,
      data_fim: formRodizio.data_fim,
      observacao: formRodizio.observacao,
      ativo: true,
      criado_por_id: 'admin',
      criado_por_nome: 'Administrador'
    });
    
    toast({ title: 'Sucesso', description: 'Rodízio configurado com sucesso' });
    setIsRodizioModalOpen(false);
    resetFormRodizio();
  };

  const handleEncerrarRodizio = (rodizioId: string) => {
    encerrarRodizio(rodizioId, 'admin', 'Administrador');
    toast({ title: 'Sucesso', description: 'Rodízio encerrado com sucesso' });
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

  const getTimelineIcon = (tipo: string) => {
    switch (tipo) {
      case 'rodizio_inicio':
        return <ArrowLeftRight className="h-4 w-4 text-blue-500" />;
      case 'rodizio_encerramento':
        return <X className="h-4 w-4 text-red-500" />;
      case 'rodizio_alteracao':
        return <RefreshCw className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
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
              {colaboradoresFiltrados.map(col => {
                const rodizioAtivo = obterRodizioAtivoDoColaborador(col.id);
                const emRodizio = colaboradorEmRodizio(col.id);
                
                return (
                  <TableRow key={col.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {getCargoIcon(col.cargo)}
                        {col.nome}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-mono">{formatarCPF(col.cpf)}</TableCell>
                    <TableCell className="text-sm">
                      <div className="flex flex-col gap-1">
                        <span>{obterNomeLoja(col.loja_id)}</span>
                        {emRodizio && rodizioAtivo && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-xs w-fit cursor-help">
                                  <RefreshCw className="h-3 w-3 mr-1" />
                                  Em Rodízio
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <div className="space-y-1 text-xs">
                                  <p><strong>Loja Destino:</strong> {obterNomeLoja(rodizioAtivo.loja_destino_id)}</p>
                                  <p><strong>Período:</strong> {format(new Date(rodizioAtivo.data_inicio), 'dd/MM/yyyy')} a {format(new Date(rodizioAtivo.data_fim), 'dd/MM/yyyy')}</p>
                                  {rodizioAtivo.observacao && <p><strong>Obs:</strong> {rodizioAtivo.observacao}</p>}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
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
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => handleOpenRodizio(col)}>
                                <ArrowLeftRight className="h-4 w-4 text-blue-500" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Configurar Rodízio</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => handleOpenHistorico(col)}>
                                <History className="h-4 w-4 text-gray-500" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Ver Histórico</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(col)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(col.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
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

      {/* Modal de Rodízio */}
      <Dialog open={isRodizioModalOpen} onOpenChange={setIsRodizioModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5 text-blue-500" />
              Configurar Rodízio Temporário
            </DialogTitle>
          </DialogHeader>
          
          {colaboradorRodizio && (
            <div className="space-y-4 py-4">
              <div className="bg-muted/50 p-3 rounded-lg space-y-1">
                <p className="text-sm"><strong>Colaborador:</strong> {colaboradorRodizio.nome}</p>
                <p className="text-sm"><strong>Loja Base:</strong> {obterNomeLoja(colaboradorRodizio.loja_id)}</p>
              </div>
              
              <div className="space-y-2">
                <Label>Loja Destino *</Label>
                <AutocompleteLoja
                  value={formRodizio.loja_destino_id}
                  onChange={(id) => setFormRodizio({ ...formRodizio, loja_destino_id: id })}
                  placeholder="Selecione a loja destino"
                  apenasLojasTipoLoja={true}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data Início *</Label>
                  <Input 
                    type="date" 
                    value={formRodizio.data_inicio}
                    onChange={e => setFormRodizio({ ...formRodizio, data_inicio: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data Fim *</Label>
                  <Input 
                    type="date" 
                    value={formRodizio.data_fim}
                    onChange={e => setFormRodizio({ ...formRodizio, data_fim: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Observação</Label>
                <Textarea 
                  placeholder="Justificativa ou detalhes do rodízio temporário..."
                  value={formRodizio.observacao}
                  onChange={e => setFormRodizio({ ...formRodizio, observacao: e.target.value })}
                  rows={3}
                />
              </div>
              
              <div className="bg-yellow-500/10 border border-yellow-500/30 p-3 rounded-lg">
                <p className="text-sm text-yellow-600">
                  ⚠️ O colaborador aparecerá disponível na loja destino durante o período informado.
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsRodizioModalOpen(false); resetFormRodizio(); }}>
              Cancelar
            </Button>
            <Button onClick={handleSaveRodizio}>
              <ArrowLeftRight className="h-4 w-4 mr-2" />
              Confirmar Rodízio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Histórico/Timeline */}
      <Dialog open={isHistoricoModalOpen} onOpenChange={setIsHistoricoModalOpen}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico - {colaboradorHistorico?.nome}
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {/* Rodízios ativos */}
              {rodiziosColaborador.filter(r => r.ativo).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Rodízio Ativo</h4>
                  {rodiziosColaborador.filter(r => r.ativo).map(rodizio => (
                    <div key={rodizio.id} className="bg-blue-500/10 border border-blue-500/30 p-3 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{obterNomeLoja(rodizio.loja_origem_id)} → {obterNomeLoja(rodizio.loja_destino_id)}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(rodizio.data_inicio), 'dd/MM/yyyy')} a {format(new Date(rodizio.data_fim), 'dd/MM/yyyy')}
                          </p>
                          {rodizio.observacao && (
                            <p className="text-xs italic">"{rodizio.observacao}"</p>
                          )}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEncerrarRodizio(rodizio.id)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Timeline */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Timeline de Eventos</h4>
                {timelineColaborador.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum evento registrado
                  </p>
                ) : (
                  <div className="space-y-3">
                    {timelineColaborador.map(entry => (
                      <div key={entry.id} className="flex gap-3 pb-3 border-b last:border-0">
                        <div className="flex-shrink-0 mt-0.5">
                          {getTimelineIcon(entry.tipo)}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex justify-between items-start">
                            <p className="text-sm font-medium">{entry.titulo}</p>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(entry.dataHora), 'dd/MM/yyyy HH:mm')}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{entry.descricao}</p>
                          {entry.metadata?.observacao && (
                            <p className="text-xs italic text-muted-foreground">Obs: "{entry.metadata.observacao}"</p>
                          )}
                          <p className="text-xs text-muted-foreground">Por: {entry.usuarioNome}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsHistoricoModalOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CadastrosLayout>
  );
}