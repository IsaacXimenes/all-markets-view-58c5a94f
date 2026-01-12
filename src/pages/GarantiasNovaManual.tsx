import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { GarantiasLayout } from '@/components/layout/GarantiasLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Shield, User, Phone, Mail, Save, Search, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { getLojas, getProdutosCadastro, getClientes, addCliente, Cliente } from '@/utils/cadastrosApi';
import { addGarantia, addTimelineEntry } from '@/utils/garantiasApi';
import { format, addMonths } from 'date-fns';
import { formatIMEI, unformatIMEI } from '@/utils/imeiMask';

export default function GarantiasNovaManual() {
  const navigate = useNavigate();
  const lojas = getLojas();
  const produtos = getProdutosCadastro();
  const [clientes, setClientes] = useState<Cliente[]>(getClientes());
  
  // Form state
  const [formData, setFormData] = useState<{
    imei: string;
    modelo: string;
    tipoGarantia: 'Garantia - Apple' | 'Garantia - Thiago Imports';
    mesesGarantia: number;
    dataInicioGarantia: string;
    lojaVenda: string;
    clienteId: string;
    clienteNome: string;
    clienteTelefone: string;
    clienteEmail: string;
    observacoes: string;
  }>({
    imei: '',
    modelo: '',
    tipoGarantia: 'Garantia - Apple',
    mesesGarantia: 12,
    dataInicioGarantia: format(new Date(), 'yyyy-MM-dd'),
    lojaVenda: '',
    clienteId: '',
    clienteNome: '',
    clienteTelefone: '',
    clienteEmail: '',
    observacoes: ''
  });

  // Client modals
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [showNovoClienteModal, setShowNovoClienteModal] = useState(false);
  const [buscaCliente, setBuscaCliente] = useState('');
  const [novoCliente, setNovoCliente] = useState<Partial<Cliente>>({});

  // Filtered clients
  const clientesFiltrados = useMemo(() => {
    if (!buscaCliente) return clientes.filter(c => c.status === 'Ativo');
    const busca = buscaCliente.toLowerCase();
    return clientes.filter(c => 
      c.status === 'Ativo' && (
        c.nome.toLowerCase().includes(busca) ||
        c.cpf.includes(busca) ||
        c.telefone.includes(busca)
      )
    );
  }, [clientes, buscaCliente]);

  // Calculate end date
  const dataFimGarantia = useMemo(() => {
    if (!formData.dataInicioGarantia) return '';
    const dataInicio = new Date(formData.dataInicioGarantia);
    return format(addMonths(dataInicio, formData.mesesGarantia), 'dd/MM/yyyy');
  }, [formData.dataInicioGarantia, formData.mesesGarantia]);

  const handleSelectCliente = (cliente: Cliente) => {
    setFormData(prev => ({
      ...prev,
      clienteId: cliente.id,
      clienteNome: cliente.nome,
      clienteTelefone: cliente.telefone,
      clienteEmail: cliente.email
    }));
    setShowClienteModal(false);
    setBuscaCliente('');
  };

  const handleAddCliente = () => {
    if (!novoCliente.nome || !novoCliente.cpf || !novoCliente.telefone) {
      toast.error('Preencha nome, CPF e telefone');
      return;
    }

    const cliente = addCliente({
      nome: novoCliente.nome || '',
      cpf: novoCliente.cpf || '',
      telefone: novoCliente.telefone || '',
      dataNascimento: novoCliente.dataNascimento || '',
      email: novoCliente.email || '',
      cep: novoCliente.cep || '',
      endereco: novoCliente.endereco || '',
      numero: novoCliente.numero || '',
      bairro: novoCliente.bairro || '',
      cidade: novoCliente.cidade || '',
      estado: novoCliente.estado || '',
      status: 'Ativo',
      origemCliente: 'Venda',
      idsCompras: []
    });

    setClientes([...clientes, cliente]);
    handleSelectCliente(cliente);
    setShowNovoClienteModal(false);
    setNovoCliente({});
    toast.success('Cliente cadastrado com sucesso!');
  };

  const handleSalvar = () => {
    // Validations
    if (!formData.imei || !formData.modelo || !formData.lojaVenda || !formData.clienteNome) {
      toast.error('Preencha todos os campos obrigatórios (IMEI, Modelo, Loja e Cliente)');
      return;
    }

    const imeiLimpo = unformatIMEI(formData.imei);
    if (imeiLimpo.length !== 15) {
      toast.error('IMEI deve ter 15 dígitos');
      return;
    }

    const dataInicio = new Date(formData.dataInicioGarantia);
    const dataFimCalc = format(addMonths(dataInicio, formData.mesesGarantia), 'yyyy-MM-dd');

    const novaGarantia = addGarantia({
      vendaId: '',
      itemVendaId: '',
      produtoId: '',
      imei: imeiLimpo,
      modelo: formData.modelo,
      tipoGarantia: formData.tipoGarantia,
      mesesGarantia: formData.mesesGarantia,
      dataInicioGarantia: formData.dataInicioGarantia,
      dataFimGarantia: dataFimCalc,
      status: 'Ativa',
      lojaVenda: formData.lojaVenda,
      clienteId: formData.clienteId,
      clienteNome: formData.clienteNome,
      clienteTelefone: formData.clienteTelefone,
      clienteEmail: formData.clienteEmail
    });

    // Add timeline entry
    addTimelineEntry({
      garantiaId: novaGarantia.id,
      dataHora: new Date().toISOString(),
      tipo: 'registro_venda',
      titulo: 'Garantia Registrada Manualmente',
      descricao: formData.observacoes || 'Garantia registrada manualmente sem vínculo com venda',
      usuarioId: 'COL-001',
      usuarioNome: 'Usuário Sistema'
    });

    toast.success('Garantia registrada com sucesso!');
    navigate(`/garantias/${novaGarantia.id}`);
  };

  const getLojaName = (id: string) => lojas.find(l => l.id === id)?.nome || id;

  return (
    <GarantiasLayout title="Nova Garantia Manual">
      {/* Header with back button */}
      <div className="mb-6 flex justify-between items-center">
        <Button variant="outline" onClick={() => navigate('/garantias/nova')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <Button onClick={handleSalvar}>
          <Save className="h-4 w-4 mr-2" />
          Registrar Garantia
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Product Data */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Dados do Produto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>IMEI *</Label>
                  <Input
                    placeholder="00-000000-000000-0"
                    value={formData.imei}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      imei: formatIMEI(e.target.value) 
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Modelo *</Label>
                  <Select 
                    value={formData.modelo} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, modelo: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o modelo" />
                    </SelectTrigger>
                    <SelectContent>
                      {produtos.map(p => (
                        <SelectItem key={p.id} value={p.produto}>{p.produto}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Resp. Garantia *</Label>
                  <Select 
                    value={formData.tipoGarantia} 
                    onValueChange={(v) => setFormData(prev => ({ 
                      ...prev, 
                      tipoGarantia: v as 'Garantia - Apple' | 'Garantia - Thiago Imports' 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Garantia - Apple">Garantia - Apple</SelectItem>
                      <SelectItem value="Garantia - Thiago Imports">Garantia - Thiago Imports</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Duração da Garantia *</Label>
                  <Select 
                    value={String(formData.mesesGarantia)} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, mesesGarantia: Number(v) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 meses</SelectItem>
                      <SelectItem value="6">6 meses</SelectItem>
                      <SelectItem value="12">12 meses</SelectItem>
                      <SelectItem value="24">24 meses</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Data Início *</Label>
                  <Input
                    type="date"
                    value={formData.dataInicioGarantia}
                    onChange={(e) => setFormData(prev => ({ ...prev, dataInicioGarantia: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Loja *</Label>
                <Select 
                  value={formData.lojaVenda} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, lojaVenda: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a loja" />
                  </SelectTrigger>
                  <SelectContent>
                    {lojas.map(l => (
                      <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Client Data */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Dados do Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Selecione um cliente..."
                    value={formData.clienteNome}
                    readOnly
                    className="flex-1"
                  />
                  <Button onClick={() => setShowClienteModal(true)}>
                    <Search className="h-4 w-4 mr-2" />
                    Buscar
                  </Button>
                </div>
              </div>
              
              {formData.clienteId && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      Telefone
                    </Label>
                    <p className="text-sm font-medium">{formData.clienteTelefone || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      E-mail
                    </Label>
                    <p className="text-sm font-medium">{formData.clienteEmail || '-'}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Observations */}
          <Card>
            <CardHeader>
              <CardTitle>Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Observações sobre a garantia..."
                value={formData.observacoes}
                onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                rows={4}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Warranty Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5" />
                Resumo da Garantia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">IMEI</p>
                <p className="font-mono font-medium">{formData.imei || '-'}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Modelo</p>
                <p className="font-medium">{formData.modelo || '-'}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Resp. Garantia</p>
                <p className="font-medium">{formData.tipoGarantia}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Duração</p>
                <p className="font-medium">{formData.mesesGarantia} meses</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Data Fim Garantia</p>
                <p className="font-medium text-primary">{dataFimGarantia || '-'}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Loja</p>
                <p className="font-medium">{formData.lojaVenda ? getLojaName(formData.lojaVenda) : '-'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Client Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5" />
                Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Nome</p>
                <p className="font-medium">{formData.clienteNome || '-'}</p>
              </div>
              {formData.clienteTelefone && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Telefone</p>
                  <p className="font-medium">{formData.clienteTelefone}</p>
                </div>
              )}
              {formData.clienteEmail && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">E-mail</p>
                  <p className="font-medium">{formData.clienteEmail}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal Buscar Cliente */}
      <Dialog open={showClienteModal} onOpenChange={setShowClienteModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Buscar Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Buscar por nome, CPF ou telefone..."
                value={buscaCliente}
                onChange={(e) => setBuscaCliente(e.target.value)}
                className="flex-1"
              />
              <Button onClick={() => setShowNovoClienteModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Cliente
              </Button>
            </div>
            <div className="border rounded-lg max-h-[300px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientesFiltrados.slice(0, 20).map(cliente => (
                    <TableRow key={cliente.id}>
                      <TableCell className="font-medium">{cliente.nome}</TableCell>
                      <TableCell>{cliente.cpf}</TableCell>
                      <TableCell>{cliente.telefone}</TableCell>
                      <TableCell>{cliente.cidade}</TableCell>
                      <TableCell>
                        <Button size="sm" onClick={() => handleSelectCliente(cliente)}>
                          Selecionar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {clientesFiltrados.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhum cliente encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Novo Cliente */}
      <Dialog open={showNovoClienteModal} onOpenChange={setShowNovoClienteModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo Cliente</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                placeholder="Nome completo"
                value={novoCliente.nome || ''}
                onChange={(e) => setNovoCliente(prev => ({ ...prev, nome: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>CPF *</Label>
              <Input
                placeholder="000.000.000-00"
                value={novoCliente.cpf || ''}
                onChange={(e) => setNovoCliente(prev => ({ ...prev, cpf: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone *</Label>
              <Input
                placeholder="(00) 00000-0000"
                value={novoCliente.telefone || ''}
                onChange={(e) => setNovoCliente(prev => ({ ...prev, telefone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input
                type="email"
                placeholder="email@exemplo.com"
                value={novoCliente.email || ''}
                onChange={(e) => setNovoCliente(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Data de Nascimento</Label>
              <Input
                type="date"
                value={novoCliente.dataNascimento || ''}
                onChange={(e) => setNovoCliente(prev => ({ ...prev, dataNascimento: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>CEP</Label>
              <Input
                placeholder="00000-000"
                value={novoCliente.cep || ''}
                onChange={(e) => setNovoCliente(prev => ({ ...prev, cep: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>Endereço</Label>
              <Input
                placeholder="Rua, Avenida..."
                value={novoCliente.endereco || ''}
                onChange={(e) => setNovoCliente(prev => ({ ...prev, endereco: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Número</Label>
              <Input
                placeholder="123"
                value={novoCliente.numero || ''}
                onChange={(e) => setNovoCliente(prev => ({ ...prev, numero: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Bairro</Label>
              <Input
                placeholder="Bairro"
                value={novoCliente.bairro || ''}
                onChange={(e) => setNovoCliente(prev => ({ ...prev, bairro: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Cidade</Label>
              <Input
                placeholder="Cidade"
                value={novoCliente.cidade || ''}
                onChange={(e) => setNovoCliente(prev => ({ ...prev, cidade: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Input
                placeholder="UF"
                value={novoCliente.estado || ''}
                onChange={(e) => setNovoCliente(prev => ({ ...prev, estado: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNovoClienteModal(false)}>Cancelar</Button>
            <Button onClick={handleAddCliente}>Salvar Cliente</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </GarantiasLayout>
  );
}
