import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  getNextOSNumber, 
  addOrdemServico, 
  getHistoricoOSCliente, 
  verificarIMEIEmOSAtiva,
  formatCurrency,
  PecaServico,
  Pagamento,
  TimelineOS
} from '@/utils/assistenciaApi';
import { 
  getClientes, 
  getLojas, 
  getColaboradoresByPermissao, 
  getFornecedores,
  addCliente,
  Cliente,
  calcularTipoPessoa
} from '@/utils/cadastrosApi';
import { Plus, Trash2, Search, AlertTriangle, Clock, User, History, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface PecaForm {
  peca: string;
  imei: string;
  valor: string;
  percentual: string;
  servicoTerceirizado: boolean;
  descricaoTerceirizado: string;
  fornecedorId: string;
  unidadeServico: string;
  pecaNoEstoque: boolean;
  pecaDeFornecedor: boolean;
}

interface PagamentoForm {
  meio: string;
  valor: string;
  parcelas: string;
}

export default function OSAssistenciaNova() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [osInfo] = useState(getNextOSNumber());
  const [dataHora] = useState(new Date().toISOString());
  
  const clientes = getClientes();
  const lojas = getLojas();
  const tecnicos = getColaboradoresByPermissao('Assistência');
  const fornecedores = getFornecedores().filter(f => f.status === 'Ativo');

  // Form state
  const [lojaId, setLojaId] = useState('');
  const [tecnicoId, setTecnicoId] = useState('');
  const [setor, setSetor] = useState<'GARANTIA' | 'ASSISTÊNCIA' | 'TROCA' | ''>('');
  const [clienteId, setClienteId] = useState('');
  const [descricao, setDescricao] = useState('');
  const [status, setStatus] = useState<'Serviço concluído' | 'Em serviço' | 'Aguardando Peça'>('Em serviço');

  // Peças
  const [pecas, setPecas] = useState<PecaForm[]>([
    { peca: '', imei: '', valor: '', percentual: '', servicoTerceirizado: false, descricaoTerceirizado: '', fornecedorId: '', unidadeServico: '', pecaNoEstoque: false, pecaDeFornecedor: false }
  ]);

  // Pagamentos
  const [pagamentos, setPagamentos] = useState<PagamentoForm[]>([
    { meio: '', valor: '', parcelas: '' }
  ]);

  // Dialogs
  const [buscarClienteOpen, setBuscarClienteOpen] = useState(false);
  const [novoClienteOpen, setNovoClienteOpen] = useState(false);
  const [confirmarOpen, setConfirmarOpen] = useState(false);
  const [buscarClienteTermo, setBuscarClienteTermo] = useState('');
  const [historicoCliente, setHistoricoCliente] = useState<any[]>([]);

  // Novo cliente form
  const [novoClienteForm, setNovoClienteForm] = useState({
    nome: '',
    cpf: '',
    telefone: '',
    dataNascimento: '',
    email: '',
    cep: '',
    endereco: '',
    numero: '',
    bairro: '',
    cidade: '',
    estado: ''
  });

  // Confirmação form
  const [confirmTecnico, setConfirmTecnico] = useState('');
  const [confirmLoja, setConfirmLoja] = useState('');
  const [confirmData, setConfirmData] = useState(new Date().toISOString().split('T')[0]);

  // Cliente selecionado
  const clienteSelecionado = clientes.find(c => c.id === clienteId);

  // Clientes filtrados para busca
  const clientesFiltrados = clientes.filter(c => {
    if (!buscarClienteTermo) return true;
    const termo = buscarClienteTermo.toLowerCase();
    return c.nome.toLowerCase().includes(termo) || c.cpf.includes(termo);
  });

  // Carregar histórico do cliente quando selecionado
  useEffect(() => {
    if (clienteId) {
      const historico = getHistoricoOSCliente(clienteId);
      setHistoricoCliente(historico);
    }
  }, [clienteId]);

  // Calcular totais
  const calcularValorTotalPeca = (peca: PecaForm) => {
    const valor = parseFloat(peca.valor.replace(/\D/g, '')) / 100 || 0;
    const percentual = parseFloat(peca.percentual) || 0;
    return valor - (valor * percentual / 100);
  };

  const valorTotalPecas = pecas.reduce((acc, p) => acc + calcularValorTotalPeca(p), 0);
  const valorTotalPagamentos = pagamentos.reduce((acc, p) => {
    const valor = parseFloat(p.valor.replace(/\D/g, '')) / 100 || 0;
    return acc + valor;
  }, 0);

  // Format currency input
  const formatCurrencyInput = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const amount = parseInt(numbers || '0') / 100;
    return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Handlers
  const handlePecaChange = (index: number, field: keyof PecaForm, value: any) => {
    const newPecas = [...pecas];
    newPecas[index] = { ...newPecas[index], [field]: value };
    setPecas(newPecas);
  };

  const addPeca = () => {
    setPecas([...pecas, { peca: '', imei: '', valor: '', percentual: '', servicoTerceirizado: false, descricaoTerceirizado: '', fornecedorId: '', unidadeServico: '', pecaNoEstoque: false, pecaDeFornecedor: false }]);
  };

  const removePeca = (index: number) => {
    if (pecas.length > 1) {
      setPecas(pecas.filter((_, i) => i !== index));
    }
  };

  const handlePagamentoChange = (index: number, field: keyof PagamentoForm, value: string) => {
    const newPagamentos = [...pagamentos];
    newPagamentos[index] = { ...newPagamentos[index], [field]: value };
    setPagamentos(newPagamentos);
  };

  const addPagamento = () => {
    setPagamentos([...pagamentos, { meio: '', valor: '', parcelas: '' }]);
  };

  const removePagamento = (index: number) => {
    if (pagamentos.length > 1) {
      setPagamentos(pagamentos.filter((_, i) => i !== index));
    }
  };

  const handleSelecionarCliente = (cliente: Cliente) => {
    if (cliente.status === 'Inativo') {
      toast({
        title: 'Cliente Bloqueado',
        description: 'Este cliente está inativo e não pode ser selecionado.',
        variant: 'destructive'
      });
      return;
    }
    setClienteId(cliente.id);
    setBuscarClienteOpen(false);
  };

  const handleSalvarNovoCliente = () => {
    if (!novoClienteForm.nome || !novoClienteForm.cpf) {
      toast({
        title: 'Erro',
        description: 'Nome e CPF são obrigatórios',
        variant: 'destructive'
      });
      return;
    }

    const novoCliente = addCliente({
      ...novoClienteForm,
      status: 'Ativo',
      origemCliente: 'Assistência',
      idsCompras: []
    });

    setClienteId(novoCliente.id);
    setNovoClienteOpen(false);
    setBuscarClienteOpen(false);
    toast({
      title: 'Sucesso',
      description: 'Cliente cadastrado com sucesso!'
    });
  };

  const validarIMEIs = () => {
    for (const peca of pecas) {
      if (peca.imei) {
        const osAtiva = verificarIMEIEmOSAtiva(peca.imei);
        if (osAtiva) {
          toast({
            title: 'IMEI em OS Aberta',
            description: `O IMEI ${peca.imei} já está em uma OS aberta (${osAtiva.id}). Não é permitido registrar.`,
            variant: 'destructive'
          });
          return false;
        }
      }
    }
    return true;
  };

  const validarFormulario = () => {
    if (!lojaId) {
      toast({ title: 'Erro', description: 'Selecione uma loja', variant: 'destructive' });
      return false;
    }
    if (!tecnicoId) {
      toast({ title: 'Erro', description: 'Selecione um técnico', variant: 'destructive' });
      return false;
    }
    if (!setor) {
      toast({ title: 'Erro', description: 'Selecione um setor', variant: 'destructive' });
      return false;
    }
    if (!clienteId) {
      toast({ title: 'Erro', description: 'Selecione um cliente', variant: 'destructive' });
      return false;
    }
    if (!status) {
      toast({ title: 'Erro', description: 'Selecione um status', variant: 'destructive' });
      return false;
    }

    // Verificar se há alguma peça aguardando -> forçar status
    const temPecaAguardando = pecas.some(p => !p.pecaNoEstoque && p.pecaDeFornecedor);
    if (temPecaAguardando && status === 'Serviço concluído') {
      toast({ 
        title: 'Status Inválido', 
        description: 'Há peças aguardando do fornecedor. O status não pode ser "Serviço concluído".', 
        variant: 'destructive' 
      });
      return false;
    }

    return validarIMEIs();
  };

  const handleAbrirConfirmacao = () => {
    if (!validarFormulario()) return;
    setConfirmTecnico(tecnicoId);
    setConfirmLoja(lojaId);
    setConfirmarOpen(true);
  };

  const handleRegistrarOS = () => {
    const tecnicoObj = tecnicos.find(t => t.id === confirmTecnico);
    const lojaObj = lojas.find(l => l.id === confirmLoja);

    if (confirmTecnico !== tecnicoId || confirmLoja !== lojaId) {
      toast({
        title: 'Confirmação Inválida',
        description: 'Os dados de confirmação não conferem.',
        variant: 'destructive'
      });
      return;
    }

    const pecasFormatadas: PecaServico[] = pecas.map((p, i) => ({
      id: `PC-${Date.now()}-${i}`,
      peca: p.peca,
      imei: p.imei || undefined,
      valor: parseFloat(p.valor.replace(/\D/g, '')) / 100 || 0,
      percentual: parseFloat(p.percentual) || 0,
      valorTotal: calcularValorTotalPeca(p),
      servicoTerceirizado: p.servicoTerceirizado,
      descricaoTerceirizado: p.descricaoTerceirizado || undefined,
      fornecedorId: p.fornecedorId || undefined,
      unidadeServico: p.unidadeServico,
      pecaNoEstoque: p.pecaNoEstoque,
      pecaDeFornecedor: p.pecaDeFornecedor
    }));

    const pagamentosFormatados: Pagamento[] = pagamentos
      .filter(p => p.meio && p.valor)
      .map((p, i) => ({
        id: `PAG-${Date.now()}-${i}`,
        meio: p.meio,
        valor: parseFloat(p.valor.replace(/\D/g, '')) / 100 || 0,
        parcelas: p.parcelas ? parseInt(p.parcelas) : undefined
      }));

    const timeline: TimelineOS[] = [
      {
        data: dataHora,
        tipo: 'registro',
        descricao: 'OS registrada',
        responsavel: tecnicoObj?.nome || ''
      }
    ];

    const novaOS = addOrdemServico({
      dataHora,
      clienteId,
      setor: setor as 'GARANTIA' | 'ASSISTÊNCIA' | 'TROCA',
      tecnicoId,
      lojaId,
      status,
      pecas: pecasFormatadas,
      pagamentos: pagamentosFormatados,
      descricao,
      timeline,
      valorTotal: valorTotalPecas,
      custoTotal: 0
    });

    toast({
      title: 'Sucesso!',
      description: `OS ${novaOS.id} registrada com sucesso!`
    });

    setConfirmarOpen(false);
    navigate('/os/assistencia');
  };

  // Format CPF/CNPJ
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

  return (
    <PageLayout title="Nova Assistência">
      <div className="mb-4">
        <Button variant="outline" onClick={() => navigate('/os/assistencia')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </div>

      <div className="space-y-6">
        {/* Informações da OS */}
        <Card>
          <CardHeader>
            <CardTitle>Informações da OS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Nº OS</Label>
                <Input value={osInfo.id} disabled className="font-mono bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Data/Hora</Label>
                <Input value={new Date(dataHora).toLocaleString('pt-BR')} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Loja *</Label>
                <Select value={lojaId} onValueChange={setLojaId}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {lojas.filter(l => l.status === 'Ativo').map(l => (
                      <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Técnico *</Label>
                <Select value={tecnicoId} onValueChange={setTecnicoId}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {tecnicos.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Setor *</Label>
                <Select value={setor} onValueChange={(v) => setSetor(v as any)}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GARANTIA">Garantia</SelectItem>
                    <SelectItem value="ASSISTÊNCIA">Assistência</SelectItem>
                    <SelectItem value="TROCA">Troca</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status *</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Serviço concluído">Serviço concluído</SelectItem>
                    <SelectItem value="Em serviço">Em serviço</SelectItem>
                    <SelectItem value="Aguardando Peça">Aguardando Peça</SelectItem>
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
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input 
                  value={clienteSelecionado?.nome || ''} 
                  placeholder="Nenhum cliente selecionado" 
                  disabled 
                  className="flex-1"
                />
                <Button onClick={() => setBuscarClienteOpen(true)}>
                  <Search className="mr-2 h-4 w-4" />
                  Buscar Cliente
                </Button>
              </div>

              {clienteSelecionado && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <Label className="text-xs text-muted-foreground">CPF/CNPJ</Label>
                    <p className="font-medium">{clienteSelecionado.cpf}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Telefone</Label>
                    <p className="font-medium">{clienteSelecionado.telefone}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">E-mail</Label>
                    <p className="font-medium">{clienteSelecionado.email}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Cidade</Label>
                    <p className="font-medium">{clienteSelecionado.cidade}/{clienteSelecionado.estado}</p>
                  </div>
                </div>
              )}

              {clienteId && historicoCliente.length > 0 && (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <History className="h-4 w-4" />
                      Histórico do Cliente (Últimas 3 OS)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    <div className="space-y-2">
                      {historicoCliente.map(h => (
                        <div key={h.osId} className="flex justify-between items-center p-2 bg-muted/50 rounded text-sm">
                          <div>
                            <span className="font-mono">{h.osId}</span>
                            <span className="text-muted-foreground ml-2">
                              {new Date(h.data).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{h.setor}</Badge>
                            <span className="font-medium">{formatCurrency(h.valorTotal)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Peças/Serviços */}
        <Card>
          <CardHeader>
            <CardTitle>Peças/Serviços</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pecas.map((peca, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label>Peça/Serviço</Label>
                      <Input
                        value={peca.peca}
                        onChange={e => handlePecaChange(index, 'peca', e.target.value)}
                        placeholder="Descrição da peça ou serviço"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>IMEI (se aplicável)</Label>
                      <Input
                        value={peca.imei}
                        onChange={e => handlePecaChange(index, 'imei', e.target.value)}
                        placeholder="IMEI"
                        maxLength={15}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Valor (R$)</Label>
                      <Input
                        value={peca.valor}
                        onChange={e => handlePecaChange(index, 'valor', formatCurrencyInput(e.target.value))}
                        placeholder="R$ 0,00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Desconto (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={peca.percentual}
                        onChange={e => handlePecaChange(index, 'percentual', e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Unidade de Serviço</Label>
                      <Select value={peca.unidadeServico} onValueChange={v => handlePecaChange(index, 'unidadeServico', v)}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {lojas.filter(l => l.status === 'Ativo').map(l => (
                            <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Valor Total</Label>
                      <Input 
                        value={formatCurrency(calcularValorTotalPeca(peca))} 
                        disabled 
                        className="bg-muted font-medium"
                      />
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={peca.pecaNoEstoque}
                            onCheckedChange={checked => handlePecaChange(index, 'pecaNoEstoque', checked)}
                          />
                          <Label className="text-sm">Peça no estoque</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={peca.pecaDeFornecedor}
                            onCheckedChange={checked => handlePecaChange(index, 'pecaDeFornecedor', checked)}
                          />
                          <Label className="text-sm">Fornecedor</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={peca.servicoTerceirizado}
                            onCheckedChange={checked => handlePecaChange(index, 'servicoTerceirizado', checked)}
                          />
                          <Label className="text-sm">Serviço Terceirizado</Label>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removePeca(index)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {peca.pecaDeFornecedor && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
                      <div className="space-y-2">
                        <Label>Fornecedor</Label>
                        <Select value={peca.fornecedorId} onValueChange={v => handlePecaChange(index, 'fornecedorId', v)}>
                          <SelectTrigger><SelectValue placeholder="Selecione o fornecedor..." /></SelectTrigger>
                          <SelectContent>
                            {fornecedores.map(f => (
                              <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {peca.servicoTerceirizado && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
                      <div className="space-y-2">
                        <Label>Descrição do Serviço Terceirizado</Label>
                        <Input
                          value={peca.descricaoTerceirizado}
                          onChange={e => handlePecaChange(index, 'descricaoTerceirizado', e.target.value)}
                          placeholder="Descreva o serviço..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Fornecedor do Serviço</Label>
                        <Select value={peca.fornecedorId} onValueChange={v => handlePecaChange(index, 'fornecedorId', v)}>
                          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                          <SelectContent>
                            {fornecedores.map(f => (
                              <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <Button variant="outline" onClick={addPeca}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Peça/Serviço
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Pagamentos */}
        <Card>
          <CardHeader>
            <CardTitle>Pagamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pagamentos.map((pag, index) => (
                <div key={index} className="flex gap-4 items-end">
                  <div className="space-y-2 flex-1">
                    <Label>Meio de Pagamento</Label>
                    <Select value={pag.meio} onValueChange={v => handlePagamentoChange(index, 'meio', v)}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pix">Pix</SelectItem>
                        <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                        <SelectItem value="Cartão Débito">Cartão Débito</SelectItem>
                        <SelectItem value="Cartão Crédito">Cartão Crédito</SelectItem>
                        <SelectItem value="Boleto">Boleto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 flex-1">
                    <Label>Valor</Label>
                    <Input
                      value={pag.valor}
                      onChange={e => handlePagamentoChange(index, 'valor', formatCurrencyInput(e.target.value))}
                      placeholder="R$ 0,00"
                    />
                  </div>
                  {(pag.meio === 'Cartão Crédito' || pag.meio === 'Boleto') && (
                    <div className="space-y-2 w-24">
                      <Label>Parcelas</Label>
                      <Input
                        type="number"
                        min="1"
                        max="12"
                        value={pag.parcelas}
                        onChange={e => handlePagamentoChange(index, 'parcelas', e.target.value)}
                        placeholder="1"
                      />
                    </div>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => removePagamento(index)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}

              <Button variant="outline" onClick={addPagamento}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Pagamento
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Descrição */}
        <Card>
          <CardHeader>
            <CardTitle>Descrição Detalhada</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder="Descreva os detalhes do serviço..."
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Resumo */}
        <Card>
          <CardHeader>
            <CardTitle>Resumo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">Total Peças/Serviços</div>
                <div className="text-2xl font-bold">{formatCurrency(valorTotalPecas)}</div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">Total Pagamentos</div>
                <div className="text-2xl font-bold">{formatCurrency(valorTotalPagamentos)}</div>
              </div>
              <div className={cn(
                "p-4 rounded-lg",
                valorTotalPagamentos >= valorTotalPecas ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"
              )}>
                <div className="text-sm text-muted-foreground">Diferença</div>
                <div className="text-2xl font-bold">
                  {formatCurrency(valorTotalPagamentos - valorTotalPecas)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Botão Registrar */}
        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={() => navigate('/os/assistencia')}>
            Cancelar
          </Button>
          <Button onClick={handleAbrirConfirmacao}>
            Registrar Assistência
          </Button>
        </div>
      </div>

      {/* Dialog Buscar Cliente */}
      <Dialog open={buscarClienteOpen} onOpenChange={setBuscarClienteOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Buscar Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Buscar por nome ou CPF..."
                value={buscarClienteTermo}
                onChange={e => setBuscarClienteTermo(e.target.value)}
              />
              <Button variant="outline" onClick={() => setNovoClienteOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Cliente
              </Button>
            </div>
            <div className="rounded-md border max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF/CNPJ</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientesFiltrados.map(c => (
                    <TableRow key={c.id} className={c.status === 'Inativo' ? 'opacity-50' : ''}>
                      <TableCell>{c.nome}</TableCell>
                      <TableCell className="font-mono text-xs">{c.cpf}</TableCell>
                      <TableCell>{c.telefone}</TableCell>
                      <TableCell>
                        <Badge variant={c.status === 'Ativo' ? 'default' : 'destructive'}>
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => handleSelecionarCliente(c)}
                          disabled={c.status === 'Inativo'}
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

      {/* Dialog Novo Cliente */}
      <Dialog open={novoClienteOpen} onOpenChange={setNovoClienteOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Cliente</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={novoClienteForm.nome}
                onChange={e => setNovoClienteForm({ ...novoClienteForm, nome: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>CPF/CNPJ *</Label>
              <Input
                value={novoClienteForm.cpf}
                onChange={e => setNovoClienteForm({ ...novoClienteForm, cpf: formatCpfCnpj(e.target.value) })}
                maxLength={18}
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                value={novoClienteForm.telefone}
                onChange={e => setNovoClienteForm({ ...novoClienteForm, telefone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Data de Nascimento</Label>
              <Input
                type="date"
                value={novoClienteForm.dataNascimento}
                onChange={e => setNovoClienteForm({ ...novoClienteForm, dataNascimento: e.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>E-mail</Label>
              <Input
                type="email"
                value={novoClienteForm.email}
                onChange={e => setNovoClienteForm({ ...novoClienteForm, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>CEP</Label>
              <Input
                value={novoClienteForm.cep}
                onChange={e => setNovoClienteForm({ ...novoClienteForm, cep: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Endereço</Label>
              <Input
                value={novoClienteForm.endereco}
                onChange={e => setNovoClienteForm({ ...novoClienteForm, endereco: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Número</Label>
              <Input
                value={novoClienteForm.numero}
                onChange={e => setNovoClienteForm({ ...novoClienteForm, numero: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Bairro</Label>
              <Input
                value={novoClienteForm.bairro}
                onChange={e => setNovoClienteForm({ ...novoClienteForm, bairro: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Cidade</Label>
              <Input
                value={novoClienteForm.cidade}
                onChange={e => setNovoClienteForm({ ...novoClienteForm, cidade: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Input
                value={novoClienteForm.estado}
                onChange={e => setNovoClienteForm({ ...novoClienteForm, estado: e.target.value })}
                maxLength={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Origem</Label>
              <Input value="Assistência" disabled className="bg-muted" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovoClienteOpen(false)}>Cancelar</Button>
            <Button onClick={handleSalvarNovoCliente}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmação */}
      <Dialog open={confirmarOpen} onOpenChange={setConfirmarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Registro de OS</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Confirme os dados abaixo para registrar a OS {osInfo.id}:
            </p>
            <div className="space-y-2">
              <Label>Técnico</Label>
              <Select value={confirmTecnico} onValueChange={setConfirmTecnico}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {tecnicos.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Loja</Label>
              <Select value={confirmLoja} onValueChange={setConfirmLoja}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {lojas.filter(l => l.status === 'Ativo').map(l => (
                    <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                type="date"
                value={confirmData}
                onChange={e => setConfirmData(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmarOpen(false)}>Cancelar</Button>
            <Button 
              onClick={handleRegistrarOS}
              disabled={confirmTecnico !== tecnicoId || confirmLoja !== lojaId}
            >
              Confirmar Registro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
