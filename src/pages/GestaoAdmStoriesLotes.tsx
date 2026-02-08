import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GestaoAdministrativaLayout } from '@/components/layout/GestaoAdministrativaLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Eye, Upload, CheckCircle, Camera, TrendingUp, AlertTriangle } from 'lucide-react';
import { useCadastroStore } from '@/store/cadastroStore';
import { useAuthStore } from '@/store/authStore';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';
import {
  gerarLotesDiarios,
  getLotes,
  getCompetenciasDisponiveisStories,
  getStatusLoteColor,
  getStatusLoteRowClass,
  getPercentualColor,
  META_STORIES_PERCENTUAL,
  StatusLote,
  LoteMonitoramento
} from '@/utils/storiesMonitoramentoApi';
import { format } from 'date-fns';

export default function GestaoAdmStoriesLotes() {
  const navigate = useNavigate();
  const { lojas, colaboradores } = useCadastroStore();
  const { user } = useAuthStore();

  const colaboradorLogado = colaboradores.find(c => c.id === user?.colaborador?.id);
  const ehGestor = colaboradorLogado?.eh_gestor ?? user?.colaborador?.cargo?.toLowerCase().includes('gestor') ?? false;

  const competencias = getCompetenciasDisponiveisStories();
  const [competencia, setCompetencia] = useState(competencias[0]?.value || format(new Date(), 'yyyy-MM'));
  const [lojaFiltro, setLojaFiltro] = useState<string>('todas');
  const [statusFiltro, setStatusFiltro] = useState<string>('todos');

  // Generate batches on load
  useEffect(() => {
    const lojasAtivas = lojas.filter(l => l.ativa && l.tipo === 'Loja');
    gerarLotesDiarios(competencia, lojasAtivas.map(l => ({ id: l.id, nome: l.nome })));
  }, [competencia, lojas]);

  const lotesFiltrados = useMemo(() => {
    let result = getLotes(competencia, lojaFiltro !== 'todas' ? lojaFiltro : undefined);
    if (statusFiltro !== 'todos') result = result.filter(l => l.status === statusFiltro);
    return result;
  }, [competencia, lojaFiltro, statusFiltro]);

  // Resumo
  const resumo = useMemo(() => {
    const all = getLotes(competencia, lojaFiltro !== 'todas' ? lojaFiltro : undefined);
    const totalVendas = all.reduce((s, l) => s + l.totalVendas, 0);
    const comStory = all.reduce((s, l) => s + l.vendasComStory, 0);
    const pendentes = all.filter(l => l.status === 'Pendente Conf. Operacional').length;
    const perc = totalVendas > 0 ? Math.round((comStory / totalVendas) * 100) : 0;
    return { totalVendas, comStory, perc, pendentes, totalLotes: all.length };
  }, [competencia, lojaFiltro, lotesFiltrados]);

  const formatDate = (d: string) => {
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  };

  if (!ehGestor) {
    return (
      <GestaoAdministrativaLayout title="Gestão Administrativa">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Acesso Restrito</AlertTitle>
          <AlertDescription>Este módulo é restrito a usuários com perfil de gestor.</AlertDescription>
        </Alert>
      </GestaoAdministrativaLayout>
    );
  }

  return (
    <GestaoAdministrativaLayout title="Lotes de Stories">
      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="space-y-2">
          <Label>Competência</Label>
          <Select value={competencia} onValueChange={setCompetencia}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {competencias.map(c => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Loja</Label>
          <Select value={lojaFiltro} onValueChange={setLojaFiltro}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as Lojas</SelectItem>
              {lojas.filter(l => l.ativa && l.tipo === 'Loja').map(l => (
                <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={statusFiltro} onValueChange={setStatusFiltro}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="Pendente Conf. Operacional">Pendente Conf. Operacional</SelectItem>
              <SelectItem value="Aguardando Validação">Aguardando Validação</SelectItem>
              <SelectItem value="Validado">Validado</SelectItem>
              <SelectItem value="Rejeitado Parcial">Rejeitado Parcial</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Camera className="h-4 w-4 text-primary" /> Total Vendas
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{resumo.totalVendas}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" /> Com Story
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold text-green-600">{resumo.comStory}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" /> % Stories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${resumo.perc >= META_STORIES_PERCENTUAL ? 'text-green-600' : resumo.perc >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
              {resumo.perc}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" /> Lotes Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold text-yellow-600">{resumo.pendentes}</p></CardContent>
        </Card>
      </div>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" /> Lotes de Monitoramento
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lotesFiltrados.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhum lote encontrado para os filtros selecionados.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Loja</TableHead>
                  <TableHead className="text-center">Total Vendas</TableHead>
                  <TableHead className="text-center">Com Story</TableHead>
                  <TableHead className="text-center">% Stories</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lotesFiltrados.map(lote => (
                  <TableRow key={lote.id} className={getStatusLoteRowClass(lote.status)}>
                    <TableCell className="font-medium">{formatDate(lote.data)}</TableCell>
                    <TableCell>{lote.lojaNome}</TableCell>
                    <TableCell className="text-center">{lote.totalVendas}</TableCell>
                    <TableCell className="text-center">{lote.vendasComStory}</TableCell>
                    <TableCell className="text-center">
                      <span className={`font-semibold ${
                        lote.percentualStories >= META_STORIES_PERCENTUAL ? 'text-green-600' :
                        lote.percentualStories >= 50 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {lote.percentualStories}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusLoteColor(lote.status)}>{lote.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8"
                                onClick={() => navigate(`/gestao-administrativa/stories/lote/${encodeURIComponent(lote.id)}/conferencia?comp=${competencia}`)}>
                                {lote.status === 'Pendente Conf. Operacional' ? <Upload className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{lote.status === 'Pendente Conf. Operacional' ? 'Conferir' : 'Ver Detalhes'}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        {lote.status === 'Aguardando Validação' && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8"
                                  onClick={() => navigate(`/gestao-administrativa/stories/lote/${encodeURIComponent(lote.id)}/validacao?comp=${competencia}`)}>
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Validar</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </GestaoAdministrativaLayout>
  );
}
