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
  FileText, 
  User,
  ChevronRight,
  Lock
} from 'lucide-react';
import {
  getFeedbacks,
  getFeedbacksByColaborador,
  getColaboradoresComFeedback,
  getTodosColaboradoresParaFeedback,
  getUltimaNotificacao,
  getProximaAnotacao,
  getContadorFeedbacks,
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
  const [selectedColaborador, setSelectedColaborador] = useState<ColaboradorFeedback | null>(null);
  const [feedbackForm, setFeedbackForm] = useState({
    tipo: '' as 'Advertência' | 'Advertência (2)' | 'Suspensão' | 'Suspensão (2)' | 'Suspensão (3)',
    texto: ''
  });
  const [refreshKey, setRefreshKey] = useState(0);

  const usuarioLogado = getUsuarioLogado();
  const lojas = getLojas();

  // Colaboradores filtrados
  const colaboradores = useMemo(() => {
    const todos = showOnlyWithFeedback 
      ? getColaboradoresComFeedback() 
      : getTodosColaboradoresParaFeedback();
    
    if (!searchTerm) return todos;
    
    return todos.filter(c => 
      c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cpf.includes(searchTerm) ||
      c.cargo.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [showOnlyWithFeedback, searchTerm, refreshKey]);

  // Helper para nome da loja
  const getNomeLoja = (lojaId: string) => {
    const loja = lojas.find(l => l.id === lojaId);
    return loja?.nome.replace('Thiago Imports ', '') || lojaId;
  };

  // Abrir modal de registro
  const handleOpenRegistrar = (colaborador: ColaboradorFeedback) => {
    const qtdFeedbacks = getContadorFeedbacks(colaborador.id);
    let tipoSugerido: FeedbackRegistro['tipo'] = 'Advertência';
    
    if (qtdFeedbacks === 1) tipoSugerido = 'Advertência (2)';
    else if (qtdFeedbacks === 2) tipoSugerido = 'Suspensão';
    else if (qtdFeedbacks >= 3) tipoSugerido = `Suspensão (${qtdFeedbacks - 1})` as FeedbackRegistro['tipo'];
    
    setSelectedColaborador(colaborador);
    setFeedbackForm({ tipo: tipoSugerido, texto: '' });
    setIsRegistrarDialogOpen(true);
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
    const dataExport = colaboradores.map(c => ({
      'ID': c.id,
      'Nome': c.nome,
      'CPF': c.cpf,
      'Cargo': c.cargo,
      'Loja': getNomeLoja(c.loja),
      'Última Notificação': getUltimaNotificacao(c.id) 
        ? format(getUltimaNotificacao(c.id)!, 'dd/MM/yyyy HH:mm', { locale: ptBR })
        : 'Sem registros',
      'Próx Anotação': getProximaAnotacao(c.id),
      'Total Feedbacks': getContadorFeedbacks(c.id)
    }));

    exportFeedbacksToCSV(dataExport, 'feedback_colaboradores.csv');
    toast({ title: 'Exportado', description: 'Arquivo CSV gerado com sucesso' });
  };

  // Exportar feedbacks do colaborador selecionado
  const handleExportColaborador = () => {
    if (!selectedColaborador) return;

    const feedbacksColaborador = getFeedbacksByColaborador(selectedColaborador.id);
    const dataExport = feedbacksColaborador.map(f => ({
      'ID': f.id,
      'Data/Hora': format(f.dataHora, 'dd/MM/yyyy HH:mm', { locale: ptBR }),
      'Gestor': f.gestorNome,
      'Tipo': f.tipo,
      'Texto': f.texto,
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
                  placeholder="Buscar por nome, CPF ou cargo..." 
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

            {/* Tabela principal */}
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead className="hidden md:table-cell">CPF</TableHead>
                    <TableHead className="hidden sm:table-cell">Cargo</TableHead>
                    <TableHead className="hidden lg:table-cell">Loja</TableHead>
                    <TableHead>Última Notificação</TableHead>
                    <TableHead>Próx Anotação</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {colaboradores.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        {showOnlyWithFeedback 
                          ? 'Nenhum colaborador com registro de feedback encontrado'
                          : 'Nenhum colaborador encontrado'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    colaboradores.map((colaborador) => {
                      const ultimaNotificacao = getUltimaNotificacao(colaborador.id);
                      const proxAnotacao = getProximaAnotacao(colaborador.id);
                      const qtdFeedbacks = getContadorFeedbacks(colaborador.id);

                      return (
                        <TableRow key={colaborador.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{colaborador.nome}</p>
                                <p className="text-xs text-muted-foreground sm:hidden">{colaborador.cargo}</p>
                              </div>
                              {qtdFeedbacks > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {qtdFeedbacks}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell font-mono text-xs">
                            {colaborador.cpf}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">{colaborador.cargo}</TableCell>
                          <TableCell className="hidden lg:table-cell">{getNomeLoja(colaborador.loja)}</TableCell>
                          <TableCell>
                            {ultimaNotificacao ? (
                              <div className="flex items-center gap-1 text-sm">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                {format(ultimaNotificacao, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">Sem registros</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                proxAnotacao === 'Sem registros' ? 'outline' :
                                proxAnotacao.includes('Suspensão') ? 'destructive' : 'secondary'
                              }
                            >
                              {proxAnotacao}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {usuarioLogado.isGestor ? (
                              <Button 
                                size="sm" 
                                onClick={() => handleOpenRegistrar(colaborador)}
                                className="gap-1"
                              >
                                <FileText className="h-4 w-4" />
                                <span className="hidden sm:inline">Registrar</span>
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button 
                                size="sm" 
                                variant="outline"
                                disabled
                                className="gap-1"
                              >
                                <Lock className="h-4 w-4" />
                                <span className="hidden sm:inline">Restrito</span>
                              </Button>
                            )}
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

      {/* Modal de Registro de Feedback */}
      <Dialog open={isRegistrarDialogOpen} onOpenChange={setIsRegistrarDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquareWarning className="h-5 w-5" />
              Registrar FeedBack - {selectedColaborador?.nome}
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6">
              {/* Info do colaborador */}
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">CPF:</span>
                      <span className="ml-2 font-mono">{selectedColaborador?.cpf}</span>
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
                      <span className="text-muted-foreground">Total Feedbacks:</span>
                      <span className="ml-2">{selectedColaborador && getContadorFeedbacks(selectedColaborador.id)}</span>
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
            </div>
          </ScrollArea>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsRegistrarDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSalvarFeedback}>
              Registrar FeedBack
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </RHLayout>
  );
}
