import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GarantiasLayout } from '@/components/layout/GarantiasLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  ArrowLeft, Shield, User, Phone, Mail, Save, Search, Plus, 
  FileText, Package, Clock, Award, Smartphone, Wrench, ArrowRightLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { getProdutosCadastro, getClientes, addCliente, Cliente, calcularTipoPessoa } from '@/utils/cadastrosApi';
import { useCadastroStore } from '@/store/cadastroStore';
import { AutocompleteLoja } from '@/components/AutocompleteLoja';
import { addGarantia, addTimelineEntry, processarTratativaGarantia } from '@/utils/garantiasApi';
import { getPlanosPorModelo, PlanoGarantia, formatCurrency } from '@/utils/planosGarantiaApi';
import { getProdutos, Produto } from '@/utils/estoqueApi';
import { format, addMonths } from 'date-fns';
import { formatIMEI, unformatIMEI, displayIMEI } from '@/utils/imeiMask';

export default function GarantiasNovaManual() {
  const navigate = useNavigate();
  const { obterLojasTipoLoja, obterLojaById } = useCadastroStore();
  const lojas = obterLojasTipoLoja(); // Apenas lojas tipo 'Loja' sincronizadas com Cadastros
  const produtos = getProdutosCadastro();
  const [clientes, setClientes] = useState<Cliente[]>(getClientes());
  
  // Form state
  const [formData, setFormData] = useState<{
    imei: string;
    modelo: string;
    condicao: 'Novo' | 'Seminovo' | '';
    planoGarantiaId: string;
    tipoGarantia: 'Garantia - Apple' | 'Garantia - Thiago Imports';
    mesesGarantia: number;
    valorGarantia: number;
    dataInicioGarantia: string;
    dataFimGarantia: string; // Campo manual
    lojaVenda: string;
    clienteId: string;
    clienteNome: string;
    clienteTelefone: string;
    clienteEmail: string;
    observacoes: string;
    modoManual: boolean; // Flag para modo manual de garantia
  }>({
    imei: '',
    modelo: '',
    condicao: '',
    planoGarantiaId: '',
    tipoGarantia: 'Garantia - Thiago Imports',
    mesesGarantia: 12,
    valorGarantia: 0,
    dataInicioGarantia: format(new Date(), 'yyyy-MM-dd'),
    dataFimGarantia: format(addMonths(new Date(), 12), 'yyyy-MM-dd'),
    lojaVenda: '',
    clienteId: '',
    clienteNome: '',
    clienteTelefone: '',
    clienteEmail: '',
    observacoes: '',
    modoManual: true // Iniciando em modo manual por padrão
  });

  // Available warranty plans based on model and condition
  const [planosDisponiveis, setPlanosDisponiveis] = useState<PlanoGarantia[]>([]);

  // Update available plans when model or condition changes (only if not in manual mode)
  useEffect(() => {
    if (formData.modelo && formData.condicao && !formData.modoManual) {
      const planos = getPlanosPorModelo(formData.modelo, formData.condicao as 'Novo' | 'Seminovo');
      setPlanosDisponiveis(planos);
      // Reset selected plan when model/condition changes
      setFormData(prev => ({ 
        ...prev, 
        planoGarantiaId: '', 
        mesesGarantia: 12,
        valorGarantia: 0,
        tipoGarantia: 'Garantia - Apple'
      }));
    } else if (formData.modoManual) {
      // Em modo manual, não buscar planos automaticamente
      setPlanosDisponiveis([]);
    } else {
      setPlanosDisponiveis([]);
    }
  }, [formData.modelo, formData.condicao, formData.modoManual]);

  // Handle plan selection
  const handleSelectPlano = (planoId: string) => {
    const plano = planosDisponiveis.find(p => p.id === planoId);
    if (plano) {
      setFormData(prev => ({
        ...prev,
        planoGarantiaId: planoId,
        mesesGarantia: plano.meses,
        valorGarantia: plano.valor,
        tipoGarantia: plano.tipo === 'Apple' ? 'Garantia - Apple' : 'Garantia - Thiago Imports'
      }));
    }
  };

  const planoSelecionado = useMemo(() => {
    return planosDisponiveis.find(p => p.id === formData.planoGarantiaId);
  }, [planosDisponiveis, formData.planoGarantiaId]);

  // Client modals
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [showNovoClienteModal, setShowNovoClienteModal] = useState(false);
  const [buscaCliente, setBuscaCliente] = useState('');
  const [novoCliente, setNovoCliente] = useState<Partial<Cliente>>({});

  // Estados da tratativa
  const [tipoTratativa, setTipoTratativa] = useState<string>('');
  const [descricaoTratativa, setDescricaoTratativa] = useState('');
  const [showModalAparelho, setShowModalAparelho] = useState(false);
  const [aparelhoSelecionado, setAparelhoSelecionado] = useState<Produto | null>(null);
  const [buscaAparelho, setBuscaAparelho] = useState('');

  // Flag para indicar se precisa de aparelho
  const precisaAparelho = tipoTratativa === 'Assistência + Empréstimo' || tipoTratativa === 'Troca Direta';

  // Lista de aparelhos disponíveis - FILTRAR APENAS SEMINOVOS para empréstimo
  const aparelhosDisponiveis = useMemo(() => {
    const produtos = getProdutos();
    return produtos.filter(p => 
      p.quantidade > 0 && 
      p.tipo === 'Seminovo' && // Apenas Seminovos
      (buscaAparelho === '' || 
        p.imei?.toLowerCase().includes(buscaAparelho.toLowerCase()) ||
        p.modelo.toLowerCase().includes(buscaAparelho.toLowerCase()))
    );
  }, [buscaAparelho]);

  // Filtered clients - incluir todos para permitir ver bloqueados
  const clientesFiltrados = useMemo(() => {
    if (!buscaCliente) return clientes;
    const busca = buscaCliente.toLowerCase();
    return clientes.filter(c => 
      c.nome.toLowerCase().includes(busca) ||
      c.cpf.includes(busca) ||
      c.telefone.includes(busca)
    );
  }, [clientes, buscaCliente]);

  // Calculate end date - usar dataFimGarantia se modo manual, senão calcular
  const dataFimGarantiaCalculada = useMemo(() => {
    if (formData.modoManual && formData.dataFimGarantia) {
      return format(new Date(formData.dataFimGarantia), 'dd/MM/yyyy');
    }
    if (!formData.dataInicioGarantia || formData.mesesGarantia <= 0) return '-';
    const dataInicio = new Date(formData.dataInicioGarantia);
    return format(addMonths(dataInicio, formData.mesesGarantia), 'dd/MM/yyyy');
  }, [formData.dataInicioGarantia, formData.mesesGarantia, formData.dataFimGarantia, formData.modoManual]);

  const handleSelectCliente = (cliente: Cliente) => {
    // Bloquear seleção de clientes inativos
    if (cliente.status === 'Inativo') {
      toast.error('Este cliente está bloqueado e não pode ser selecionado.');
      return;
    }
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
  
  // Helper para formatar CPF/CNPJ
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

  const handleSelecionarAparelho = (produto: Produto) => {
    setAparelhoSelecionado(produto);
    setShowModalAparelho(false);
    setBuscaAparelho('');
  };

  const getTipoTimeline = (tipo: string) => {
    switch (tipo) {
      case 'Direcionado Apple': return 'tratativa';
      case 'Encaminhado Assistência': return 'os_criada';
      case 'Assistência + Empréstimo': return 'emprestimo';
      case 'Troca Direta': return 'troca';
      default: return 'tratativa';
    }
  };

  const getTituloTimeline = (tipo: string) => {
    switch (tipo) {
      case 'Direcionado Apple': return 'Cliente Direcionado para Apple';
      case 'Encaminhado Assistência': return 'Aparelho Encaminhado para Assistência';
      case 'Assistência + Empréstimo': return 'Assistência + Aparelho Emprestado';
      case 'Troca Direta': return 'Troca Direta Realizada';
      default: return 'Tratativa Registrada';
    }
  };

  const handleSalvar = () => {
    // Validations
    if (!formData.imei || !formData.modelo || !formData.condicao || !formData.lojaVenda || !formData.clienteNome) {
      toast.error('Preencha todos os campos obrigatórios (IMEI, Modelo, Condição, Loja e Cliente)');
      return;
    }

    // Em modo manual, não precisa de plano selecionado
    if (!formData.modoManual && !formData.planoGarantiaId) {
      toast.error('Selecione um plano de garantia');
      return;
    }

    const imeiLimpo = unformatIMEI(formData.imei);
    if (imeiLimpo.length !== 15) {
      toast.error('IMEI deve ter 15 dígitos');
      return;
    }

    // Validação de tratativa (opcional, mas se tiver tipo, precisa ter descrição)
    if (tipoTratativa && !descricaoTratativa) {
      toast.error('Preencha a descrição da tratativa');
      return;
    }

    if (precisaAparelho && tipoTratativa && !aparelhoSelecionado) {
      toast.error('Selecione um aparelho para esta tratativa');
      return;
    }

    // Em modo manual, usar a data fim manual; senão, calcular
    const dataFimCalc = formData.modoManual && formData.dataFimGarantia 
      ? formData.dataFimGarantia 
      : format(addMonths(new Date(formData.dataInicioGarantia), formData.mesesGarantia), 'yyyy-MM-dd');

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
      status: tipoTratativa ? 'Em Tratativa' : 'Ativa',
      lojaVenda: formData.lojaVenda,
      vendedorId: '',
      clienteId: formData.clienteId,
      clienteNome: formData.clienteNome,
      clienteTelefone: formData.clienteTelefone,
      clienteEmail: formData.clienteEmail
    });

    // Add timeline entry for warranty registration
    const planoInfo = planoSelecionado ? `Plano: ${planoSelecionado.nome} - ${formatCurrency(planoSelecionado.valor)}` : '';
    addTimelineEntry({
      garantiaId: novaGarantia.id,
      dataHora: new Date().toISOString(),
      tipo: 'registro_venda',
      titulo: 'Garantia Registrada Manualmente',
      descricao: `${formData.observacoes || 'Garantia registrada manualmente sem vínculo com venda'}. Condição: ${formData.condicao}. ${planoInfo}`,
      usuarioId: 'COL-001',
      usuarioNome: 'Usuário Sistema'
    });

    // Se tiver tratativa, usar o orquestrador atômico (mesmo fluxo da página de detalhes)
    if (tipoTratativa && descricaoTratativa) {
      const resultado = processarTratativaGarantia({
        garantiaId: novaGarantia.id,
        tipo: tipoTratativa as 'Direcionado Apple' | 'Encaminhado Assistência' | 'Assistência + Empréstimo' | 'Troca Direta',
        descricao: descricaoTratativa,
        usuarioId: 'COL-001',
        usuarioNome: 'Usuário Sistema',
        aparelhoSelecionado: aparelhoSelecionado,
      });

      if (!resultado.sucesso) {
        toast.error(resultado.erro || 'Erro ao processar tratativa');
        return;
      }

      if (resultado.osId) {
        toast.success(`Tratativa registrada! OS ${resultado.osId} criada automaticamente.`);
      }
    }

    toast.success('Garantia registrada com sucesso!');
    navigate(`/garantias/${novaGarantia.id}`);
  };

  const getLojaName = (id: string) => {
    const loja = obterLojaById(id);
    return loja?.nome || id;
  };

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
          Salvar Registro
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dados da Venda Original */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Dados da Venda Original
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">ID Venda</p>
                  <p className="font-medium text-muted-foreground italic">Registro Manual</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Data *</p>
                  <Input
                    type="date"
                    value={formData.dataInicioGarantia}
                    onChange={(e) => setFormData(prev => ({ ...prev, dataInicioGarantia: e.target.value }))}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Loja *</p>
                  <AutocompleteLoja
                    value={formData.lojaVenda}
                    onChange={(v) => setFormData(prev => ({ ...prev, lojaVenda: v }))}
                    apenasLojasTipoLoja={true}
                    placeholder="Selecione a loja"
                    className="h-9"
                  />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status Garantia</p>
                  <Badge variant="secondary" className="mt-1">Nova Garantia</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dados do Cliente */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Dados do Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nome *</p>
                  <p className="font-medium">{formData.clienteNome || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Telefone</p>
                  <p className="font-medium flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {formData.clienteTelefone || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {formData.clienteEmail || '-'}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowClienteModal(true)}>
                  <Search className="h-4 w-4 mr-2" />
                  Buscar Cliente
                </Button>
                <Button variant="outline" onClick={() => setShowNovoClienteModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Cliente
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Dados do Aparelho + Garantia */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Dados do Aparelho + Garantia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Modelo *</p>
                  <Select 
                    value={formData.modelo} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, modelo: v }))}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {produtos.map(p => (
                        <SelectItem key={p.id} value={p.produto}>{p.produto}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Condição *</p>
                  <Select 
                    value={formData.condicao} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, condicao: v as 'Novo' | 'Seminovo' }))}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Novo">Novo</SelectItem>
                      <SelectItem value="Seminovo">Seminovo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">IMEI *</p>
                  <Input
                    placeholder="00-000000-000000-0"
                    value={formData.imei}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      imei: formatIMEI(e.target.value) 
                    }))}
                    className="h-9 font-mono text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Status Expiração</p>
                  <Badge variant="secondary" className="bg-blue-500 text-white mt-1">
                    Pendente Registro
                  </Badge>
                </div>
              </div>

              {/* Campos de Garantia Manuais */}
              <Separator className="my-4" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Tipo Garantia *</p>
                  <Select 
                    value={formData.tipoGarantia} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, tipoGarantia: v as 'Garantia - Apple' | 'Garantia - Thiago Imports' }))}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Garantia - Apple">Garantia - Apple</SelectItem>
                      <SelectItem value="Garantia - Thiago Imports">Garantia - Thiago Imports</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Meses *</p>
                  <Input
                    type="number"
                    min={1}
                    max={36}
                    value={formData.mesesGarantia}
                    onChange={(e) => {
                      const meses = parseInt(e.target.value) || 0;
                      const novaDataFim = format(addMonths(new Date(formData.dataInicioGarantia), meses), 'yyyy-MM-dd');
                      setFormData(prev => ({ ...prev, mesesGarantia: meses, dataFimGarantia: novaDataFim }));
                    }}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Data Início *</p>
                  <Input
                    type="date"
                    value={formData.dataInicioGarantia}
                    onChange={(e) => {
                      const novaDataFim = format(addMonths(new Date(e.target.value), formData.mesesGarantia), 'yyyy-MM-dd');
                      setFormData(prev => ({ ...prev, dataInicioGarantia: e.target.value, dataFimGarantia: novaDataFim }));
                    }}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Data Fim *</p>
                  <Input
                    type="date"
                    value={formData.dataFimGarantia}
                    onChange={(e) => setFormData(prev => ({ ...prev, dataFimGarantia: e.target.value }))}
                    className="h-9"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Plano de Garantia */}
          {formData.modelo && formData.condicao && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Plano de Garantia *
                </CardTitle>
              </CardHeader>
              <CardContent>
                {planosDisponiveis.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {planosDisponiveis.map((plano) => (
                      <div
                        key={plano.id}
                        onClick={() => handleSelectPlano(plano.id)}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-primary/50 ${
                          formData.planoGarantiaId === plano.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border'
                        }`}
                      >
                        <div className="font-semibold text-sm">{plano.nome}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {plano.meses > 0 ? `${plano.meses} meses` : 'Sem garantia adicional'}
                        </div>
                        <div className="text-lg font-bold text-primary mt-2">
                          {plano.valor > 0 ? formatCurrency(plano.valor) : 'Gratuito'}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {plano.tipo}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-muted/50 rounded-lg text-center text-muted-foreground">
                    Nenhum plano de garantia disponível para este modelo e condição.
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Timeline - Empty for new warranty */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-4">
                A timeline será criada após o registro da garantia.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Registrar Nova Tratativa */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Registrar Nova Tratativa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de Tratativa</Label>
                <Select value={tipoTratativa} onValueChange={setTipoTratativa}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Direcionado Apple">Direcionado Apple</SelectItem>
                    <SelectItem value="Encaminhado Assistência">Encaminhado Assistência</SelectItem>
                    <SelectItem value="Assistência + Empréstimo">Assistência + Empréstimo</SelectItem>
                    <SelectItem value="Troca Direta">Troca Direta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Descrição {tipoTratativa && '*'}</Label>
                <Textarea 
                  placeholder="Descreva a tratativa..."
                  value={descricaoTratativa}
                  onChange={(e) => setDescricaoTratativa(e.target.value)}
                  rows={3}
                />
              </div>
              
              {precisaAparelho && (
                <div className="space-y-2">
                  <Label>
                    {tipoTratativa === 'Assistência + Empréstimo' ? 'Aparelho Empréstimo' : 'Aparelho Troca'} *
                  </Label>
                  {aparelhoSelecionado ? (
                    <div className="p-3 bg-muted/50 rounded-lg flex justify-between items-center">
                      <div>
                        <p className="font-medium text-sm">{aparelhoSelecionado.modelo}</p>
                        <p className="text-xs text-muted-foreground">{aparelhoSelecionado.imei}</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowModalAparelho(true)}
                      >
                        Trocar
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setShowModalAparelho(true)}
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Selecionar Aparelho
                    </Button>
                  )}
                </div>
              )}

              <Separator />

              <div className="space-y-2">
                <Label>Observações Gerais</Label>
                <Textarea 
                  placeholder="Observações adicionais sobre esta garantia..."
                  value={formData.observacoes}
                  onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                  rows={2}
                />
              </div>
              
              <Separator />
              
              <Button 
                className="w-full" 
                onClick={handleSalvar}
              >
                <Save className="h-4 w-4 mr-2" />
                Salvar Registro
              </Button>
            </CardContent>
          </Card>

          {/* Resumo da Garantia */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Resumo da Garantia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">IMEI</p>
                  <p className="font-mono text-sm">{formData.imei || '-'}</p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Modelo</p>
                  <p className="font-medium">{formData.modelo || '-'}</p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Condição</p>
                  <p className="font-medium">{formData.condicao || '-'}</p>
                </div>
                
                {planoSelecionado && (
                  <>
                    <Separator />
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Plano</p>
                      <p className="font-medium">{planoSelecionado.nome}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Valor</p>
                      <p className="font-medium text-primary">
                        {planoSelecionado.valor > 0 ? formatCurrency(planoSelecionado.valor) : 'Gratuito'}
                      </p>
                    </div>
                  </>
                )}
                
                <Separator />
                
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Tipo Garantia</p>
                  <Badge variant="outline">{formData.tipoGarantia}</Badge>
                </div>
                
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Período</p>
                  <p className="font-medium text-sm">
                    {formData.dataInicioGarantia 
                      ? `${format(new Date(formData.dataInicioGarantia), 'dd/MM/yyyy')} → ${dataFimGarantiaCalculada}`
                      : '-'
                    }
                  </p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Loja</p>
                  <p className="font-medium">{formData.lojaVenda ? getLojaName(formData.lojaVenda) : '-'}</p>
                </div>
                
                <Separator />
                
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Cliente</p>
                  <p className="font-medium">{formData.clienteNome || '-'}</p>
                </div>
                
                {formData.clienteTelefone && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Telefone</p>
                    <p className="font-medium flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {formData.clienteTelefone}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal Buscar Cliente - Padronizado com VendasNova */}
      <Dialog open={showClienteModal} onOpenChange={setShowClienteModal}>
        <DialogContent className="max-w-5xl">
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
            <div className="border rounded-lg max-h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CPF/CNPJ</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo Pessoa</TableHead>
                    <TableHead>Tipo Cliente</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientesFiltrados.slice(0, 20).map(cliente => {
                    const tipoPessoa = calcularTipoPessoa(cliente.cpf);
                    const tipoPessoaAbrev = tipoPessoa === 'Pessoa Física' ? 'PF' : 'PJ';
                    const isBloqueado = cliente.status === 'Inativo';
                    
                    return (
                      <TableRow key={cliente.id} className={isBloqueado ? 'opacity-60' : ''}>
                        <TableCell className="font-mono text-sm">{formatCpfCnpj(cliente.cpf)}</TableCell>
                        <TableCell className="font-medium">{cliente.nome}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={tipoPessoaAbrev === 'PF' 
                            ? 'bg-blue-500/10 text-blue-600 border-blue-500/30' 
                            : 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                          }>
                            {tipoPessoaAbrev}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            cliente.tipoCliente === 'VIP' 
                              ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' 
                              : cliente.tipoCliente === 'Novo'
                                ? 'bg-green-500/10 text-green-600 border-green-500/30'
                                : 'bg-gray-500/10 text-gray-600 border-gray-500/30'
                          }>
                            {cliente.tipoCliente || 'Normal'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={isBloqueado ? 'destructive' : 'outline'} className={
                            isBloqueado 
                              ? '' 
                              : 'bg-green-500/10 text-green-600 border-green-500/30'
                          }>
                            {cliente.status === 'Ativo' ? 'Ativo' : 'Bloqueado'}
                          </Badge>
                        </TableCell>
                        <TableCell>{cliente.telefone}</TableCell>
                        <TableCell>
                          {isBloqueado ? (
                            <span className="text-sm text-destructive font-medium">Bloqueado</span>
                          ) : (
                            <Button size="sm" onClick={() => handleSelectCliente(cliente)}>
                              Selecionar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {clientesFiltrados.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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

      {/* Modal Seleção de Aparelho */}
      <Dialog open={showModalAparelho} onOpenChange={setShowModalAparelho}>
        <DialogContent className="max-w-6xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {tipoTratativa === 'Assistência + Empréstimo' ? 'Selecionar Aparelho para Empréstimo' : 'Selecionar Aparelho para Troca'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por IMEI ou modelo..."
                  value={buscaAparelho}
                  onChange={(e) => setBuscaAparelho(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Condição</TableHead>
                    <TableHead>IMEI</TableHead>
                    <TableHead>Cor</TableHead>
                    <TableHead>Saúde Bateria</TableHead>
                    <TableHead>Loja</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aparelhosDisponiveis.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        Nenhum aparelho disponível encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    aparelhosDisponiveis.slice(0, 20).map(produto => (
                      <TableRow 
                        key={produto.id}
                        className={aparelhoSelecionado?.id === produto.id ? 'bg-primary/10' : ''}
                      >
                        <TableCell className="font-mono text-xs">{produto.id}</TableCell>
                        <TableCell className="font-medium">{produto.modelo}</TableCell>
                        <TableCell>
                          <Badge variant={produto.tipo === 'Novo' ? 'default' : 'secondary'}>
                            {produto.tipo || 'Seminovo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{displayIMEI(produto.imei || '')}</TableCell>
                        <TableCell>{produto.cor}</TableCell>
                        <TableCell>{produto.saudeBateria}%</TableCell>
                        <TableCell>{getLojaName(produto.loja)}</TableCell>
                        <TableCell>
                          <Button 
                            size="sm" 
                            variant={aparelhoSelecionado?.id === produto.id ? 'default' : 'outline'}
                            onClick={() => handleSelecionarAparelho(produto)}
                          >
                            {aparelhoSelecionado?.id === produto.id ? 'Selecionado' : 'Selecionar'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </GarantiasLayout>
  );
}
