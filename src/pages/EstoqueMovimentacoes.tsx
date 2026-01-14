import { useState, useEffect } from 'react';
import { EstoqueLayout } from '@/components/layout/EstoqueLayout';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { getMovimentacoes, addMovimentacao, getProdutos, Produto } from '@/utils/estoqueApi';
import { getLojas, getLojaById, getColaboradores } from '@/utils/cadastrosApi';
import { exportToCSV } from '@/utils/formatUtils';
import { formatIMEI, unformatIMEI, isValidIMEI } from '@/utils/imeiMask';
import { InputComMascara } from '@/components/ui/InputComMascara';
import { Download, Plus, AlertCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

// Função para buscar modelo por IMEI no estoque
const obterModeloPorIMEI = (imei: string): { modelo: string; produto: Produto } | null => {
  const produtos = getProdutos();
  const imeiLimpo = unformatIMEI(imei);
  const produtoEncontrado = produtos.find(p => unformatIMEI(p.imei) === imeiLimpo);
  if (produtoEncontrado) {
    return { modelo: `${produtoEncontrado.marca} ${produtoEncontrado.modelo}`, produto: produtoEncontrado };
  }
  return null;
};

export default function EstoqueMovimentacoes() {
  const [movimentacoes, setMovimentacoes] = useState(getMovimentacoes());
  const [origemFilter, setOrigemFilter] = useState<string>('todas');
  const [destinoFilter, setDestinoFilter] = useState<string>('todas');
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const lojas = getLojas().filter(l => l.status === 'Ativo');
  const colaboradores = getColaboradores().filter(c => c.status === 'Ativo');

  // Form state - nova ordem: IMEI, Modelo, Responsável, Data, Observações
  const [formData, setFormData] = useState({
    imei: '',
    produto: '',
    responsavel: '',
    data: '',
    motivo: '',
    origem: '',
    destino: '',
    quantidade: '1'
  });
  
  const [imeiEncontrado, setImeiEncontrado] = useState<boolean | null>(null);
  const [modeloBloqueado, setModeloBloqueado] = useState(false);

  const getLojaNome = (lojaIdOuNome: string) => {
    // Primeiro tenta buscar por ID
    const lojaPorId = getLojaById(lojaIdOuNome);
    if (lojaPorId) return lojaPorId.nome;
    // Se não encontrar, retorna o valor original (pode ser um nome legado)
    return lojaIdOuNome;
  };

  const movimentacoesFiltradas = movimentacoes.filter(m => {
    if (origemFilter !== 'todas' && m.origem !== origemFilter) return false;
    if (destinoFilter !== 'todas' && m.destino !== destinoFilter) return false;
    return true;
  });

  const handleExport = () => {
    const dataToExport = movimentacoesFiltradas.map(m => ({
      ...m,
      imei: formatIMEI(m.imei),
      data: new Date(m.data).toLocaleDateString('pt-BR'),
      origem: getLojaNome(m.origem),
      destino: getLojaNome(m.destino)
    }));
    exportToCSV(dataToExport, 'movimentacoes-estoque.csv');
  };

  const handleIMEIChange = (formatted: string, raw: string | number) => {
    const imeiStr = String(raw);
    setFormData(prev => ({ ...prev, imei: imeiStr }));
    
    // Se IMEI completo (15 dígitos), buscar automaticamente
    if (imeiStr.length === 15) {
      const resultado = obterModeloPorIMEI(imeiStr);
      if (resultado) {
        setFormData(prev => ({ ...prev, produto: resultado.modelo }));
        setImeiEncontrado(true);
        setModeloBloqueado(true);
      } else {
        setImeiEncontrado(false);
        setModeloBloqueado(false);
      }
    } else {
      setImeiEncontrado(null);
      if (imeiStr.length === 0) {
        setFormData(prev => ({ ...prev, produto: '' }));
      }
      setModeloBloqueado(false);
    }
  };

  const handleRegistrarMovimentacao = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!formData.responsavel) {
      toast({
        title: 'Campo obrigatório',
        description: 'Selecione um responsável',
        variant: 'destructive'
      });
      return;
    }
    
    if (!formData.imei || formData.imei.length !== 15) {
      toast({
        title: 'Campo obrigatório',
        description: 'IMEI deve ter 15 dígitos',
        variant: 'destructive'
      });
      return;
    }

    const novaMovimentacao = addMovimentacao({
      data: formData.data,
      produto: formData.produto,
      imei: formData.imei,
      quantidade: parseInt(formData.quantidade),
      origem: formData.origem,
      destino: formData.destino,
      responsavel: colaboradores.find(c => c.id === formData.responsavel)?.nome || formData.responsavel,
      motivo: formData.motivo
    });

    setMovimentacoes([...movimentacoes, novaMovimentacao]);
    setDialogOpen(false);
    setFormData({
      imei: '',
      produto: '',
      responsavel: '',
      data: '',
      motivo: '',
      origem: '',
      destino: '',
      quantidade: '1'
    });
    setImeiEncontrado(null);
    setModeloBloqueado(false);
    toast({
      title: 'Movimentação registrada',
      description: `Movimentação ${novaMovimentacao.id} registrada com sucesso`,
    });
  };

  return (
    <EstoqueLayout title="Movimentações - Aparelhos">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-4">
          <Select value={origemFilter} onValueChange={setOrigemFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as origens</SelectItem>
              {lojas.map(loja => (
                <SelectItem key={loja.id} value={loja.id}>{loja.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={destinoFilter} onValueChange={setDestinoFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Destino" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todos os destinos</SelectItem>
              {lojas.map(loja => (
                <SelectItem key={loja.id} value={loja.id}>{loja.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="ml-auto flex gap-2">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Registrar Nova Movimentação
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Registrar Movimentação</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleRegistrarMovimentacao} className="space-y-4">
                  {/* 1. IMEI - com máscara e busca automática */}
                  <div>
                    <Label htmlFor="imei">IMEI *</Label>
                    <InputComMascara
                      mascara="imei"
                      value={formData.imei}
                      onChange={handleIMEIChange}
                      placeholder="00-000000-000000-0"
                    />
                    {imeiEncontrado === false && formData.imei.length === 15 && (
                      <div className="flex items-center gap-1 mt-1 text-amber-600 text-sm">
                        <AlertCircle className="h-4 w-4" />
                        IMEI não encontrado no estoque
                      </div>
                    )}
                    {imeiEncontrado === true && (
                      <div className="text-green-600 text-sm mt-1">
                        ✓ IMEI encontrado no estoque
                      </div>
                    )}
                  </div>

                  {/* 2. Modelo - preenchido automaticamente, apenas leitura quando IMEI válido */}
                  <div>
                    <Label htmlFor="produto">Modelo *</Label>
                    <Input 
                      id="produto"
                      value={formData.produto}
                      onChange={(e) => setFormData(prev => ({ ...prev, produto: e.target.value }))}
                      disabled={modeloBloqueado}
                      placeholder={modeloBloqueado ? '' : 'Digite o modelo ou insira o IMEI acima'}
                      required 
                    />
                    {modeloBloqueado && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Modelo preenchido automaticamente pelo IMEI
                      </p>
                    )}
                  </div>

                  {/* 3. Responsável */}
                  <div>
                    <Label htmlFor="responsavel">Responsável *</Label>
                    <Select 
                      value={formData.responsavel}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, responsavel: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o colaborador" />
                      </SelectTrigger>
                      <SelectContent>
                        {colaboradores.map(col => (
                          <SelectItem key={col.id} value={col.id}>{col.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 4. Data da Movimentação */}
                  <div>
                    <Label htmlFor="data">Data da Movimentação *</Label>
                    <Input 
                      id="data" 
                      type="date" 
                      value={formData.data}
                      onChange={(e) => setFormData(prev => ({ ...prev, data: e.target.value }))}
                      required 
                    />
                  </div>

                  {/* Origem e Destino */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="origem">Origem *</Label>
                      <Select 
                        value={formData.origem}
                        onValueChange={(v) => setFormData(prev => ({ ...prev, origem: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {lojas.map(loja => (
                            <SelectItem key={loja.id} value={loja.id}>{loja.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="destino">Destino *</Label>
                      <Select 
                        value={formData.destino}
                        onValueChange={(v) => setFormData(prev => ({ ...prev, destino: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {lojas.map(loja => (
                            <SelectItem key={loja.id} value={loja.id}>{loja.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* 5. Observações (opcional) */}
                  <div>
                    <Label htmlFor="motivo">Observações</Label>
                    <Textarea 
                      id="motivo"
                      value={formData.motivo}
                      onChange={(e) => setFormData(prev => ({ ...prev, motivo: e.target.value }))}
                      placeholder="Observações adicionais (opcional)"
                      rows={3}
                    />
                  </div>

                  {/* 6. Botões de ação */}
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit">Salvar</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            <Button onClick={handleExport} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>IMEI</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Observações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movimentacoesFiltradas.map(mov => (
                <TableRow key={mov.id}>
                  <TableCell className="font-mono text-xs">{mov.id}</TableCell>
                  <TableCell className="font-mono text-xs">{formatIMEI(mov.imei)}</TableCell>
                  <TableCell>{mov.produto}</TableCell>
                  <TableCell>{mov.responsavel}</TableCell>
                  <TableCell>{new Date(mov.data).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>{getLojaNome(mov.origem)}</TableCell>
                  <TableCell>{getLojaNome(mov.destino)}</TableCell>
                  <TableCell className="max-w-[200px] truncate" title={mov.motivo}>{mov.motivo}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </EstoqueLayout>
  );
}
