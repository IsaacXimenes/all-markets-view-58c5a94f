import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GarantiasLayout } from '@/components/layout/GarantiasLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Save, ArrowLeft, Truck, Phone, User, Shield, CheckCircle, Search, Plus, CreditCard, Star } from 'lucide-react';
import { format, addMonths, addDays } from 'date-fns';

import { getClientes, getMotoboys, Cliente, addCliente, calcularTipoPessoa, getProdutosCadastro, ProdutoCadastro } from '@/utils/cadastrosApi';
import { 
  addContatoAtivo, 
  ContatoAtivoGarantia 
} from '@/utils/garantiasApi';
import { getPlanosPorModelo, getPlanosAtivos, PlanoGarantia, formatCurrency } from '@/utils/planosGarantiaApi';
import { formatIMEI } from '@/utils/imeiMask';
import { PagamentoQuadro } from '@/components/vendas/PagamentoQuadro';
import { Pagamento } from '@/utils/vendasApi';

export default function GarantiaContatosAtivosNovo() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState<Cliente[]>(getClientes());
  const motoboys = getMotoboys();
  const todosPlanos = getPlanosAtivos();
  const produtosCadastro = getProdutosCadastro();
  
  // Pagamentos state
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  
  // Client modal states
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [showNovoClienteModal, setShowNovoClienteModal] = useState(false);
  const [buscaCliente, setBuscaCliente] = useState('');
  const [novoCliente, setNovoCliente] = useState<Partial<Cliente>>({});
  
  // Form state
  const [form, setForm] = useState({
    clienteId: '',
    clienteNome: '',
    clienteTelefone: '',
    clienteEmail: '',
    aparelhoModelo: '',
    aparelhoImei: '',
    aparelhoCondicao: '' as '' | 'Novo' | 'Seminovo',
    motoboyId: '',
    dataEntregaPrevista: '',
    enderecoEntrega: '',
    observacoes: '',
    garantiaExtendidaAderida: false,
    planoGarantiaId: ''
  });

  // Filtered clients
  const clientesFiltrados = useMemo(() => {
    if (!buscaCliente) return clientes;
    const busca = buscaCliente.toLowerCase();
    return clientes.filter(c => 
      c.nome.toLowerCase().includes(busca) || 
      c.cpf.includes(busca)
    );
  }, [clientes, buscaCliente]);

  // Planos filtrados por modelo e condição
  const planosFiltrados = useMemo(() => {
    if (!form.aparelhoModelo || !form.aparelhoCondicao) {
      return [];
    }
    
    return todosPlanos.filter(plano => {
      if (plano.nome === 'Sem Garantia Adicional') return true;
      
      if (plano.condicao !== 'Ambos' && plano.condicao !== form.aparelhoCondicao) {
        return false;
      }
      
      const modeloNormalizado = form.aparelhoModelo.toLowerCase();
      const modeloEncontrado = plano.modelos.some(m => 
        modeloNormalizado.includes(m.toLowerCase()) || m.toLowerCase().includes(modeloNormalizado)
      );
      
      return modeloEncontrado;
    });
  }, [form.aparelhoModelo, form.aparelhoCondicao, todosPlanos]);

  // Plano selecionado
  const planoSelecionado = useMemo(() => {
    if (!form.planoGarantiaId) return null;
    return todosPlanos.find(p => p.id === form.planoGarantiaId) || null;
  }, [form.planoGarantiaId, todosPlanos]);

  // Resetar plano quando mudar modelo ou condição
  useEffect(() => {
    setForm(prev => ({ ...prev, planoGarantiaId: '' }));
  }, [form.aparelhoModelo, form.aparelhoCondicao]);

  const getMotoboyNome = (id: string) => motoboys.find(m => m.id === id)?.nome || id;

  // Formatar CPF/CNPJ dinamicamente
  const formatCpfCnpj = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
      return numbers
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
    }
  };

  // Select existing client
  const handleSelectCliente = (cliente: Cliente) => {
    if (cliente.status === 'Inativo') {
      toast.error('Este cliente está bloqueado e não pode ser selecionado.');
      return;
    }
    
    setForm(prev => ({
      ...prev,
      clienteId: cliente.id,
      clienteNome: cliente.nome,
      clienteTelefone: cliente.telefone,
      clienteEmail: cliente.email,
      enderecoEntrega: `${cliente.endereco}, ${cliente.numero} - ${cliente.bairro}, ${cliente.cidade}-${cliente.estado}`
    }));
    setShowClienteModal(false);
    setBuscaCliente('');
  };

  // Add new client
  const handleAddCliente = () => {
    if (!novoCliente.nome || !novoCliente.cpf) {
      toast.error('Nome e CPF/CNPJ são obrigatórios');
      return;
    }
    
    const cpfLimpo = novoCliente.cpf.replace(/\D/g, '');
    const clienteExistente = clientes.find(c => c.cpf.replace(/\D/g, '') === cpfLimpo);
    
    if (clienteExistente) {
      if (clienteExistente.status === 'Inativo') {
        toast.error('Cliente bloqueado — não permitido cadastrar novamente.');
        return;
      } else {
        toast.error('Este CPF/CNPJ já está cadastrado no sistema.');
        return;
      }
    }
    
    const cliente = addCliente({
      nome: novoCliente.nome,
      cpf: novoCliente.cpf,
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
    if (!form.clienteNome || !form.aparelhoModelo || !form.aparelhoImei || !form.aparelhoCondicao || !form.motoboyId || !form.dataEntregaPrevista) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (form.garantiaExtendidaAderida && !form.planoGarantiaId) {
      toast.error('Selecione um plano de garantia');
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
        imei: form.aparelhoImei,
        condicao: form.aparelhoCondicao
      },
      logistica: {
        motoboyId: form.motoboyId,
        motoboyNome: getMotoboyNome(form.motoboyId),
        dataEntregaPrevista: form.dataEntregaPrevista,
        enderecoEntrega: form.enderecoEntrega,
        observacoes: form.observacoes
      },
      garantiaEstendida: form.garantiaExtendidaAderida && planoSelecionado ? {
        aderida: true,
        planoId: planoSelecionado.id,
        planoNome: planoSelecionado.nome,
        planoMeses: planoSelecionado.meses,
        valor: planoSelecionado.valor
      } : undefined,
      status: 'Pendente'
    };

    addContatoAtivo(novoContato);
    toast.success('Contato registrado com sucesso!');
    navigate('/garantias/contatos-ativos');
  };

  return (
    <GarantiasLayout title="Novo Lançamento de Garantia">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/garantias/contatos-ativos')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
      </div>

      <div className="space-y-6">
        {/* Cliente Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input 
                    value={form.clienteNome} 
                    placeholder="Nome do Cliente"
                    readOnly
                    className="flex-1"
                  />
                  <Button onClick={() => setShowClienteModal(true)}>
                    <Search className="h-4 w-4 mr-2" />
                    Buscar
                  </Button>
                </div>
                
                {form.clienteId && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground">Telefone</label>
                      <p className="font-medium">{form.clienteTelefone}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">E-mail</label>
                      <p className="font-medium">{form.clienteEmail}</p>
                    </div>
                  </div>
                )}
              </div>
              
              {form.clienteId && form.enderecoEntrega && (
                <Card className="bg-muted/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Endereço do Cliente</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{form.enderecoEntrega}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Aparelho Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Aparelho
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Modelo *</Label>
                <Select value={form.aparelhoModelo} onValueChange={v => setForm({...form, aparelhoModelo: v})}>
                  <SelectTrigger><SelectValue placeholder="Selecione o modelo..." /></SelectTrigger>
                  <SelectContent>
                    {produtosCadastro.map(p => (
                      <SelectItem key={p.id} value={p.produto}>{p.marca} - {p.produto}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Condição *</Label>
                <Select value={form.aparelhoCondicao} onValueChange={v => setForm({...form, aparelhoCondicao: v as 'Novo' | 'Seminovo'})}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Novo">Novo</SelectItem>
                    <SelectItem value="Seminovo">Seminovo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>IMEI *</Label>
                <Input 
                  value={form.aparelhoImei} 
                  onChange={e => setForm({...form, aparelhoImei: formatIMEI(e.target.value)})}
                  placeholder="00-000000-000000-0"
                  maxLength={18}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logística Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Logística
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
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
              <div>
                <Label>Data de Entrega Prevista *</Label>
                <Input 
                  type="date" 
                  value={form.dataEntregaPrevista} 
                  onChange={e => setForm({...form, dataEntregaPrevista: e.target.value})} 
                />
              </div>
              <div className="md:col-span-2">
                <Label>Endereço de Entrega</Label>
                <Input 
                  value={form.enderecoEntrega} 
                  onChange={e => setForm({...form, enderecoEntrega: e.target.value})} 
                />
              </div>
              <div className="md:col-span-2">
                <Label>Observações</Label>
                <Textarea 
                  value={form.observacoes} 
                  onChange={e => setForm({...form, observacoes: e.target.value})}
                  rows={3}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Garantia Estendida Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Garantia Estendida
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Deseja aderir à Garantia Estendida?</Label>
              <Select 
                value={form.garantiaExtendidaAderida ? 'sim' : 'nao'} 
                onValueChange={v => setForm({...form, garantiaExtendidaAderida: v === 'sim', planoGarantiaId: ''})}
              >
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nao">Não</SelectItem>
                  <SelectItem value="sim">Sim</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.garantiaExtendidaAderida && (
              <>
                {!form.aparelhoModelo || !form.aparelhoCondicao ? (
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg text-yellow-800 dark:text-yellow-200">
                    <p className="font-medium">Preencha o modelo e a condição do aparelho</p>
                    <p className="text-sm">Os planos disponíveis serão exibidos de acordo com o aparelho informado.</p>
                  </div>
                ) : planosFiltrados.length === 0 ? (
                  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
                    <p className="font-medium">Nenhum plano disponível</p>
                    <p className="text-sm">Não há planos de garantia cadastrados para o modelo "{form.aparelhoModelo}" na condição "{form.aparelhoCondicao}".</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Planos disponíveis para <strong>{form.aparelhoModelo}</strong> ({form.aparelhoCondicao}):
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {planosFiltrados
                        .filter(p => p.nome !== 'Sem Garantia Adicional')
                        .map(plano => (
                        <div
                          key={plano.id}
                          onClick={() => setForm({...form, planoGarantiaId: plano.id})}
                          className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                            form.planoGarantiaId === plano.id 
                              ? 'border-primary bg-primary/5' 
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          {form.planoGarantiaId === plano.id && (
                            <div className="absolute -top-2 -right-2">
                              <CheckCircle className="h-6 w-6 text-primary fill-background" />
                            </div>
                          )}
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Badge 
                                className={plano.nome === 'Silver' 
                                  ? 'bg-gray-400 hover:bg-gray-500' 
                                  : 'bg-yellow-500 hover:bg-yellow-600'}
                              >
                                {plano.nome}
                              </Badge>
                              <span className="text-xs text-muted-foreground">{plano.meses} meses</span>
                            </div>
                            
                            <div className="text-2xl font-bold text-primary">
                              {formatCurrency(plano.valor)}
                            </div>
                            
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {plano.descricao}
                            </p>
                            
                            <div className="flex gap-1 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                {plano.condicao}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {plano.tipo}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {planoSelecionado && (
                      <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-primary">Plano selecionado: {planoSelecionado.nome}</p>
                            <p className="text-sm text-muted-foreground">
                              {planoSelecionado.meses} meses de cobertura
                            </p>
                          </div>
                          <div className="text-2xl font-bold text-primary">
                            {formatCurrency(planoSelecionado.valor)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Quadro de Pagamentos */}
        <PagamentoQuadro
          valorTotalProdutos={planoSelecionado?.valor || 0}
          custoTotalProdutos={0}
          onPagamentosChange={setPagamentos}
          pagamentosIniciais={pagamentos}
        />

        {/* Botões de ação */}
        <div className="flex justify-end gap-4 pb-6">
          <Button variant="outline" onClick={() => navigate('/garantias/contatos-ativos')}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar} size="lg">
            <Save className="h-4 w-4 mr-2" />
            Salvar Lançamento
          </Button>
        </div>
      </div>

      {/* Modal Buscar Cliente */}
      <Dialog open={showClienteModal} onOpenChange={setShowClienteModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Selecionar Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input 
                placeholder="Buscar por nome ou CPF..."
                value={buscaCliente}
                onChange={(e) => setBuscaCliente(e.target.value)}
                className="flex-1"
              />
              <Button onClick={() => setShowNovoClienteModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Cliente
              </Button>
            </div>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CPF/CNPJ</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientesFiltrados.map(cliente => (
                  <TableRow key={cliente.id} className={cliente.status === 'Inativo' ? 'bg-destructive/10' : ''}>
                    <TableCell>{cliente.cpf}</TableCell>
                    <TableCell className="font-medium">{cliente.nome}</TableCell>
                    <TableCell>
                      <Badge className={cliente.tipoPessoa === 'Pessoa Jurídica' ? 'bg-blue-500' : 'bg-green-500'}>
                        {cliente.tipoPessoa === 'Pessoa Jurídica' ? 'PJ' : 'PF'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {cliente.status === 'Inativo' ? (
                        <Badge variant="destructive">Bloqueado</Badge>
                      ) : (
                        <Badge variant="outline">Ativo</Badge>
                      )}
                    </TableCell>
                    <TableCell>{cliente.telefone}</TableCell>
                    <TableCell>
                      {cliente.status === 'Inativo' ? (
                        <span className="text-destructive text-sm font-medium">Bloqueado</span>
                      ) : (
                        <Button 
                          size="sm" 
                          onClick={() => handleSelectCliente(cliente)}
                        >
                          Selecionar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Novo Cliente */}
      <Dialog open={showNovoClienteModal} onOpenChange={setShowNovoClienteModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo Cliente</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nome *</Label>
              <Input 
                value={novoCliente.nome || ''}
                onChange={(e) => setNovoCliente({ ...novoCliente, nome: e.target.value })}
              />
            </div>
            <div>
              <Label>CPF/CNPJ *</Label>
              <Input 
                value={novoCliente.cpf || ''}
                onChange={(e) => setNovoCliente({ ...novoCliente, cpf: formatCpfCnpj(e.target.value) })}
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
                maxLength={18}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {(novoCliente.cpf?.replace(/\D/g, '').length || 0) <= 11 ? 'CPF' : 'CNPJ'}
              </p>
            </div>
            <div>
              <Label>Telefone</Label>
              <Input 
                value={novoCliente.telefone || ''}
                onChange={(e) => setNovoCliente({ ...novoCliente, telefone: e.target.value })}
              />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input 
                value={novoCliente.email || ''}
                onChange={(e) => setNovoCliente({ ...novoCliente, email: e.target.value })}
              />
            </div>
            <div>
              <Label>Data de Nascimento</Label>
              <Input 
                type="date"
                value={novoCliente.dataNascimento || ''}
                onChange={(e) => setNovoCliente({ ...novoCliente, dataNascimento: e.target.value })}
              />
            </div>
            <div>
              <Label>CEP</Label>
              <Input 
                value={novoCliente.cep || ''}
                onChange={(e) => setNovoCliente({ ...novoCliente, cep: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Label>Endereço</Label>
              <Input 
                value={novoCliente.endereco || ''}
                onChange={(e) => setNovoCliente({ ...novoCliente, endereco: e.target.value })}
              />
            </div>
            <div>
              <Label>Número</Label>
              <Input 
                value={novoCliente.numero || ''}
                onChange={(e) => setNovoCliente({ ...novoCliente, numero: e.target.value })}
              />
            </div>
            <div>
              <Label>Bairro</Label>
              <Input 
                value={novoCliente.bairro || ''}
                onChange={(e) => setNovoCliente({ ...novoCliente, bairro: e.target.value })}
              />
            </div>
            <div>
              <Label>Cidade</Label>
              <Input 
                value={novoCliente.cidade || ''}
                onChange={(e) => setNovoCliente({ ...novoCliente, cidade: e.target.value })}
              />
            </div>
            <div>
              <Label>Estado</Label>
              <Input 
                value={novoCliente.estado || ''}
                onChange={(e) => setNovoCliente({ ...novoCliente, estado: e.target.value })}
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
