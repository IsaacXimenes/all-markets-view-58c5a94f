import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { GarantiasLayout } from '@/components/layout/GarantiasLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Save, Edit, Eye, Plus, Truck, Phone, User } from 'lucide-react';
import { format } from 'date-fns';

import { getClientes, getColaboradoresByPermissao, getMotoboys, Cliente, Colaborador } from '@/utils/cadastrosApi';
import { 
  getContatosAtivos, addContatoAtivo, updateContatoAtivo, 
  ContatoAtivoGarantia, getGarantias, addGarantia, addTimelineEntry 
} from '@/utils/garantiasApi';
import { getPlanosPorModelo, PlanoGarantia } from '@/utils/planosGarantiaApi';

export default function GarantiaContatosAtivos() {
  const navigate = useNavigate();
  const clientes = getClientes();
  const motoboys = getMotoboys();
  
  // Estados
  const [contatos, setContatos] = useState<ContatoAtivoGarantia[]>(getContatosAtivos());
  const [showNovoModal, setShowNovoModal] = useState(false);
  const [editando, setEditando] = useState<ContatoAtivoGarantia | null>(null);
  const [showDetalhesModal, setShowDetalhesModal] = useState(false);
  const [contatoSelecionado, setContatoSelecionado] = useState<ContatoAtivoGarantia | null>(null);
  
  // Filtros
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  
  // Form state
  const [form, setForm] = useState({
    clienteId: '',
    clienteNome: '',
    clienteTelefone: '',
    clienteEmail: '',
    aparelhoModelo: '',
    aparelhoImei: '',
    motoboyId: '',
    dataEntregaPrevista: '',
    enderecoEntrega: '',
    observacoes: '',
    garantiaExtendidaAderida: false,
    garantiaExtendidaPlano: '' as '' | 'Um Ano' | 'Dois Anos' | 'Três Anos'
  });

  const contatosFiltrados = useMemo(() => {
    return contatos.filter(c => {
      if (filtroCliente && !c.cliente.nome.toLowerCase().includes(filtroCliente.toLowerCase())) return false;
      if (filtroStatus !== 'todos' && c.status !== filtroStatus) return false;
      return true;
    }).sort((a, b) => new Date(b.dataLancamento).getTime() - new Date(a.dataLancamento).getTime());
  }, [contatos, filtroCliente, filtroStatus]);

  const getMotoboyNome = (id: string) => motoboys.find(m => m.id === id)?.nome || id;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pendente':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Pendente</Badge>;
      case 'Garantia Criada':
        return <Badge className="bg-blue-500 hover:bg-blue-600">Garantia Criada</Badge>;
      case 'Entregue':
        return <Badge className="bg-green-500 hover:bg-green-600">Entregue</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const resetForm = () => {
    setForm({
      clienteId: '',
      clienteNome: '',
      clienteTelefone: '',
      clienteEmail: '',
      aparelhoModelo: '',
      aparelhoImei: '',
      motoboyId: '',
      dataEntregaPrevista: '',
      enderecoEntrega: '',
      observacoes: '',
      garantiaExtendidaAderida: false,
      garantiaExtendidaPlano: ''
    });
    setEditando(null);
  };

  const handleSelecionarCliente = (clienteId: string) => {
    const cliente = clientes.find(c => c.id === clienteId);
    if (cliente) {
      setForm(prev => ({
        ...prev,
        clienteId: cliente.id,
        clienteNome: cliente.nome,
        clienteTelefone: cliente.telefone,
        clienteEmail: cliente.email,
        enderecoEntrega: `${cliente.endereco}, ${cliente.numero} - ${cliente.bairro}, ${cliente.cidade}-${cliente.estado}`
      }));
    }
  };

  const handleEditar = (contato: ContatoAtivoGarantia) => {
    setEditando(contato);
    setForm({
      clienteId: contato.cliente.id,
      clienteNome: contato.cliente.nome,
      clienteTelefone: contato.cliente.telefone,
      clienteEmail: contato.cliente.email,
      aparelhoModelo: contato.aparelho.modelo,
      aparelhoImei: contato.aparelho.imei,
      motoboyId: contato.logistica.motoboyId,
      dataEntregaPrevista: contato.logistica.dataEntregaPrevista,
      enderecoEntrega: contato.logistica.enderecoEntrega,
      observacoes: contato.logistica.observacoes,
      garantiaExtendidaAderida: contato.garantiaEstendida?.aderida || false,
      garantiaExtendidaPlano: contato.garantiaEstendida?.plano || ''
    });
    setShowNovoModal(true);
  };

  const handleVerDetalhes = (contato: ContatoAtivoGarantia) => {
    setContatoSelecionado(contato);
    setShowDetalhesModal(true);
  };

  const handleSalvar = () => {
    if (!form.clienteNome || !form.aparelhoModelo || !form.aparelhoImei || !form.motoboyId || !form.dataEntregaPrevista) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const novoContato: Omit<ContatoAtivoGarantia, 'id' | 'timeline'> = {
      garantiaId: undefined,
      dataLancamento: new Date().toISOString(),
      cliente: {
        id: form.clienteId || `CLI-TEMP-${Date.now()}`,
        nome: form.clienteNome,
        telefone: form.clienteTelefone,
        email: form.clienteEmail
      },
      aparelho: {
        modelo: form.aparelhoModelo,
        imei: form.aparelhoImei
      },
      logistica: {
        motoboyId: form.motoboyId,
        motoboyNome: getMotoboyNome(form.motoboyId),
        dataEntregaPrevista: form.dataEntregaPrevista,
        enderecoEntrega: form.enderecoEntrega,
        observacoes: form.observacoes
      },
      garantiaEstendida: form.garantiaExtendidaAderida ? {
        aderida: true,
        plano: form.garantiaExtendidaPlano as 'Um Ano' | 'Dois Anos' | 'Três Anos'
      } : undefined,
      status: 'Pendente'
    };

    if (editando) {
      updateContatoAtivo(editando.id, novoContato);
      toast.success('Contato atualizado com sucesso!');
    } else {
      addContatoAtivo(novoContato);
      toast.success('Contato registrado com sucesso!');
    }

    setContatos(getContatosAtivos());
    setShowNovoModal(false);
    resetForm();
  };

  // Stats
  const totalContatos = contatos.length;
  const pendentes = contatos.filter(c => c.status === 'Pendente').length;
  const garantiasCriadas = contatos.filter(c => c.status === 'Garantia Criada').length;
  const entregues = contatos.filter(c => c.status === 'Entregue').length;

  return (
    <GarantiasLayout title="Contatos - Ativos">
      {/* Dashboard Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{totalContatos}</div>
            <div className="text-xs text-muted-foreground">Total Contatos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{pendentes}</div>
            <div className="text-xs text-muted-foreground">Pendentes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{garantiasCriadas}</div>
            <div className="text-xs text-muted-foreground">Garantias Criadas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{entregues}</div>
            <div className="text-xs text-muted-foreground">Entregues</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Input
                placeholder="Buscar cliente..."
                value={filtroCliente}
                onChange={e => setFiltroCliente(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                  <SelectItem value="Garantia Criada">Garantia Criada</SelectItem>
                  <SelectItem value="Entregue">Entregue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2 md:col-span-2">
              <Button onClick={() => { resetForm(); setShowNovoModal(true); }} className="flex-1">
                <Plus className="h-4 w-4 mr-2" />
                Novo Lançamento
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Aparelho</TableHead>
              <TableHead>IMEI</TableHead>
              <TableHead>Motoboy</TableHead>
              <TableHead>Entrega Prevista</TableHead>
              <TableHead>Garantia Ext.</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contatosFiltrados.map(contato => (
              <TableRow key={contato.id}>
                <TableCell className="font-mono text-xs">{contato.id}</TableCell>
                <TableCell>{format(new Date(contato.dataLancamento), 'dd/MM/yyyy')}</TableCell>
                <TableCell className="font-medium">{contato.cliente.nome}</TableCell>
                <TableCell>{contato.aparelho.modelo}</TableCell>
                <TableCell className="font-mono text-xs">{contato.aparelho.imei}</TableCell>
                <TableCell>{contato.logistica.motoboyNome}</TableCell>
                <TableCell>{format(new Date(contato.logistica.dataEntregaPrevista), 'dd/MM/yyyy')}</TableCell>
                <TableCell>
                  {contato.garantiaEstendida?.aderida ? (
                    <Badge className="bg-green-500">{contato.garantiaEstendida.plano}</Badge>
                  ) : (
                    <Badge variant="outline">Não</Badge>
                  )}
                </TableCell>
                <TableCell>{getStatusBadge(contato.status)}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleVerDetalhes(contato)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleEditar(contato)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {contatosFiltrados.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  Nenhum contato encontrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal Novo/Editar */}
      <Dialog open={showNovoModal} onOpenChange={setShowNovoModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar Contato' : 'Novo Lançamento de Garantia'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Cliente */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-4 w-4" />
                  Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label>Selecionar Cliente</Label>
                  <Select value={form.clienteId} onValueChange={handleSelecionarCliente}>
                    <SelectTrigger><SelectValue placeholder="Buscar cliente..." /></SelectTrigger>
                    <SelectContent>
                      {clientes.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.nome} - {c.cpf}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input value={form.clienteNome} onChange={e => setForm({...form, clienteNome: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input value={form.clienteTelefone} onChange={e => setForm({...form, clienteTelefone: e.target.value})} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Email</Label>
                  <Input value={form.clienteEmail} onChange={e => setForm({...form, clienteEmail: e.target.value})} />
                </div>
              </CardContent>
            </Card>

            {/* Aparelho */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Phone className="h-4 w-4" />
                  Aparelho
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Modelo *</Label>
                  <Input 
                    value={form.aparelhoModelo} 
                    onChange={e => setForm({...form, aparelhoModelo: e.target.value})}
                    placeholder="iPhone 15 Pro Max"
                  />
                </div>
                <div className="space-y-2">
                  <Label>IMEI *</Label>
                  <Input 
                    value={form.aparelhoImei} 
                    onChange={e => setForm({...form, aparelhoImei: e.target.value})}
                    placeholder="352123456789012"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Logística */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Truck className="h-4 w-4" />
                  Logística
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Motoboy *</Label>
                  <Select value={form.motoboyId} onValueChange={v => setForm({...form, motoboyId: v})}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {motoboys.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Data de Entrega Prevista *</Label>
                  <Input 
                    type="date" 
                    value={form.dataEntregaPrevista} 
                    onChange={e => setForm({...form, dataEntregaPrevista: e.target.value})} 
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Endereço de Entrega</Label>
                  <Input 
                    value={form.enderecoEntrega} 
                    onChange={e => setForm({...form, enderecoEntrega: e.target.value})} 
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Observações</Label>
                  <Textarea 
                    value={form.observacoes} 
                    onChange={e => setForm({...form, observacoes: e.target.value})}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Garantia Estendida */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Garantia Estendida</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Aderida?</Label>
                  <Select 
                    value={form.garantiaExtendidaAderida ? 'sim' : 'nao'} 
                    onValueChange={v => setForm({...form, garantiaExtendidaAderida: v === 'sim'})}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nao">Não</SelectItem>
                      <SelectItem value="sim">Sim</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.garantiaExtendidaAderida && (
                  <div className="space-y-2">
                    <Label>Plano</Label>
                    <Select 
                      value={form.garantiaExtendidaPlano} 
                      onValueChange={v => setForm({...form, garantiaExtendidaPlano: v as 'Um Ano' | 'Dois Anos' | 'Três Anos'})}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Um Ano">Um Ano</SelectItem>
                        <SelectItem value="Dois Anos">Dois Anos</SelectItem>
                        <SelectItem value="Três Anos">Três Anos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNovoModal(false)}>Cancelar</Button>
            <Button onClick={handleSalvar}>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Detalhes */}
      <Dialog open={showDetalhesModal} onOpenChange={setShowDetalhesModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do Contato</DialogTitle>
          </DialogHeader>
          {contatoSelecionado && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">ID</Label>
                  <p className="font-mono">{contatoSelecionado.id}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(contatoSelecionado.status)}</div>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground">Cliente</Label>
                  <p className="font-medium">{contatoSelecionado.cliente.nome}</p>
                  <p className="text-sm text-muted-foreground">{contatoSelecionado.cliente.telefone}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Aparelho</Label>
                  <p>{contatoSelecionado.aparelho.modelo}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">IMEI</Label>
                  <p className="font-mono text-xs">{contatoSelecionado.aparelho.imei}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Motoboy</Label>
                  <p>{contatoSelecionado.logistica.motoboyNome}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Entrega Prevista</Label>
                  <p>{format(new Date(contatoSelecionado.logistica.dataEntregaPrevista), 'dd/MM/yyyy')}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground">Endereço</Label>
                  <p className="text-sm">{contatoSelecionado.logistica.enderecoEntrega}</p>
                </div>
                {contatoSelecionado.logistica.observacoes && (
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">Observações</Label>
                    <p className="text-sm">{contatoSelecionado.logistica.observacoes}</p>
                  </div>
                )}
              </div>

              {/* Timeline */}
              {contatoSelecionado.timeline && contatoSelecionado.timeline.length > 0 && (
                <div className="border-t pt-4">
                  <Label className="text-sm font-medium">Timeline</Label>
                  <div className="mt-2 space-y-2">
                    {contatoSelecionado.timeline.map(entry => (
                      <div key={entry.id} className="text-sm p-2 bg-muted rounded">
                        <div className="font-medium">{entry.descricao}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(entry.dataHora), 'dd/MM/yyyy HH:mm')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetalhesModal(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </GarantiasLayout>
  );
}
