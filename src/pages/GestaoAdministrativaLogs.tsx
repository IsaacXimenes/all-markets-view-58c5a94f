import { useState, useMemo } from 'react';
import { GestaoAdministrativaLayout } from '@/components/layout/GestaoAdministrativaLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { History, CheckCircle, XCircle, FileEdit, ShieldAlert } from 'lucide-react';
import { useCadastroStore } from '@/store/cadastroStore';
import { useAuthStore } from '@/store/authStore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  getLogsAuditoria,
  getCompetenciasDisponiveis,
  LogAuditoria
} from '@/utils/gestaoAdministrativaApi';

export default function GestaoAdministrativaLogs() {
  const { lojas, colaboradores } = useCadastroStore();
  const { user } = useAuthStore();
  
  // Verificar se é gestor
  const colaboradorLogado = colaboradores.find(c => c.id === user?.colaborador?.id);
  const ehGestor = colaboradorLogado?.eh_gestor ?? false;
  
  // Estados de filtros
  const competencias = getCompetenciasDisponiveis();
  const [competencia, setCompetencia] = useState<string>('');
  const [lojaId, setLojaId] = useState<string>('todas');
  
  // Buscar logs
  const logs = useMemo(() => {
    return getLogsAuditoria(competencia || undefined, lojaId);
  }, [competencia, lojaId]);
  
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="space-y-2">
          <Label>Competência</Label>
          <Select value={competencia} onValueChange={setCompetencia}>
            <SelectTrigger>
              <SelectValue placeholder="Todas as competências" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas as competências</SelectItem>
              {competencias.map(comp => (
                <SelectItem key={comp.value} value={comp.value}>
                  {comp.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label>Loja</Label>
          <Select value={lojaId} onValueChange={setLojaId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a loja" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as Lojas</SelectItem>
              {lojas.map(loja => (
                <SelectItem key={loja.id} value={loja.id}>
                  {loja.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
