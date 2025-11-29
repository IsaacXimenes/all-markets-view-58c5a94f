import { useParams, useNavigate } from 'react-router-dom';
import { EstoqueLayout } from '@/components/layout/EstoqueLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';
import { getNotasCompra } from '@/utils/estoqueApi';

export default function EstoqueNotaDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const nota = getNotasCompra().find(n => n.id === id);

  if (!nota) {
    return (
      <EstoqueLayout title="Nota não encontrada">
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">Nota não encontrada</p>
          <Button onClick={() => navigate('/estoque/notas-compra')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Notas
          </Button>
        </div>
      </EstoqueLayout>
    );
  }

  return (
    <EstoqueLayout title={`Detalhes da Nota ${nota.id}`}>
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/estoque/notas-compra')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Notas de Compra
        </Button>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <CardTitle>Informações da Nota</CardTitle>
              <Badge variant={nota.status === 'Concluído' ? 'default' : 'destructive'}>
                {nota.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>ID da Nota</Label>
                <Input value={nota.id} disabled />
              </div>
              <div>
                <Label>Nº da Nota</Label>
                <Input value={nota.numeroNota} disabled />
              </div>
              <div>
                <Label>Data de Entrada</Label>
                <Input value={new Date(nota.data).toLocaleDateString('pt-BR')} disabled />
              </div>
              <div>
                <Label>Fornecedor</Label>
                <Input value={nota.fornecedor} disabled />
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Produtos</h3>
              <div className="space-y-2">
                {nota.produtos.map((prod, idx) => (
                  <div key={idx} className="p-3 bg-muted/30 rounded">
                    <div className="flex justify-between">
                      <span className="font-medium">{prod.marca} {prod.modelo} - {prod.cor}</span>
                      <span className="font-semibold">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prod.valorTotal)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      IMEI: {prod.imei} | Qtd: {prod.quantidade} | Tipo: {prod.tipo} | Saúde Bat: {prod.saudeBateria}%
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Valor Total da Nota</span>
                <span className="text-2xl font-bold">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(nota.valorTotal)}
                </span>
              </div>
            </div>

            {nota.status === 'Concluído' && nota.pagamento && (
              <div className="border-t pt-4 bg-green-500/10 p-4 rounded">
                <h3 className="font-semibold mb-3 text-green-700 dark:text-green-400">Pagamento (Finalizado pelo Financeiro)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Forma de Pagamento</Label>
                    <Input value={nota.pagamento.formaPagamento} disabled />
                  </div>
                  <div>
                    <Label>Número de Parcelas</Label>
                    <Input value={nota.pagamento.parcelas} disabled />
                  </div>
                  <div>
                    <Label>Valor da Parcela</Label>
                    <Input 
                      value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(nota.pagamento.valorParcela)} 
                      disabled 
                    />
                  </div>
                  <div>
                    <Label>Data de Vencimento</Label>
                    <Input value={new Date(nota.pagamento.dataVencimento).toLocaleDateString('pt-BR')} disabled />
                  </div>
                </div>
                {nota.responsavelFinanceiro && (
                  <div className="mt-4">
                    <Label>Responsável Financeiro</Label>
                    <Input value={nota.responsavelFinanceiro} disabled />
                  </div>
                )}
              </div>
            )}

            {nota.status === 'Pendente' && (
              <div className="border-t pt-4 bg-yellow-500/10 p-4 rounded">
                <h3 className="font-semibold mb-2 text-yellow-700 dark:text-yellow-400">Pagamento</h3>
                <p className="text-sm text-muted-foreground">Aguardando preenchimento pelo Financeiro</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </EstoqueLayout>
  );
}
