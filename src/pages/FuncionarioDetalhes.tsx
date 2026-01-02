import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { getEmployeeById, getStoreById, generateSalesHistory, generateTopProducts } from '@/utils/rhApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, Mail, Phone, Calendar, Briefcase, TrendingUp } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/utils/formatUtils';

export default function FuncionarioDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const employee = getEmployeeById(id || '');
  const [selectedPeriod, setSelectedPeriod] = useState(12);

  if (!employee) {
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

  const store = getStoreById(employee.storeId);
  const salesHistory = generateSalesHistory(employee.id, selectedPeriod);
  const topProducts = generateTopProducts(employee.id);

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : name.substring(0, 2);
  };


  return (
    <PageLayout title={employee.name}>
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(`/rh/loja/${employee.storeId}`)} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar para {store?.name}
        </Button>

        {/* Informações do Funcionário */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-6">
              <Avatar className="h-24 w-24">
                <AvatarFallback className="text-3xl">{getInitials(employee.name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-3xl font-bold mb-2">{employee.name}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    <span>{employee.position} - {store?.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Admitido em {employee.admissionDate.toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    <span>Produto destaque: {employee.topProduct}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">CPF:</span>
                    <span>{employee.cpf}</span>
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
