import React, { useState } from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { 
  generateMultiStorePerformance, 
  generateBrandRecurrence,
  calculateAverageTicket,
  generateHourlyTraffic,
  getLastThreeMonths,
  mockStoresData 
} from '@/utils/storesApi';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Clock, BarChart3 } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function Performance() {
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState(12);

  const performanceData = generateMultiStorePerformance(selectedPeriod, selectedStore === 'all' ? undefined : selectedStore);
  const brandData = generateBrandRecurrence();
  const ticketData = calculateAverageTicket(selectedStore === 'all' ? undefined : selectedStore);
  const hourlyData = generateHourlyTraffic();
  const lastThreeMonths = getLastThreeMonths();

  const formatCurrency = (value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const initialValue = performanceData[0]?.total || 0;
  const currentValue = performanceData[performanceData.length - 1]?.total || 0;
  const absoluteReturn = currentValue - initialValue;
  const percentReturn = initialValue > 0 ? ((absoluteReturn / initialValue) * 100) : 0;

  const COLORS = ['#3b82f6', '#2563eb', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border p-3 rounded-lg shadow-lg">
          <p className="font-semibold mb-2">{data.brand}</p>
          <p className="text-sm text-muted-foreground mb-1">{formatCurrency(data.value)}</p>
          <div className="text-xs text-muted-foreground mt-2 space-y-1">
            <p className="font-medium">Top 3 produtos:</p>
            {data.topProducts.map((product: string, idx: number) => (<p key={idx}>• {product}</p>))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <PageLayout title="Desempenho" icon={BarChart3}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Selecionar Loja:</span>
            <Select value={selectedStore} onValueChange={setSelectedStore}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as lojas</SelectItem>
                {mockStoresData.map(store => (<SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            {[3, 6, 9, 12].map((period) => (<Button key={period} variant={selectedPeriod === period ? 'default' : 'outline'} size="sm" onClick={() => setSelectedPeriod(period)}>{period}m</Button>))}
            <Button variant={selectedPeriod === 24 ? 'default' : 'outline'} size="sm" onClick={() => setSelectedPeriod(24)}>Tudo</Button>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle>Desempenho {selectedStore === 'all' ? 'de Todas as Lojas' : `- ${mockStoresData.find(s => s.id === selectedStore)?.name}`}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} name="Receita Total" dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">Resumo Financeiro</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><p className="text-sm text-muted-foreground">Valor Investido</p><p className="text-2xl font-bold">{formatCurrency(initialValue)}</p></div>
              <div><p className="text-sm text-muted-foreground">Receita Gerada</p><p className="text-2xl font-bold">{formatCurrency(currentValue)}</p></div>
              <div>
                <p className="text-sm text-muted-foreground">Retorno Gerado</p>
                <p className={`text-2xl font-bold flex items-center gap-2 ${absoluteReturn >= 0 ? 'text-success' : 'text-danger'}`}>
                  {absoluteReturn >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                  {formatCurrency(Math.abs(absoluteReturn))}
                </p>
                <p className={`text-sm ${percentReturn >= 0 ? 'text-success' : 'text-danger'}`}>{percentReturn >= 0 ? '+' : ''}{percentReturn.toFixed(2)}%</p>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-lg">Vendas Recorrentes por Marca</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={brandData} cx="50%" cy="50%" labelLine={false} label={(entry) => entry.brand} outerRadius={100} fill="#3b82f6" dataKey="value">
                    {brandData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Comparativo Mensal – Todas as Lojas</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lastThreeMonths.map((monthData, idx) => (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{monthData.month}</h4>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold">{formatCurrency(monthData.total)}</span>
                      <span className={`flex items-center text-sm ${monthData.change >= 0 ? 'text-success' : 'text-danger'}`}>
                        {monthData.change >= 0 ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                        {Math.abs(monthData.change).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <Accordion type="single" collapsible>
                    <AccordionItem value={`month-${idx}`}>
                      <AccordionTrigger className="text-sm text-muted-foreground">Ver detalhes por loja</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                          {monthData.stores.map(store => (<div key={store.id} className="bg-muted/50 p-3 rounded"><p className="text-sm font-medium">{store.name}</p><p className="text-lg font-bold">{formatCurrency(store.monthRevenue)}</p></div>))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" />Ticket Médio (últimos 30 dias)</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-primary/10 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Ticket Médio Geral</p>
                <p className="text-3xl font-bold text-primary">{formatCurrency(ticketData.overall)}</p>
              </div>
              {ticketData.byStore.length > 1 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {ticketData.byStore.map(store => (<div key={store.storeId} className="bg-muted/50 p-3 rounded"><p className="text-xs text-muted-foreground mb-1">{store.name}</p><p className="text-lg font-bold">{formatCurrency(store.ticket)}</p></div>))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" />Vendas por Horário do Dia</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Legend />
                <Bar dataKey="morning" stackId="a" fill="#94a3b8" name="06-10h" />
                <Bar dataKey="midday" stackId="a" fill="#3b82f6" name="10-14h" />
                <Bar dataKey="afternoon" stackId="a" fill="#3b82f6" name="14-18h" />
                <Bar dataKey="evening" stackId="a" fill="#1d4ed8" name="18-24h" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
