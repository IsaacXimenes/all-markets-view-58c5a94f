import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { VendasLayout } from '@/components/layout/VendasLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Lock, User, Calendar, DollarSign, Search, Plus, Clock, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { 
  getVendaDigitalById, 
  finalizarVendaDigital, 
  formatCurrency,
  VendaDigital 
} from '@/utils/vendasDigitalApi';
import { getClientes, Cliente, addCliente } from '@/utils/cadastrosApi';

export default function VendasFinalizarDigital() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [venda, setVenda] = useState<VendaDigital | null>(null);
  const [clientes] = useState<Cliente[]>(getClientes());
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [buscaCliente, setBuscaCliente] = useState('');
  const [modalCliente, setModalCliente] = useState(false);
  const [modalNovoCliente, setModalNovoCliente] = useState(false);
  const [observacoes, setObservacoes] = useState('');
  
  // Novo cliente form
  const [novoCliente, setNovoCliente] = useState({
    nome: '',
    cpf: '',
    telefone: '',
    email: '',
    endereco: '',
    numero: '',
    bairro: '',
    cidade: '',
    estado: 'SP',
    cep: '',
    dataNascimento: ''
  });

  useEffect(() => {
    if (id) {
      const vendaData = getVendaDigitalById(id);
      if (vendaData) {
        setVenda(vendaData);
      } else {
        toast.error('Venda não encontrada');
        navigate('/vendas/pendentes-digitais');
      }
    }
  }, [id, navigate]);

  const clientesFiltrados = clientes.filter(c => {
    if (!buscaCliente) return true;
    const termo = buscaCliente.toLowerCase();
    return c.nome.toLowerCase().includes(termo) || 
           c.cpf.includes(termo) ||
           c.telefone.includes(termo);
  });

  const handleSelecionarCliente = (cliente: Cliente) => {
    if (cliente.status === 'Inativo') {
      toast.error('Cliente inativo — operação bloqueada');
      return;
    }
    setClienteSelecionado(cliente);
    setModalCliente(false);
    toast.success(`Cliente ${cliente.nome} selecionado`);
  };

  const handleCriarCliente = () => {
    if (!novoCliente.nome || !novoCliente.cpf || !novoCliente.telefone) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    const cliente = addCliente({
      ...novoCliente,
      status: 'Ativo',
      origemCliente: 'Venda',
      idsCompras: []
    });

    setClienteSelecionado(cliente);
    setModalNovoCliente(false);
    setNovoCliente({
      nome: '',
      cpf: '',
      telefone: '',
      email: '',
      endereco: '',
      numero: '',
      bairro: '',
      cidade: '',
      estado: 'SP',
      cep: '',
      dataNascimento: ''
    });
    toast.success(`Cliente ${cliente.nome} cadastrado e selecionado`);
  };

  const handleFinalizar = () => {
    if (!venda || !clienteSelecionado) {
      toast.error('Selecione um cliente para finalizar');
      return;
    }

    finalizarVendaDigital(
      venda.id,
      'COL-010',
      'Lucas Finalizador',
      clienteSelecionado.id,
      {
        itens: [],
        tradeIns: [],
        pagamentos: [],
        observacoes,
        origemVenda: 'Digital',
        localRetirada: 'LOJA-001'
      }
    );

    toast.success(`Venda digital ${venda.id} finalizada`, {
      description: 'Estoque atualizado e enviada para Conferência de Contas'
    });

    navigate('/vendas/pendentes-digitais');
  };

  if (!venda) {
    return (
      <VendasLayout title="Finalizar Venda Digital">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </VendasLayout>
    );
  }

  return (
    <VendasLayout title="Finalizar Venda Digital">
      <div className="space-y-6">
        {/* Header com badge */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-primary border-primary">
                  <Lock className="h-3 w-3 mr-1" />
                  Pré-cadastro por {venda.responsavelVendaNome}
                </Badge>
                <span className="font-mono text-sm">{venda.id}</span>
              </div>
              <Badge variant="secondary">
                <Clock className="h-3 w-3 mr-1" />
                {new Date(venda.dataHora).toLocaleString('pt-BR')}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Dados bloqueados do pré-cadastro */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Dados do Pré-Cadastro
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Responsável pela Venda</Label>
                <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{venda.responsavelVendaNome}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Data/Hora</Label>
                <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{new Date(venda.dataHora).toLocaleString('pt-BR')}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Cliente (nome informado)</Label>
                <div className="p-2 bg-muted rounded-md">
                  <span>{venda.clienteNome}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Valor Total</Label>
                <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-lg font-bold text-primary">{formatCurrency(venda.valorTotal)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Seleção de cliente */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Cliente Cadastrado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {clienteSelecionado ? (
                <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{clienteSelecionado.nome}</p>
                      <p className="text-sm text-muted-foreground">{clienteSelecionado.cpf}</p>
                      <p className="text-sm text-muted-foreground">{clienteSelecionado.telefone}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setModalCliente(true)}>
                      Alterar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Button onClick={() => setModalCliente(true)} className="w-full">
                    <Search className="h-4 w-4 mr-2" />
                    Buscar Cliente
                  </Button>
                  <Button variant="outline" onClick={() => setModalNovoCliente(true)} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Cliente
                  </Button>
                </div>
              )}

              <Separator />

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  placeholder="Observações sobre a venda..."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Timeline da Venda</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {venda.timeline.map((entry, index) => (
                <div key={entry.id} className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${index === 0 ? 'bg-primary' : 'bg-muted-foreground'}`} />
                  <div>
                    <p className="font-medium">{entry.acao}</p>
                    <p className="text-sm text-muted-foreground">
                      {entry.responsavel} • {new Date(entry.data).toLocaleString('pt-BR')}
                    </p>
                    {entry.detalhes && (
                      <p className="text-sm mt-1 p-2 bg-muted rounded">{entry.detalhes}</p>
                    )}
                  </div>
                </div>
              ))}
              {clienteSelecionado && (
                <div className="flex items-start gap-3 opacity-50">
                  <div className="w-2 h-2 rounded-full mt-2 bg-green-500" />
                  <div>
                    <p className="font-medium">Venda finalizada (pendente)</p>
                    <p className="text-sm text-muted-foreground">
                      Lucas Finalizador • Agora
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Botão finalizar */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Valor Total da Venda</p>
                <p className="text-3xl font-bold text-primary">{formatCurrency(venda.valorTotal)}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => navigate('/vendas/pendentes-digitais')}>
                  Cancelar
                </Button>
                <Button 
                  size="lg" 
                  onClick={handleFinalizar}
                  disabled={!clienteSelecionado}
                  className="min-w-[200px]"
                >
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Finalizar Venda
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal buscar cliente */}
      <Dialog open={modalCliente} onOpenChange={setModalCliente}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Buscar Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 flex-1 overflow-hidden">
            <div className="flex gap-2">
              <Input
                placeholder="Buscar por nome, CPF ou telefone..."
                value={buscaCliente}
                onChange={(e) => setBuscaCliente(e.target.value)}
              />
              <Button variant="outline" onClick={() => setModalNovoCliente(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo
              </Button>
            </div>
            <div className="overflow-auto max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientesFiltrados.map(cliente => (
                    <TableRow key={cliente.id}>
                      <TableCell className="font-medium">{cliente.nome}</TableCell>
                      <TableCell>{cliente.cpf}</TableCell>
                      <TableCell>{cliente.telefone}</TableCell>
                      <TableCell>
                        <Badge variant={cliente.status === 'Ativo' ? 'default' : 'destructive'}>
                          {cliente.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button 
                          size="sm" 
                          onClick={() => handleSelecionarCliente(cliente)}
                          disabled={cliente.status === 'Inativo'}
                        >
                          Selecionar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal novo cliente */}
      <Dialog open={modalNovoCliente} onOpenChange={setModalNovoCliente}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo Cliente</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label>Nome *</Label>
              <Input
                value={novoCliente.nome}
                onChange={(e) => setNovoCliente({ ...novoCliente, nome: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>CPF/CNPJ *</Label>
              <Input
                value={novoCliente.cpf}
                onChange={(e) => setNovoCliente({ ...novoCliente, cpf: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone *</Label>
              <Input
                value={novoCliente.telefone}
                onChange={(e) => setNovoCliente({ ...novoCliente, telefone: e.target.value })}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={novoCliente.email}
                onChange={(e) => setNovoCliente({ ...novoCliente, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>CEP</Label>
              <Input
                value={novoCliente.cep}
                onChange={(e) => setNovoCliente({ ...novoCliente, cep: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Cidade</Label>
              <Input
                value={novoCliente.cidade}
                onChange={(e) => setNovoCliente({ ...novoCliente, cidade: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalNovoCliente(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCriarCliente}>
              Cadastrar Cliente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </VendasLayout>
  );
}
