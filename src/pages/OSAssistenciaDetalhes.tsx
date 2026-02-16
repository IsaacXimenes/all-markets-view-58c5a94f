import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { InputComMascara } from '@/components/ui/InputComMascara';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  getOrdemServicoById, 
  formatCurrency, 
  calcularSLADias,
  OrdemServico,
  updateOrdemServico
} from '@/utils/assistenciaApi';
import { getClientes, getFornecedores } from '@/utils/cadastrosApi';
import { getSolicitacoesByOS, addSolicitacao, SolicitacaoPeca } from '@/utils/solicitacaoPecasApi';
import { getPecas } from '@/utils/pecasApi';
import { useCadastroStore } from '@/store/cadastroStore';
import { AutocompleteLoja } from '@/components/AutocompleteLoja';
import { AutocompleteColaborador } from '@/components/AutocompleteColaborador';
import { ArrowLeft, FileText, Clock, AlertTriangle, User, Wrench, MapPin, Calendar, CreditCard, Save, Edit, Package, Plus, Trash2, CheckCircle, ImageIcon, DollarSign, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import QRCode from 'qrcode';
import { toast } from 'sonner';
import { PagamentoQuadro } from '@/components/vendas/PagamentoQuadro';
import { Pagamento as PagamentoVendaType } from '@/utils/vendasApi';

export default function OSAssistenciaDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [os, setOS] = useState<OrdemServico | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [isEditing, setIsEditing] = useState(searchParams.get('edit') === 'true');
  const [solicitacoesOS, setSolicitacoesOS] = useState<SolicitacaoPeca[]>([]);

  // Editable fields
  const [editClienteId, setEditClienteId] = useState('');
  const [editLojaId, setEditLojaId] = useState('');
  const [editTecnicoId, setEditTecnicoId] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editSetor, setEditSetor] = useState('');
  const [editDescricao, setEditDescricao] = useState('');
  const [editPecas, setEditPecas] = useState<OrdemServico['pecas']>([]);
  const [editPagamentosQuadro, setEditPagamentosQuadro] = useState<PagamentoVendaType[]>([]);

  // Campos Etapa 2 - Avaliação Técnica
  const [valorCustoTecnico, setValorCustoTecnico] = useState<number>(0);
  const [valorVendaTecnico, setValorVendaTecnico] = useState<number>(0);

  // Solicitação de peças form
  const [novaSolPeca, setNovaSolPeca] = useState('');
  const [novaSolQtd, setNovaSolQtd] = useState(1);
  const [novaSolJustificativa, setNovaSolJustificativa] = useState('');

  const pecasEstoque = getPecas();

  const clientes = getClientes();
  const { obterLojasPorTipo, obterTecnicos, obterNomeLoja, obterNomeColaborador } = useCadastroStore();
  const lojas = obterLojasPorTipo('Assistência');
  const tecnicos = obterTecnicos();
  const fornecedores = getFornecedores();

  useEffect(() => {
    if (id) {
      const ordem = getOrdemServicoById(id);
      setOS(ordem || null);
      if (ordem) {
        setEditClienteId(ordem.clienteId);
        setEditLojaId(ordem.lojaId);
        setEditTecnicoId(ordem.tecnicoId);
        setEditStatus(ordem.status);
        setEditSetor(ordem.setor);
        setEditDescricao(ordem.descricao || '');
        setEditPecas([...ordem.pecas]);
        setEditPagamentosQuadro(ordem.pagamentos.map(p => ({
          id: p.id,
          meioPagamento: p.meio,
          valor: p.valor,
          contaDestino: '',
          parcelas: p.parcelas || 1,
          comprovante: '',
          comprovanteNome: '',
        })));
        setValorCustoTecnico(ordem.valorCustoTecnico || 0);
        setValorVendaTecnico(ordem.valorVendaTecnico || 0);
      }
      const solicitacoes = getSolicitacoesByOS(id);
      setSolicitacoesOS(solicitacoes);
    }
  }, [id]);

  useEffect(() => {
    if (os) {
      QRCode.toDataURL(`OS:${os.id}|VALOR:${os.valorTotal}|DATA:${os.dataHora}`)
        .then(url => setQrCodeUrl(url))
        .catch(console.error);
    }
  }, [os]);

  const canEdit = os && os.status !== 'Serviço concluído';

  const handleSaveChanges = () => {
    if (!os) return;
    
    // Ler OS mais recente do store para preservar dados atualizados por outras operações
    const osFresh = getOrdemServicoById(os.id);
    if (!osFresh) return;
    
    const valorTotal = editPecas.reduce((acc, p) => acc + p.valorTotal, 0);
    const pagamentosConvertidos = editPagamentosQuadro.map(p => ({
      id: p.id,
      meio: p.meioPagamento,
      valor: p.valor,
      parcelas: p.parcelas
    }));
    // Preservar peças originais se editPecas estiver vazio mas OS já tinha peças
    const pecasParaSalvar = editPecas.length > 0 ? editPecas : (osFresh.pecas.length > 0 ? osFresh.pecas : editPecas);
    
    // Determinar proximaAtuacao com base no status editado
    let proximaAtuacao = osFresh.proximaAtuacao;
    if (editStatus === 'Solicitação de Peça') {
      proximaAtuacao = 'Gestor (Suprimentos)';
    } else if (editStatus === 'Em serviço') {
      proximaAtuacao = 'Técnico';
    }
    
    updateOrdemServico(os.id, {
      clienteId: editClienteId,
      lojaId: editLojaId,
      tecnicoId: editTecnicoId,
      status: editStatus as any,
      proximaAtuacao,
      setor: editSetor as 'GARANTIA' | 'ASSISTÊNCIA' | 'TROCA',
      descricao: editDescricao,
      pecas: pecasParaSalvar,
      pagamentos: pagamentosConvertidos,
      valorTotal,
      // Preservar campos existentes da versão mais recente do store
      timeline: osFresh.timeline,
      valorCustoTecnico: osFresh.valorCustoTecnico,
      valorVendaTecnico: osFresh.valorVendaTecnico,
      observacaoOrigem: osFresh.observacaoOrigem,
      origemOS: osFresh.origemOS,
      garantiaId: osFresh.garantiaId,
      modeloAparelho: osFresh.modeloAparelho,
      imeiAparelho: osFresh.imeiAparelho,
      resumoConclusao: osFresh.resumoConclusao,
      fotosEntrada: osFresh.fotosEntrada,
    });
    
    // Refresh OS data and re-sync edit states
    const updatedOS = getOrdemServicoById(os.id);
    setOS(updatedOS || null);
    if (updatedOS) {
      setEditPecas([...updatedOS.pecas]);
      setEditClienteId(updatedOS.clienteId);
      setEditLojaId(updatedOS.lojaId);
      setEditTecnicoId(updatedOS.tecnicoId);
      setEditStatus(updatedOS.status);
      setEditSetor(updatedOS.setor);
      setEditDescricao(updatedOS.descricao || '');
      setValorCustoTecnico(updatedOS.valorCustoTecnico || 0);
      setValorVendaTecnico(updatedOS.valorVendaTecnico || 0);
      setEditPagamentosQuadro(updatedOS.pagamentos.map(p => ({
        id: p.id,
        meioPagamento: p.meio,
        valor: p.valor,
        contaDestino: (p as any).contaDestino || '',
        parcelas: p.parcelas || 1,
        comprovante: (p as any).comprovante || '',
        comprovanteNome: (p as any).comprovanteNome || '',
      })));
    }
    // Recarregar solicitações
    if (os.id) {
      setSolicitacoesOS(getSolicitacoesByOS(os.id));
    }
    setIsEditing(false);
    toast.success('Alterações salvas com sucesso!');
  };

  const handleVoltar = () => {
    const from = searchParams.get('from');
    if (from === 'solicitacoes') {
      navigate('/os/solicitacoes-pecas');
    } else {
      navigate('/os/assistencia');
    }
  };

  if (!os) {
    return (
      <PageLayout title="OS não encontrada">
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground mb-4">Ordem de serviço não encontrada.</p>
          <Button onClick={handleVoltar}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </PageLayout>
    );
  }

  const cliente = clientes.find(c => c.id === (isEditing ? editClienteId : os.clienteId));
  const loja = lojas.find(l => l.id === (isEditing ? editLojaId : os.lojaId));
  const tecnico = tecnicos.find(t => t.id === (isEditing ? editTecnicoId : os.tecnicoId));
  const slaDias = calcularSLADias(os.dataHora);

  const getLojaNome = (lojaId: string) => obterNomeLoja(lojaId);
  const getTecnicoNome = (tecnicoId: string) => obterNomeColaborador(tecnicoId);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Em Aberto':
        return <Badge className="bg-slate-500 hover:bg-slate-600">Em Aberto</Badge>;
      case 'Aguardando Análise':
        return <Badge className="bg-slate-500 hover:bg-slate-600">Aguardando Análise</Badge>;
      case 'Serviço concluído':
        return <Badge className="bg-green-500 hover:bg-green-600">Serviço Concluído</Badge>;
      case 'Em serviço':
        return <Badge className="bg-blue-500 hover:bg-blue-600">Em serviço</Badge>;
      case 'Aguardando Peça':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Aguardando Peça</Badge>;
      case 'Solicitação Enviada':
      case 'Solicitação de Peça':
        return <Badge className="bg-orange-500 hover:bg-orange-600">Solicitação de Peça</Badge>;
      case 'Em Análise':
        return <Badge className="bg-indigo-500 hover:bg-indigo-600">Em Análise</Badge>;
      case 'Aguardando Aprovação do Gestor':
        return <Badge className="bg-amber-500 hover:bg-amber-600">Aguardando Aprovação</Badge>;
      case 'Rejeitado pelo Gestor':
        return <Badge className="bg-red-500 hover:bg-red-600">Rejeitado</Badge>;
      case 'Pagamento - Financeiro':
        return <Badge className="bg-purple-500 hover:bg-purple-600">Pagamento - Financeiro</Badge>;
      case 'Pagamento Finalizado':
        return <Badge className="bg-teal-500 hover:bg-teal-600">Pagamento Finalizado</Badge>;
      case 'Pagamento Concluído':
        return <Badge className="bg-teal-500 hover:bg-teal-600">Pagamento Concluído</Badge>;
      case 'Aguardando Chegada da Peça':
        return <Badge className="bg-cyan-500 hover:bg-cyan-600">Aguardando Chegada</Badge>;
      case 'Peça Recebida':
        return <Badge className="bg-emerald-500 hover:bg-emerald-600">Peça Recebida</Badge>;
      case 'Peça em Estoque / Aguardando Reparo':
        return <Badge className="bg-lime-500 hover:bg-lime-600">Aguardando Reparo</Badge>;
      case 'Aguardando Recebimento':
        return <Badge className="bg-cyan-500 hover:bg-cyan-600">Aguardando Recebimento</Badge>;
      case 'Em Execução':
        return <Badge className="bg-indigo-500 hover:bg-indigo-600">Em Execução</Badge>;
      case 'Aguardando Pagamento':
        return <Badge className="bg-amber-500 hover:bg-amber-600">Aguardando Pagamento</Badge>;
      case 'Aguardando Conferência':
      case 'Pendente de Pagamento':
        return <Badge className="bg-violet-500 hover:bg-violet-600">Pendente de Pagamento</Badge>;
      case 'Conferência do Gestor':
        return <Badge className="bg-orange-500 hover:bg-orange-600">Conferência do Gestor</Badge>;
      case 'Concluído':
        return <Badge className="bg-emerald-600 hover:bg-emerald-700">Concluído</Badge>;
      case 'Finalizado':
        return <Badge className="bg-emerald-700 hover:bg-emerald-800">Finalizado</Badge>;
      case 'Aguardando Financeiro':
        return <Badge className="bg-purple-600 hover:bg-purple-700">Aguardando Financeiro</Badge>;
      case 'Liquidado':
        return <Badge className="bg-green-700 hover:bg-green-800">Liquidado</Badge>;
      case 'Recusada pelo Técnico':
        return <Badge variant="destructive">Recusada pelo Técnico</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleConcluirServico = () => {
    if (!os) return;
    if (!valorCustoTecnico || !valorVendaTecnico) {
      toast.error('Preencha os valores de Custo e Venda antes de concluir o serviço.');
      return;
    }
    // Ler OS mais recente do store para evitar dados obsoletos
    const osFresh = getOrdemServicoById(os.id);
    if (!osFresh) return;
    
    updateOrdemServico(os.id, {
      status: 'Serviço concluído',
      proximaAtuacao: 'Atendente',
      valorCustoTecnico,
      valorVendaTecnico,
      pecas: osFresh.pecas, // Preservar peças atualizadas
      timeline: [...osFresh.timeline, {
        data: new Date().toISOString(),
        tipo: 'conclusao_servico',
        descricao: `Serviço finalizado pelo técnico. Custo: R$ ${valorCustoTecnico.toFixed(2)}, Venda: R$ ${valorVendaTecnico.toFixed(2)}`,
        responsavel: tecnico?.nome || 'Técnico'
      }]
    });
    const updatedOS = getOrdemServicoById(os.id);
    setOS(updatedOS || null);
    toast.success('Serviço finalizado! Aguardando pagamento do atendente.');
  };

  const handleSalvarPagamentoVendedor = () => {
    if (!os) return;
    // Ler OS mais recente do store
    const osFresh = getOrdemServicoById(os.id);
    if (!osFresh) return;
    if (!osFresh.valorCustoTecnico || !osFresh.valorVendaTecnico) {
      toast.error('O técnico precisa preencher os campos de Valor de Custo e Valor de Venda antes do registro de pagamento.');
      return;
    }
    const pagamentosConvertidos = editPagamentosQuadro.map(p => ({
      id: p.id,
      meio: p.meioPagamento,
      valor: p.valor,
      parcelas: p.parcelas,
      comprovante: p.comprovante,
      comprovanteNome: p.comprovanteNome,
      contaDestino: p.contaDestino,
    }));
    const valorTotal = editPagamentosQuadro.reduce((acc, p) => acc + p.valor, 0);
    updateOrdemServico(os.id, {
      pagamentos: pagamentosConvertidos,
      valorTotal,
      status: 'Conferência do Gestor' as any,
      proximaAtuacao: 'Gestor',
      pecas: osFresh.pecas, // Preservar peças
      timeline: [...osFresh.timeline, {
        data: new Date().toISOString(),
        tipo: 'pagamento',
        descricao: `Pagamento registrado pelo vendedor: R$ ${valorTotal.toFixed(2)}`,
        responsavel: 'Vendedor'
      }]
    });
    const updatedOS = getOrdemServicoById(os.id);
    setOS(updatedOS || null);
    toast.success('Pagamento registrado! Enviado para conferência do gestor.');
  };

  const handleValidarFinanceiro = () => {
    if (!os) return;
    const osFresh = getOrdemServicoById(os.id);
    if (!osFresh) return;
    updateOrdemServico(os.id, {
      status: 'Liquidado' as any,
      proximaAtuacao: '-',
      timeline: [...osFresh.timeline, {
        data: new Date().toISOString(),
        tipo: 'validacao_financeiro',
        descricao: 'Lançamento validado pelo financeiro. OS liquidada.',
        responsavel: 'Financeiro'
      }]
    });
    const updatedOS = getOrdemServicoById(os.id);
    setOS(updatedOS || null);
    toast.success('Lançamento validado! OS liquidada com sucesso.');
  };

  const getSetorBadge = (setor: string) => {
    switch (setor) {
      case 'GARANTIA':
        return <Badge variant="outline" className="border-green-500 text-green-600">Garantia</Badge>;
      case 'ASSISTÊNCIA':
        return <Badge variant="outline" className="border-blue-500 text-blue-600">Assistência</Badge>;
      case 'TROCA':
        return <Badge variant="outline" className="border-purple-500 text-purple-600">Troca</Badge>;
      default:
        return <Badge variant="outline">{setor}</Badge>;
    }
  };

  const getSLADisplay = () => {
    let bgClass = '';
    let icon = null;

    if (slaDias >= 5) {
      bgClass = 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
      icon = <AlertTriangle className="h-4 w-4" />;
    } else if (slaDias >= 3) {
      bgClass = 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
      icon = <Clock className="h-4 w-4" />;
    }

    return (
      <span className={cn('px-3 py-1 rounded text-sm font-medium inline-flex items-center gap-2', bgClass)}>
        {icon}
        {slaDias} dias
      </span>
    );
  };

  const handleGerarRecibo = () => {
    const content = `
===========================================
           RECIBO DE SERVIÇO
===========================================

Nº OS: ${os.id}
Data: ${new Date(os.dataHora).toLocaleString('pt-BR')}
Setor: ${os.setor}
Status: ${os.status}

-------------------------------------------
CLIENTE
-------------------------------------------
Nome: ${cliente?.nome || '-'}
CPF/CNPJ: ${cliente?.cpf || '-'}
Telefone: ${cliente?.telefone || '-'}

-------------------------------------------
TÉCNICO / LOJA
-------------------------------------------
Técnico: ${tecnico?.nome || '-'}
Loja: ${loja?.nome || '-'}

-------------------------------------------
PEÇAS / SERVIÇOS
-------------------------------------------
${os.pecas.map(p => `${p.peca} - ${formatCurrency(p.valorTotal)}`).join('\n')}

-------------------------------------------
PAGAMENTOS
-------------------------------------------
${os.pagamentos.map(p => `${p.meio} - ${formatCurrency(p.valor)}`).join('\n')}

-------------------------------------------
TOTAL: ${formatCurrency(os.valorTotal)}
-------------------------------------------

${os.descricao ? `\nDescrição:\n${os.descricao}` : ''}

===========================================
    `;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recibo-${os.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PageLayout title={`Detalhes da OS ${os.id}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={handleVoltar}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h2 className="text-2xl font-bold">{os.id}</h2>
              <p className="text-sm text-muted-foreground">
                {new Date(os.dataHora).toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {getStatusBadge(isEditing ? editStatus : os.status)}
            {getSetorBadge(isEditing ? editSetor : os.setor)}
            {getSLADisplay()}
            {canEdit && !isEditing && (
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Editar OS
              </Button>
            )}
            {isEditing && (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveChanges}>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Alterações
                </Button>
              </>
            )}
            <Button onClick={handleGerarRecibo}>
              <FileText className="h-4 w-4 mr-2" />
              Gerar Recibo
            </Button>
          </div>
        </div>

        {canEdit && !isEditing && (
          <div className="bg-blue-100 dark:bg-blue-950/30 p-3 rounded-lg text-blue-700 dark:text-blue-300 text-sm flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Esta OS ainda pode ser editada. Clique em "Editar OS" para fazer alterações.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Cliente */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Cliente
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Cliente</label>
                      <Select value={editClienteId} onValueChange={setEditClienteId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o cliente" />
                        </SelectTrigger>
                        <SelectContent>
                          {clientes.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.nome} - {c.cpf}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {cliente && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-3 bg-muted rounded-lg">
                        <div>
                          <p className="text-xs text-muted-foreground">CPF/CNPJ</p>
                          <p className="font-medium">{cliente.cpf}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Telefone</p>
                          <p className="font-medium">{cliente.telefone}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">E-mail</p>
                          <p className="font-medium">{cliente.email || '-'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Nome</p>
                      <p className="font-medium">{cliente?.nome || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">CPF/CNPJ</p>
                      <p className="font-medium">{cliente?.cpf || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Telefone</p>
                      <p className="font-medium">{cliente?.telefone || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">E-mail</p>
                      <p className="font-medium">{cliente?.email || '-'}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Peças/Serviços */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Wrench className="h-5 w-5" />
                    Peças / Serviços
                  </span>
                  {isEditing && (
                    <Button size="sm" variant="outline" onClick={() => {
                      setEditPecas([...editPecas, {
                        id: `PECA-${Date.now()}`,
                        peca: '',
                        imei: '',
                        valor: 0,
                        percentual: 0,
                        valorTotal: 0,
                        unidadeServico: '',
                        pecaNoEstoque: false,
                        pecaDeFornecedor: false,
                        servicoTerceirizado: false
                      }]);
                    }}>
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <div className="space-y-3">
                    {editPecas.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">Nenhuma peça/serviço adicionada. Clique em "Adicionar" para incluir.</p>
                    )}
                    {editPecas.map((peca, index) => (
                      <div key={index} className="p-3 border rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Item {index + 1}</span>
                          <Button size="sm" variant="ghost" className="text-destructive h-8 w-8 p-0" onClick={() => {
                            setEditPecas(editPecas.filter((_, i) => i !== index));
                          }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="text-xs text-muted-foreground">Descrição *</label>
                            {peca.pecaNoEstoque ? (
                              <Select
                                value={peca.peca}
                                onValueChange={(value) => {
                                  const updated = [...editPecas];
                                  updated[index] = { ...updated[index], peca: value };
                                  setEditPecas(updated);
                                }}
                              >
                                <SelectTrigger className={cn(!peca.peca && 'border-destructive')}>
                                  <SelectValue placeholder="Selecione a peça do estoque" />
                                </SelectTrigger>
                                <SelectContent>
                                {pecasEstoque
                                    .filter(p => p.status === 'Disponível' && p.quantidade > 0)
                                    .map(p => (
                                       <SelectItem key={p.id} value={p.descricao}>
                                         {p.descricao} (Qtd: {p.quantidade} | {obterNomeLoja(p.lojaId)})
                                       </SelectItem>
                                     ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                value={peca.peca}
                                onChange={(e) => {
                                  const updated = [...editPecas];
                                  updated[index] = { ...updated[index], peca: e.target.value };
                                  setEditPecas(updated);
                                }}
                                placeholder="Descrição da peça/serviço"
                                className={cn(!peca.peca && 'border-destructive')}
                              />
                            )}
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Valor (R$)</label>
                            <Input
                              type="number"
                              value={peca.valor || ''}
                              onChange={(e) => {
                                const valor = parseFloat(e.target.value) || 0;
                                const updated = [...editPecas];
                                const valorTotal = valor - (valor * (updated[index].percentual / 100));
                                updated[index] = { ...updated[index], valor, valorTotal };
                                setEditPecas(updated);
                              }}
                              placeholder="0,00"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Desconto (%)</label>
                            <Input
                              type="number"
                              value={peca.percentual || ''}
                              onChange={(e) => {
                                const percentual = parseFloat(e.target.value) || 0;
                                const updated = [...editPecas];
                                const valorTotal = updated[index].valor - (updated[index].valor * (percentual / 100));
                                updated[index] = { ...updated[index], percentual, valorTotal };
                                setEditPecas(updated);
                              }}
                              placeholder="0"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <label className="flex items-center gap-2">
                            <Checkbox checked={peca.pecaNoEstoque} onCheckedChange={(checked) => {
                              const updated = [...editPecas];
                              updated[index] = { ...updated[index], pecaNoEstoque: !!checked };
                              setEditPecas(updated);
                            }} />
                            Estoque
                          </label>
                          <label className="flex items-center gap-2">
                            <Checkbox checked={peca.pecaDeFornecedor} onCheckedChange={(checked) => {
                              const updated = [...editPecas];
                              updated[index] = { ...updated[index], pecaDeFornecedor: !!checked };
                              setEditPecas(updated);
                            }} />
                            Fornecedor
                          </label>
                          <label className="flex items-center gap-2">
                            <Checkbox checked={peca.servicoTerceirizado} onCheckedChange={(checked) => {
                              const updated = [...editPecas];
                              updated[index] = { ...updated[index], servicoTerceirizado: !!checked };
                              setEditPecas(updated);
                            }} />
                            Terceirizado
                          </label>
                          <span className="ml-auto font-medium">{formatCurrency(peca.valorTotal)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {os.pecas.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Nenhuma peça/serviço registrada.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Descrição</TableHead>
                            <TableHead>IMEI</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead>Desconto</TableHead>
                            <TableHead>Valor Total</TableHead>
                            <TableHead>Origem</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {os.pecas.map((peca, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{peca.peca}</TableCell>
                              <TableCell className="font-mono text-xs">{peca.imei || '-'}</TableCell>
                              <TableCell>{formatCurrency(peca.valor)}</TableCell>
                              <TableCell>{peca.percentual}%</TableCell>
                              <TableCell className="font-medium">{formatCurrency(peca.valorTotal)}</TableCell>
                              <TableCell>
                                {peca.pecaNoEstoque && (
                                  <Badge variant="outline" className="mr-1 cursor-pointer hover:bg-primary/10" onClick={() => navigate('/os/pecas')}>Estoque</Badge>
                                )}
                                {peca.pecaDeFornecedor && (
                                  <Badge variant="outline">{fornecedores.find(f => f.id === peca.fornecedorId)?.nome || 'Fornecedor'}</Badge>
                                )}
                                {peca.servicoTerceirizado && <Badge variant="secondary">Terceirizado</Badge>}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Solicitações de Peças - sempre visível */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Solicitações de Peças
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {solicitacoesOS.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Peça</TableHead>
                        <TableHead>Qtd</TableHead>
                        <TableHead>Justificativa</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {solicitacoesOS.map((sol) => (
                        <TableRow key={sol.id}>
                          <TableCell className="font-medium">{sol.peca}</TableCell>
                          <TableCell>{sol.quantidade}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{sol.justificativa}</TableCell>
                          <TableCell>
                            {(() => {
                              switch (sol.status) {
                                case 'Pendente': return <Badge className="bg-yellow-500 hover:bg-yellow-600">Pendente</Badge>;
                                case 'Aprovada': return <Badge className="bg-green-500 hover:bg-green-600">Aprovada</Badge>;
                                case 'Rejeitada': return <Badge className="bg-red-500 hover:bg-red-600">Rejeitada</Badge>;
                                case 'Enviada': return <Badge className="bg-blue-500 hover:bg-blue-600">Enviada</Badge>;
                                case 'Recebida': return <Badge className="bg-emerald-500 hover:bg-emerald-600">Recebida</Badge>;
                                case 'Cancelada': return <Badge className="bg-gray-500 hover:bg-gray-600">Cancelada</Badge>;
                                default: return <Badge variant="secondary">{sol.status}</Badge>;
                              }
                            })()}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(sol.dataSolicitacao).toLocaleDateString('pt-BR')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-2">Nenhuma solicitação registrada.</p>
                )}

                {/* Formulário para nova solicitação */}
                {isEditing && (
                  <div className="border-t pt-4 space-y-3">
                    <p className="text-sm font-medium">Nova Solicitação de Peça</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground">Peça *</label>
                        <Input
                          value={novaSolPeca}
                          onChange={(e) => setNovaSolPeca(e.target.value)}
                          placeholder="Nome da peça"
                          className={cn(!novaSolPeca && 'border-destructive')}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Quantidade</label>
                        <Input
                          type="number"
                          min={1}
                          value={novaSolQtd}
                          onChange={(e) => setNovaSolQtd(parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Justificativa *</label>
                        <Input
                          value={novaSolJustificativa}
                          onChange={(e) => setNovaSolJustificativa(e.target.value)}
                          placeholder="Justificativa"
                          className={cn(!novaSolJustificativa && 'border-destructive')}
                        />
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => {
                      if (!novaSolPeca.trim() || !novaSolJustificativa.trim()) {
                        toast.error('Preencha peça e justificativa');
                        return;
                      }
                      addSolicitacao({
                        osId: os.id,
                        peca: novaSolPeca,
                        quantidade: novaSolQtd,
                        justificativa: novaSolJustificativa,
                        modeloImei: os.pecas[0]?.imei || '',
                        lojaSolicitante: os.lojaId
                      });
                      // Atualizar status da OS para Solicitação de Peça
                      updateOrdemServico(os.id, {
                        status: 'Solicitação de Peça' as any,
                        proximaAtuacao: 'Gestor (Suprimentos)',
                        timeline: [...os.timeline, {
                          data: new Date().toISOString(),
                          tipo: 'peca',
                          descricao: `Solicitação de peça: ${novaSolPeca} x${novaSolQtd} – ${novaSolJustificativa}`,
                          responsavel: 'Atendente'
                        }]
                      });
                      // Atualizar estado local do status para evitar sobrescrita ao salvar
                      setEditStatus('Solicitação de Peça');
                      // Refresh OS e solicitações
                      const updatedOS = getOrdemServicoById(os.id);
                      if (updatedOS) setOS(updatedOS);
                      setSolicitacoesOS(getSolicitacoesByOS(os.id));
                      setNovaSolPeca('');
                      setNovaSolQtd(1);
                      setNovaSolJustificativa('');
                      toast.success('Solicitação adicionada! Status atualizado para Aguardando Peça.');
                    }}>
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar Solicitação
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Botão Confirmar Recebimento - visível quando status é Solicitação de Peça */}
            {(os.status === 'Solicitação de Peça' || os.status === 'Aguardando Peça' || os.status === 'Solicitação Enviada') && (
              <Card className="border-yellow-500/50 bg-yellow-50/30">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-yellow-600" />
                      <span className="font-medium text-yellow-700">Peça solicitada — aguardando recebimento</span>
                    </div>
                    <Button
                      variant="default"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        const osFresh = getOrdemServicoById(os.id);
                        if (!osFresh) return;
                        updateOrdemServico(os.id, {
                          status: 'Em serviço' as any,
                          proximaAtuacao: 'Técnico',
                          timeline: [...osFresh.timeline, {
                            data: new Date().toISOString(),
                            tipo: 'peca',
                            descricao: 'Recebimento de peça confirmado. OS retornou para serviço.',
                            responsavel: 'Técnico'
                          }]
                        });
                        setEditStatus('Em serviço');
                        const updatedOS = getOrdemServicoById(os.id);
                        if (updatedOS) setOS(updatedOS);
                        toast.success('Recebimento confirmado! OS retornou para Em serviço.');
                      }}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Confirmar Recebimento
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Avaliação Técnica - Etapa 2 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Avaliação Técnica
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Valor de Custo (R$)</label>
                    <InputComMascara
                      mascara="moeda"
                      value={valorCustoTecnico}
                      onChange={(formatted, raw) => setValorCustoTecnico(typeof raw === 'number' ? raw : 0)}
                      placeholder="0,00"
                      disabled={os.proximaAtuacao !== 'Técnico: Avaliar/Executar' && os.proximaAtuacao !== 'Técnico' && !!os.valorCustoTecnico}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Custo de peças/insumos utilizados</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Valor de Venda (R$)</label>
                    <InputComMascara
                      mascara="moeda"
                      value={valorVendaTecnico}
                      onChange={(formatted, raw) => setValorVendaTecnico(typeof raw === 'number' ? raw : 0)}
                      placeholder="0,00"
                      disabled={os.proximaAtuacao !== 'Técnico: Avaliar/Executar' && os.proximaAtuacao !== 'Técnico' && !!os.valorVendaTecnico}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Valor cobrado do cliente</p>
                  </div>
                </div>
                {(os.proximaAtuacao === 'Técnico: Avaliar/Executar' || os.proximaAtuacao === 'Técnico') && os.status !== 'Finalizado' && os.status !== 'Liquidado' && os.status !== 'Serviço concluído' && (
                  <Button onClick={handleConcluirServico} className="w-full">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Finalizar Serviço
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Pagamentos - Etapa 3 (Vendedor) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Pagamentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(os.proximaAtuacao === 'Vendedor: Registrar Pagamento' || os.proximaAtuacao === 'Gestor/Vendedor' || (os.proximaAtuacao === 'Atendente' && (os.status === 'Aguardando Pagamento' || os.status === 'Serviço concluído')) || searchParams.get('pagamento') === 'true') ? (
                  (!os.valorCustoTecnico || !os.valorVendaTecnico) ? (
                    <div className="bg-destructive/10 p-4 rounded-lg text-destructive text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      O técnico precisa preencher os campos de Valor de Custo e Valor de Venda antes do registro de pagamento.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <PagamentoQuadro
                        valorTotalProdutos={os.valorVendaTecnico || 0}
                        custoTotalProdutos={os.valorCustoTecnico || 0}
                        lojaVendaId={os.lojaId}
                        onPagamentosChange={setEditPagamentosQuadro}
                        pagamentosIniciais={editPagamentosQuadro}
                        ocultarCards={true}
                      />
                      <Button onClick={handleSalvarPagamentoVendedor} className="w-full">
                        <Save className="h-4 w-4 mr-2" />
                        Registrar Pagamento
                      </Button>
                    </div>
                  )
                ) : os.proximaAtuacao === 'Financeiro: Conferir Lançamento' || os.proximaAtuacao === 'Financeiro' || os.proximaAtuacao === 'Concluído' || os.proximaAtuacao === '-' ? (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Meio de Pagamento</TableHead>
                          <TableHead>Parcelas</TableHead>
                          <TableHead>Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {os.pagamentos.map((pag, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{pag.meio}</TableCell>
                            <TableCell>{pag.parcelas || '-'}</TableCell>
                            <TableCell className="font-medium">{formatCurrency(pag.valor)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/50">
                          <TableCell colSpan={2} className="font-bold">Total</TableCell>
                          <TableCell className="font-bold text-lg">{formatCurrency(os.valorTotal)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                    {(os.proximaAtuacao === 'Financeiro: Conferir Lançamento' || os.proximaAtuacao === 'Financeiro') && (
                      <Button onClick={handleValidarFinanceiro} className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700">
                        <ShieldCheck className="h-4 w-4 mr-2" />
                        Validar Lançamento (Financeiro)
                      </Button>
                    )}
                  </>
                ) : isEditing ? (
                  <PagamentoQuadro
                    valorTotalProdutos={editPecas.reduce((acc, p) => acc + p.valorTotal, 0)}
                    custoTotalProdutos={0}
                    lojaVendaId={editLojaId}
                    onPagamentosChange={setEditPagamentosQuadro}
                    pagamentosIniciais={editPagamentosQuadro}
                    ocultarCards={true}
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Meio de Pagamento</TableHead>
                        <TableHead>Parcelas</TableHead>
                        <TableHead>Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {os.pagamentos.map((pag, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{pag.meio}</TableCell>
                          <TableCell>{pag.parcelas || '-'}</TableCell>
                          <TableCell className="font-medium">{formatCurrency(pag.valor)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50">
                        <TableCell colSpan={2} className="font-bold">Total</TableCell>
                        <TableCell className="font-bold text-lg">{formatCurrency(os.valorTotal)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Observação do Estoque */}
            {os.observacaoOrigem && (
              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <p className="text-sm font-medium text-amber-700 dark:text-amber-300 mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Observação do Estoque – Tratativas para o Técnico
                </p>
                <p className="text-sm text-amber-800 dark:text-amber-200 whitespace-pre-wrap">{os.observacaoOrigem}</p>
              </div>
            )}

            {/* Descrição */}
            <Card>
              <CardHeader>
                <CardTitle>Descrição Detalhada</CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <Textarea 
                    value={editDescricao}
                    onChange={(e) => setEditDescricao(e.target.value)}
                    placeholder="Descrição detalhada do serviço..."
                    rows={4}
                  />
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{os.descricao || 'Nenhuma descrição.'}</p>
                )}
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Timeline da OS
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Fotos de Entrada */}
                  {os.fotosEntrada && os.fotosEntrada.length > 0 && (
                    <div className="p-3 bg-muted rounded-lg space-y-2">
                      <p className="text-sm font-medium flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" />
                        Fotos de Entrada ({os.fotosEntrada.length})
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {os.fotosEntrada.map((foto, i) => (
                          <img key={i} src={foto} alt={`Foto entrada ${i + 1}`} className="w-20 h-20 object-cover rounded-md border" />
                        ))}
                      </div>
                    </div>
                  )}
                  {os.timeline.map((item, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={cn(
                          "w-3 h-3 rounded-full",
                          item.tipo === 'conclusao_servico' ? 'bg-green-500' :
                          item.tipo === 'pagamento' ? 'bg-amber-500' :
                          item.tipo === 'validacao_financeiro' ? 'bg-emerald-600' :
                          'bg-primary'
                        )} />
                        {index < os.timeline.length - 1 && (
                          <div className="w-0.5 h-full bg-border" />
                        )}
                      </div>
                      <div className="pb-4">
                        <p className="font-medium capitalize">{item.tipo.replace(/_/g, ' ')}</p>
                        <p className="text-sm text-muted-foreground">{item.descricao}</p>
                        {item.fotos && item.fotos.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.fotos.map((foto, i) => (
                              <img key={i} src={foto} alt={`Foto ${i + 1}`} className="w-16 h-16 object-cover rounded border" />
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(item.data).toLocaleString('pt-BR')} - {item.responsavel}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Coluna Lateral */}
          <div className="space-y-6">
            {/* Info Rápida */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Informações
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <>
                    <div>
                      <label className="text-xs text-muted-foreground">Loja</label>
                      <AutocompleteLoja
                        value={editLojaId}
                        onChange={setEditLojaId}
                        filtrarPorTipo="Assistência"
                        placeholder="Selecione a loja"
                      />
                    </div>
                    <Separator />
                    <div>
                      <label className="text-xs text-muted-foreground">Técnico Responsável</label>
                      <Select value={editTecnicoId} onValueChange={setEditTecnicoId}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Selecione o técnico" />
                        </SelectTrigger>
                        <SelectContent>
                          {tecnicos.map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Separator />
                    <div>
                      <label className="text-xs text-muted-foreground">Setor</label>
                      <Select value={editSetor} onValueChange={setEditSetor}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Selecione o setor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GARANTIA">Garantia</SelectItem>
                          <SelectItem value="ASSISTÊNCIA">Assistência</SelectItem>
                          <SelectItem value="TROCA">Troca</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Separator />
                    <div>
                      <label className="text-xs text-muted-foreground">Status</label>
                      <Select value={editStatus} onValueChange={setEditStatus}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="Em Aberto">Em Aberto</SelectItem>
                          <SelectItem value="Em serviço">Em serviço</SelectItem>
                          <SelectItem value="Em Execução">Em Execução</SelectItem>
                          <SelectItem value="Aguardando Peça">Aguardando Peça</SelectItem>
                          <SelectItem value="Solicitação Enviada">Solicitação Enviada</SelectItem>
                          <SelectItem value="Em Análise">Em Análise</SelectItem>
                          <SelectItem value="Peça Recebida">Peça Recebida</SelectItem>
                          <SelectItem value="Pagamento Concluído">Pagamento Concluído</SelectItem>
                          <SelectItem value="Serviço concluído">Serviço concluído</SelectItem>
                          <SelectItem value="Aguardando Conferência">Aguardando Conferência</SelectItem>
                          <SelectItem value="Finalizado">Finalizado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-xs text-muted-foreground">SLA</p>
                      <div className="mt-1">{getSLADisplay()}</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-xs text-muted-foreground">Loja</p>
                      <p className="font-medium">{loja?.nome || '-'}</p>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-xs text-muted-foreground">Técnico Responsável</p>
                      <p className="font-medium">{tecnico?.nome || '-'}</p>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-xs text-muted-foreground">Setor</p>
                      <div className="mt-1">{getSetorBadge(os.setor)}</div>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-xs text-muted-foreground">Status</p>
                      <div className="mt-1">{getStatusBadge(os.status)}</div>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-xs text-muted-foreground">Próxima Atuação</p>
                      <div className="mt-1">
                        {os.proximaAtuacao ? (
                          <Badge className={cn(
                            os.proximaAtuacao === 'Técnico: Avaliar/Executar' ? 'bg-blue-500 hover:bg-blue-600' :
                            os.proximaAtuacao === 'Vendedor: Registrar Pagamento' ? 'bg-amber-500 hover:bg-amber-600' :
                            os.proximaAtuacao === 'Financeiro: Conferir Lançamento' ? 'bg-purple-500 hover:bg-purple-600' :
                            os.proximaAtuacao === 'Gestor: Aprovar Peça' ? 'bg-orange-500 hover:bg-orange-600' :
                            os.proximaAtuacao === 'Logística: Enviar Peça' ? 'bg-cyan-500 hover:bg-cyan-600' :
                            'bg-emerald-600 hover:bg-emerald-700'
                          )}>
                            {os.proximaAtuacao}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-xs text-muted-foreground">SLA</p>
                      <div className="mt-1">{getSLADisplay()}</div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* QR Code */}
            <Card>
              <CardHeader>
                <CardTitle>QR Code</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                {qrCodeUrl && (
                  <img src={qrCodeUrl} alt="QR Code da OS" className="w-40 h-40" />
                )}
              </CardContent>
            </Card>

            {/* Resumo Financeiro */}
            <Card>
              <CardHeader>
                <CardTitle>Resumo Financeiro</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Peças/Serviços</span>
                  <span className="font-medium">{formatCurrency(os.pecas.reduce((acc, p) => acc + p.valorTotal, 0))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Pagamentos</span>
                  <span className="font-medium">{formatCurrency(os.pagamentos.reduce((acc, p) => acc + p.valor, 0))}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg">
                  <span className="font-bold">Valor Total</span>
                  <span className="font-bold text-primary">{formatCurrency(os.valorTotal)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}