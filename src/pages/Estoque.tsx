import { EstoqueLayout } from '@/components/layout/EstoqueLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getEstoqueStats } from '@/utils/estoqueApi';
import { Package, DollarSign, AlertTriangle, FileWarning } from 'lucide-react';

export default function Estoque() {
  const stats = getEstoqueStats();

  return (
    <EstoqueLayout title="Estoque">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Produtos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProdutos}</div>
            <p className="text-xs text-muted-foreground">Unidades em estoque</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total do Estoque</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.valorTotalEstoque)}
            </div>
            <p className="text-xs text-muted-foreground">Base custo</p>
          </CardContent>
        </Card>

        <Card className={stats.produtosBateriaFraca > 0 ? 'bg-destructive/10' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saúde da Bateria &lt; 85%</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${stats.produtosBateriaFraca > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.produtosBateriaFraca > 0 ? 'text-destructive' : ''}`}>
              {stats.produtosBateriaFraca}
            </div>
            <p className="text-xs text-muted-foreground">Produtos com bateria degradada</p>
          </CardContent>
        </Card>

        <Card className={stats.notasPendentes > 0 ? 'bg-destructive/10' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notas Pendentes</CardTitle>
            <FileWarning className={`h-4 w-4 ${stats.notasPendentes > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.notasPendentes > 0 ? 'text-destructive' : ''}`}>
              {stats.notasPendentes}
            </div>
            <p className="text-xs text-muted-foreground">Aguardando financeiro</p>
          </CardContent>
        </Card>
      </div>
    </EstoqueLayout>
  );
}
