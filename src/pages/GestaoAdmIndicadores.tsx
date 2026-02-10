import { useState, useMemo, useEffect } from 'react';
import { GestaoAdministrativaLayout } from '@/components/layout/GestaoAdministrativaLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Camera, TrendingUp, Target, Users, ShieldAlert, Award, CalendarIcon, BarChart3, Globe, ListChecks } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useCadastroStore } from '@/store/cadastroStore';
import { useAuthStore } from '@/store/authStore';
import { AutocompleteLoja } from '@/components/AutocompleteLoja';
import { cn } from '@/lib/utils';
import {
  gerarLotesDiarios,
  calcularIndicadores,
  getPercentualColor,
  META_STORIES_PERCENTUAL
} from '@/utils/storiesMonitoramentoApi';
import {
  calcularRankingGestores,
  calcularExecucaoPorLoja,
} from '@/utils/atividadesGestoresApi';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subDays } from 'date-fns';

const PIE_COLORS = ['hsl(var(--primary))', 'hsl(0 84% 60%)', 'hsl(38 92% 50%)', 'hsl(142 72% 52%)', 'hsl(280 60% 60%)', 'hsl(200 70% 50%)'];
const BAR_COLORS = ['hsl(var(--primary))', 'hsl(142 72% 52%)', 'hsl(38 92% 50%)', 'hsl(0 84% 60%)'];

export default function GestaoAdmIndicadores() {
  const { lojas, colaboradores } = useCadastroStore();
  const { user } = useAuthStore();

  const colaboradorLogado = colaboradores.find(c => c.id === user?.colaborador?.id);
  const ehGestor = colaboradorLogado?.eh_gestor ?? user?.colaborador?.cargo?.toLowerCase().includes('gestor') ?? false;

  // Stories state
  const [dataInicio, setDataInicio] = useState<Date | undefined>(startOfMonth(new Date()));
  const [dataFim, setDataFim] = useState<Date | undefined>(endOfMonth(new Date()));
  const competencia = dataInicio ? format(dataInicio, 'yyyy-MM') : format(new Date(), 'yyyy-MM');
  const [lojaFiltro, setLojaFiltro] = useState<string>('');

  // Atividades state
  const [atvPeriodo, setAtvPeriodo] = useState('semanal');
  const [atvLojaFiltro, setAtvLojaFiltro] = useState('');

  useEffect(() => {
    const lojasAtivas = lojas.filter(l => l.ativa && l.tipo === 'Loja');
    gerarLotesDiarios(competencia, lojasAtivas.map(l => ({ id: l.id, nome: l.nome })));
  }, [competencia, lojas]);

  const indicadores = useMemo(() => calcularIndicadores(competencia, lojaFiltro || undefined), [competencia, lojaFiltro]);

  // Atividades dashboard data
  const { atvDataInicio, atvDataFim } = useMemo(() => {
    const hoje = new Date();
    if (atvPeriodo === 'diario') return { atvDataInicio: format(hoje, 'yyyy-MM-dd'), atvDataFim: format(hoje, 'yyyy-MM-dd') };
    if (atvPeriodo === 'semanal') return { atvDataInicio: format(startOfWeek(hoje, { weekStartsOn: 0 }), 'yyyy-MM-dd'), atvDataFim: format(endOfWeek(hoje, { weekStartsOn: 0 }), 'yyyy-MM-dd') };
    return { atvDataInicio: format(startOfMonth(hoje), 'yyyy-MM-dd'), atvDataFim: format(endOfMonth(hoje), 'yyyy-MM-dd') };
  }, [atvPeriodo]);

  const getLojaNome = (id: string) => lojas.find(l => l.id === id)?.nome || id;

  const rankingGestores = useMemo(() => calcularRankingGestores(atvDataInicio, atvDataFim, atvLojaFiltro || undefined), [atvDataInicio, atvDataFim, atvLojaFiltro]);
  const execucaoPorLoja = useMemo(() => calcularExecucaoPorLoja(atvDataInicio, atvDataFim, getLojaNome), [atvDataInicio, atvDataFim, lojas]);

  if (!ehGestor) {
    return (
      <GestaoAdministrativaLayout title="Indicadores">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Acesso Restrito</AlertTitle>
          <AlertDescription>Este módulo é restrito a usuários com perfil de gestor.</AlertDescription>
        </Alert>
      </GestaoAdministrativaLayout>
    );
  }

  const percColor = getPercentualColor(indicadores.percentualGeral);

  return (
    <GestaoAdministrativaLayout title="Indicadores">
      <Tabs defaultValue="stories" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="stories" className="gap-2"><Camera className="h-4 w-4" /> Stories</TabsTrigger>
          <TabsTrigger value="google" className="gap-2"><Globe className="h-4 w-4" /> Google</TabsTrigger>
          <TabsTrigger value="atividades" className="gap-2"><ListChecks className="h-4 w-4" /> Atividades</TabsTrigger>
        </TabsList>

        {/* === STORIES TAB === */}
        <TabsContent value="stories">
          {/* Filters */}
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
              <AutocompleteLoja value={lojaFiltro} onChange={setLojaFiltro} placeholder="Todas as Lojas" apenasLojasTipoLoja />
            </div>
          </div>

          {/* Thermometer + Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5" /> Termômetro de Engajamento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Meta: {META_STORIES_PERCENTUAL}%</span>
                    <span className={`text-3xl font-bold ${percColor === 'green' ? 'text-green-600' : percColor === 'yellow' ? 'text-yellow-600' : 'text-red-600'}`}>
                      {indicadores.percentualGeral}%
                    </span>
                  </div>
                  <div className="relative">
                    <Progress value={indicadores.percentualGeral} className="h-6" />
                    <div className="absolute top-0 h-6 border-l-2 border-dashed border-foreground/50" style={{ left: `${META_STORIES_PERCENTUAL}%` }} />
                  </div>
                  {indicadores.metaAtingida ? (
                    <Badge className="bg-green-500/20 text-green-700 border-green-500/30">✅ Meta atingida!</Badge>
                  ) : (
                    <Badge className="bg-red-500/20 text-red-700 border-red-500/30">⚠️ Abaixo da meta</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Camera className="h-4 w-4 text-primary" /> Total Vendas</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold">{indicadores.totalVendas}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><TrendingUp className="h-4 w-4 text-green-600" /> Com Story</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold text-green-600">{indicadores.totalComStory}</p></CardContent>
              </Card>
            </div>
          </div>

          {/* Rankings + Pie */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Award className="h-4 w-4" /> Ranking de Lojas</CardTitle></CardHeader>
              <CardContent>
                {indicadores.rankingLojas.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">Sem dados</p>
                ) : (
                  <Table>
                    <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Loja</TableHead><TableHead className="text-center">Vendas</TableHead><TableHead className="text-center">Stories</TableHead><TableHead className="text-center">%</TableHead></TableRow></TableHeader>
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
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4" /> Motivos de Não Postagem</CardTitle></CardHeader>
              <CardContent>
                {indicadores.motivosDistribuicao.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">Sem dados de motivos</p>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={indicadores.motivosDistribuicao} dataKey="quantidade" nameKey="motivo" cx="50%" cy="50%" outerRadius={80} label={({ quantidade }) => `${quantidade}`}>
                        {indicadores.motivosDistribuicao.map((_, i) => (<Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />))}
                      </Pie>
                      <RechartsTooltip /><Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Seller ranking */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4" /> Ranking de Vendedores</CardTitle></CardHeader>
            <CardContent>
              {indicadores.rankingVendedores.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Sem dados</p>
              ) : (
                <Table>
                  <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Vendedor</TableHead><TableHead className="text-center">Total Vendas</TableHead><TableHead className="text-center">Stories</TableHead><TableHead className="text-center">% Sucesso</TableHead></TableRow></TableHeader>
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
        </TabsContent>

        {/* === GOOGLE TAB === */}
        <TabsContent value="google">
          <Card>
            <CardContent className="py-16 text-center">
              <Globe className="h-16 w-16 mx-auto text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground">Em breve</h3>
              <p className="text-sm text-muted-foreground mt-2">Indicadores de avaliações Google serão implementados em breve.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === ATIVIDADES TAB === */}
        <TabsContent value="atividades">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="space-y-2">
              <Label>Período</Label>
              <Select value={atvPeriodo} onValueChange={setAtvPeriodo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="diario">Diário</SelectItem>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="mensal">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Loja</Label>
              <AutocompleteLoja value={atvLojaFiltro} onChange={setAtvLojaFiltro} placeholder="Todas as Lojas" />
            </div>
          </div>

          {/* Ranking de Gestores */}
          <Card className="mb-6">
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Award className="h-4 w-4" /> Ranking de Gestores</CardTitle></CardHeader>
            <CardContent>
              {rankingGestores.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Sem dados no período</p>
              ) : (
                <Table>
                  <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Gestor</TableHead><TableHead className="text-center">Pontuação</TableHead><TableHead className="text-center">Executadas</TableHead><TableHead className="text-center">Total</TableHead><TableHead className="text-center">%</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {rankingGestores.map((g, i) => (
                      <TableRow key={g.gestorId} className={g.percentual >= 80 ? 'bg-green-500/10' : g.percentual >= 50 ? 'bg-yellow-500/10' : 'bg-red-500/10'}>
                        <TableCell className="font-bold">{i + 1}º</TableCell>
                        <TableCell>{g.gestorNome}</TableCell>
                        <TableCell className="text-center font-semibold">{g.pontuacaoTotal}</TableCell>
                        <TableCell className="text-center">{g.atividadesExecutadas}</TableCell>
                        <TableCell className="text-center">{g.atividadesTotal}</TableCell>
                        <TableCell className="text-center font-semibold">{g.percentual}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Execução por Loja */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Target className="h-4 w-4" /> Execução por Loja</CardTitle></CardHeader>
              <CardContent>
                {execucaoPorLoja.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">Sem dados</p>
                ) : (
                  <div className="space-y-4">
                    {execucaoPorLoja.map(l => (
                      <div key={l.lojaId} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{l.lojaNome}</span>
                          <span>{l.percentual}% ({l.executadas}/{l.total})</span>
                        </div>
                        <Progress value={l.percentual} className="h-3" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="h-4 w-4" /> Pontuação Média por Loja</CardTitle></CardHeader>
              <CardContent>
                {execucaoPorLoja.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">Sem dados</p>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={execucaoPorLoja}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="lojaNome" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="pontuacaoMedia" fill="hsl(var(--primary))" name="Pontuação Média" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </GestaoAdministrativaLayout>
  );
}
