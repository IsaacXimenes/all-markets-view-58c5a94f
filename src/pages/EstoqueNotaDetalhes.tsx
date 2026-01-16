import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { EstoqueLayout } from '@/components/layout/EstoqueLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Save, ChevronDown, ChevronUp, Clock, Edit, Send, XCircle, CheckCircle, FileText } from 'lucide-react';
import { getNotasCompra, updateNota, NotaCompra } from '@/utils/estoqueApi';
import { getFornecedores } from '@/utils/cadastrosApi';
import { toast } from 'sonner';
import { formatCurrency } from '@/utils/formatUtils';

// Interface para timeline de alterações
interface TimelineNotaEntry {
  id: string;
  dataHora: string;
  usuarioId: string;
  usuarioNome: string;
  tipoEvento: 'criacao' | 'edicao' | 'enviado_financeiro' | 'recusado_financeiro' | 'aprovado_financeiro';
  observacoes?: string;
  camposAlterados?: {
    campo: string;
    valorAnterior: any;
    valorNovo: any;
  }[];
}

// Interface estendida de nota com timeline e status recusado
interface NotaCompraExtendida extends Omit<NotaCompra, 'status'> {
  timeline?: TimelineNotaEntry[];
  motivoRecusa?: string;
  status: 'Pendente' | 'Concluído' | 'Recusado' | 'Enviado para Financeiro';
}

// Mock de usuário logado
const usuarioLogado = { id: 'COL-003', nome: 'Carlos Estoque' };

export default function EstoqueNotaDetalhes() {
  console.log('[EstoqueNotaDetalhes] Component mounting...');
  const { id } = useParams();
  console.log('[EstoqueNotaDetalhes] ID from params:', id);
  const navigate = useNavigate();
  
  const [nota, setNota] = useState<NotaCompraExtendida | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(true);
  const [fornecedores, setFornecedores] = useState<ReturnType<typeof getFornecedores>>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Estado de edição
  const [editData, setEditData] = useState({
    numeroNota: '',
    fornecedor: '',
    observacoes: ''
  });
  
  // Carregar fornecedores no mount
  useEffect(() => {
    console.log('[EstoqueNotaDetalhes] useEffect fornecedores running...');
    try {
      const data = getFornecedores();
      console.log('[EstoqueNotaDetalhes] Fornecedores loaded:', data?.length);
      setFornecedores(data);
    } catch (error) {
      console.error('[EstoqueNotaDetalhes] Erro ao carregar fornecedores:', error);
    }
  }, []);

  useEffect(() => {
    console.log('[EstoqueNotaDetalhes] useEffect nota running, id:', id);
    
    const loadNota = () => {
      try {
        const notas = getNotasCompra();
        console.log('[EstoqueNotaDetalhes] Notas loaded:', notas?.length);
        const notaBase = notas.find(n => n.id === id);
        console.log('[EstoqueNotaDetalhes] NotaBase found:', !!notaBase);
        
        if (notaBase) {
          // Carregar timeline do localStorage com tratamento de erro
          let timeline: TimelineNotaEntry[];
          try {
            const storedTimeline = localStorage.getItem(`nota_timeline_${id}`);
            timeline = storedTimeline 
              ? JSON.parse(storedTimeline) 
              : [{
                  id: `TL-${id}-001`,
                  dataHora: notaBase.data + 'T09:00:00',
                  usuarioId: 'COL-001',
                  usuarioNome: 'Sistema',
                  tipoEvento: 'criacao' as const,
                  observacoes: 'Nota criada com sucesso'
                }];
          } catch (parseError) {
            console.error('[EstoqueNotaDetalhes] Error parsing timeline:', parseError);
            timeline = [{
              id: `TL-${id}-001`,
              dataHora: notaBase.data + 'T09:00:00',
              usuarioId: 'COL-001',
              usuarioNome: 'Sistema',
              tipoEvento: 'criacao' as const,
              observacoes: 'Nota criada com sucesso'
            }];
          }
          
          // Carregar status estendido
          const storedStatus = localStorage.getItem(`nota_status_${id}`);
          const status = storedStatus || notaBase.status;
          
          // Carregar motivo de recusa se houver
          const storedMotivo = localStorage.getItem(`nota_motivo_${id}`);
          
          setNota({
            ...notaBase,
            timeline,
            status: status as NotaCompraExtendida['status'],
            motivoRecusa: storedMotivo || undefined
          });
          
          setEditData({
            numeroNota: notaBase.numeroNota,
            fornecedor: notaBase.fornecedor,
            observacoes: ''
          });
          console.log('[EstoqueNotaDetalhes] Nota set successfully');
        } else {
          console.log('[EstoqueNotaDetalhes] Nota not found for id:', id);
        }
      } catch (error) {
        console.error('[EstoqueNotaDetalhes] Error loading nota:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadNota();
  }, [id]);

  console.log('[EstoqueNotaDetalhes] Rendering, nota:', !!nota, 'isLoading:', isLoading);

  if (isLoading) {
    return (
      <EstoqueLayout title="Carregando...">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Carregando detalhes da nota...</p>
        </div>
      </EstoqueLayout>
    );
  }

  if (!nota) {
    return (
      <EstoqueLayout title="Nota não encontrada">
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">Nota não encontrada (ID: {id})</p>
          <Button onClick={() => navigate('/estoque/notas-compra')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Notas
          </Button>
        </div>
      </EstoqueLayout>
    );
  }

  const addTimelineEntry = (
    tipo: TimelineNotaEntry['tipoEvento'],
    observacoes: string,
    camposAlterados?: TimelineNotaEntry['camposAlterados']
  ) => {
    const newEntry: TimelineNotaEntry = {
      id: `TL-${id}-${String((nota.timeline?.length || 0) + 1).padStart(3, '0')}`,
      dataHora: new Date().toISOString(),
      usuarioId: usuarioLogado.id,
      usuarioNome: usuarioLogado.nome,
      tipoEvento: tipo,
      observacoes,
      camposAlterados
    };

    const updatedTimeline = [newEntry, ...(nota.timeline || [])];
    localStorage.setItem(`nota_timeline_${id}`, JSON.stringify(updatedTimeline));
    
    setNota(prev => prev ? { ...prev, timeline: updatedTimeline } : null);
  };

  const handleSaveEdit = () => {
    if (!nota) return;

    const camposAlterados: TimelineNotaEntry['camposAlterados'] = [];
    
    if (editData.numeroNota !== nota.numeroNota) {
      camposAlterados.push({
        campo: 'Número da Nota',
        valorAnterior: nota.numeroNota,
        valorNovo: editData.numeroNota
      });
    }
    
    if (editData.fornecedor !== nota.fornecedor) {
      camposAlterados.push({
        campo: 'Fornecedor',
        valorAnterior: nota.fornecedor,
        valorNovo: editData.fornecedor
      });
    }

    if (camposAlterados.length === 0 && !editData.observacoes) {
      toast.info('Nenhuma alteração detectada');
      setIsEditing(false);
      return;
    }

    // Atualizar nota na API
    updateNota(nota.id, {
      numeroNota: editData.numeroNota,
      fornecedor: editData.fornecedor
    });

    // Adicionar entrada na timeline
    addTimelineEntry(
      'edicao',
      editData.observacoes || 'Edição realizada',
      camposAlterados.length > 0 ? camposAlterados : undefined
    );

    // Atualizar estado local
    setNota(prev => prev ? {
      ...prev,
      numeroNota: editData.numeroNota,
      fornecedor: editData.fornecedor
    } : null);

    setIsEditing(false);
    setEditData(prev => ({ ...prev, observacoes: '' }));
    toast.success('Nota atualizada com sucesso!');
  };

  const getStatusBadge = (status: NotaCompraExtendida['status']) => {
    switch (status) {
      case 'Pendente':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">Pendente</Badge>;
      case 'Enviado para Financeiro':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">Enviado para Financeiro</Badge>;
      case 'Recusado':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">Recusado</Badge>;
      case 'Concluído':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">Concluído</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTimelineIcon = (tipo: TimelineNotaEntry['tipoEvento']) => {
    switch (tipo) {
      case 'criacao':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'edicao':
        return <Edit className="h-4 w-4 text-amber-500" />;
      case 'enviado_financeiro':
        return <Send className="h-4 w-4 text-blue-500" />;
      case 'recusado_financeiro':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'aprovado_financeiro':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTipoEventoLabel = (tipo: TimelineNotaEntry['tipoEvento']) => {
    switch (tipo) {
      case 'criacao':
        return 'Criação';
      case 'edicao':
        return 'Edição';
      case 'enviado_financeiro':
        return 'Enviado para Financeiro';
      case 'recusado_financeiro':
        return 'Recusado pelo Financeiro';
      case 'aprovado_financeiro':
        return 'Aprovado pelo Financeiro';
      default:
        return tipo;
    }
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleEnviarParaFinanceiro = () => {
    if (!nota) return;
    
    // Atualizar status
    localStorage.setItem(`nota_status_${id}`, 'Enviado para Financeiro');
    
    // Adicionar entrada na timeline
    addTimelineEntry('enviado_financeiro', 'Nota enviada para conferência do financeiro');
    
    // Atualizar estado local
    setNota(prev => prev ? { ...prev, status: 'Enviado para Financeiro' } : null);
    
    toast.success('Nota enviada para o financeiro com sucesso!');
  };

  const [motivoRecusa, setMotivoRecusa] = useState('');
  const [dialogRecusaOpen, setDialogRecusaOpen] = useState(false);

  const handleRecusarNota = () => {
    if (!nota || !motivoRecusa.trim()) {
      toast.error('Informe o motivo da recusa');
      return;
    }
    
    // Atualizar status
    localStorage.setItem(`nota_status_${id}`, 'Recusado');
    localStorage.setItem(`nota_motivo_${id}`, motivoRecusa);
    
    // Adicionar entrada na timeline
    addTimelineEntry('recusado_financeiro', `Nota recusada: ${motivoRecusa}`);
    
    // Atualizar estado local
    setNota(prev => prev ? { ...prev, status: 'Recusado', motivoRecusa } : null);
    
    setDialogRecusaOpen(false);
    setMotivoRecusa('');
    toast.info('Nota marcada como recusada');
  };

  return (
    <EstoqueLayout title={`Detalhes da Nota ${nota.id}`}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Button variant="ghost" onClick={() => navigate('/estoque/notas-compra')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Notas de Compra
          </Button>
          
          <div className="flex gap-2">
            {!isEditing && nota.status === 'Pendente' && (
              <>
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </Button>
                <Button onClick={handleEnviarParaFinanceiro}>
                  <Send className="mr-2 h-4 w-4" />
                  Enviar para Financeiro
                </Button>
              </>
            )}
            
            {!isEditing && nota.status === 'Recusado' && (
              <>
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </Button>
                <Button onClick={handleEnviarParaFinanceiro}>
                  <Send className="mr-2 h-4 w-4" />
                  Reenviar para Financeiro
                </Button>
              </>
            )}
            
            {!isEditing && nota.status === 'Enviado para Financeiro' && (
              <Button variant="destructive" onClick={() => setDialogRecusaOpen(true)}>
                <XCircle className="mr-2 h-4 w-4" />
                Recusar Nota
              </Button>
            )}
            
            {!isEditing && nota.status !== 'Pendente' && nota.status !== 'Recusado' && nota.status !== 'Enviado para Financeiro' && (
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <CardTitle>Informações da Nota</CardTitle>
              {getStatusBadge(nota.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>ID da Nota</Label>
                <Input value={nota.id} disabled />
              </div>
              <div>
                <Label>Nº da Nota</Label>
                {isEditing ? (
                  <Input 
                    value={editData.numeroNota}
                    onChange={(e) => setEditData(prev => ({ ...prev, numeroNota: e.target.value }))}
                  />
                ) : (
                  <Input value={nota.numeroNota} disabled />
                )}
              </div>
              <div>
                <Label>Data de Entrada</Label>
                <Input value={new Date(nota.data + 'T12:00:00').toLocaleDateString('pt-BR')} disabled />
              </div>
              <div>
                <Label>Fornecedor</Label>
                {isEditing ? (
                  <Select value={editData.fornecedor} onValueChange={(v) => setEditData(prev => ({ ...prev, fornecedor: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fornecedores.filter(f => f.status === 'Ativo').map(f => (
                        <SelectItem key={f.id} value={f.nome}>{f.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={nota.fornecedor} disabled />
                )}
              </div>
            </div>

            {isEditing && (
              <div>
                <Label>Observações da Edição</Label>
                <Textarea
                  value={editData.observacoes}
                  onChange={(e) => setEditData(prev => ({ ...prev, observacoes: e.target.value }))}
                  placeholder="Descreva o motivo da alteração (opcional)"
                  rows={2}
                />
              </div>
            )}

            {isEditing && (
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsEditing(false)}>Cancelar</Button>
                <Button onClick={handleSaveEdit}>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Alterações
                </Button>
              </div>
            )}

            {/* Mostrar motivo de recusa se houver */}
            {nota.status === 'Recusado' && nota.motivoRecusa && (
              <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
                <h4 className="font-semibold text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  Motivo da Recusa
                </h4>
                <p className="text-sm text-red-600 dark:text-red-300">{nota.motivoRecusa}</p>
              </div>
            )}

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Produtos</h3>
              <div className="space-y-2">
                {nota.produtos.map((prod, idx) => (
                  <div key={idx} className="p-3 bg-muted/30 rounded">
                    <div className="flex justify-between">
                      <span className="font-medium">{prod.marca} {prod.modelo} - {prod.cor}</span>
                      <span className="font-semibold">{formatCurrency(prod.valorTotal)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      IMEI: {prod.imei} | Qtd: {prod.quantidade} | Tipo: {prod.tipo} | Saúde Bat: {prod.saudeBateria}%
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Valor Total da Nota</span>
                <span className="text-2xl font-bold">{formatCurrency(nota.valorTotal)}</span>
              </div>
            </div>

            {nota.status === 'Concluído' && nota.pagamento && (
              <div className="border-t pt-4 bg-green-500/10 p-4 rounded">
                <h3 className="font-semibold mb-3 text-green-700 dark:text-green-400">Pagamento (Finalizado pelo Financeiro)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Forma de Pagamento</Label>
                    <Input value={nota.pagamento.formaPagamento} disabled />
                  </div>
                  <div>
                    <Label>Número de Parcelas</Label>
                    <Input value={nota.pagamento.parcelas} disabled />
                  </div>
                  <div>
                    <Label>Valor da Parcela</Label>
                    <Input value={formatCurrency(nota.pagamento.valorParcela)} disabled />
                  </div>
                  <div>
                    <Label>Data de Vencimento</Label>
                    <Input value={new Date(nota.pagamento.dataVencimento + 'T12:00:00').toLocaleDateString('pt-BR')} disabled />
                  </div>
                </div>
                {nota.responsavelFinanceiro && (
                  <div className="mt-4">
                    <Label>Responsável Financeiro</Label>
                    <Input value={nota.responsavelFinanceiro} disabled />
                  </div>
                )}
              </div>
            )}

            {nota.status === 'Pendente' && (
              <div className="border-t pt-4 bg-yellow-500/10 p-4 rounded">
                <h3 className="font-semibold mb-2 text-yellow-700 dark:text-yellow-400">Pagamento</h3>
                <p className="text-sm text-muted-foreground">Aguardando preenchimento pelo Financeiro</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timeline de Alterações */}
        <Card>
          <Collapsible open={timelineOpen} onOpenChange={setTimelineOpen}>
            <CardHeader>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Timeline de Alterações
                  </CardTitle>
                  {timelineOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </Button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>
                <div className="space-y-4">
                  {nota.timeline && nota.timeline.length > 0 ? (
                    nota.timeline.map((entry, index) => (
                      <div key={entry.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            {getTimelineIcon(entry.tipoEvento)}
                          </div>
                          {index < (nota.timeline?.length || 0) - 1 && (
                            <div className="w-0.5 h-full bg-border flex-1 mt-2" />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm">
                              {formatDateTime(entry.dataHora)}
                            </span>
                            <span className="text-muted-foreground">-</span>
                            <span className="text-sm">{entry.usuarioNome}</span>
                            <Badge variant="outline" className="text-xs">
                              {getTipoEventoLabel(entry.tipoEvento)}
                            </Badge>
                          </div>
                          {entry.observacoes && (
                            <p className="text-sm text-muted-foreground">{entry.observacoes}</p>
                          )}
                          {entry.camposAlterados && entry.camposAlterados.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {entry.camposAlterados.map((alteracao, idx) => (
                                <div key={idx} className="text-xs bg-muted/50 px-2 py-1 rounded">
                                  <span className="font-medium">{alteracao.campo}:</span>{' '}
                                  <span className="text-red-500 line-through">{alteracao.valorAnterior}</span>
                                  {' → '}
                                  <span className="text-green-600">{alteracao.valorNovo}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-sm text-center py-4">
                      Nenhum registro na timeline
                    </p>
                  )}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      </div>

      {/* Dialog de Recusa */}
      <Dialog open={dialogRecusaOpen} onOpenChange={setDialogRecusaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Recusar Nota
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Motivo da Recusa *</Label>
              <Textarea
                value={motivoRecusa}
                onChange={(e) => setMotivoRecusa(e.target.value)}
                placeholder="Descreva o motivo da recusa..."
                rows={4}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDialogRecusaOpen(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleRecusarNota} disabled={!motivoRecusa.trim()}>
                Confirmar Recusa
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </EstoqueLayout>
  );
}
