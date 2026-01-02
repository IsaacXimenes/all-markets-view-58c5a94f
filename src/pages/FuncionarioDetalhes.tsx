import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { getColaboradorById, getLojaById, getCargoNome } from '@/utils/cadastrosApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, Calendar, Briefcase, TrendingUp } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/utils/formatUtils';

// Mock functions for sales data (can be replaced with real data later)
const generateSalesHistory = (colaboradorId: string, months: number = 12) => {
  const history = [];
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const baseSales = 15000 + Math.random() * 10000;
  
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const variation = (Math.random() - 0.5) * 0.4;
    const sales = baseSales * (1 + variation);
    const commission = sales * 0.02;
    
    history.push({
      month: monthNames[date.getMonth()],
      sales: Math.round(sales),
      salary: 2500,
      commission: Math.round(commission)
    });
  }
  
  return history;
};

const generateTopProducts = () => {
  const products = [
    { name: 'iPhone 15 Pro Max', quantity: Math.floor(Math.random() * 20) + 10, revenue: 0 },
    { name: 'iPhone 15 Pro', quantity: Math.floor(Math.random() * 25) + 8, revenue: 0 },
    { name: 'iPhone 15', quantity: Math.floor(Math.random() * 30) + 12, revenue: 0 },
    { name: 'AirPods Pro 2ª Geração', quantity: Math.floor(Math.random() * 40) + 15, revenue: 0 },
    { name: 'Apple Watch Series 9', quantity: Math.floor(Math.random() * 15) + 5, revenue: 0 }
  ];
  
  products.forEach(product => {
    const avgPrice = product.name.includes('iPhone 15 Pro Max') ? 7999 :
                     product.name.includes('iPhone 15 Pro') ? 6999 :
                     product.name.includes('iPhone 15') ? 5499 :
                     product.name.includes('AirPods') ? 1899 : 2999;
    product.revenue = product.quantity * avgPrice;
  });
  
  return products.sort((a, b) => b.revenue - a.revenue).slice(0, 5);
};

export default function FuncionarioDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const colaborador = getColaboradorById(id || '');
  const [selectedPeriod, setSelectedPeriod] = useState(12);

  if (!colaborador) {
    return (
      <PageLayout title="Funcionário não encontrado">
        <div className="text-center">
          <p>Funcionário não encontrado</p>
          <Button onClick={() => navigate('/rh')} className="mt-4">
            Voltar para RH
          </Button>
        </div>
      </PageLayout>
    );
  }

  const loja = getLojaById(colaborador.loja);
  const salesHistory = generateSalesHistory(colaborador.id, selectedPeriod);
  const topProducts = generateTopProducts();

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : name.substring(0, 2);
  };

  return (
    <PageLayout title={colaborador.nome}>
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(`/rh/loja/${colaborador.loja}`)} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar para {loja?.nome}
        </Button>

        {/* Informações do Funcionário */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-6">
              <Avatar className="h-24 w-24">
                <AvatarFallback className="text-3xl">{getInitials(colaborador.nome)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-3xl font-bold mb-2">{colaborador.nome}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    <span>{getCargoNome(colaborador.cargo)} - {loja?.nome}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Admitido em {new Date(colaborador.dataAdmissao).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    <span>Salário: {colaborador.salario ? `R$ ${colaborador.salario.toLocaleString('pt-BR')}` : '-'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">CPF:</span>
                    <span>{colaborador.cpf}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Controles de Período */}
        <div className="flex justify-end gap-2">
          {[3, 6, 9, 12].map((period) => (
            <Button
              key={period}
              variant={selectedPeriod === period ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod(period)}
            >
              {period} meses
            </Button>
          ))}
          <Button
            variant={selectedPeriod === 24 ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedPeriod(24)}
          >
            Tudo
          </Button>
        </div>

        {/* Top 5 Produtos Mais Vendidos */}
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Produtos Mais Vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={150} />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                />
                <Legend />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" name="Receita Gerada" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Vendas vs Salário + Comissão */}
        <Card>
          <CardHeader>
            <CardTitle>Vendas Geradas vs Salário + Comissão</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={salesHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Vendas Geradas"
                  dot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="commission" 
                  stroke="hsl(var(--success))" 
                  strokeWidth={2}
                  name="Salário + Comissão"
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
