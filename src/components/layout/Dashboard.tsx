
import React, { useState } from 'react';
import { 
  useProductData, useCategoryData, useSalesMetrics,
  mockProducts, mockCategories, mockSalesMetrics, mockNews,
  generatePriceHistory 
} from '@/utils/productsApi';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { StockCard } from '@/components/stocks/StockCard';
import { StockChart } from '@/components/stocks/StockChart';
import { MarketOverview } from '@/components/markets/MarketOverview';
import { CurrencyExchange } from '@/components/currencies/CurrencyExchange';
import { NewsCard } from '@/components/news/NewsCard';
import { StatsCard } from '@/components/ui/StatsCard';
import { RankingVendedores } from '@/components/dashboard/RankingVendedores';
import { BarChart3, TrendingDown, TrendingUp, Wallet2, Package, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Dashboard() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(mockProducts[0]);
  
  // Use nossos hooks para dados em tempo real
  const products = useProductData(mockProducts);
  const categories = useCategoryData(mockCategories);
  const salesMetrics = useSalesMetrics(mockSalesMetrics);
  
  // Gerar histórico de preços para o produto selecionado
  const selectedProductHistory = generatePriceHistory(30, selectedProduct.price, 2);
  
  // Gerar histórico para os cards de produtos
  const productsWithHistory = products.map(product => {
    return {
      ...product,
      priceHistory: generatePriceHistory(30, product.price, 2)
    };
  });
  
  // Calcular estatísticas
  const productsInStock = products.filter(p => p.stock > 0);
  const lowStock = products.filter(p => p.stock < 50);
  
  const topSeller = [...products].sort((a, b) => b.sales - a.sales)[0];
  const totalRevenue = products.reduce((sum, p) => sum + (p.price * p.sales), 0);
  const totalSales = products.reduce((sum, p) => sum + p.sales, 0);
  
  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => !prev);
  };
  
  return (
    <div className="min-h-screen flex">
      <Sidebar isCollapsed={isSidebarCollapsed} onToggle={toggleSidebar} />
      
      <div className={cn("flex-1 flex flex-col transition-all duration-300", isSidebarCollapsed ? "ml-16" : "ml-64")}>
        <Navbar />
        
        <main className="flex-1 transition-all duration-300 overflow-hidden">
          <div className="container max-w-full h-full p-4 lg:p-6 flex flex-col animate-fade-in">
            <div className="bg-muted/30 rounded-lg p-4 mb-4 text-center border border-border">
              <h1 className="text-2xl font-bold">Painel da Loja</h1>
            </div>
            
            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4 animate-slide-up" style={{ '--delay': '100ms' } as React.CSSProperties}>
              <StatsCard 
                title="Receita Total" 
                value={`R$ ${(totalRevenue / 1000000).toFixed(2)}M`}
                trend={5.2}
                icon={<Wallet2 />}
                className="bg-primary/5"
              />
              <StatsCard 
                title="Vendas Totais" 
                value={totalSales.toLocaleString()}
                description="Unidades vendidas"
                icon={<ShoppingCart />}
                className="bg-primary/5"
              />
              <StatsCard 
                title="Mais Vendido" 
                value={topSeller.name}
                trend={((topSeller.sales / totalSales) * 100)}
                trendLabel={`${topSeller.sales} vendas`}
                icon={<TrendingUp />}
                className="bg-success/5"
              />
              <StatsCard 
                title="Produtos em Estoque" 
                value={productsInStock.length.toString()}
                trend={lowStock.length > 0 ? -lowStock.length : 0}
                trendLabel={lowStock.length > 0 ? `${lowStock.length} com estoque baixo` : 'Estoque bom'}
                icon={<Package />}
                className={lowStock.length > 0 ? "bg-danger/5" : "bg-success/5"}
              />
            </div>
            
            {/* Main Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 min-h-0">
              {/* Left column - Product list */}
              <div className="lg:col-span-1 flex flex-col animate-slide-up overflow-hidden" style={{ '--delay': '200ms' } as React.CSSProperties}>
                <h2 className="text-xl font-semibold mb-3">Produtos em Destaque</h2>
                <div className="space-y-3 overflow-y-auto">
                  {productsWithHistory.slice(0, 5).map((product) => (
                    <StockCard 
                      key={product.id} 
                      stock={{
                        symbol: product.id,
                        name: product.name,
                        price: product.price,
                        change: product.discount || 0,
                        changePercent: product.discount ? ((product.discount / product.price) * 100) : 0,
                        volume: product.sales,
                        marketCap: product.stock,
                        lastUpdated: product.lastUpdated
                      }}
                      priceHistory={product.priceHistory}
                      onClick={() => setSelectedProduct(product)}
                      className={selectedProduct.id === product.id ? "ring-2 ring-primary" : ""}
                    />
                  ))}
                </div>
              </div>
              
              {/* Middle column - Chart and news */}
              <div className="lg:col-span-2 flex flex-col gap-4 animate-slide-up overflow-hidden" style={{ '--delay': '300ms' } as React.CSSProperties}>
                <div className="flex-1 min-h-0">
                  <StockChart 
                    symbol={selectedProduct.id} 
                    name={selectedProduct.name} 
                    currentPrice={selectedProduct.price}
                    volatility={2.5}
                  />
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                  <NewsCard news={mockNews} className="h-full" />
                </div>
              </div>
              
            {/* Right column - Ranking de Vendedores */}
            <div className="lg:col-span-1 flex flex-col gap-4 animate-slide-up overflow-hidden" style={{ '--delay': '400ms' } as React.CSSProperties}>
              <RankingVendedores />
            </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
