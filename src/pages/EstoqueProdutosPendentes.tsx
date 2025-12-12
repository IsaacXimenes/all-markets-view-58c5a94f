import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { EstoqueLayout } from '@/components/layout/EstoqueLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Eye, Clock, AlertTriangle, CheckCircle, Package } from 'lucide-react';
import { getProdutosPendentes, ProdutoPendente } from '@/utils/osApi';

const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export default function EstoqueProdutosPendentes() {
  const navigate = useNavigate();
  const [produtosPendentes, setProdutosPendentes] = useState<ProdutoPendente[]>([]);

  useEffect(() => {
    const data = getProdutosPendentes();
    // Filtrar apenas produtos que ainda não foram liberados e não estão na OS
    const pendentesEstoque = data.filter(p => 
      p.statusGeral === 'Pendente Estoque' || 
      (p.parecerEstoque?.status === 'Análise Realizada – Produto em ótimo estado' && p.statusGeral !== 'Liberado')
    );
    setProdutosPendentes(pendentesEstoque);
  }, []);

  const getStatusBadge = (produto: ProdutoPendente) => {
    if (!produto.parecerEstoque) {
      return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">Aguardando Parecer</Badge>;
    }
    if (produto.parecerEstoque.status === 'Análise Realizada – Produto em ótimo estado') {
      return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">Aprovado</Badge>;
    }
    return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">Encaminhado Assis.</Badge>;
  };

  const getOrigemBadge = (origem: string) => {
    if (origem === 'Trade-In') {
      return <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/30">Trade-In</Badge>;
    }
    return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">Nota de Entrada</Badge>;
  };

  const stats = {
    totalPendentes: produtosPendentes.length,
    aguardandoParecer: produtosPendentes.filter(p => !p.parecerEstoque).length,
    aprovados: produtosPendentes.filter(p => p.parecerEstoque?.status === 'Análise Realizada – Produto em ótimo estado').length,
    encaminhados: produtosPendentes.filter(p => p.parecerEstoque?.status === 'Encaminhado para conferência da Assistência').length,
  };

  return (
    <EstoqueLayout title="Produtos Pendentes">
      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              Total Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPendentes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              Aguardando Parecer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.aguardandoParecer}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Aprovados (Liberar)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.aprovados}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-blue-500" />
              Encaminhados Assis.
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.encaminhados}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Produtos Pendentes */}
      <Card>
        <CardHeader>
          <CardTitle>Produtos Pendentes de Conferência</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>IMEI</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Loja</TableHead>
                  <TableHead>Parecer Estoque</TableHead>
                  <TableHead>Parecer Assistência</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {produtosPendentes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhum produto pendente de conferência
                    </TableCell>
                  </TableRow>
                ) : (
                  produtosPendentes.map((produto) => (
                    <TableRow key={produto.id}>
                      <TableCell className="font-mono text-xs">{produto.id}</TableCell>
                      <TableCell className="font-mono text-xs">{produto.imei}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{produto.modelo}</div>
                          <div className="text-xs text-muted-foreground">{produto.cor}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getOrigemBadge(produto.origemEntrada)}</TableCell>
                      <TableCell>{produto.loja}</TableCell>
                      <TableCell>{getStatusBadge(produto)}</TableCell>
                      <TableCell>
                        {produto.parecerAssistencia ? (
                          <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30">
                            {produto.parecerAssistencia.status === 'Aguardando peça' ? 'Aguardando Peça' : 'Em Análise'}
                          </Badge>
                        ) : produto.parecerEstoque?.status === 'Encaminhado para conferência da Assistência' ? (
                          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">Para Análise</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/estoque/produto-pendente/${produto.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </EstoqueLayout>
  );
}
