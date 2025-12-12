import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { OSLayout } from '@/components/layout/OSLayout';
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
import { Eye, Wrench, Clock, AlertTriangle, CheckCircle, Package } from 'lucide-react';
import { getProdutosParaAnaliseOS, ProdutoPendente } from '@/utils/osApi';

const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export default function OSProdutosAnalise() {
  const navigate = useNavigate();
  const [produtos, setProdutos] = useState<ProdutoPendente[]>([]);

  useEffect(() => {
    const data = getProdutosParaAnaliseOS();
    setProdutos(data);
  }, []);

  const getStatusAssistenciaBadge = (produto: ProdutoPendente) => {
    if (!produto.parecerAssistencia) {
      return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">Para Análise</Badge>;
    }
    switch (produto.parecerAssistencia.status) {
      case 'Produto conferido':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">Conferido</Badge>;
      case 'Aguardando peça':
        return <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30">Aguardando Peça</Badge>;
      case 'Ajustes realizados':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">Ajustes Realizados</Badge>;
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  const getOrigemBadge = (origem: string) => {
    if (origem === 'Trade-In') {
      return <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/30">Trade-In</Badge>;
    }
    return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">Nota de Entrada</Badge>;
  };

  const stats = {
    totalAnalise: produtos.length,
    paraAnalise: produtos.filter(p => !p.parecerAssistencia).length,
    aguardandoPeca: produtos.filter(p => p.parecerAssistencia?.status === 'Aguardando peça').length,
    ajustesRealizados: produtos.filter(p => p.parecerAssistencia?.status === 'Ajustes realizados').length,
    custoTotal: produtos.reduce((acc, p) => acc + p.custoAssistencia, 0)
  };

  return (
    <OSLayout title="Produtos para Análise">
      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Total em Análise
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAnalise}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              Para Análise
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.paraAnalise}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Aguardando Peça
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.aguardandoPeca}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-blue-500" />
              Ajustes Realizados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.ajustesRealizados}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Custo Total Assistência
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(stats.custoTotal)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Produtos */}
      <Card>
        <CardHeader>
          <CardTitle>Produtos Encaminhados para Assistência</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>IMEI</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Loja</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Data Encaminhamento</TableHead>
                  <TableHead>Parecer Estoque</TableHead>
                  <TableHead>Parecer Assistência</TableHead>
                  <TableHead>Custo Assis.</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {produtos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      Nenhum produto em análise na assistência
                    </TableCell>
                  </TableRow>
                ) : (
                  produtos.map((produto) => (
                    <TableRow key={produto.id}>
                      <TableCell className="font-mono text-xs">{produto.imei}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{produto.marca}</div>
                          <div className="text-xs text-muted-foreground">{produto.cor}</div>
                        </div>
                      </TableCell>
                      <TableCell>{produto.modelo}</TableCell>
                      <TableCell>{produto.loja}</TableCell>
                      <TableCell>{getOrigemBadge(produto.origemEntrada)}</TableCell>
                      <TableCell>
                        {produto.parecerEstoque 
                          ? new Date(produto.parecerEstoque.data).toLocaleDateString('pt-BR')
                          : '—'
                        }
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
                          Encaminhado Assis.
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusAssistenciaBadge(produto)}</TableCell>
                      <TableCell className={produto.custoAssistencia > 0 ? 'text-red-600 font-medium' : ''}>
                        {produto.custoAssistencia > 0 ? formatCurrency(produto.custoAssistencia) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/os/produto/${produto.id}`)}
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
    </OSLayout>
  );
}
