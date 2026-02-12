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
import { ListChecks, CalendarIcon, ShieldAlert, CheckCircle2, Clock, Target, Store, CalendarDays } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useCadastroStore } from '@/store/cadastroStore';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  getExecucoesDoDia,
  toggleExecucao,
  calcularResumoExecucao,
  atualizarColaboradorExecucao,
  ExecucaoAtividade,
} from '@/utils/atividadesGestoresApi';
import { AutocompleteColaborador } from '@/components/AutocompleteColaborador';
import { AgendaEletronicaModal } from '@/components/gestao/AgendaEletronicaModal';
import { temAnotacaoImportante } from '@/utils/agendaGestaoApi';

// Sort: fixed times earliest first, then open ones at the end
const sortExecucoes = (execucoes: ExecucaoAtividade[]): ExecucaoAtividade[] => {
  return [...execucoes].sort((a, b) => {
    const aIsOpen = a.tipoHorario === 'aberto' || !a.horarioPrevisto;
    const bIsOpen = b.tipoHorario === 'aberto' || !b.horarioPrevisto;
    if (aIsOpen && !bIsOpen) return 1;
    if (!aIsOpen && bIsOpen) return -1;
    if (aIsOpen && bIsOpen) return 0;
    return (a.horarioPrevisto || '').localeCompare(b.horarioPrevisto || '');
  });
};

export default function GestaoAdmAtividades() {
  const { user } = useAuthStore();
  const { colaboradores, lojas } = useCadastroStore();

  const colaboradorLogado = colaboradores.find(c => c.id === user?.colaborador?.id);
  const ehGestor = colaboradorLogado?.eh_gestor ?? user?.colaborador?.cargo?.toLowerCase().includes('gestor') ?? false;

  const [dataSelecionada, setDataSelecionada] = useState<Date>(new Date());
  const [refreshKey, setRefreshKey] = useState(0);
  const [agendaOpen, setAgendaOpen] = useState(false);
  const [agendaLojaId, setAgendaLojaId] = useState('');
  const [agendaLojaNome, setAgendaLojaNome] = useState('');
  const [agendaAtividadeId, setAgendaAtividadeId] = useState('');
  const [agendaAtividadeNome, setAgendaAtividadeNome] = useState('');

  const dataStr = format(dataSelecionada, 'yyyy-MM-dd');

  // Get all active stores (type 'loja')
  const lojasAtivas = useMemo(() => {
    return lojas.filter(l => l.tipo === 'Loja' && l.ativa !== false);
  }, [lojas]);

  // Get executions for all stores
  const execucoesPorLoja = useMemo(() => {
    const result: { lojaId: string; lojaNome: string; execucoes: ExecucaoAtividade[] }[] = [];
    for (const loja of lojasAtivas) {
      const execucoes = getExecucoesDoDia(dataStr, loja.id);
      result.push({
        lojaId: loja.id,
        lojaNome: loja.nome,
        execucoes: sortExecucoes(execucoes),
      });
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataStr, lojasAtivas, refreshKey]);

  // Global summary
  const resumoGeral = useMemo(() => {
    const todasExecucoes = execucoesPorLoja.flatMap(e => e.execucoes);
    return calcularResumoExecucao(todasExecucoes);
  }, [execucoesPorLoja]);

  const handleToggle = (atividadeId: string, lojaId: string) => {
    if (!user?.colaborador) return;
    toggleExecucao(dataStr, atividadeId, lojaId, user.colaborador.id, user.colaborador.nome);
    setRefreshKey(k => k + 1);
  };

  const handleDesignarColaborador = (atividadeId: string, lojaId: string, colaboradorId: string) => {
    const colab = colaboradores.find(c => c.id === colaboradorId);
    atualizarColaboradorExecucao(dataStr, atividadeId, lojaId, colaboradorId, colab?.nome || '');
    setRefreshKey(k => k + 1);
  };

  const handleAbrirAgenda = (lojaId: string, lojaNome: string, atividadeId: string, atividadeNome: string) => {
    setAgendaLojaId(lojaId);
    setAgendaLojaNome(lojaNome);
    setAgendaAtividadeId(atividadeId);
    setAgendaAtividadeNome(atividadeNome);
    setAgendaOpen(true);
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
      </div>

      {/* Resumo Geral */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" /> Pontuação Geral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{resumoGeral.pontuacaoObtida} / {resumoGeral.pontuacaoMaxima}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" /> Executadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{resumoGeral.executados} / {resumoGeral.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" /> Progresso Geral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-2xl font-bold">{resumoGeral.percentual}%</p>
              <Progress value={resumoGeral.percentual} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quadros por Loja */}
      <div className="space-y-6">
        {execucoesPorLoja.map(({ lojaId, lojaNome, execucoes }) => {
          const resumoLoja = calcularResumoExecucao(execucoes);
          return (
            <Card key={lojaId}>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="flex items-center gap-2">
                    <Store className="h-5 w-5" /> {lojaNome}
                  </CardTitle>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Executadas: <strong className="text-foreground">{resumoLoja.executados}/{resumoLoja.total}</strong></span>
                    <span>Pontuação: <strong className="text-foreground">{resumoLoja.pontuacaoObtida}/{resumoLoja.pontuacaoMaxima}</strong></span>
                    <Badge variant={resumoLoja.percentual === 100 ? 'default' : 'outline'}>
                      {resumoLoja.percentual}%
                    </Badge>
                  </div>
                </div>
                <Progress value={resumoLoja.percentual} className="h-1.5 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Atividade</TableHead>
                        <TableHead className="min-w-[200px]">Colaborador</TableHead>
                        <TableHead>Horário Previsto</TableHead>
                        <TableHead>Horário Executado</TableHead>
                        <TableHead className="text-center">Executado</TableHead>
                        <TableHead className="text-center">Pontuação</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-center">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {execucoes.map(exec => (
                        <TableRow key={exec.id} className={exec.status === 'executado_com_atraso' ? 'bg-yellow-500/10' : exec.executado ? 'bg-green-500/10' : ''}>
                          <TableCell className="font-medium">{exec.atividadeNome}</TableCell>
                          <TableCell>
                            <AutocompleteColaborador
                              value={exec.colaboradorDesignadoId || ''}
                              onChange={(id) => handleDesignarColaborador(exec.atividadeId, lojaId, id)}
                              filtrarPorLoja={lojaId}
                              placeholder="Selecionar..."
                              className="text-sm"
                            />
                          </TableCell>
                          <TableCell>{exec.tipoHorario === 'fixo' ? exec.horarioPrevisto : 'Aberto'}</TableCell>
                          <TableCell>
                            {exec.horarioExecutado ? format(new Date(exec.horarioExecutado), 'HH:mm') : '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            <Checkbox
                              checked={exec.executado}
                              onCheckedChange={() => handleToggle(exec.atividadeId, lojaId)}
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
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 relative"
                              onClick={() => handleAbrirAgenda(lojaId, lojaNome, exec.atividadeId, exec.atividadeNome)}
                            >
                              <CalendarDays className="h-4 w-4" />
                              {temAnotacaoImportante(`atividades_${lojaId}_${exec.atividadeId}`) && (
                                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-destructive" />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {execucoes.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground text-sm">Nenhuma atividade configurada para esta loja.</div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {execucoesPorLoja.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">Nenhuma loja ativa encontrada.</div>
        )}
      </div>

      <AgendaEletronicaModal
        open={agendaOpen}
        onOpenChange={setAgendaOpen}
        chaveContexto={`atividades_${agendaLojaId}_${agendaAtividadeId}`}
        titulo="Agenda Eletrônica"
        subtitulo={`${agendaLojaNome} — ${agendaAtividadeNome}`}
      />
    </GestaoAdministrativaLayout>
  );
}
