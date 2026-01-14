import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Trophy, Medal, Award, TrendingUp, Store } from 'lucide-react';
import { getColaboradores, getLojaById, getCargos } from '@/utils/cadastrosApi';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/formatUtils';
import { getPercentualComissao } from '@/utils/calculoComissaoVenda';

// Gerar dados mock de vendas para ranking com comissões
const getTopSellers = (limit: number) => {
  const colaboradores = getColaboradores().filter(c => c.status === 'Ativo');
  const cargos = getCargos();
  
  // Filtrar apenas vendedores
  const cargoVendedor = cargos.find(c => c.funcao.toLowerCase().includes('vendedor'));
  const vendedores = colaboradores.filter(c => 
    c.cargo === cargoVendedor?.id || 
    cargos.find(cargo => cargo.id === c.cargo)?.funcao.toLowerCase().includes('vendedor')
  );
  
  // Gerar vendas mock baseadas no ID para consistência
  const vendedoresComVendas = vendedores.map(v => {
    const seed = parseInt(v.id.replace('COL-', '')) || 1;
    const sales = Math.floor(15000 + (seed * 3500) + Math.sin(seed) * 5000);
    const lucro = sales * 0.3; // ~30% margem
    // Calcular comissão baseada na loja do vendedor
    const percentualComissao = getPercentualComissao(v.loja);
    const commission = lucro * (percentualComissao / 100);
    
    return {
      id: v.id,
      name: v.nome,
      storeId: v.loja || '',
      sales,
      lucro,
      commission,
      percentualComissao
    };
  });
  
  return vendedoresComVendas
    .sort((a, b) => b.sales - a.sales)
    .slice(0, limit);
};

export function RankingVendedores() {
  const topSellers = getTopSellers(10);
  
  const getInitials = (name: string) => {
    const parts = name.split(' ');
    return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : name.substring(0, 2);
  };
  
  const getMedalIcon = (position: number) => {
    if (position === 1) return <Trophy className="h-6 w-6 text-yellow-500" />;
    if (position === 2) return <Medal className="h-6 w-6 text-gray-400" />;
    if (position === 3) return <Award className="h-6 w-6 text-amber-600" />;
    return null;
  };
  
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Ranking de Vendedores do Mês
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        <div className="space-y-2">
          {/* Top 3 em Destaque */}
          {topSellers.slice(0, 3).map((seller, index) => {
            const store = getLojaById(seller.storeId);
            const position = index + 1;
            
            return (
              <div 
                key={seller.id}
                className={cn(
                  "p-4 rounded-lg border-2 transition-all hover:shadow-md",
                  position === 1 && "bg-yellow-500/10 border-yellow-500/50",
                  position === 2 && "bg-gray-400/10 border-gray-400/50",
                  position === 3 && "bg-amber-600/10 border-amber-600/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8">
                    {getMedalIcon(position)}
                  </div>
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="text-lg font-bold">
                      {getInitials(seller.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{seller.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {store?.nome.replace('Thiago Imports - ', '')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-success">{formatCurrency(seller.sales)}</p>
                    <p className="text-xs text-purple-600 font-medium">
                      {formatCurrency(seller.commission)} ({seller.percentualComissao}%)
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
          
          {/* Demais (4º ao 10º) */}
          <div className="pt-2 space-y-1">
            {topSellers.slice(3).map((seller, index) => {
              const store = getLojaById(seller.storeId);
              const position = index + 4;
              
              return (
                <div 
                  key={seller.id}
                  className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-center w-6">
                    <span className="text-sm font-semibold text-muted-foreground">
                      {position}º
                    </span>
                  </div>
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {getInitials(seller.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{seller.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {store?.nome.replace('Thiago Imports - ', '')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatCurrency(seller.sales)}</p>
                    <p className="text-xs text-purple-600">
                      {formatCurrency(seller.commission)} ({seller.percentualComissao}%)
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
