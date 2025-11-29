import { useState } from 'react';
import { FinanceiroLayout } from '@/components/layout/FinanceiroLayout';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getNotasCompra, finalizarNota, NotaCompra } from '@/utils/estoqueApi';
import { Eye, CheckCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

export default function FinanceiroConferenciaNotas() {
  const [notas, setNotas] = useState(getNotasCompra());
  const [notaSelecionada, setNotaSelecionada] = useState<NotaCompra | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const notasPendentes = notas.filter(n => n.status === 'Pendente');

  const handleVerNota = (nota: NotaCompra) => {
    setNotaSelecionada(nota);
    setDialogOpen(true);
  };

  const handleFinalizarNota = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!notaSelecionada) return;

    const formData = new FormData(e.currentTarget);
    
    const pagamento = {
      formaPagamento: formData.get('formaPagamento') as string,
      parcelas: parseInt(formData.get('parcelas') as string),
      valorParcela: parseFloat(formData.get('valorParcela') as string),
      dataVencimento: formData.get('dataVencimento') as string
    };
    
    const responsavel = formData.get('responsavel') as string;

    const notaFinalizada = finalizarNota(notaSelecionada.id, pagamento, responsavel);
    
    if (notaFinalizada) {
      setNotas(getNotasCompra());
      setDialogOpen(false);
      
      const totalProdutos = notaFinalizada.produtos.reduce((sum, p) => sum + p.quantidade, 0);
      
      toast({
        title: '✅ Nota liberada com sucesso!',
        description: `Nota ${notaFinalizada.id} liberada – ${totalProdutos} produtos adicionados ao estoque!`,
        className: 'bg-green-500 text-white',
      });
    }
  };

  return (
    <FinanceiroLayout title="Conferência de Notas de Entrada">
      <div className="space-y-4">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Nº Nota</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Valor Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notasPendentes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhuma nota pendente de conferência
                  </TableCell>
                </TableRow>
              ) : (
                notasPendentes.map(nota => (
                  <TableRow key={nota.id}>
                    <TableCell className="font-mono text-xs">{nota.id}</TableCell>
                    <TableCell>{new Date(nota.data).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell className="font-mono text-xs">{nota.numeroNota}</TableCell>
                    <TableCell>{nota.fornecedor}</TableCell>
                    <TableCell>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(nota.valorTotal)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="destructive">{nota.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => handleVerNota(nota)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Conferir Nota {notaSelecionada?.id}</DialogTitle>
            </DialogHeader>
            
            {notaSelecionada && (
              <form onSubmit={handleFinalizarNota} className="space-y-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Nº da Nota</Label>
                      <Input value={notaSelecionada.numeroNota} disabled />
                    </div>
                    <div>
                      <Label>Data</Label>
                      <Input value={new Date(notaSelecionada.data).toLocaleDateString('pt-BR')} disabled />
                    </div>
                  </div>

                  <div>
                    <Label>Fornecedor</Label>
                    <Input value={notaSelecionada.fornecedor} disabled />
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-3">Produtos (Somente Leitura)</h3>
                    <div className="space-y-2 text-sm">
                      {notaSelecionada.produtos.map((prod, idx) => (
                        <div key={idx} className="p-3 bg-muted/30 rounded">
                          <div className="flex justify-between">
                            <span className="font-medium">{prod.marca} {prod.modelo} - {prod.cor}</span>
                            <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prod.valorTotal)}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            IMEI: {prod.imei} | Qtd: {prod.quantidade} | Tipo: {prod.tipo}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-3 text-primary">Seção "Pagamento" (Habilitada)</h3>
                    <div className="grid gap-4">
                      <div>
                        <Label htmlFor="formaPagamento">Forma de Pagamento*</Label>
                        <Select name="formaPagamento" required>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pix">Pix</SelectItem>
                            <SelectItem value="Transferência Bancária">Transferência Bancária</SelectItem>
                            <SelectItem value="Boleto">Boleto</SelectItem>
                            <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="parcelas">Parcelas*</Label>
                          <Input id="parcelas" name="parcelas" type="number" min="1" defaultValue="1" required />
                        </div>
                        <div>
                          <Label htmlFor="valorParcela">Valor da Parcela*</Label>
                          <Input 
                            id="valorParcela" 
                            name="valorParcela" 
                            type="number" 
                            step="0.01" 
                            defaultValue={notaSelecionada.valorTotal}
                            required 
                          />
                        </div>
                        <div>
                          <Label htmlFor="dataVencimento">Data Vencimento*</Label>
                          <Input id="dataVencimento" name="dataVencimento" type="date" required />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="responsavel">Responsável Financeiro*</Label>
                        <Input id="responsavel" name="responsavel" placeholder="Seu nome" required />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-green-600 hover:bg-green-700">
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Finalizar Nota
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </FinanceiroLayout>
  );
}
