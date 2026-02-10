import { useState, useMemo } from 'react';
import { GestaoAdministrativaLayout } from '@/components/layout/GestaoAdministrativaLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { ListChecks, CalendarIcon, ShieldAlert, CheckCircle2, Clock, Target } from 'lucide-react';
import { AutocompleteLoja } from '@/components/AutocompleteLoja';
import { useAuthStore } from '@/store/authStore';
import { useCadastroStore } from '@/store/cadastroStore';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  getExecucoesDoDia,
  toggleExecucao,
  calcularResumoExecucao,
} from '@/utils/atividadesGestoresApi';

export default function GestaoAdmAtividades() {
  const { user } = useAuthStore();
  const { colaboradores } = useCadastroStore();

  const colaboradorLogado = colaboradores.find(c => c.id === user?.colaborador?.id);
  const ehGestor = colaboradorLogado?.eh_gestor ?? user?.colaborador?.cargo?.toLowerCase().includes('gestor') ?? false;

  const [dataSelecionada, setDataSelecionada] = useState<Date>(new Date());
  const [lojaFiltro, setLojaFiltro] = useState<string>('');
  const [refreshKey, setRefreshKey] = useState(0);

  const dataStr = format(dataSelecionada, 'yyyy-MM-dd');

  const execucoes = useMemo(() => {
    if (!lojaFiltro) return [];
    return getExecucoesDoDia(dataStr, lojaFiltro);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataStr, lojaFiltro, refreshKey]);

  const resumo = useMemo(() => calcularResumoExecucao(execucoes), [execucoes]);

  const handleToggle = (atividadeId: string) => {
    if (!lojaFiltro || !user?.colaborador) return;
    toggleExecucao(dataStr, atividadeId, lojaFiltro, user.colaborador.id, user.colaborador.nome);
    setRefreshKey(k => k + 1);
  };

  if (!ehGestor) {
    return (
      <GestaoAdministrativaLayout title="Atividades dos Gestores">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Acesso Restrito</AlertTitle>
          <AlertDescription>Este módulo é restrito a usuários com perfil de gestor.</AlertDescription>
        </Alert>
      </GestaoAdministrativaLayout>
    );
  }

  return (
    <GestaoAdministrativaLayout title="Checklist Diário de Atividades">
      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="space-y-2">
          <Label>Data</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(dataSelecionada, 'dd/MM/yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent mode="single" selected={dataSelecionada} onSelect={(d) => d && setDataSelecionada(d)} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label>Loja *</Label>
          <AutocompleteLoja value={lojaFiltro} onChange={setLojaFiltro} placeholder="Selecione a loja" />
        </div>
      </div>

      {!lojaFiltro ? (
        <div className="text-center py-12 text-muted-foreground">Selecione uma loja para visualizar o checklist.</div>
      ) : (
        <>
          {/* Resumo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" /> Pontuação
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{resumo.pontuacaoObtida} / {resumo.pontuacaoMaxima}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" /> Executadas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">{resumo.executados} / {resumo.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" /> Progresso
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-2xl font-bold">{resumo.percentual}%</p>
                  <Progress value={resumo.percentual} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabela de atividades */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListChecks className="h-5 w-5" /> Atividades - {format(dataSelecionada, 'dd/MM/yyyy')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Atividade</TableHead>
                      <TableHead>Horário Previsto</TableHead>
                      <TableHead>Horário Executado</TableHead>
                      <TableHead className="text-center">Executado</TableHead>
                      <TableHead className="text-center">Pontuação</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {execucoes.map(exec => (
                      <TableRow key={exec.id} className={exec.status === 'executado_com_atraso' ? 'bg-yellow-500/10' : exec.executado ? 'bg-green-500/10' : ''}>
                        <TableCell className="font-medium">{exec.atividadeNome}</TableCell>
                        <TableCell>{exec.tipoHorario === 'fixo' ? exec.horarioPrevisto : 'Aberto'}</TableCell>
                        <TableCell>
                          {exec.horarioExecutado ? format(new Date(exec.horarioExecutado), 'HH:mm') : '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={exec.executado}
                            onCheckedChange={() => handleToggle(exec.atividadeId)}
                          />
                        </TableCell>
                        <TableCell className="text-center font-semibold">
                          {exec.pontuacao > 0 ? exec.pontuacao : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            exec.status === 'executado' ? 'default' :
                            exec.status === 'executado_com_atraso' ? 'secondary' : 'outline'
                          }>
                            {exec.status === 'executado' ? 'Executado' :
                             exec.status === 'executado_com_atraso' ? 'Com Atraso' : 'Pendente'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {execucoes.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">Nenhuma atividade configurada para esta loja.</div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </GestaoAdministrativaLayout>
  );
}
