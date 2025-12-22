import React, { useState, useMemo } from 'react';
import { RHLayout } from '@/components/layout/RHLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  MessageSquareWarning, 
  Download, 
  AlertTriangle, 
  Clock, 
  User,
  Lock,
  Plus,
  Eye
} from 'lucide-react';
import {
  getFeedbacks,
  getFeedbacksByColaborador,
  getTodosColaboradoresParaFeedback,
  addFeedback,
  getUsuarioLogado,
  exportFeedbacksToCSV,
  ColaboradorFeedback,
  FeedbackRegistro
} from '@/utils/feedbackApi';
import { getLojas } from '@/utils/cadastrosApi';

export default function RHFeedback() {
  const { toast } = useToast();
  const [showOnlyWithFeedback, setShowOnlyWithFeedback] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isRegistrarDialogOpen, setIsRegistrarDialogOpen] = useState(false);
  const [isDetalhesDialogOpen, setIsDetalhesDialogOpen] = useState(false);
  const [selectedColaborador, setSelectedColaborador] = useState<ColaboradorFeedback | null>(null);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackRegistro | null>(null);
  const [feedbackForm, setFeedbackForm] = useState({
    tipo: '' as 'Advertência' | 'Advertência (2)' | 'Suspensão' | 'Suspensão (2)' | 'Suspensão (3)',
    texto: ''
  });
  const [refreshKey, setRefreshKey] = useState(0);

  const usuarioLogado = getUsuarioLogado();
  const lojas = getLojas();
  const todosColaboradores = getTodosColaboradoresParaFeedback();

  // Feedbacks filtrados para tabela principal
  const feedbacksFiltrados = useMemo(() => {
    let lista = getFeedbacks();
    
    if (showOnlyWithFeedback) {
      // Já mostra todos os feedbacks
    }
    
    if (searchTerm) {
      lista = lista.filter(f => {
        const colaborador = todosColaboradores.find(c => c.id === f.colaboradorId);
        return (
          f.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          f.colaboradorId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          colaborador?.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
          f.tipo.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }
    
    return lista;
  }, [searchTerm, refreshKey, todosColaboradores, showOnlyWithFeedback]);

  // Helper para nome da loja
  const getNomeLoja = (lojaId: string) => {
    const loja = lojas.find(l => l.id === lojaId);
    return loja?.nome.replace('Thiago Imports ', '') || lojaId;
  };

  // Helper para dados do colaborador
  const getColaborador = (colaboradorId: string) => {
    return todosColaboradores.find(c => c.id === colaboradorId);
  };

  // Abrir modal de registro (novo feedback)
  const handleOpenRegistrar = () => {
    setSelectedColaborador(null);
    setFeedbackForm({ tipo: 'Advertência', texto: '' });
    setIsRegistrarDialogOpen(true);
  };

  // Selecionar colaborador no modal de registro
  const handleSelectColaborador = (colaboradorId: string) => {
    const colaborador = todosColaboradores.find(c => c.id === colaboradorId);
    if (colaborador) {
      const feedbacksColaborador = getFeedbacksByColaborador(colaborador.id);
      const qtd = feedbacksColaborador.length;
      let tipoSugerido: FeedbackRegistro['tipo'] = 'Advertência';
      
      if (qtd === 1) tipoSugerido = 'Advertência (2)';
      else if (qtd === 2) tipoSugerido = 'Suspensão';
      else if (qtd >= 3) tipoSugerido = `Suspensão (${qtd - 1})` as FeedbackRegistro['tipo'];
      
      setSelectedColaborador(colaborador);
      setFeedbackForm({ tipo: tipoSugerido, texto: '' });
    }
  };

  // Abrir modal de detalhes
  const handleVerDetalhes = (feedback: FeedbackRegistro) => {
    const colaborador = todosColaboradores.find(c => c.id === feedback.colaboradorId);
    setSelectedFeedback(feedback);
    setSelectedColaborador(colaborador || null);
    setIsDetalhesDialogOpen(true);
  };

  // Salvar feedback
  const handleSalvarFeedback = () => {
    if (!selectedColaborador || !feedbackForm.tipo || !feedbackForm.texto.trim()) {
      toast({ title: 'Erro', description: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }

    const feedbacksAnteriores = getFeedbacksByColaborador(selectedColaborador.id);
    const ultimoFeedback = feedbacksAnteriores[0];

    addFeedback({
      colaboradorId: selectedColaborador.id,
      tipo: feedbackForm.tipo,
      texto: feedbackForm.texto,
      gestorId: usuarioLogado.id,
      gestorNome: usuarioLogado.nome,
      dataHora: new Date(),
      referenciaAnterior: ultimoFeedback?.id
    });

    toast({ title: 'Sucesso', description: 'Feedback registrado com sucesso' });
    setIsRegistrarDialogOpen(false);
    setSelectedColaborador(null);
    setRefreshKey(prev => prev + 1);
  };

  // Exportar tabela principal
  const handleExportTable = () => {
    const dataExport = feedbacksFiltrados.map(f => {
      const colaborador = getColaborador(f.colaboradorId);
      return {
        'ID Feedback': f.id,
        'ID Colaborador': f.colaboradorId,
        'Nome Colaborador': colaborador?.nome || '-',
        'Cargo': colaborador?.cargo || '-',
        'Loja': colaborador ? getNomeLoja(colaborador.loja) : '-',
        'Tipo': f.tipo,
        'Data/Hora': format(f.dataHora, 'dd/MM/yyyy HH:mm', { locale: ptBR }),
        'Gestor': f.gestorNome,
        'Descrição': f.texto,
        'Referência Anterior': f.referenciaAnterior || '-'
      };
    });

    exportFeedbacksToCSV(dataExport, 'feedbacks_export.csv');
    toast({ title: 'Exportado', description: 'Arquivo CSV gerado com sucesso' });
  };

  // Exportar feedbacks do colaborador selecionado
  const handleExportColaborador = () => {
    if (!selectedColaborador) return;

    const feedbacksColaborador = getFeedbacksByColaborador(selectedColaborador.id);
    const dataExport = feedbacksColaborador.map(f => ({
      'ID Feedback': f.id,
      'Data/Hora': format(f.dataHora, 'dd/MM/yyyy HH:mm', { locale: ptBR }),
      'Gestor': f.gestorNome,
      'Tipo': f.tipo,
      'Descrição': f.texto,
      'Referência Anterior': f.referenciaAnterior || '-'
    }));

    exportFeedbacksToCSV(dataExport, `feedbacks_${selectedColaborador.nome.replace(/\s+/g, '_')}.csv`);
    toast({ title: 'Exportado', description: 'Histórico do colaborador exportado' });
  };

  // Timeline de feedbacks do colaborador
  const timelineColaborador = selectedColaborador 
    ? getFeedbacksByColaborador(selectedColaborador.id) 
    : [];

  return (
    <RHLayout title="Recursos Humanos - FeedBack">
      <div className="space-y-4">
        {/* Mensagem para não gestores */}
        {!usuarioLogado.isGestor && (
          <Card className="border-warning bg-warning/10">
            <CardContent className="py-4 flex items-center gap-3">
              <Lock className="h-5 w-5 text-warning" />
              <span className="text-sm text-warning-foreground">
                Acesso restrito a gestores. Você pode visualizar os registros, mas não pode adicionar novos feedbacks.
              </span>
            </CardContent>
          </Card>
        )}

        {/* Header com filtros */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <MessageSquareWarning className="h-5 w-5" />
                Gestão de FeedBack
              </CardTitle>
              <div className="flex items-center gap-2">
                {usuarioLogado.isGestor && (
                  <Button onClick={handleOpenRegistrar} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Registrar FeedBack
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={handleExportTable}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="flex-1">
                <Input 
                  placeholder="Buscar por ID, nome, colaborador ou tipo..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="showOnlyWithFeedback"
                  checked={showOnlyWithFeedback}
                  onCheckedChange={(checked) => setShowOnlyWithFeedback(checked as boolean)}
                />
                <Label htmlFor="showOnlyWithFeedback" className="text-sm cursor-pointer">
                  Mostrar apenas colaboradores com registro de Feedback
                </Label>
              </div>
            </div>

            {/* Tabela principal de feedbacks */}
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID Feedback</TableHead>
                    <TableHead>ID Colaborador</TableHead>
                    <TableHead>Colaborador</TableHead>
                    <TableHead className="hidden md:table-cell">Cargo</TableHead>
                    <TableHead className="hidden lg:table-cell">Loja</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead className="hidden sm:table-cell">Gestor</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feedbacksFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        Nenhum feedback encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    feedbacksFiltrados.map((feedback) => {
                      const colaborador = getColaborador(feedback.colaboradorId);

                      return (
                        <TableRow key={feedback.id}>
                          <TableCell className="font-mono text-xs font-medium">
                            {feedback.id}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {feedback.colaboradorId}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{colaborador?.nome || '-'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {colaborador?.cargo || '-'}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {colaborador ? getNomeLoja(colaborador.loja) : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={feedback.tipo.includes('Suspensão') ? 'destructive' : 'secondary'}
                            >
                              {feedback.tipo}
                            </Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <div className="flex items-center gap-1 text-sm">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              {format(feedback.dataHora, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground">
                            {feedback.gestorNome}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleVerDetalhes(feedback)}
                              className="gap-1"
                            >
                              <Eye className="h-4 w-4" />
                              <span className="hidden sm:inline">Ver Detalhes</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de Ver Detalhes */}
      <Dialog open={isDetalhesDialogOpen} onOpenChange={setIsDetalhesDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquareWarning className="h-5 w-5" />
              Detalhes do FeedBack - {selectedFeedback?.id}
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6">
              {/* Info do feedback */}
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">ID Feedback:</span>
                      <span className="ml-2 font-mono font-medium">{selectedFeedback?.id}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">ID Colaborador:</span>
                      <span className="ml-2 font-mono">{selectedFeedback?.colaboradorId}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Colaborador:</span>
                      <span className="ml-2 font-medium">{selectedColaborador?.nome}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Cargo:</span>
                      <span className="ml-2">{selectedColaborador?.cargo}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Loja:</span>
                      <span className="ml-2">{selectedColaborador && getNomeLoja(selectedColaborador.loja)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">CPF:</span>
                      <span className="ml-2 font-mono">{selectedColaborador?.cpf}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Detalhes do feedback selecionado */}
              <Card>
                <CardContent className="pt-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={selectedFeedback?.tipo.includes('Suspensão') ? 'destructive' : 'secondary'}
                      className="text-sm"
                    >
                      {selectedFeedback?.tipo}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {selectedFeedback && format(selectedFeedback.dataHora, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Descrição</Label>
                    <p className="mt-1 text-sm">{selectedFeedback?.texto}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Gestor:</span>
                      <span className="ml-2">{selectedFeedback?.gestorNome}</span>
                    </div>
                    {selectedFeedback?.referenciaAnterior && (
                      <div>
                        <span className="text-muted-foreground">Ref. Anterior:</span>
                        <span className="ml-2 font-mono">{selectedFeedback.referenciaAnterior}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Separator />

              {/* Timeline */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Histórico Completo do Colaborador
                  </h4>
                  {timelineColaborador.length > 0 && (
                    <Button variant="outline" size="sm" onClick={handleExportColaborador}>
                      <Download className="h-4 w-4 mr-2" />
                      Exportar Histórico
                    </Button>
                  )}
                </div>

                {timelineColaborador.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">
                    Nenhum registro para este colaborador
                  </p>
                ) : (
                  <div className="space-y-3">
                    {timelineColaborador.map((feedback, index) => (
                      <Card 
                        key={feedback.id} 
                        className={`relative ${feedback.id === selectedFeedback?.id ? 'ring-2 ring-primary' : ''}`}
                      >
                        {index < timelineColaborador.length - 1 && (
                          <div className="absolute left-6 top-full h-3 w-0.5 bg-border" />
                        )}
                        <CardContent className="py-3">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-full ${
                              feedback.tipo.includes('Suspensão') 
                                ? 'bg-destructive/10 text-destructive' 
                                : 'bg-warning/10 text-warning'
                            }`}>
                              <AlertTriangle className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant={feedback.tipo.includes('Suspensão') ? 'destructive' : 'secondary'}>
                                  {feedback.tipo}
                                </Badge>
                                <span className="text-xs font-mono text-muted-foreground">
                                  {feedback.id}
                                </span>
                                {feedback.id === selectedFeedback?.id && (
                                  <Badge variant="outline" className="text-xs">Atual</Badge>
                                )}
                              </div>
                              <p className="text-sm mt-1">{feedback.texto}</p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span>
                                  {format(feedback.dataHora, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                </span>
                                <span>Gestor: {feedback.gestorNome}</span>
                                {feedback.referenciaAnterior && (
                                  <span>Ref: {feedback.referenciaAnterior}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsDetalhesDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Registro de Feedback */}
      <Dialog open={isRegistrarDialogOpen} onOpenChange={setIsRegistrarDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Registrar Novo FeedBack
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6">
              {/* Seleção do colaborador */}
              <div className="space-y-2">
                <Label>Selecionar Colaborador *</Label>
                <Select 
                  value={selectedColaborador?.id || ''} 
                  onValueChange={handleSelectColaborador}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um colaborador" />
                  </SelectTrigger>
                  <SelectContent>
                    {todosColaboradores.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.id} - {c.nome} ({c.cargo})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedColaborador && (
                <>
                  {/* Info do colaborador */}
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">ID:</span>
                          <span className="ml-2 font-mono">{selectedColaborador.id}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">CPF:</span>
                          <span className="ml-2 font-mono">{selectedColaborador.cpf}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Cargo:</span>
                          <span className="ml-2">{selectedColaborador.cargo}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Loja:</span>
                          <span className="ml-2">{getNomeLoja(selectedColaborador.loja)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total Feedbacks:</span>
                          <span className="ml-2">{timelineColaborador.length}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Formulário */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Tipo de Notificação *</Label>
                      <Select 
                        value={feedbackForm.tipo} 
                        onValueChange={(value: FeedbackRegistro['tipo']) => setFeedbackForm({...feedbackForm, tipo: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Advertência">Advertência</SelectItem>
                          <SelectItem value="Advertência (2)">Advertência (2)</SelectItem>
                          <SelectItem value="Suspensão">Suspensão</SelectItem>
                          <SelectItem value="Suspensão (2)">Suspensão (2)</SelectItem>
                          <SelectItem value="Suspensão (3)">Suspensão (3)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Descrição do Feedback *</Label>
                      <Textarea 
                        value={feedbackForm.texto}
                        onChange={(e) => setFeedbackForm({...feedbackForm, texto: e.target.value})}
                        placeholder="Descreva detalhadamente o motivo do feedback..."
                        rows={4}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                      <div>
                        <span>Gestor:</span>
                        <span className="ml-2 font-medium text-foreground">{usuarioLogado.nome}</span>
                      </div>
                      <div>
                        <span>Data/Hora:</span>
                        <span className="ml-2 font-medium text-foreground">
                          {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Timeline */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Histórico de Notificações
                      </h4>
                      {timelineColaborador.length > 0 && (
                        <Button variant="outline" size="sm" onClick={handleExportColaborador}>
                          <Download className="h-4 w-4 mr-2" />
                          Exportar Histórico
                        </Button>
                      )}
                    </div>

                    {timelineColaborador.length === 0 ? (
                      <p className="text-muted-foreground text-sm text-center py-4">
                        Nenhum registro anterior para este colaborador
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {timelineColaborador.map((feedback, index) => (
                          <Card key={feedback.id} className="relative">
                            {index < timelineColaborador.length - 1 && (
                              <div className="absolute left-6 top-full h-3 w-0.5 bg-border" />
                            )}
                            <CardContent className="py-3">
                              <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-full ${
                                  feedback.tipo.includes('Suspensão') 
                                    ? 'bg-destructive/10 text-destructive' 
                                    : 'bg-warning/10 text-warning'
                                }`}>
                                  <AlertTriangle className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Badge variant={feedback.tipo.includes('Suspensão') ? 'destructive' : 'secondary'}>
                                      {feedback.tipo}
                                    </Badge>
                                    <span className="text-xs font-mono text-muted-foreground">
                                      {feedback.id}
                                    </span>
                                  </div>
                                  <p className="text-sm mt-1">{feedback.texto}</p>
                                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                    <span>
                                      {format(feedback.dataHora, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                    </span>
                                    <span>Gestor: {feedback.gestorNome}</span>
                                    {feedback.referenciaAnterior && (
                                      <span>Ref: {feedback.referenciaAnterior}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsRegistrarDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSalvarFeedback} disabled={!selectedColaborador}>
              Registrar FeedBack
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </RHLayout>
  );
}
