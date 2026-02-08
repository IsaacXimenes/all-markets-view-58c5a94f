import { useState, useMemo, useEffect } from 'react';
import { GestaoAdministrativaLayout } from '@/components/layout/GestaoAdministrativaLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Camera, TrendingUp, Target, Users, ShieldAlert, Award } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { useCadastroStore } from '@/store/cadastroStore';
import { useAuthStore } from '@/store/authStore';
import {
  gerarLotesDiarios,
  calcularIndicadores,
  getCompetenciasDisponiveisStories,
  getPercentualColor,
  META_STORIES_PERCENTUAL
} from '@/utils/storiesMonitoramentoApi';
import { format } from 'date-fns';

const PIE_COLORS = ['hsl(var(--primary))', 'hsl(0 84% 60%)', 'hsl(38 92% 50%)', 'hsl(142 72% 52%)', 'hsl(280 60% 60%)', 'hsl(200 70% 50%)'];

export default function GestaoAdmStoriesIndicadores() {
  const { lojas, colaboradores } = useCadastroStore();
  const { user } = useAuthStore();

  const colaboradorLogado = colaboradores.find(c => c.id === user?.colaborador?.id);
  const ehGestor = colaboradorLogado?.eh_gestor ?? user?.colaborador?.cargo?.toLowerCase().includes('gestor') ?? false;

  const competencias = getCompetenciasDisponiveisStories();
  const [competencia, setCompetencia] = useState(competencias[0]?.value || format(new Date(), 'yyyy-MM'));
  const [lojaFiltro, setLojaFiltro] = useState<string>('todas');

  useEffect(() => {
    const lojasAtivas = lojas.filter(l => l.ativa && l.tipo === 'Loja');
    gerarLotesDiarios(competencia, lojasAtivas.map(l => ({ id: l.id, nome: l.nome })));
  }, [competencia, lojas]);

  const indicadores = useMemo(() => {
    return calcularIndicadores(competencia, lojaFiltro !== 'todas' ? lojaFiltro : undefined);
  }, [competencia, lojaFiltro]);

  if (!ehGestor) {
    return (
      <GestaoAdministrativaLayout title="Indicadores Stories">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Acesso Restrito</AlertTitle>
          <AlertDescription>Este módulo é restrito a usuários com perfil de gestor.</AlertDescription>
        </Alert>
      </GestaoAdministrativaLayout>
    );
  }

  const percColor = getPercentualColor(indicadores.percentualGeral);
  const progressColor = percColor === 'green' ? 'bg-green-500' : percColor === 'yellow' ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <GestaoAdministrativaLayout title="Indicadores de Stories">
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
      </div>

      {/* Thermometer + Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" /> Termômetro de Engajamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Meta: {META_STORIES_PERCENTUAL}%</span>
                <span className={`text-3xl font-bold ${
                  percColor === 'green' ? 'text-green-600' : percColor === 'yellow' ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {indicadores.percentualGeral}%
                </span>
              </div>
              <div className="relative">
                <Progress value={indicadores.percentualGeral} className="h-6" />
                <div
                  className="absolute top-0 h-6 border-l-2 border-dashed border-foreground/50"
                  style={{ left: `${META_STORIES_PERCENTUAL}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span className="font-medium">Meta {META_STORIES_PERCENTUAL}%</span>
                <span>100%</span>
              </div>
              {indicadores.metaAtingida ? (
                <Badge className="bg-green-500/20 text-green-700 border-green-500/30">
                  ✅ Meta atingida!
                </Badge>
              ) : (
                <Badge className="bg-red-500/20 text-red-700 border-red-500/30">
                  ⚠️ Abaixo da meta
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Camera className="h-4 w-4 text-primary" /> Total Vendas
              </CardTitle>
            </CardHeader>
            <CardContent><p className="text-2xl font-bold">{indicadores.totalVendas}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" /> Com Story
              </CardTitle>
            </CardHeader>
            <CardContent><p className="text-2xl font-bold text-green-600">{indicadores.totalComStory}</p></CardContent>
          </Card>
        </div>
      </div>

      {/* Rankings + Pie chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Store ranking */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="h-4 w-4" /> Ranking de Lojas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {indicadores.rankingLojas.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Sem dados</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Loja</TableHead>
                    <TableHead className="text-center">Vendas</TableHead>
                    <TableHead className="text-center">Stories</TableHead>
                    <TableHead className="text-center">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {indicadores.rankingLojas.map((l, i) => (
                    <TableRow key={l.lojaId} className={l.percentual >= META_STORIES_PERCENTUAL ? 'bg-green-500/10' : l.percentual >= 50 ? 'bg-yellow-500/10' : 'bg-red-500/10'}>
                      <TableCell className="font-bold">{i + 1}º</TableCell>
                      <TableCell>{l.lojaNome}</TableCell>
                      <TableCell className="text-center">{l.totalVendas}</TableCell>
                      <TableCell className="text-center">{l.comStory}</TableCell>
                      <TableCell className="text-center font-semibold">{l.percentual}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Pie chart: reasons */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" /> Motivos de Não Postagem
            </CardTitle>
          </CardHeader>
          <CardContent>
            {indicadores.motivosDistribuicao.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Sem dados de motivos</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={indicadores.motivosDistribuicao}
                    dataKey="quantidade"
                    nameKey="motivo"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ motivo, quantidade }) => `${quantidade}`}
                  >
                    {indicadores.motivosDistribuicao.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Seller ranking */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" /> Ranking de Vendedores
          </CardTitle>
        </CardHeader>
        <CardContent>
          {indicadores.rankingVendedores.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Sem dados</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead className="text-center">Total Vendas</TableHead>
                  <TableHead className="text-center">Stories</TableHead>
                  <TableHead className="text-center">% Sucesso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {indicadores.rankingVendedores.map((v, i) => (
                  <TableRow key={v.vendedorId} className={v.percentual >= META_STORIES_PERCENTUAL ? 'bg-green-500/10' : v.percentual >= 50 ? 'bg-yellow-500/10' : 'bg-red-500/10'}>
                    <TableCell className="font-bold">{i + 1}º</TableCell>
                    <TableCell>{v.vendedorNome}</TableCell>
                    <TableCell className="text-center">{v.totalVendas}</TableCell>
                    <TableCell className="text-center">{v.comStory}</TableCell>
                    <TableCell className="text-center font-semibold">{v.percentual}%</TableCell>
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
