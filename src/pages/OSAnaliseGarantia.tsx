import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { OSLayout } from '@/components/layout/OSLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Eye, Check, Clock, AlertTriangle, AlertCircle, 
  Shield, Package, XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useCadastroStore } from '@/store/cadastroStore';
import { 
  getRegistrosAnaliseGarantia, aprovarAnaliseGarantia, recusarAnaliseGarantia,
  RegistroAnaliseGarantia, getGarantiaById
} from '@/utils/garantiasApi';
import { updateProdutoPendente, getProdutoPendenteById, ParecerAssistencia } from '@/utils/osApi';
import { addOrdemServico } from '@/utils/assistenciaApi';
import { getClientes } from '@/utils/cadastrosApi';
import { formatIMEI, unformatIMEI } from '@/utils/imeiMask';

export default function OSAnaliseGarantia() {
  const navigate = useNavigate();
  const [registros, setRegistros] = useState<RegistroAnaliseGarantia[]>(getRegistrosAnaliseGarantia());
  const { obterTecnicos, obterLojasTipoLoja, obterNomeLoja, obterNomeColaborador, obterColaboradorById } = useCadastroStore();
  const tecnicos = obterTecnicos();
  const lojas = obterLojasTipoLoja();
  
  // Filtros
  const [filtroOrigem, setFiltroOrigem] = useState<string>('todos');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [filtroIMEI, setFiltroIMEI] = useState('');

  const extrairIMEI = (descricao: string): string => {
    const match = descricao.match(/IMEI[:\s]*([0-9\-\s]+)/i);
    return match ? match[1].replace(/\D/g, '') : '';
  };
  
  // Modal aprovar
  const [showAprovarModal, setShowAprovarModal] = useState(false);
  const [registroSelecionado, setRegistroSelecionado] = useState<RegistroAnaliseGarantia | null>(null);
  const [tecnicoSelecionado, setTecnicoSelecionado] = useState('');
  const [lojaSelecionada, setLojaSelecionada] = useState('');
  const [dataHoraAprovacao] = useState(new Date().toISOString());
  
  // Modal detalhes
  const [showDetalhesModal, setShowDetalhesModal] = useState(false);
  const [detalheRegistro, setDetalheRegistro] = useState<RegistroAnaliseGarantia | null>(null);

  // Modal recusar
  const [showRecusarModal, setShowRecusarModal] = useState(false);
  const [registroParaRecusar, setRegistroParaRecusar] = useState<RegistroAnaliseGarantia | null>(null);
  const [motivoRecusa, setMotivoRecusa] = useState('');

  const calcularSLA = (dataChegada: string): number => {
    const hoje = new Date();
    const chegada = new Date(dataChegada);
    const dias = Math.floor((hoje.getTime() - chegada.getTime()) / (1000 * 60 * 60 * 24));
    return dias;
  };

  const registrosFiltrados = useMemo(() => {
    return registros.filter(r => {
      if (filtroOrigem !== 'todos' && r.origem !== filtroOrigem) return false;
      if (filtroStatus !== 'todos' && r.status !== filtroStatus) return false;
      if (filtroIMEI) {
        const imeiRegistro = extrairIMEI(r.clienteDescricao);
        if (!imeiRegistro || !imeiRegistro.includes(unformatIMEI(filtroIMEI))) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.dataChegada).getTime() - new Date(a.dataChegada).getTime());
  }, [registros, filtroOrigem, filtroStatus, filtroIMEI]);

  const getOrigemBadge = (origem: string) => {
    switch (origem) {
      case 'Garantia':
        return <Badge className="bg-blue-500 hover:bg-blue-600"><Shield className="h-3 w-3 mr-1" />Garantia</Badge>;
      case 'Estoque':
        return <Badge className="bg-purple-500 hover:bg-purple-600"><Package className="h-3 w-3 mr-1" />Estoque</Badge>;
      default:
        return <Badge variant="secondary">{origem}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pendente':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Pendente</Badge>;
      case 'Solicitação Aprovada':
        return <Badge className="bg-green-500 hover:bg-green-600">Solicitação Aprovada</Badge>;
      case 'Recusada':
        return <Badge className="bg-red-500 hover:bg-red-600">Recusada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getSLABadge = (dataChegada: string) => {
    const sla = calcularSLA(dataChegada);
    
    if (sla > 3) {
      return (
        <span className="px-2 py-1 rounded text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 inline-flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {sla} dias
        </span>
      );
    }
    return (
      <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 inline-flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {sla} dias
      </span>
    );
  };

  const handleAbrirAprovar = (registro: RegistroAnaliseGarantia) => {
    setRegistroSelecionado(registro);
    setTecnicoSelecionado('');
    setLojaSelecionada(lojas[0]?.id || '');
    setShowAprovarModal(true);
  };

  const handleVerDetalhes = (registro: RegistroAnaliseGarantia) => {
    setDetalheRegistro(registro);
    setShowDetalhesModal(true);
  };

  const handleConfirmarAprovacao = () => {
    if (!registroSelecionado || !tecnicoSelecionado) {
      toast.error('Selecione um técnico');
      return;
    }
    
    if (!lojaSelecionada) {
      toast.error('Selecione uma loja');
      return;
    }

    const tecnico = tecnicos.find(t => t.id === tecnicoSelecionado);
    const registroAprovado = aprovarAnaliseGarantia(registroSelecionado.id, {
      tecnicoId: tecnicoSelecionado,
      tecnicoNome: tecnico?.nome || '',
      dataAprovacao: dataHoraAprovacao,
      usuarioAprovacao: 'Usuário Sistema'
    });

    if (registroAprovado) {
      // Atualizar statusGeral do produto pendente
      if (registroAprovado.origemId) {
        updateProdutoPendente(registroAprovado.origemId, {
          statusGeral: 'Em Análise Assistência'
        });
      }

      // Criar OS diretamente
      const clientes = getClientes();
      let clienteId = '';
      let modeloAparelho = '';
      let imeiAparelho = '';
      let origemOS: 'Garantia' | 'Estoque' | 'Venda' | 'Balcão' = 'Balcão';

      if (registroAprovado.origem === 'Garantia' && registroAprovado.origemId) {
        origemOS = 'Garantia';
        const garantia = getGarantiaById(registroAprovado.origemId);
        if (garantia) {
          const cliente = clientes.find(c => c.nome === garantia.clienteNome || c.id === garantia.clienteId);
          if (cliente) clienteId = cliente.id;
          modeloAparelho = garantia.modelo || '';
          imeiAparelho = garantia.imei || '';
        }
    } else if (registroAprovado.origem === 'Estoque') {
        origemOS = 'Estoque';
        if (registroAprovado.origemId) {
          const produtoPendente = getProdutoPendenteById(registroAprovado.origemId);
          if (produtoPendente) {
            modeloAparelho = produtoPendente.modelo || '';
            imeiAparelho = produtoPendente.imei || '';
          }
        }
      }

      addOrdemServico({
        dataHora: new Date().toISOString(),
        clienteId,
        lojaId: lojaSelecionada,
        tecnicoId: tecnicoSelecionado,
        setor: registroAprovado.origem === 'Garantia' ? 'GARANTIA' : 'ASSISTÊNCIA',
        status: 'Em Aberto' as any,
        pecas: [],
        pagamentos: [],
        valorTotal: 0,
        custoTotal: 0,
        descricao: `Origem: ${registroAprovado.origem} - ${registroAprovado.clienteDescricao}`,
        timeline: [{
          data: new Date().toISOString(),
          tipo: 'registro' as const,
          descricao: `OS criada a partir da Análise de Tratativas (${registroAprovado.id})`,
          responsavel: 'Sistema'
        }],
        origemOS,
        proximaAtuacao: 'Técnico: Avaliar/Executar',
        garantiaId: registroAprovado.origem === 'Garantia' ? registroAprovado.origemId : undefined,
        modeloAparelho,
        imeiAparelho,
        observacaoOrigem: registroAprovado.observacao,
      });

      toast.success('Solicitação aprovada e OS criada com sucesso!');
      // Navegar para a aba Nova Assistência (lista)
      navigate('/os/assistencia');
    }

    setRegistros(getRegistrosAnaliseGarantia());
    setShowAprovarModal(false);
  };

  // Stats
  const handleConfirmarRecusa = () => {
    if (!registroParaRecusar) return;
    if (!motivoRecusa.trim()) {
      toast.error('Informe o motivo da recusa.');
      return;
    }

    const registroRecusado = recusarAnaliseGarantia(registroParaRecusar.id, motivoRecusa);
    if (registroRecusado) {
      // Reverter origem com pareceres atualizados
      if (registroRecusado.origem === 'Estoque' && registroRecusado.origemId) {
        const produtoPendente = getProdutoPendenteById(registroRecusado.origemId);
        
        // Criar parecer assistência com status "Recusado"
        const parecerAssistencia: ParecerAssistencia = {
          id: `PA-REC-${Date.now()}`,
          data: new Date().toISOString(),
          status: 'Aguardando peça' as any, // Placeholder - campo real é o status customizado abaixo
          observacoes: `Recusado na Análise de Tratativas. Motivo: ${motivoRecusa}`,
          responsavel: 'Sistema'
        };

        updateProdutoPendente(registroRecusado.origemId, {
          statusGeral: 'Pendente Estoque',
          parecerAssistencia: {
            ...parecerAssistencia,
            status: 'Aguardando peça' as any, // Keep valid type but add recusa info in observacoes
          },
          timeline: [
            ...(produtoPendente?.timeline || []),
            {
              id: `TL-REC-${Date.now()}`,
              data: new Date().toISOString(),
              tipo: 'parecer_assistencia' as const,
              titulo: `Recusado pela Assistência – ${registroRecusado.origemId}`,
              descricao: `Tratativa recusada na Análise de Tratativas. Motivo: ${motivoRecusa}. Produto devolvido para Estoque.`,
              responsavel: 'Sistema'
            }
          ]
        });
      }
      // Para Garantia, poderia atualizar a garantia correspondente se necessário
      
      toast.success('Solicitação recusada e devolvida à origem.');
    }

    setRegistros(getRegistrosAnaliseGarantia());
    setShowRecusarModal(false);
  };

  // Stats
  const totalRegistros = registros.length;
  const pendentes = registros.filter(r => r.status === 'Pendente').length;
  const aprovados = registros.filter(r => r.status === 'Solicitação Aprovada').length;
  const recusados = registros.filter(r => r.status === 'Recusada').length;
  const slaCritico = registros.filter(r => r.status === 'Pendente' && calcularSLA(r.dataChegada) > 3).length;

  return (
    <OSLayout title="Análise de Tratativas">
      {/* Dashboard Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{totalRegistros}</div>
            <div className="text-xs text-muted-foreground">Total</div>
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
            <div className="text-2xl font-bold text-green-600">{aprovados}</div>
            <div className="text-xs text-muted-foreground">Aprovados</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{recusados}</div>
            <div className="text-xs text-muted-foreground">Recusados</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
           <div className="space-y-2">
              <Label>IMEI</Label>
              <Input
                placeholder="Buscar por IMEI..."
                value={filtroIMEI}
                onChange={e => setFiltroIMEI(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Origem</Label>
              <Select value={filtroOrigem} onValueChange={setFiltroOrigem}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="Garantia">Garantia</SelectItem>
                  <SelectItem value="Estoque">Estoque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                  <SelectItem value="Solicitação Aprovada">Solicitação Aprovada</SelectItem>
                  <SelectItem value="Recusada">Recusada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={() => { setFiltroOrigem('todos'); setFiltroStatus('todos'); setFiltroIMEI(''); }}>
                Limpar Filtros
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
              <TableHead>IMEI</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Cliente/Descrição</TableHead>
              <TableHead>Data Chegada</TableHead>
              <TableHead>SLA</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {registrosFiltrados.map(registro => {
              const sla = calcularSLA(registro.dataChegada);
              return (
                <TableRow key={registro.id} className={sla > 3 ? 'bg-red-500/10' : ''}>
                  <TableCell className="font-mono text-xs">{registro.id}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {extrairIMEI(registro.clienteDescricao) ? formatIMEI(extrairIMEI(registro.clienteDescricao)) : '-'}
                  </TableCell>
                  <TableCell>{getOrigemBadge(registro.origem)}</TableCell>
                  <TableCell className="font-medium">{registro.clienteDescricao}</TableCell>
                  <TableCell>{format(new Date(registro.dataChegada), 'dd/MM/yyyy HH:mm')}</TableCell>
                  <TableCell>{getSLABadge(registro.dataChegada)}</TableCell>
                  <TableCell>{getStatusBadge(registro.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleVerDetalhes(registro)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {registro.status === 'Pendente' && (
                        <>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-600 hover:text-red-700"
                            onClick={() => {
                              setRegistroParaRecusar(registro);
                              setMotivoRecusa('');
                              setShowRecusarModal(true);
                            }}
                            title="Recusar"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-green-600 hover:text-green-700"
                            onClick={() => handleAbrirAprovar(registro)}
                            title="Aprovar"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {registrosFiltrados.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Nenhum registro encontrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal Aprovar */}
      <Dialog open={showAprovarModal} onOpenChange={setShowAprovarModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar Solicitação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Técnico Responsável *</Label>
              <Select value={tecnicoSelecionado} onValueChange={(val) => {
                setTecnicoSelecionado(val);
                // Auto-fill loja based on technician's assigned store
                if (val) {
                  const colaborador = obterColaboradorById(val);
                  if (colaborador?.loja_id) {
                    setLojaSelecionada(colaborador.loja_id);
                  }
                }
              }}>
                <SelectTrigger><SelectValue placeholder="Selecione um técnico..." /></SelectTrigger>
                <SelectContent>
                  {tecnicos.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Loja *</Label>
              <Select value={lojaSelecionada} onValueChange={setLojaSelecionada}>
                <SelectTrigger><SelectValue placeholder="Selecione uma loja..." /></SelectTrigger>
                <SelectContent>
                  {lojas.map(l => (
                    <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data/Hora</Label>
              <Input 
                value={format(new Date(dataHoraAprovacao), 'dd/MM/yyyy HH:mm')} 
                disabled 
                className="bg-muted"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAprovarModal(false)}>Cancelar</Button>
            <Button onClick={handleConfirmarAprovacao}>
              <Check className="h-4 w-4 mr-2" />
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Detalhes */}
      <Dialog open={showDetalhesModal} onOpenChange={setShowDetalhesModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do Registro</DialogTitle>
          </DialogHeader>
          {detalheRegistro && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">ID</Label>
                  <p className="font-mono">{detalheRegistro.id}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Origem</Label>
                  <div className="mt-1">{getOrigemBadge(detalheRegistro.origem)}</div>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground">Cliente/Descrição</Label>
                  <p className="font-medium">{detalheRegistro.clienteDescricao}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Data Chegada</Label>
                  <p>{format(new Date(detalheRegistro.dataChegada), 'dd/MM/yyyy HH:mm')}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">SLA</Label>
                  <div className="mt-1">{getSLABadge(detalheRegistro.dataChegada)}</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(detalheRegistro.status)}</div>
                </div>
                {detalheRegistro.tecnicoId && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Técnico</Label>
                    <p>{detalheRegistro.tecnicoNome || obterNomeColaborador(detalheRegistro.tecnicoId)}</p>
                  </div>
                )}
                {detalheRegistro.dataAprovacao && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Data Aprovação</Label>
                    <p>{format(new Date(detalheRegistro.dataAprovacao), 'dd/MM/yyyy HH:mm')}</p>
                  </div>
                )}
                {detalheRegistro.observacao && (
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">Observação do Estoque</Label>
                    <div className="mt-1 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                      <p className="text-sm text-amber-800 dark:text-amber-300">{detalheRegistro.observacao}</p>
                    </div>
                  </div>
                )}
                {detalheRegistro.motivoRecusa && (
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">Motivo da Recusa</Label>
                    <div className="mt-1 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                      <p className="text-sm text-red-800 dark:text-red-300">{detalheRegistro.motivoRecusa}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetalhesModal(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Recusar */}
      <Dialog open={showRecusarModal} onOpenChange={setShowRecusarModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Recusar Solicitação {registroParaRecusar?.id}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {registroParaRecusar?.observacao && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <p className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-1">Observação de Origem</p>
                <p className="text-sm text-amber-800 dark:text-amber-200">{registroParaRecusar.observacao}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Motivo da Recusa *</Label>
              <Textarea
                value={motivoRecusa}
                onChange={(e) => setMotivoRecusa(e.target.value)}
                placeholder="Descreva o motivo da recusa..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRecusarModal(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleConfirmarRecusa}>
              <XCircle className="h-4 w-4 mr-2" />
              Confirmar Recusa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OSLayout>
  );
}