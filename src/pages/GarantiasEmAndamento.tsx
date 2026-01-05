import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { GarantiasLayout } from '@/components/layout/GarantiasLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  Eye, Clock, Package, Smartphone, Wrench, AlertTriangle, CheckCircle
} from 'lucide-react';
import { 
  getGarantiasEmAndamento, getTratativas, updateTratativa, updateGarantia,
  addTimelineEntry, getContadoresGarantia, GarantiaItem, TratativaGarantia
} from '@/utils/garantiasApi';
import { format, differenceInDays } from 'date-fns';

export default function GarantiasEmAndamento() {
  const navigate = useNavigate();
  
  // Dados
  const garantiasEmAndamento = getGarantiasEmAndamento();
  const todasTratativas = getTratativas();
  const contadores = getContadoresGarantia();
  
  // Modal devolução
  const [showDevolucaoModal, setShowDevolucaoModal] = useState(false);
  const [tratativaSelecionada, setTratativaSelecionada] = useState<TratativaGarantia | null>(null);
  const [garantiaParaDevolucao, setGarantiaParaDevolucao] = useState<GarantiaItem | null>(null);
  
  // Montar dados da tabela
  const dadosTabela = useMemo(() => {
    return garantiasEmAndamento.map(garantia => {
      const tratativas = todasTratativas.filter(t => t.garantiaId === garantia.id && t.status === 'Em Andamento');
      const ultimaTratativa = tratativas[tratativas.length - 1];
      const diasAberto = ultimaTratativa 
        ? differenceInDays(new Date(), new Date(ultimaTratativa.dataHora))
        : 0;
      
      return {
        garantia,
        tratativa: ultimaTratativa,
        diasAberto
      };
    });
  }, [garantiasEmAndamento, todasTratativas]);
  
  // Registrar devolução
  const handleDevolucao = () => {
    if (!tratativaSelecionada || !garantiaParaDevolucao) return;
    
    // Atualizar tratativa
    updateTratativa(tratativaSelecionada.id, { status: 'Concluído' });
    
    // Atualizar garantia
    updateGarantia(garantiaParaDevolucao.id, { status: 'Concluída' });
    
    // Adicionar timeline
    addTimelineEntry({
      garantiaId: garantiaParaDevolucao.id,
      dataHora: new Date().toISOString(),
      tipo: 'devolucao',
      titulo: 'Aparelho devolvido',
      descricao: `Aparelho emprestado ${tratativaSelecionada.aparelhoEmprestadoModelo} (IMEI: ${tratativaSelecionada.aparelhoEmprestadoImei}) devolvido`,
      usuarioId: 'COL-001',
      usuarioNome: 'Usuário Sistema'
    });
    
    addTimelineEntry({
      garantiaId: garantiaParaDevolucao.id,
      dataHora: new Date().toISOString(),
      tipo: 'conclusao',
      titulo: 'Garantia concluída',
      descricao: 'Tratativa finalizada com sucesso',
      usuarioId: 'COL-001',
      usuarioNome: 'Usuário Sistema'
    });
    
    toast.success('Devolução registrada com sucesso!');
    setShowDevolucaoModal(false);
    setTratativaSelecionada(null);
    setGarantiaParaDevolucao(null);
  };
  
  const abrirModalDevolucao = (garantia: GarantiaItem, tratativa: TratativaGarantia) => {
    setGarantiaParaDevolucao(garantia);
    setTratativaSelecionada(tratativa);
    setShowDevolucaoModal(true);
  };

  return (
    <GarantiasLayout title="Garantias Em Andamento">
      <div className="space-y-6">
        {/* Cards Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Clock className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total em Andamento</p>
                  <p className="text-2xl font-bold">{contadores.emAndamento}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <Smartphone className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Aparelhos Emprestados</p>
                  <p className="text-2xl font-bold">{contadores.aparelhosEmprestados}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Wrench className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Em Assistência</p>
                  <p className="text-2xl font-bold">{contadores.emAssistencia}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">&gt; 7 dias sem resolução</p>
                  <p className="text-2xl font-bold">{contadores.maisde7Dias}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Tabela */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Data Abertura</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead>IMEI</TableHead>
                    <TableHead>Tipo Tratativa</TableHead>
                    <TableHead>Dias</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dadosTabela.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Nenhuma garantia em andamento
                      </TableCell>
                    </TableRow>
                  ) : (
                    dadosTabela.map(({ garantia, tratativa, diasAberto }) => (
                      <TableRow key={garantia.id} className={diasAberto > 7 ? 'bg-red-50 dark:bg-red-950/20' : ''}>
                        <TableCell className="font-medium">{garantia.id}</TableCell>
                        <TableCell>
                          {tratativa ? format(new Date(tratativa.dataHora), 'dd/MM/yyyy') : '-'}
                        </TableCell>
                        <TableCell>{garantia.clienteNome}</TableCell>
                        <TableCell>{garantia.modelo}</TableCell>
                        <TableCell className="font-mono text-xs">{garantia.imei}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{tratativa?.tipo || '-'}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={diasAberto > 7 ? 'destructive' : diasAberto > 3 ? 'secondary' : 'default'}>
                            {diasAberto} {diasAberto === 1 ? 'dia' : 'dias'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => navigate(`/garantias/${garantia.id}`)}
                              title="Ver detalhes"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {tratativa?.aparelhoEmprestadoId && (
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => abrirModalDevolucao(garantia, tratativa)}
                                title="Registrar devolução"
                              >
                                <Package className="h-4 w-4" />
                              </Button>
                            )}
                            {tratativa?.osId && (
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => {
                                  updateTratativa(tratativa.id, { status: 'Concluído' });
                                  updateGarantia(garantia.id, { status: 'Concluída' });
                                  toast.success('Garantia finalizada!');
                                }}
                                title="Finalizar"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Modal Devolução */}
      <Dialog open={showDevolucaoModal} onOpenChange={setShowDevolucaoModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Devolução</DialogTitle>
            <DialogDescription>
              Confirme a devolução do aparelho emprestado
            </DialogDescription>
          </DialogHeader>
          
          {tratativaSelecionada && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Aparelho Emprestado</p>
                <p className="font-medium">{tratativaSelecionada.aparelhoEmprestadoModelo}</p>
                <p className="text-sm font-mono">{tratativaSelecionada.aparelhoEmprestadoImei}</p>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Ao confirmar, o aparelho será devolvido ao estoque e a tratativa será finalizada.
              </p>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDevolucaoModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleDevolucao}>
              Confirmar Devolução
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </GarantiasLayout>
  );
}
