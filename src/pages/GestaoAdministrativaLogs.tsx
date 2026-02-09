import { useState, useMemo } from 'react';
import { GestaoAdministrativaLayout } from '@/components/layout/GestaoAdministrativaLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { History, CheckCircle, XCircle, FileEdit, ShieldAlert, CalendarIcon } from 'lucide-react';
import { useCadastroStore } from '@/store/cadastroStore';
import { useAuthStore } from '@/store/authStore';
import { AutocompleteLoja } from '@/components/AutocompleteLoja';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  getLogsAuditoria,
  LogAuditoria
} from '@/utils/gestaoAdministrativaApi';

export default function GestaoAdministrativaLogs() {
  const { lojas, colaboradores } = useCadastroStore();
  const { user } = useAuthStore();
  
  // Verificar se é gestor - busca no cadastro ou fallback pelo cargo do authStore
  const colaboradorLogado = colaboradores.find(c => c.id === user?.colaborador?.id);
  const ehGestor = colaboradorLogado?.eh_gestor ?? user?.colaborador?.cargo?.toLowerCase().includes('gestor') ?? false;
  
  // Estados de filtros
  const [lojaId, setLojaId] = useState<string>('');
  const [dataInicio, setDataInicio] = useState<Date | undefined>(startOfMonth(new Date()));
  const [dataFim, setDataFim] = useState<Date | undefined>(endOfMonth(new Date()));
  
  // Buscar logs e filtrar por período
  const logs = useMemo(() => {
    const competencia = dataInicio ? format(dataInicio, 'yyyy-MM') : undefined;
    const allLogs = getLogsAuditoria(competencia, lojaId || 'todas');
    if (!dataInicio && !dataFim) return allLogs;
    return allLogs.filter(log => {
      const logDate = new Date(log.dataHora);
      if (dataInicio && logDate < dataInicio) return false;
      if (dataFim) {
        const fimDia = new Date(dataFim);
        fimDia.setHours(23, 59, 59, 999);
        if (logDate > fimDia) return false;
      }
      return true;
    });
  }, [lojaId, dataInicio, dataFim]);
  
  const getLojaNome = (lojaId: string) => {
    if (lojaId === 'todas') return 'Todas as Lojas';
    const loja = lojas.find(l => l.id === lojaId);
    return loja?.nome || lojaId;
  };
  
  const getAcaoBadge = (acao: LogAuditoria['acao']) => {
    switch (acao) {
      case 'conferencia_marcada':
        return (
          <Badge className="bg-green-500/20 text-green-700 border-green-500/30 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Conferência Marcada
          </Badge>
        );
      case 'conferencia_desmarcada':
        return (
          <Badge className="bg-red-500/20 text-red-700 border-red-500/30 flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Conferência Desmarcada
          </Badge>
        );
      case 'ajuste_registrado':
        return (
          <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30 flex items-center gap-1">
            <FileEdit className="h-3 w-3" />
            Ajuste Registrado
          </Badge>
        );
      default:
        return <Badge variant="outline">{acao}</Badge>;
    }
  };
  
  // Verificar permissão
  if (!ehGestor) {
    return (
      <GestaoAdministrativaLayout title="Logs de Auditoria">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Acesso Restrito</AlertTitle>
          <AlertDescription>
            Este módulo é restrito a usuários com perfil de gestor. Entre em contato com o administrador do sistema.
          </AlertDescription>
        </Alert>
      </GestaoAdministrativaLayout>
    );
  }
  
  return (
    <GestaoAdministrativaLayout title="Logs de Auditoria">
      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="space-y-2">
          <Label>Data Início</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dataInicio && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dataInicio ? format(dataInicio, 'dd/MM/yyyy') : 'Selecione'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent mode="single" selected={dataInicio} onSelect={setDataInicio} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label>Data Fim</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dataFim && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dataFim ? format(dataFim, 'dd/MM/yyyy') : 'Selecione'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent mode="single" selected={dataFim} onSelect={setDataFim} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label>Loja</Label>
          <AutocompleteLoja
            value={lojaId}
            onChange={setLojaId}
            placeholder="Todas as Lojas"
            apenasLojasTipoLoja
          />
        </div>
      </div>
      
      {/* Tabela de Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Ações ({logs.length} registros)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum log de auditoria encontrado.</p>
              <p className="text-sm">Os logs serão exibidos aqui após ações de conferência ou registro de ajustes.</p>
            </div>
          ) : (
            <ScrollArea className="w-full" type="always">
              <div className="min-w-[800px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-40">Data/Hora</TableHead>
                      <TableHead className="w-28">Data Ref.</TableHead>
                      <TableHead>Loja</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Detalhes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map(log => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-sm">
                          {format(new Date(log.dataHora), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          {format(new Date(log.data + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell>{getLojaNome(log.lojaId)}</TableCell>
                        <TableCell>{getAcaoBadge(log.acao)}</TableCell>
                        <TableCell>
                          {log.metodoPagamento ? (
                            <Badge variant="outline">{log.metodoPagamento}</Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell>{log.usuarioNome}</TableCell>
                        <TableCell className="max-w-xs truncate" title={log.detalhes}>
                          {log.detalhes}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <ScrollBar orientation="horizontal" className="h-4" />
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </GestaoAdministrativaLayout>
  );
}
