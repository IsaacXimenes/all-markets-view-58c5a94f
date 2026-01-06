import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { VendasLayout } from '@/components/layout/VendasLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { 
  ShoppingCart, Search, Plus, X, Clock, Trash2, 
  User, Package, CreditCard, Truck, FileText, AlertTriangle, Check 
} from 'lucide-react';
import { 
  getLojas, getClientes, getColaboradores, getCargos, getOrigensVenda, 
  getContasFinanceiras, Loja, Cliente, Colaborador, Cargo, OrigemVenda, ContaFinanceira,
  addCliente
} from '@/utils/cadastrosApi';
import { getNextVendaNumber, getHistoricoComprasCliente, formatCurrency, Pagamento } from '@/utils/vendasApi';
import { 
  getAcessorios, 
  subtrairEstoqueAcessorio, 
  Acessorio,
  VendaAcessorio 
} from '@/utils/acessoriosApi';

const TIMER_DURATION = 1800; // 30 minutos em segundos

export default function VendasAcessorios() {
  const navigate = useNavigate();
  
  // Dados do cadastros
  const [lojas] = useState<Loja[]>(getLojas());
  const [clientes, setClientes] = useState<Cliente[]>(getClientes());
  const [colaboradores] = useState<Colaborador[]>(getColaboradores());
  const [cargos] = useState<Cargo[]>(getCargos());
  const [origensVenda] = useState<OrigemVenda[]>(getOrigensVenda());
  const [contasFinanceiras] = useState<ContaFinanceira[]>(getContasFinanceiras());
  const [acessoriosEstoque, setAcessoriosEstoque] = useState<Acessorio[]>(getAcessorios());
  
  // Info da venda
  const [vendaInfo] = useState(getNextVendaNumber());
  const [lojaVenda, setLojaVenda] = useState('');
  const [vendedor, setVendedor] = useState('');
  
  // Cliente
  const [clienteId, setClienteId] = useState('');
  const [clienteNome, setClienteNome] = useState('');
  const [clienteCpf, setClienteCpf] = useState('');
  const [clienteTelefone, setClienteTelefone] = useState('');
  const [clienteEmail, setClienteEmail] = useState('');
  const [clienteCidade, setClienteCidade] = useState('');
  const [historicoCliente, setHistoricoCliente] = useState<any[]>([]);
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [showNovoClienteModal, setShowNovoClienteModal] = useState(false);
  const [buscaCliente, setBuscaCliente] = useState('');
  const [novoCliente, setNovoCliente] = useState<Partial<Cliente>>({});
  
  // Origem e retirada
  const [origemVenda, setOrigemVenda] = useState('');
  const [localRetirada, setLocalRetirada] = useState('');
  const [tipoRetirada, setTipoRetirada] = useState<'Retirada Balcão' | 'Entrega' | 'Retirada em Outra Loja'>('Retirada Balcão');
  const [taxaEntrega, setTaxaEntrega] = useState(0);
  const [observacoes, setObservacoes] = useState('');
  
  // Acessórios da venda
  const [acessorios, setAcessorios] = useState<VendaAcessorio[]>([]);
  const [showAcessorioModal, setShowAcessorioModal] = useState(false);
  const [buscaAcessorio, setBuscaAcessorio] = useState('');
  const [quantidadeAcessorio, setQuantidadeAcessorio] = useState(1);
  const [acessorioSelecionado, setAcessorioSelecionado] = useState<Acessorio | null>(null);
  
  // Timer
  const [timer, setTimer] = useState<number | null>(null);
  const [timerStart, setTimerStart] = useState<number | null>(null);
  
  // Pagamentos
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [showPagamentoModal, setShowPagamentoModal] = useState(false);
  const [novoPagamento, setNovoPagamento] = useState<Partial<Pagamento>>({});
  
  // Confirmação
  const [showConfirmacaoModal, setShowConfirmacaoModal] = useState(false);
  const [confirmVendedor, setConfirmVendedor] = useState('');
  const [confirmLoja, setConfirmLoja] = useState('');

  // Vendedores com permissão de vendas
  const vendedoresDisponiveis = useMemo(() => {
    const cargosVendas = cargos.filter(c => c.permissoes.includes('Vendas')).map(c => c.id);
    return colaboradores.filter(col => cargosVendas.includes(col.cargo));
  }, [colaboradores, cargos]);

  // Timer effect
  useEffect(() => {
    if (timerStart && acessorios.length > 0) {
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - timerStart) / 1000);
        const remaining = TIMER_DURATION - elapsed;
        
        if (remaining <= 0) {
          setAcessorios([]);
          setTimer(null);
          setTimerStart(null);
          toast({
            title: "Tempo esgotado",
            description: "Acessórios liberados novamente para o estoque",
            variant: "destructive"
          });
        } else {
          setTimer(remaining);
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [timerStart, acessorios.length]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Cálculos
  const subtotal = useMemo(() => acessorios.reduce((acc, item) => acc + item.valorTotal, 0), [acessorios]);
  const totalPagamentos = useMemo(() => pagamentos.reduce((acc, p) => acc + p.valor, 0), [pagamentos]);
  const total = useMemo(() => subtotal + taxaEntrega, [subtotal, taxaEntrega]);
  const valorPendente = useMemo(() => total - totalPagamentos, [total, totalPagamentos]);

  // Buscar cliente
  const clientesFiltrados = useMemo(() => {
    if (!buscaCliente) return clientes;
    const busca = buscaCliente.toLowerCase();
    return clientes.filter(c => 
      c.nome.toLowerCase().includes(busca) || 
      c.cpf.includes(busca)
    );
  }, [clientes, buscaCliente]);

  const handleSelectCliente = (cliente: Cliente) => {
    if (cliente.status === 'Inativo') {
      toast({ title: "Cliente bloqueado", description: "Este cliente está inativo.", variant: "destructive" });
      return;
    }
    
    setClienteId(cliente.id);
    setClienteNome(cliente.nome);
    setClienteCpf(cliente.cpf);
    setClienteTelefone(cliente.telefone);
    setClienteEmail(cliente.email);
    setClienteCidade(cliente.cidade);
    setHistoricoCliente(getHistoricoComprasCliente(cliente.id));
    setShowClienteModal(false);
    setBuscaCliente('');
  };

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

  const handleAddCliente = () => {
    if (!novoCliente.nome || !novoCliente.cpf) {
      toast({ title: "Erro", description: "Nome e CPF/CNPJ são obrigatórios", variant: "destructive" });
      return;
    }
    
    const cpfLimpo = novoCliente.cpf.replace(/\D/g, '');
    const clienteExistente = clientes.find(c => c.cpf.replace(/\D/g, '') === cpfLimpo);
    
    if (clienteExistente) {
      toast({ title: "Erro", description: "CPF/CNPJ já cadastrado.", variant: "destructive" });
      return;
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
    toast({ title: "Sucesso", description: "Cliente cadastrado!" });
  };

  // Acessórios filtrados
  const acessoriosFiltrados = useMemo(() => {
    return acessoriosEstoque.filter(a => {
      if (a.quantidade <= 0) return false;
      if (buscaAcessorio && !a.descricao.toLowerCase().includes(buscaAcessorio.toLowerCase())) return false;
      return true;
    });
  }, [acessoriosEstoque, buscaAcessorio]);

  // Adicionar acessório
  const handleAddAcessorio = () => {
    if (!acessorioSelecionado || quantidadeAcessorio <= 0) {
      toast({ title: "Erro", description: "Selecione um acessório e quantidade válida", variant: "destructive" });
      return;
    }

    if (acessorioSelecionado.quantidade < quantidadeAcessorio) {
      toast({ title: "Estoque insuficiente", description: `Disponível: ${acessorioSelecionado.quantidade} unidades`, variant: "destructive" });
      return;
    }

    const valorRecomendado = acessorioSelecionado.valorRecomendado || acessorioSelecionado.valorCusto * 1.5;

    const novoItem: VendaAcessorio = {
      id: `VA-${Date.now()}`,
      acessorioId: acessorioSelecionado.id,
      descricao: acessorioSelecionado.descricao,
      quantidade: quantidadeAcessorio,
      valorRecomendado: valorRecomendado,
      valorUnitario: valorRecomendado,
      valorTotal: valorRecomendado * quantidadeAcessorio
    };
    
    setAcessorios([...acessorios, novoItem]);
    setShowAcessorioModal(false);
    setAcessorioSelecionado(null);
    setQuantidadeAcessorio(1);
    setBuscaAcessorio('');
    
    if (acessorios.length === 0) {
      setTimerStart(Date.now());
      setTimer(TIMER_DURATION);
    }
    
    toast({ title: "Acessório adicionado", description: `${acessorioSelecionado.descricao} adicionado à venda` });
  };

  const handleRemoveAcessorio = (itemId: string) => {
    setAcessorios(acessorios.filter(a => a.id !== itemId));
    if (acessorios.length === 1) {
      setTimer(null);
      setTimerStart(null);
    }
  };

  // Adicionar pagamento
  const handleAddPagamento = () => {
    if (!novoPagamento.meioPagamento || !novoPagamento.valor || !novoPagamento.contaDestino) {
      toast({ title: "Erro", description: "Todos os campos são obrigatórios", variant: "destructive" });
      return;
    }
    
    // Validar parcelas para cartão crédito
    if (novoPagamento.meioPagamento === 'Cartão Crédito' && !novoPagamento.parcelas) {
      toast({ title: "Erro", description: "Selecione o número de parcelas", variant: "destructive" });
      return;
    }
    
    const parcelas = novoPagamento.meioPagamento === 'Cartão Crédito' 
      ? novoPagamento.parcelas 
      : novoPagamento.meioPagamento === 'Cartão Débito' 
        ? 1 
        : undefined;
    
    const valorParcela = parcelas && parcelas > 0 ? novoPagamento.valor! / parcelas : undefined;
    
    const pagamento: Pagamento = {
      id: `PAG-${Date.now()}`,
      meioPagamento: novoPagamento.meioPagamento!,
      valor: novoPagamento.valor!,
      contaDestino: novoPagamento.contaDestino!,
      parcelas,
      valorParcela,
      descricao: novoPagamento.descricao
    };
    
    setPagamentos([...pagamentos, pagamento]);
    setShowPagamentoModal(false);
    setNovoPagamento({});
  };

  // Validar venda - removido localRetirada
  const canSubmit = useMemo(() => {
    return (
      lojaVenda &&
      vendedor &&
      clienteId &&
      origemVenda &&
      acessorios.length > 0 &&
      valorPendente <= 0
    );
  }, [lojaVenda, vendedor, clienteId, origemVenda, acessorios.length, valorPendente]);

  const handleRegistrarVenda = () => {
    if (!canSubmit) return;
    setConfirmVendedor(vendedor);
    setConfirmLoja(lojaVenda);
    setShowConfirmacaoModal(true);
  };

  const handleConfirmarVenda = () => {
    // Subtrair acessórios do estoque
    acessorios.forEach(item => {
      subtrairEstoqueAcessorio(item.acessorioId, item.quantidade);
    });

    toast({
      title: "Venda registrada com sucesso!",
      description: `Venda de acessórios ${vendaInfo.id} registrada!`,
    });

    setShowConfirmacaoModal(false);
    navigate('/vendas');
  };

  const getColaboradorNome = (id: string) => {
    const col = colaboradores.find(c => c.id === id);
    return col?.nome || id;
  };

  const getLojaNome = (id: string) => {
    const loja = lojas.find(l => l.id === id);
    return loja?.nome || id;
  };

  const getContaNome = (id: string) => {
    const conta = contasFinanceiras.find(c => c.id === id);
    return conta?.nome || id;
  };

  return (
    <VendasLayout title="Venda - Balcão">
      <div className="mb-4">
        <Button variant="ghost" onClick={() => navigate('/vendas')} className="gap-2">
          <span>←</span> Voltar
        </Button>
      </div>

      {timer !== null && (
        <div className={`fixed top-20 right-6 z-50 p-4 rounded-lg shadow-lg flex items-center gap-3 ${
          timer <= 30 ? 'bg-destructive text-destructive-foreground animate-pulse' : 'bg-primary text-primary-foreground'
        }`}>
          <Clock className="h-5 w-5" />
          <span className="text-2xl font-mono font-bold">{formatTimer(timer)}</span>
        </div>
      )}

      <div className="space-y-6">
        {/* Info da Venda */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Informações da Venda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium">ID da Venda</label>
                <Input value={vendaInfo.id} disabled className="bg-muted" />
              </div>
              <div>
                <label className="text-sm font-medium">Nº da Venda</label>
                <Input value={vendaInfo.numero} disabled className="bg-muted" />
              </div>
              <div>
                <label className="text-sm font-medium">Loja de Venda *</label>
                <Select value={lojaVenda} onValueChange={setLojaVenda}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a loja" />
                  </SelectTrigger>
                  <SelectContent>
                    {lojas.filter(l => l.status === 'Ativo').map(loja => (
                      <SelectItem key={loja.id} value={loja.id}>{loja.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Responsável *</label>
                <Select value={vendedor} onValueChange={setVendedor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendedoresDisponiveis.map(col => (
                      <SelectItem key={col.id} value={col.id}>{col.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cliente */}
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
                    value={clienteNome} 
                    placeholder="Nome do Cliente"
                    className="flex-1"
                    readOnly
                  />
                  <Button onClick={() => setShowClienteModal(true)}>
                    <Search className="h-4 w-4 mr-2" />
                    Buscar
                  </Button>
                </div>
                
                {clienteId && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground">CPF</label>
                      <p className="font-medium">{clienteCpf}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Telefone</label>
                      <p className="font-medium">{clienteTelefone}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="text-sm font-medium">Origem da Venda *</label>
                <Select value={origemVenda} onValueChange={setOrigemVenda}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a origem" />
                  </SelectTrigger>
                  <SelectContent>
                    {origensVenda.filter(o => o.status === 'Ativo').map(origem => (
                      <SelectItem key={origem.id} value={origem.origem}>{origem.origem}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Acessórios */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Acessórios
              </span>
              <Button onClick={() => setShowAcessorioModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Selecionar Acessórios
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {acessorios.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum acessório adicionado.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Acessório</TableHead>
                    <TableHead className="text-center">Qtd</TableHead>
                    <TableHead className="text-right">Custo Unit.</TableHead>
                    <TableHead className="text-right">Valor Recomendado</TableHead>
                    <TableHead className="text-right">Valor Unit.</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead className="text-right">Lucro</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {acessorios.map(item => {
                    const acessorioOriginal = acessoriosEstoque.find(a => a.id === item.acessorioId);
                    const custoUnit = acessorioOriginal?.valorCusto || 0;
                    const lucroItem = item.valorTotal - (custoUnit * item.quantidade);
                    return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.descricao}</TableCell>
                      <TableCell className="text-center">{item.quantidade}</TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm">
                        {formatCurrency(custoUnit)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(item.valorRecomendado)}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(item.valorUnitario)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.valorTotal)}</TableCell>
                      <TableCell className="text-right">
                        <span className={`font-bold ${lucroItem >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                          {formatCurrency(lucroItem)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleRemoveAcessorio(item.id)}
                        >
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );})}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Pagamentos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Pagamentos
              </span>
              <Button variant="outline" onClick={() => setShowPagamentoModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Pagamento
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pagamentos.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                Nenhum pagamento adicionado.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Meio de Pagamento</TableHead>
                    <TableHead>Conta de Destino</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagamentos.map(pag => (
                    <TableRow key={pag.id}>
                      <TableCell className="font-medium">{pag.meioPagamento}</TableCell>
                      <TableCell>{getContaNome(pag.contaDestino)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(pag.valor)}</TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setPagamentos(pagamentos.filter(p => p.id !== pag.id))}
                        >
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            
            {valorPendente > 0 && (
              <div className="mt-4 p-3 bg-destructive/10 rounded-lg flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">Valor Pendente: {formatCurrency(valorPendente)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Observações */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Observações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea 
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Observações da venda..."
            />
          </CardContent>
        </Card>

        {/* Resumo */}
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Resumo da Venda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal Acessórios</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              {taxaEntrega > 0 && (
                <div className="flex justify-between">
                  <span>Taxa de Entrega</span>
                  <span className="font-medium">{formatCurrency(taxaEntrega)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>TOTAL</span>
                <span>{formatCurrency(total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total Pago</span>
                <span className="text-green-600">{formatCurrency(totalPagamentos)}</span>
              </div>
              {valorPendente > 0 && (
                <div className="flex justify-between text-sm text-destructive">
                  <span>Valor Pendente</span>
                  <span>{formatCurrency(valorPendente)}</span>
                </div>
              )}
            </div>
            
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => navigate('/vendas')}>
                Cancelar
              </Button>
              <Button 
                onClick={handleRegistrarVenda}
                disabled={!canSubmit}
                className="gap-2"
              >
                <Check className="h-4 w-4" />
                Registrar Venda
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal Buscar Cliente */}
      <Dialog open={showClienteModal} onOpenChange={setShowClienteModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Buscar Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input 
                placeholder="Buscar por nome ou CPF..."
                value={buscaCliente}
                onChange={(e) => setBuscaCliente(e.target.value)}
              />
              <Button variant="outline" onClick={() => {
                setShowClienteModal(false);
                setShowNovoClienteModal(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Novo
              </Button>
            </div>
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Telefone</TableHead>
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
                        <Button 
                          size="sm"
                          onClick={() => handleSelectCliente(cliente)}
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

      {/* Modal Novo Cliente */}
      <Dialog open={showNovoClienteModal} onOpenChange={setShowNovoClienteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome *</label>
              <Input 
                value={novoCliente.nome || ''}
                onChange={(e) => setNovoCliente({ ...novoCliente, nome: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">CPF/CNPJ *</label>
              <Input 
                value={novoCliente.cpf || ''}
                onChange={(e) => setNovoCliente({ ...novoCliente, cpf: formatCpfCnpj(e.target.value) })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Telefone</label>
              <Input 
                value={novoCliente.telefone || ''}
                onChange={(e) => setNovoCliente({ ...novoCliente, telefone: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">E-mail</label>
              <Input 
                value={novoCliente.email || ''}
                onChange={(e) => setNovoCliente({ ...novoCliente, email: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNovoClienteModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddCliente}>
              Cadastrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Selecionar Acessório */}
      <Dialog open={showAcessorioModal} onOpenChange={setShowAcessorioModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Selecionar Acessório</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input 
              placeholder="Buscar acessório..."
              value={buscaAcessorio}
              onChange={(e) => setBuscaAcessorio(e.target.value)}
            />
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-center">Qtd Disponível</TableHead>
                    <TableHead className="text-right">Valor Custo</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {acessoriosFiltrados.map(acessorio => (
                    <TableRow 
                      key={acessorio.id}
                      className={acessorioSelecionado?.id === acessorio.id ? 'bg-muted' : ''}
                    >
                      <TableCell className="font-mono">{acessorio.id}</TableCell>
                      <TableCell className="font-medium">{acessorio.descricao}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={acessorio.quantidade < 10 ? 'destructive' : 'secondary'}>
                          {acessorio.quantidade}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(acessorio.valorCusto)}</TableCell>
                      <TableCell>
                        <Button 
                          size="sm"
                          variant={acessorioSelecionado?.id === acessorio.id ? 'default' : 'outline'}
                          onClick={() => setAcessorioSelecionado(acessorio)}
                        >
                          {acessorioSelecionado?.id === acessorio.id ? 'Selecionado' : 'Selecionar'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {acessorioSelecionado && (
              <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                <span className="font-medium">{acessorioSelecionado.descricao}</span>
                <div className="flex items-center gap-2">
                  <label className="text-sm">Quantidade:</label>
                  <Input 
                    type="number"
                    min="1"
                    max={acessorioSelecionado.quantidade}
                    value={quantidadeAcessorio}
                    onChange={(e) => setQuantidadeAcessorio(parseInt(e.target.value) || 1)}
                    className="w-20"
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAcessorioModal(false);
              setAcessorioSelecionado(null);
            }}>
              Cancelar
            </Button>
            <Button onClick={handleAddAcessorio} disabled={!acessorioSelecionado}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Adicionar Pagamento */}
      <Dialog open={showPagamentoModal} onOpenChange={setShowPagamentoModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Meio de Pagamento *</label>
              <Select 
                value={novoPagamento.meioPagamento || ''}
                onValueChange={(v) => {
                  if (v === 'Cartão Débito') {
                    setNovoPagamento({ ...novoPagamento, meioPagamento: v, parcelas: 1 });
                  } else if (v === 'Cartão Crédito') {
                    setNovoPagamento({ ...novoPagamento, meioPagamento: v, parcelas: novoPagamento.parcelas || 1 });
                  } else {
                    setNovoPagamento({ ...novoPagamento, meioPagamento: v, parcelas: undefined });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pix">Pix</SelectItem>
                  <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="Cartão Débito">Cartão Débito</SelectItem>
                  <SelectItem value="Cartão Crédito">Cartão Crédito</SelectItem>
                  <SelectItem value="Boleto">Boleto</SelectItem>
                  <SelectItem value="Transferência">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Valor *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                <Input 
                  type="text"
                  value={(novoPagamento.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setNovoPagamento({ ...novoPagamento, valor: Number(value) / 100 });
                  }}
                  className="pl-10"
                />
              </div>
            </div>
            
            {/* Parcelas para Cartão Crédito */}
            {novoPagamento.meioPagamento === 'Cartão Crédito' && (
              <div>
                <label className="text-sm font-medium">Número de Parcelas *</label>
                <Select 
                  value={String(novoPagamento.parcelas || 1)} 
                  onValueChange={(v) => setNovoPagamento({ ...novoPagamento, parcelas: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 18 }, (_, i) => i + 1).map(num => (
                      <SelectItem key={num} value={String(num)}>{num}x</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {novoPagamento.valor && novoPagamento.parcelas && novoPagamento.parcelas > 1 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {novoPagamento.parcelas}x de {formatCurrency(novoPagamento.valor / novoPagamento.parcelas)}
                  </p>
                )}
              </div>
            )}
            
            {novoPagamento.meioPagamento === 'Cartão Débito' && (
              <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                Cartão de Débito: pagamento à vista (1x)
              </div>
            )}
            
            <div>
              <label className="text-sm font-medium">Conta de Destino *</label>
              <Select 
                value={novoPagamento.contaDestino || ''}
                onValueChange={(v) => setNovoPagamento({ ...novoPagamento, contaDestino: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {contasFinanceiras.map(conta => (
                    <SelectItem key={conta.id} value={conta.id}>{conta.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Descrição (opcional)</label>
              <Textarea 
                value={novoPagamento.descricao || ''}
                onChange={(e) => setNovoPagamento({ ...novoPagamento, descricao: e.target.value })}
                placeholder="Observações sobre o pagamento..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPagamentoModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddPagamento}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmação */}
      <Dialog open={showConfirmacaoModal} onOpenChange={setShowConfirmacaoModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Venda</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Confirme os dados para registrar a venda:</p>
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Vendedor</p>
                <p className="font-medium">{getColaboradorNome(confirmVendedor)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Loja</p>
                <p className="font-medium">{getLojaNome(confirmLoja)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cliente</p>
                <p className="font-medium">{clienteNome}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="font-medium text-lg">{formatCurrency(total)}</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmacaoModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmarVenda}>
              Confirmar Venda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </VendasLayout>
  );
}
