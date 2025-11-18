
import React, { useState } from 'react';
import { 
  useStockData, useMarketIndices, useCurrencyPairs, 
  mockStocks, mockIndices, mockCurrencies, mockNews,
  generatePriceHistory 
} from '@/utils/stocksApi';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { StockCard } from '@/components/stocks/StockCard';
import { StockChart } from '@/components/stocks/StockChart';
import { MarketOverview } from '@/components/markets/MarketOverview';
import { CurrencyExchange } from '@/components/currencies/CurrencyExchange';
import { NewsCard } from '@/components/news/NewsCard';
import { StatsCard } from '@/components/ui/StatsCard';
import { BarChart3, TrendingDown, TrendingUp, Wallet2 } from 'lucide-react';

export function Dashboard() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedStock, setSelectedStock] = useState(mockStocks[0]);
  
  // Use our hooks to get real-time mock data
  const stocks = useStockData(mockStocks);
  const indices = useMarketIndices(mockIndices);
  const currencies = useCurrencyPairs(mockCurrencies);
  
  // Generate chart data for the selected stock
  const selectedStockHistory = generatePriceHistory(30, selectedStock.price, 2);
  
  // Generate chart data for stock cards
  const stocksWithHistory = stocks.map(stock => {
    return {
      ...stock,
      priceHistory: generatePriceHistory(30, stock.price, 2)
    };
  });
  
  // Calculate market statistics
  const gainers = stocks.filter(stock => stock.changePercent > 0);
  const losers = stocks.filter(stock => stock.changePercent < 0);
  
  const topGainer = [...stocks].sort((a, b) => b.changePercent - a.changePercent)[0];
  const topLoser = [...stocks].sort((a, b) => a.changePercent - b.changePercent)[0];
  
  const totalMarketCap = stocks.reduce((sum, stock) => sum + stock.marketCap, 0);
  const totalVolume = stocks.reduce((sum, stock) => sum + stock.volume, 0);
  
  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => !prev);
  };
  
  return (
    <div className="min-h-screen flex">
      <Sidebar isCollapsed={isSidebarCollapsed} onToggle={toggleSidebar} />
      
      <div className="flex-1 flex flex-col">
        <Navbar />
        
        <main className="flex-1 transition-all duration-300 overflow-hidden">
          <div className="container max-w-full h-full p-4 lg:p-6 flex flex-col animate-fade-in">
            <div className="bg-muted/30 rounded-lg p-4 mb-4 text-center border border-border">
              <h1 className="text-2xl font-bold">Painel do Mercado</h1>
            </div>
            
            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4 animate-slide-up" style={{ '--delay': '100ms' } as React.CSSProperties}>
              <StatsCard 
                title="Cap. de Mercado" 
                value="$13.42T"
                trend={0.47}
                icon={<Wallet2 />}
                className="bg-primary/5"
              />
              <StatsCard 
                title="Volume Negociado" 
                value="487.32M"
                description="Volume de hoje"
                icon={<BarChart3 />}
                className="bg-primary/5"
              />
              <StatsCard 
                title="Maior Alta" 
                value={topGainer.symbol}
                trend={topGainer.changePercent}
                trendLabel={topGainer.name}
                icon={<TrendingUp />}
                className="bg-success/5"
              />
              <StatsCard 
                title="Maior Baixa" 
                value={topLoser.symbol}
                trend={topLoser.changePercent}
                trendLabel={topLoser.name}
                icon={<TrendingDown />}
                className="bg-danger/5"
              />
            </div>
            
            {/* Main Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 min-h-0">
              {/* Left column - Stock list */}
              <div className="lg:col-span-1 flex flex-col animate-slide-up overflow-hidden" style={{ '--delay': '200ms' } as React.CSSProperties}>
                <h2 className="text-xl font-semibold mb-3">Lista de Observação</h2>
                <div className="space-y-3 overflow-y-auto">
                  {stocksWithHistory.slice(0, 5).map((stock) => (
                    <StockCard 
                      key={stock.symbol} 
                      stock={stock} 
                      priceHistory={stock.priceHistory}
                      onClick={() => setSelectedStock(stock)}
                      className={selectedStock.symbol === stock.symbol ? "ring-2 ring-primary" : ""}
                    />
                  ))}
                </div>
              </div>
              
              {/* Middle column - Chart and news */}
              <div className="lg:col-span-2 flex flex-col gap-4 animate-slide-up overflow-hidden" style={{ '--delay': '300ms' } as React.CSSProperties}>
                <div className="flex-1 min-h-0">
                  <StockChart 
                    symbol={selectedStock.symbol} 
                    name={selectedStock.name} 
                    currentPrice={selectedStock.price}
                    volatility={2.5}
                  />
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                  <NewsCard news={mockNews} className="h-full" />
                </div>
              </div>
              
              {/* Right column - Markets and currencies */}
              <div className="lg:col-span-1 flex flex-col gap-4 animate-slide-up overflow-hidden" style={{ '--delay': '400ms' } as React.CSSProperties}>
                <div className="flex-1 min-h-0 overflow-hidden">
                  <MarketOverview indices={indices} />
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                  <CurrencyExchange currencies={currencies} />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
