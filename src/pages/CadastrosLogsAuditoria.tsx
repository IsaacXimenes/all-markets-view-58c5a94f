import { useState, useMemo } from 'react';
import { CadastrosLayout } from '@/components/layout/CadastrosLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { History, CalendarIcon, Download } from 'lucide-react';
import { AutocompleteColaborador } from '@/components/AutocompleteColaborador';
import { cn } from '@/lib/utils';
import { format, isWithinInterval, parseISO } from 'date-fns';
import { getLogsAuditoria, LogAuditoria } from '@/utils/gestaoAdministrativaApi';
import { getLogsAtividades, LogAtividade } from '@/utils/atividadesGestoresApi';
import { exportToCSV } from '@/utils/formatUtils';
import { toast } from 'sonner';

interface LogUnificado {
  id: string;
  modulo: string;
  dataHora: string;
  usuario: string;
  acao: string;
  detalhes: string;
}

export default function CadastrosLogsAuditoria() {
  const [moduloFiltro, setModuloFiltro] = useState('todos');
  const [usuarioFiltro, setUsuarioFiltro] = useState('');
  const [dataInicio, setDataInicio] = useState<Date | undefined>(undefined);
  const [dataFim, setDataFim] = useState<Date | undefined>(undefined);

  const logsUnificados = useMemo(() => {
    const resultado: LogUnificado[] = [];

    // Logs de conferência de caixa
    if (moduloFiltro === 'todos' || moduloFiltro === 'conferencia') {
      const logsConf = getLogsAuditoria();
      logsConf.forEach(log => {
        resultado.push({
          id: log.id,
          modulo: 'Conferência de Caixa',
          dataHora: log.dataHora,
          usuario: log.usuarioNome,
          acao: log.acao === 'conferencia_marcada' ? 'Conferência Marcada' :
                log.acao === 'conferencia_desmarcada' ? 'Conferência Desmarcada' : 'Ajuste Registrado',
          detalhes: log.detalhes,
        });
      });
    }

    // Logs de atividades dos gestores
    if (moduloFiltro === 'todos' || moduloFiltro === 'atividades') {
      const logsAtv = getLogsAtividades();
      logsAtv.forEach(log => {
        resultado.push({
          id: log.id,
          modulo: 'Atividades Gestores',
          dataHora: log.dataHora,
          usuario: log.gestorNome,
          acao: log.acao === 'marcou' ? 'Atividade Marcada' : 'Atividade Desmarcada',
          detalhes: log.detalhes,
        });
      });
    }

    // Filtros
    let filtrado = resultado;

    if (usuarioFiltro) {
      filtrado = filtrado.filter(l => l.usuario.toLowerCase().includes(usuarioFiltro.toLowerCase()));
    }

    if (dataInicio) {
      filtrado = filtrado.filter(l => {
        const logDate = parseISO(l.dataHora);
        return logDate >= dataInicio;
      });
    }

    if (dataFim) {
      const fimDoDia = new Date(dataFim);
      fimDoDia.setHours(23, 59, 59, 999);
      filtrado = filtrado.filter(l => {
        const logDate = parseISO(l.dataHora);
        return logDate <= fimDoDia;
      });
    }

    // Ordenar por data mais recente
    return filtrado.sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime());
  }, [moduloFiltro, usuarioFiltro, dataInicio, dataFim]);

  const handleExport = () => {
    const data = logsUnificados.map(l => ({
      'Data/Hora': format(parseISO(l.dataHora), 'dd/MM/yyyy HH:mm:ss'),
      Módulo: l.modulo,
      Usuário: l.usuario,
      Ação: l.acao,
      Detalhes: l.detalhes,
    }));
    exportToCSV(data, `logs-auditoria-${new Date().toISOString().split('T')[0]}.csv`);
    toast.success('Logs exportados!');
  };

  const getModuloBadgeVariant = (modulo: string) => {
    if (modulo === 'Conferência de Caixa') return 'default';
    if (modulo === 'Atividades Gestores') return 'secondary';
    return 'outline';
  };

  return (
    <CadastrosLayout title="Logs de Auditoria">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Logs de Auditoria Centralizados
            </CardTitle>
            <Button onClick={handleExport} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="space-y-2">
              <Label>Módulo</Label>
              <Select value={moduloFiltro} onValueChange={setModuloFiltro}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="conferencia">Conferência de Caixa</SelectItem>
                  <SelectItem value="atividades">Atividades Gestores</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Usuário</Label>
              <AutocompleteColaborador value={usuarioFiltro} onChange={setUsuarioFiltro} placeholder="Todos" />
            </div>
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
          </div>

          {/* Tabela */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Módulo</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logsUnificados.slice(0, 100).map(log => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {format(parseISO(log.dataHora), 'dd/MM/yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getModuloBadgeVariant(log.modulo)}>{log.modulo}</Badge>
                    </TableCell>
                    <TableCell>{log.usuario}</TableCell>
                    <TableCell>{log.acao}</TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-muted-foreground" title={log.detalhes}>
                      {log.detalhes}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {logsUnificados.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">Nenhum log encontrado.</div>
          )}
          {logsUnificados.length > 100 && (
            <p className="text-sm text-muted-foreground text-center mt-4">Exibindo 100 de {logsUnificados.length} registros.</p>
          )}
        </CardContent>
      </Card>
    </CadastrosLayout>
  );
}
