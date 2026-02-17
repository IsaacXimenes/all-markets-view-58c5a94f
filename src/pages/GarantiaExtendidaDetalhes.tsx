import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GarantiasLayout } from '@/components/layout/GarantiasLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, Phone, Mail, MapPin, Calendar, Shield, Clock, User, 
  Star, CheckCircle2, AlertTriangle, CreditCard
} from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { toast } from 'sonner';
import { getGarantiaById, getTimelineByGarantiaId, addTimelineEntry } from '@/utils/garantiasApi';
import { getLojas, getColaboradores, getContasFinanceiras, getMaquinasCartao, getModelosPagamento } from '@/utils/cadastrosApi';
import { getPlanosGarantia, PlanoGarantia } from '@/utils/planosGarantiaApi';
import { 
  calcularTempoRestante, podeRenovar, addTratativaComercial, 
  getTratativasComerciasByGarantiaId, TratativaComercial, ResultadoContato,
  notificarFinanceiroAdesao, formatCurrency
} from '@/utils/garantiaExtendidaApi';
import { adicionarVendaParaConferencia } from '@/utils/conferenciaGestorApi';
import { useAuthStore } from '@/store/authStore';

export default function GarantiaExtendidaDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const garantia = getGarantiaById(id || '');
  const timeline = getTimelineByGarantiaId(id || '');
  const tratativasComerciais = getTratativasComerciasByGarantiaId(id || '');
  const lojas = getLojas();
  const colaboradores = getColaboradores();
  const contasFinanceiras = getContasFinanceiras();
  const maquinas = getMaquinasCartao();
  const meiosPagamento = getModelosPagamento();
  const planosGarantia = getPlanosGarantia();
  const user = useAuthStore(state => state.user);
  
  // Estados
  const [tipoTratativa, setTipoTratativa] = useState<string>('');
  const [descricao, setDescricao] = useState('');
  const [resultadoContato, setResultadoContato] = useState<ResultadoContato | ''>('');
  
  // Estados para adesão
  const [dialogAdesao, setDialogAdesao] = useState(false);
  const [planoSelecionado, setPlanoSelecionado] = useState<PlanoGarantia | null>(null);
  const [meioPagamento, setMeioPagamento] = useState('');
  const [maquinaSelecionada, setMaquinaSelecionada] = useState('');
  const [contaDestino, setContaDestino] = useState('');
  const [parcelas, setParcelas] = useState('1');
  
  // Estados para confirmação dupla
  const [dialogConfirmacao1, setDialogConfirmacao1] = useState(false);
  const [dialogConfirmacao2, setDialogConfirmacao2] = useState(false);
  const [responsavelConfirmacao, setResponsavelConfirmacao] = useState(user?.colaborador?.id || '');
  const [observacaoFinal, setObservacaoFinal] = useState('');
  const [dadosAdesaoTemp, setDadosAdesaoTemp] = useState<any>(null);
  
  if (!garantia) {
    return (
      <GarantiasLayout title="Garantia Extendida">
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground mb-4">Garantia não encontrada</p>
          <Button onClick={() => navigate('/garantias/extendida')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </GarantiasLayout>
    );
  }
  
  const tempoRestante = calcularTempoRestante(garantia.dataFimGarantia);
  const podeRenovarGarantia = podeRenovar(garantia.dataFimGarantia);
  const getLojaName = (id: string) => lojas.find(l => l.id === id)?.nome || id;
  
  // Planos disponíveis para renovação
  const planosSilver = planosGarantia.filter(p => p.nome === 'Silver' && p.status === 'Ativo');
  const planosGold = planosGarantia.filter(p => p.nome === 'Gold' && p.status === 'Ativo');
  
  // Timeline combinada (tratativas técnicas + comerciais)
  const timelineCombinada = useMemo(() => {
    const items: { data: string; tipo: string; titulo: string; descricao: string; usuario: string }[] = [];
    
    // Timeline original
    timeline.forEach(t => {
      items.push({
        data: t.dataHora,
        tipo: t.tipo,
        titulo: t.titulo,
        descricao: t.descricao,
        usuario: t.usuarioNome
      });
    });
    
    // Tratativas comerciais
    tratativasComerciais.forEach(t => {
      let tituloTimeline: string = t.tipo;
      let descricaoTimeline: string = t.descricao || '';
      
      if (t.tipo === 'Contato Realizado') {
        tituloTimeline = `Contato Comercial: ${t.resultadoContato}`;
      } else if (t.tipo === 'Adesão Silver' || t.tipo === 'Adesão Gold') {
        tituloTimeline = `${t.tipo} - ${t.statusAdesao}`;
        descricaoTimeline = `${t.planoNome} (${t.mesesPlano} meses) - ${formatCurrency(t.valorPlano || 0)}`;
      }
      
      items.push({
        data: t.dataHora,
        tipo: 'comercial',
        titulo: tituloTimeline,
        descricao: descricaoTimeline,
        usuario: t.usuarioNome
      });
    });
    
    return items.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }, [timeline, tratativasComerciais]);
  
  // Registrar contato
  const handleRegistrarContato = () => {
    if (!resultadoContato) {
      toast.error('Selecione o resultado do contato');
      return;
    }
    
    addTratativaComercial({
      garantiaId: garantia.id,
      vendaId: garantia.vendaId,
      tipo: 'Contato Realizado',
      dataHora: new Date().toISOString(),
      usuarioId: 'COL-001',
      usuarioNome: 'Usuário Sistema',
      descricao,
      resultadoContato
    });
    
    addTimelineEntry({
      garantiaId: garantia.id,
      dataHora: new Date().toISOString(),
      tipo: 'tratativa',
      titulo: `Contato comercial: ${resultadoContato}`,
      descricao: descricao || 'Contato realizado com cliente',
      usuarioId: 'COL-001',
      usuarioNome: 'Usuário Sistema'
    });
    
    toast.success('Contato registrado com sucesso!');
    setTipoTratativa('');
    setDescricao('');
    setResultadoContato('');
  };
  
  // Iniciar adesão
  const handleIniciarAdesao = (tipo: 'Silver' | 'Gold') => {
    if (!podeRenovarGarantia) {
      toast.error('A garantia ainda está ativa. Só é possível renovar após expirar.');
      return;
    }
    
    const planos = tipo === 'Silver' ? planosSilver : planosGold;
    // Buscar plano adequado para o modelo
    const planoAdequado = planos.find(p => 
      p.modelos.some(m => garantia.modelo.toLowerCase().includes(m.toLowerCase()))
    ) || planos[0];
    
    setPlanoSelecionado(planoAdequado);
    setDialogAdesao(true);
  };
  
  // Confirmar adesão (primeira confirmação)
  const handleConfirmarAdesao = () => {
    if (!meioPagamento || !contaDestino) {
      toast.error('Preencha todos os campos de pagamento');
      return;
    }
    
    const maquina = maquinas.find(m => m.id === maquinaSelecionada);
    const conta = contasFinanceiras.find(c => c.id === contaDestino);
    const meio = meiosPagamento.find(m => m.id === meioPagamento);
    
    setDadosAdesaoTemp({
      plano: planoSelecionado,
      pagamento: {
        meioPagamento: meio?.modelo || meioPagamento,
        maquinaId: maquinaSelecionada,
        maquinaNome: maquina?.nome || '',
        contaDestinoId: contaDestino,
        contaDestinoNome: conta?.nome || '',
        valor: planoSelecionado?.valor || 0,
        parcelas: parseInt(parcelas)
      }
    });
    
    setDialogAdesao(false);
    setDialogConfirmacao1(true);
  };
  
  // Segunda confirmação
  const handleConfirmacao1 = () => {
    if (!responsavelConfirmacao) {
      toast.error('Selecione o responsável');
      return;
    }
    
    const responsavel = colaboradores.find(c => c.id === responsavelConfirmacao);
    
    setDadosAdesaoTemp({
      ...dadosAdesaoTemp,
      confirmacao1: {
        responsavelId: responsavelConfirmacao,
        responsavelNome: responsavel?.nome || 'Responsável',
        dataHora: new Date().toISOString()
      }
    });
    
    setDialogConfirmacao1(false);
    setDialogConfirmacao2(true);
  };
  
  // Finalizar adesão
  const handleFinalizarAdesao = () => {
    const responsavel = colaboradores.find(c => c.id === responsavelConfirmacao);
    const novaDataFim = format(addMonths(new Date(), dadosAdesaoTemp.plano.meses), 'yyyy-MM-dd');
    
    // Criar tratativa comercial
    const tratativa = addTratativaComercial({
      garantiaId: garantia.id,
      vendaId: garantia.vendaId,
      tipo: dadosAdesaoTemp.plano.nome === 'Silver' ? 'Adesão Silver' : 'Adesão Gold',
      dataHora: new Date().toISOString(),
      usuarioId: responsavelConfirmacao,
      usuarioNome: responsavel?.nome || 'Responsável',
      descricao: observacaoFinal,
      planoId: dadosAdesaoTemp.plano.id,
      planoNome: dadosAdesaoTemp.plano.nome,
      valorPlano: dadosAdesaoTemp.plano.valor,
      mesesPlano: dadosAdesaoTemp.plano.meses,
      novaDataFimGarantia: novaDataFim,
      statusAdesao: 'Pendente Financeiro',
      pagamento: dadosAdesaoTemp.pagamento,
      confirmacao1: dadosAdesaoTemp.confirmacao1,
      confirmacao2: {
        responsavelId: responsavelConfirmacao,
        responsavelNome: responsavel?.nome || 'Responsável',
        dataHora: new Date().toISOString(),
        observacao: observacaoFinal
      }
    });
    
    // Criar venda para conferência financeira
    adicionarVendaParaConferencia(
      `VEN-EXT-${Date.now()}`,
      garantia.lojaVenda,
      getLojaName(garantia.lojaVenda),
      responsavelConfirmacao,
      responsavel?.nome || 'Responsável',
      garantia.clienteNome,
      dadosAdesaoTemp.plano.valor,
      'Normal',
      {
        clienteTelefone: garantia.clienteTelefone,
        clienteEmail: garantia.clienteEmail,
        origemVenda: `Garantia Extendida - ${dadosAdesaoTemp.plano.nome}`,
        itens: [{
          produto: `Plano ${dadosAdesaoTemp.plano.nome} - ${garantia.modelo}`,
          valorVenda: dadosAdesaoTemp.plano.valor,
          valorCusto: 0
        }],
        pagamentos: [dadosAdesaoTemp.pagamento],
        subtotal: dadosAdesaoTemp.plano.valor,
        totalTradeIn: 0,
        total: dadosAdesaoTemp.plano.valor,
        lucro: dadosAdesaoTemp.plano.valor,
        margem: 100,
        observacoes: `Adesão de garantia extendida para ${garantia.imei}`
      }
    );
    
    // Timeline
    addTimelineEntry({
      garantiaId: garantia.id,
      dataHora: new Date().toISOString(),
      tipo: 'tratativa',
      titulo: `Adesão ${dadosAdesaoTemp.plano.nome} registrada`,
      descricao: `Cliente aderiu ao plano ${dadosAdesaoTemp.plano.nome} (${dadosAdesaoTemp.plano.meses} meses) - ${formatCurrency(dadosAdesaoTemp.plano.valor)}`,
      usuarioId: responsavelConfirmacao,
      usuarioNome: responsavel?.nome || 'Responsável'
    });
    
    // Notificar financeiro
    notificarFinanceiroAdesao(tratativa);
    
    toast.success('Adesão registrada com sucesso! Enviada para conferência financeira.');
    
    // Limpar estados
    setDialogConfirmacao2(false);
    setPlanoSelecionado(null);
    setMeioPagamento('');
    setMaquinaSelecionada('');
    setContaDestino('');
    setParcelas('1');
    setResponsavelConfirmacao('');
    setObservacaoFinal('');
    setDadosAdesaoTemp(null);
    setTipoTratativa('');
  };

  return (
    <GarantiasLayout title="Detalhes - Garantia Extendida">
      <div className="space-y-6">
        {/* Voltar */}
        <Button variant="ghost" onClick={() => navigate('/garantias/extendida')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para Garantia Extendida
        </Button>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Alerta de status */}
            {tempoRestante.status === 'expirada' && (
              <div className="p-4 bg-muted border rounded-lg flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Garantia Expirada</p>
                  <p className="text-sm text-muted-foreground">
                    Esta garantia expirou. O cliente pode aderir a um plano Silver ou Gold.
                  </p>
                </div>
              </div>
            )}
            
            {tempoRestante.status === 'urgente' && (
              <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-red-500" />
                <div>
                  <p className="font-semibold text-red-700 dark:text-red-400">Garantia Expirando em Breve!</p>
                  <p className="text-sm text-red-600 dark:text-red-300">
                    Restam apenas {tempoRestante.texto}. Entre em contato com o cliente.
                  </p>
                </div>
              </div>
            )}
            
            {tempoRestante.status === 'atencao' && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-center gap-3">
                <Clock className="h-6 w-6 text-yellow-500" />
                <div>
                  <p className="font-semibold text-yellow-700 dark:text-yellow-400">Atenção: Garantia Próxima do Vencimento</p>
                  <p className="text-sm text-yellow-600 dark:text-yellow-300">
                    Restam {tempoRestante.texto}. Considere entrar em contato com o cliente.
                  </p>
                </div>
              </div>
            )}
            
            {/* Dados da Venda */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Dados da Venda Original
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">ID Venda</p>
                    <p className="font-medium">{garantia.vendaId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Data da Venda</p>
                    <p className="font-medium">{format(new Date(garantia.dataInicioGarantia), 'dd/MM/yyyy')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Loja</p>
                    <p className="font-medium">{getLojaName(garantia.lojaVenda)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Modelo</p>
                    <p className="font-medium">{garantia.modelo}</p>
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
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Nome</p>
                      <p className="font-medium">{garantia.clienteNome}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Telefone</p>
                      <p className="font-medium">{garantia.clienteTelefone || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{garantia.clienteEmail || '-'}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Dados da Garantia */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Dados da Garantia
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">IMEI</p>
                    <p className="font-mono text-sm">{garantia.imei}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tipo Garantia</p>
                    <Badge variant="outline">{garantia.tipoGarantia}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Data Fim Garantia</p>
                    <p className="font-medium">{format(new Date(garantia.dataFimGarantia), 'dd/MM/yyyy')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tempo Restante</p>
                    <Badge className={
                      tempoRestante.status === 'expirada' ? 'bg-muted text-muted-foreground' :
                      tempoRestante.status === 'urgente' ? 'bg-red-500 text-white' :
                      tempoRestante.status === 'atencao' ? 'bg-yellow-500 text-white' :
                      'bg-green-500 text-white'
                    }>
                      {tempoRestante.texto}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Timeline Completa</CardTitle>
              </CardHeader>
              <CardContent>
                {timelineCombinada.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">Nenhum registro na timeline</p>
                ) : (
                  <div className="space-y-4">
                    {timelineCombinada.map((item, index) => (
                      <div key={index} className="flex gap-4 pb-4 border-b last:border-0 last:pb-0">
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full ${
                            item.tipo === 'comercial' ? 'bg-primary' : 'bg-muted-foreground'
                          }`} />
                          {index < timelineCombinada.length - 1 && (
                            <div className="w-0.5 h-full bg-border mt-1" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <p className="font-medium">{item.titulo}</p>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(item.data), 'dd/MM/yyyy HH:mm')}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{item.descricao}</p>
                          <p className="text-xs text-muted-foreground mt-1">Por: {item.usuario}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Coluna Lateral - Tratativas */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Registrar Tratativa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Tipo de Tratativa *</Label>
                  <Select value={tipoTratativa} onValueChange={setTipoTratativa}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contato">Contato Realizado</SelectItem>
                      <SelectItem value="silver" disabled={!podeRenovarGarantia}>
                        Adesão do Plano - Silver {!podeRenovarGarantia && '(Aguardar expirar)'}
                      </SelectItem>
                      <SelectItem value="gold" disabled={!podeRenovarGarantia}>
                        Adesão do Plano - Gold {!podeRenovarGarantia && '(Aguardar expirar)'}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {tipoTratativa === 'contato' && (
                  <>
                    <div>
                      <Label>Resultado do Contato *</Label>
                      <Select value={resultadoContato} onValueChange={(v) => setResultadoContato(v as ResultadoContato)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Interessado">Interessado</SelectItem>
                          <SelectItem value="Sem interesse">Sem interesse</SelectItem>
                          <SelectItem value="Sem resposta">Sem resposta</SelectItem>
                          <SelectItem value="Agendou retorno">Agendou retorno</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Descrição</Label>
                      <Textarea 
                        placeholder="Descreva o contato..."
                        value={descricao}
                        onChange={(e) => setDescricao(e.target.value)}
                      />
                    </div>
                    <Button className="w-full" onClick={handleRegistrarContato}>
                      Registrar Contato
                    </Button>
                  </>
                )}
                
                {tipoTratativa === 'silver' && (
                  <Button className="w-full" onClick={() => handleIniciarAdesao('Silver')}>
                    <Star className="h-4 w-4 mr-2" />
                    Iniciar Adesão Silver
                  </Button>
                )}
                
                {tipoTratativa === 'gold' && (
                  <Button className="w-full" onClick={() => handleIniciarAdesao('Gold')}>
                    <Star className="h-4 w-4 mr-2 fill-current" />
                    Iniciar Adesão Gold
                  </Button>
                )}
                
                {!podeRenovarGarantia && tipoTratativa && tipoTratativa !== 'contato' && (
                  <p className="text-sm text-muted-foreground text-center">
                    A garantia precisa estar expirada para realizar a adesão.
                  </p>
                )}
              </CardContent>
            </Card>
            
            {/* Tratativas anteriores */}
            {tratativasComerciais.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Tratativas Anteriores</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {tratativasComerciais.map(t => (
                      <div key={t.id} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-start mb-1">
                          <Badge variant="outline">{t.tipo}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(t.dataHora), 'dd/MM HH:mm')}
                          </span>
                        </div>
                        {t.resultadoContato && (
                          <p className="text-sm font-medium">{t.resultadoContato}</p>
                        )}
                        {t.statusAdesao && (
                          <Badge className={
                            t.statusAdesao === 'Concluída' ? 'bg-green-500' :
                            t.statusAdesao === 'Pendente Financeiro' ? 'bg-yellow-500' :
                            'bg-red-500'
                          }>
                            {t.statusAdesao}
                          </Badge>
                        )}
                        {t.descricao && (
                          <p className="text-sm text-muted-foreground mt-1">{t.descricao}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
      
      {/* Dialog Adesão - Pagamento */}
      <Dialog open={dialogAdesao} onOpenChange={setDialogAdesao}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adesão Plano {planoSelecionado?.nome}</DialogTitle>
            <DialogDescription>
              Configure o pagamento para a adesão
            </DialogDescription>
          </DialogHeader>
          
          {planoSelecionado && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold">Plano {planoSelecionado.nome}</p>
                    <p className="text-sm text-muted-foreground">{planoSelecionado.meses} meses de garantia</p>
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(planoSelecionado.valor)}</p>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <Label>Meio de Pagamento *</Label>
                <Select value={meioPagamento} onValueChange={setMeioPagamento}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {meiosPagamento.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.modelo}</SelectItem>
                    ))}
                  </SelectContent>
              </Select>
              </div>
              
              {meioPagamento && meiosPagamento.find(m => m.id === meioPagamento)?.modelo.toLowerCase().includes('cartão') && (
                <>
                  <div>
                    <Label>Máquina</Label>
                    <Select value={maquinaSelecionada} onValueChange={setMaquinaSelecionada}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {maquinas.map(m => (
                          <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Parcelas</Label>
                    <Select value={parcelas} onValueChange={setParcelas}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1,2,3,4,5,6,7,8,9,10,11,12].map(p => (
                          <SelectItem key={p} value={String(p)}>{p}x</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              
              <div>
                <Label>Conta Destino *</Label>
                <Select value={contaDestino} onValueChange={setContaDestino}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {contasFinanceiras.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAdesao(false)}>Cancelar</Button>
            <Button onClick={handleConfirmarAdesao}>
              <CreditCard className="h-4 w-4 mr-2" />
              Confirmar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog Confirmação 1 */}
      <Dialog open={dialogConfirmacao1} onOpenChange={setDialogConfirmacao1}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Adesão - Etapa 1</DialogTitle>
            <DialogDescription>
              Confirme os dados da adesão ao plano {dadosAdesaoTemp?.plano?.nome}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plano:</span>
                <span className="font-medium">{dadosAdesaoTemp?.plano?.nome}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor:</span>
                <span className="font-medium">{formatCurrency(dadosAdesaoTemp?.plano?.valor || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pagamento:</span>
                <span className="font-medium">{dadosAdesaoTemp?.pagamento?.meioPagamento}</span>
              </div>
            </div>
            
            <div>
              <Label>Responsável pela Confirmação *</Label>
              <Input
                value={user?.colaborador?.nome || 'Não identificado'}
                disabled
                className="bg-muted"
              />
            </div>
            
            <p className="text-sm text-muted-foreground">
              Data/Hora: {format(new Date(), 'dd/MM/yyyy HH:mm')}
            </p>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogConfirmacao1(false)}>Cancelar</Button>
            <Button onClick={handleConfirmacao1}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog Confirmação 2 - Final */}
      <Dialog open={dialogConfirmacao2} onOpenChange={setDialogConfirmacao2}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalizar Adesão - Etapa 2</DialogTitle>
            <DialogDescription>
              Esta é a confirmação final. A adesão será enviada para o Financeiro.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-primary/10 rounded-lg">
              <p className="text-center font-semibold">
                Plano {dadosAdesaoTemp?.plano?.nome} - {formatCurrency(dadosAdesaoTemp?.plano?.valor || 0)}
              </p>
              <p className="text-center text-sm text-muted-foreground">
                Nova garantia: {dadosAdesaoTemp?.plano?.meses} meses
              </p>
            </div>
            
            <div>
              <Label>Observações (opcional)</Label>
              <Textarea 
                placeholder="Adicione observações sobre a adesão..."
                value={observacaoFinal}
                onChange={(e) => setObservacaoFinal(e.target.value)}
              />
            </div>
            
            <p className="text-sm text-muted-foreground">
              Responsável: {colaboradores.find(c => c.id === responsavelConfirmacao)?.nome}
            </p>
            <p className="text-sm text-muted-foreground">
              Data/Hora: {format(new Date(), 'dd/MM/yyyy HH:mm')}
            </p>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogConfirmacao2(false)}>Cancelar</Button>
            <Button onClick={handleFinalizarAdesao} className="bg-green-600 hover:bg-green-700">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Finalizar Adesão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </GarantiasLayout>
  );
}
