import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { StatsCard } from '@/components/ui/StatsCard';
import { RankingVendedores } from '@/components/dashboard/RankingVendedores';
import { Wallet2, Package, ShoppingCart, Users, Wrench, TrendingUp, Shield, ShieldAlert, Percent } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getVendas } from '@/utils/vendasApi';
import { getProdutos } from '@/utils/estoqueApi';
import { getOrdensServico } from '@/utils/assistenciaApi';
import { getColaboradores } from '@/utils/cadastrosApi';
import { formatCurrency } from '@/utils/formatUtils';
import { getGarantiasExpirandoEm7Dias, getGarantiasExpirandoEm30Dias } from '@/utils/garantiasApi';
import { getPercentualComissao, LOJA_ONLINE_ID } from '@/utils/calculoComissaoVenda';
import { useSidebarState } from '@/hooks/useSidebarState';

export function Dashboard() {
  const navigate = useNavigate();
  const [isSidebarCollapsed, toggleSidebar] = useSidebarState();
  
  // Dados reais do sistema
  const vendas = getVendas();
  const produtos = getProdutos();
  const ordensServico = getOrdensServico();
  const colaboradores = getColaboradores();
  
  // Calcular estatísticas
  const vendasHoje = vendas.filter(v => {
    const hoje = new Date().toISOString().split('T')[0];
    return v.dataHora.split('T')[0] === hoje;
  });
  
  const receitaHoje = vendasHoje.reduce((sum, v) => sum + v.total, 0);
  const receitaTotal = vendas.reduce((sum, v) => sum + v.total, 0);
  
  const produtosEmEstoque = produtos.filter(p => p.quantidade > 0).length;
  const produtosBaixoEstoque = produtos.filter(p => p.quantidade > 0 && p.quantidade < 5).length;
  
  const osAbertas = ordensServico.filter(os => os.status !== 'Serviço concluído').length;
  const osUrgentes = ordensServico.filter(os => os.status === 'Aguardando Peça').length;
  
  const garantiasUrgentes = getGarantiasExpirandoEm7Dias();
  const garantiasAtencao = getGarantiasExpirandoEm30Dias();
  
  const colaboradoresAtivos = colaboradores.length;
  
  // Cálculo de comissão do dia (mock - baseado em lucro estimado)
  const comissaoHoje = useMemo(() => {
    // Simular cálculo de comissão baseado nas vendas de hoje
    const lucroEstimadoHoje = receitaHoje * 0.3; // ~30% de margem estimada
    // Média ponderada: 80% loja física (10%), 20% online (6%)
    const percentualMedio = (0.8 * 10 + 0.2 * 6);
    return lucroEstimadoHoje * (percentualMedio / 100);
  }, [receitaHoje]);
  
  return (
    <div className="min-h-screen flex">
      <Sidebar isCollapsed={isSidebarCollapsed} onToggle={toggleSidebar} />
      
      <div className={cn(
        "flex-1 flex flex-col transition-all duration-300",
        isSidebarCollapsed ? "ml-16" : "ml-64 xl:ml-72"
      )}>
        <Navbar />
        
        <main className="flex-1 transition-all duration-300 overflow-hidden">
          <div className="w-full max-w-full h-full p-3 sm:p-4 lg:p-6 xl:p-8 flex flex-col animate-fade-in">
            <div className="bg-muted/30 rounded-lg p-3 sm:p-4 mb-4 text-center border border-border">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Painel de Gestão</h1>
            </div>
            
            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 xl:grid-cols-5 2xl:grid-cols-6 3xl:grid-cols-7 gap-3 mb-4 animate-slide-up" style={{ '--delay': '100ms' } as React.CSSProperties}>
              <StatsCard 
                title="Receita Hoje" 
                value={formatCurrency(receitaHoje)}
                description={`${vendasHoje.length} vendas`}
                icon={<Wallet2 />}
                className="bg-primary/5"
              />
              <StatsCard 
                title="Vendas Totais" 
                value={formatCurrency(receitaTotal)}
                description={`${vendas.length} vendas`}
                icon={<ShoppingCart />}
                className="bg-primary/5"
              />
              <StatsCard 
                title="Comissão Hoje" 
                value={formatCurrency(comissaoHoje)}
                description="Estimativa"
                icon={<Percent />}
                className="bg-purple-500/10"
              />
              <StatsCard 
                title="Estoque" 
                value={produtosEmEstoque.toString()}
                trend={produtosBaixoEstoque > 0 ? -produtosBaixoEstoque : 0}
                trendLabel={produtosBaixoEstoque > 0 ? `${produtosBaixoEstoque} com estoque baixo` : 'Estoque OK'}
                icon={<Package />}
                className={produtosBaixoEstoque > 0 ? "bg-danger/5" : "bg-success/5"}
              />
              <StatsCard 
                title="OS Abertas" 
                value={osAbertas.toString()}
                trend={osUrgentes > 0 ? -osUrgentes : 0}
                trendLabel={osUrgentes > 0 ? `${osUrgentes} aguardando peça` : 'Sem urgências'}
                icon={<Wrench />}
                className={osUrgentes > 0 ? "bg-warning/5" : "bg-success/5"}
              />
            </div>
            
            {/* Cards de Garantias */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 animate-slide-up" style={{ '--delay': '150ms' } as React.CSSProperties}>
              <Card 
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  garantiasUrgentes.length > 0 ? "border-red-500 bg-red-50 dark:bg-red-950/20" : "bg-muted/30"
                )}
                onClick={() => navigate('/garantias/em-andamento')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-500/10">
                      <ShieldAlert className="h-5 w-5 text-red-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Garantias Urgentes</p>
                      <p className="text-2xl font-bold">{garantiasUrgentes.length}</p>
                      <p className="text-xs text-red-500">Expiram em 7 dias</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card 
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  garantiasAtencao.length > 0 ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20" : "bg-muted/30"
                )}
                onClick={() => navigate('/garantias/em-andamento')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-yellow-500/10">
                      <Shield className="h-5 w-5 text-yellow-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Garantias Atenção</p>
                      <p className="text-2xl font-bold">{garantiasAtencao.length}</p>
                      <p className="text-xs text-yellow-600">Expiram em 30 dias</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Main Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 2xl:grid-cols-4 gap-4 flex-1 min-h-0">
              {/* Left column - Resumo Rápido */}
              <div className="lg:col-span-2 2xl:col-span-3 flex flex-col gap-4 animate-slide-up overflow-hidden" style={{ '--delay': '200ms' } as React.CSSProperties}>
                <Card className="flex-1">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Resumo do Sistema
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 2xl:grid-cols-5 gap-4">
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <p className="text-2xl font-bold text-primary">{vendas.length}</p>
                        <p className="text-sm text-muted-foreground">Vendas</p>
                      </div>
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <p className="text-2xl font-bold text-primary">{produtos.length}</p>
                        <p className="text-sm text-muted-foreground">Produtos</p>
                      </div>
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <p className="text-2xl font-bold text-primary">{ordensServico.length}</p>
                        <p className="text-sm text-muted-foreground">Ordens de Serviço</p>
                      </div>
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <p className="text-2xl font-bold text-primary">{colaboradoresAtivos}</p>
                        <p className="text-sm text-muted-foreground">Colaboradores</p>
                      </div>
                    </div>
                    
                    <div className="mt-6">
                      <h3 className="font-semibold mb-3">Últimas Vendas</h3>
                      <div className="space-y-2">
                        {vendas.slice(0, 5).map(venda => (
                          <div key={venda.id} className="flex justify-between items-center p-2 bg-muted/30 rounded">
                            <div>
                              <p className="font-medium text-sm">{venda.clienteNome}</p>
                              <p className="text-xs text-muted-foreground">{new Date(venda.dataHora).toLocaleDateString('pt-BR')}</p>
                            </div>
                            <span className="font-semibold text-primary">{formatCurrency(venda.total)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Right column - Ranking de Vendedores */}
              <div className="lg:col-span-1 flex flex-col gap-4 animate-slide-up overflow-hidden" style={{ '--delay': '300ms' } as React.CSSProperties}>
                <RankingVendedores />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
