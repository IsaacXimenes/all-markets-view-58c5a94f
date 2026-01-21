import { useState, useMemo } from 'react';
import { EstoqueLayout } from '@/components/layout/EstoqueLayout';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { getAcessorios, Acessorio } from '@/utils/acessoriosApi';
import { useCadastroStore } from '@/store/cadastroStore';
import { Download, Plus, CheckCircle, Clock } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface MovimentacaoAcessorio {
  id: string;
  data: string;
  acessorio: string;
  acessorioId: string;
  quantidade: number;
  origem: string;
  destino: string;
  responsavel: string;
  motivo: string;
  status: 'Pendente' | 'Recebido';
}

// Mock data
const mockMovimentacoes: MovimentacaoAcessorio[] = [
  {
    id: 'MOV-ACESS-001',
    data: '2024-01-15',
    acessorio: 'Capa iPhone 14 Pro Silicone',
    acessorioId: 'ACESS-001',
    quantidade: 5,
    origem: 'Loja Centro',
    destino: 'Loja Shopping',
    responsavel: 'Maria Souza',
    motivo: 'Reposição de estoque',
    status: 'Recebido'
  },
  {
    id: 'MOV-ACESS-002',
    data: '2024-01-16',
    acessorio: 'Película Vidro Samsung S23',
    acessorioId: 'ACESS-002',
    quantidade: 10,
    origem: 'Matriz',
    destino: 'Loja Centro',
    responsavel: 'João Silva',
    motivo: 'Transferência',
    status: 'Pendente'
  },
  {
    id: 'MOV-ACESS-003',
    data: '2024-01-18',
    acessorio: 'Carregador USB-C 20W',
    acessorioId: 'ACESS-003',
    quantidade: 3,
    origem: 'Loja Shopping',
    destino: 'Loja Centro',
    responsavel: 'Ana Costa',
    motivo: 'Devolução',
    status: 'Recebido'
  }
];

let movimentacoesData = [...mockMovimentacoes];

export default function EstoqueMovimentacoesAcessorios() {
  const { obterLojasTipoLoja, obterColaboradoresAtivos, obterLojaById, obterNomeLoja } = useCadastroStore();
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoAcessorio[]>(movimentacoesData);
  const [origemFilter, setOrigemFilter] = useState<string>('todas');
  const [destinoFilter, setDestinoFilter] = useState<string>('todas');
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  // Apenas lojas do tipo 'Loja' para movimentações
  const lojas = obterLojasTipoLoja();
  const acessorios = getAcessorios();
  
  // Colaboradores com permissão de estoque ou gestor
  const colaboradoresComPermissao = obterColaboradoresAtivos().filter(
    col => col.eh_estoquista || col.eh_gestor
  );

  const getLojaNome = (lojaIdOuNome: string) => {
    const loja = obterLojaById(lojaIdOuNome);
    if (loja) return loja.nome;
    return obterNomeLoja(lojaIdOuNome);
  };

  const movimentacoesFiltradas = useMemo(() => {
    return movimentacoes.filter(m => {
      if (origemFilter !== 'todas' && m.origem !== origemFilter) return false;
      if (destinoFilter !== 'todas' && m.destino !== destinoFilter) return false;
      return true;
    });
  }, [movimentacoes, origemFilter, destinoFilter]);

  const handleExport = () => {
    const headers = ['ID', 'Data', 'Acessório', 'Quantidade', 'Origem', 'Destino', 'Responsável', 'Motivo'];
    const rows = movimentacoesFiltradas.map(m => [
      m.id,
      new Date(m.data).toLocaleDateString('pt-BR'),
      m.acessorio,
      m.quantidade.toString(),
      m.origem,
      m.destino,
      m.responsavel,
      m.motivo
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'movimentacoes-acessorios.csv';
    link.click();
  };

  const handleRegistrarMovimentacao = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const acessorioId = formData.get('acessorioId') as string;
    const acessorio = acessorios.find(a => a.id === acessorioId);
    
    const responsavelId = formData.get('responsavel') as string;
    const responsavelNome = colaboradoresComPermissao.find(c => c.id === responsavelId)?.nome || responsavelId;
    
    const novaMovimentacao: MovimentacaoAcessorio = {
      id: `MOV-ACESS-${Date.now()}`,
      data: formData.get('data') as string,
      acessorio: acessorio?.descricao || '',
      acessorioId,
      quantidade: parseInt(formData.get('quantidade') as string),
      origem: formData.get('origem') as string,
      destino: formData.get('destino') as string,
      responsavel: responsavelNome,
      motivo: formData.get('motivo') as string,
      status: 'Pendente'
    };

    movimentacoesData = [...movimentacoesData, novaMovimentacao];
    setMovimentacoes(movimentacoesData);
    setDialogOpen(false);
    toast({
      title: 'Movimentação registrada',
      description: `Movimentação ${novaMovimentacao.id} registrada com sucesso`,
    });
  };

  return (
    <EstoqueLayout title="Movimentações - Acessórios">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-4">
          <Select value={origemFilter} onValueChange={setOrigemFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as origens</SelectItem>
              {lojas.map(loja => (
                <SelectItem key={loja.id} value={loja.nome}>{loja.nome}</SelectItem>
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
                <SelectItem key={loja.id} value={loja.nome}>{loja.nome}</SelectItem>
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
                  <DialogTitle>Registrar Movimentação de Acessório</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleRegistrarMovimentacao} className="space-y-4">
                  <div>
                    <Label htmlFor="data">Data</Label>
                    <Input id="data" name="data" type="date" required />
                  </div>

                  <div>
                    <Label htmlFor="acessorioId">Acessório</Label>
                    <Select name="acessorioId" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {acessorios.filter(a => a.quantidade > 0).map(acessorio => (
                          <SelectItem key={acessorio.id} value={acessorio.id}>
                            {acessorio.descricao} (Qtd: {acessorio.quantidade})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="quantidade">Quantidade</Label>
                    <Input id="quantidade" name="quantidade" type="number" defaultValue="1" required />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="origem">Origem</Label>
                      <Select name="origem" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {lojas.map(loja => (
                            <SelectItem key={loja.id} value={loja.nome}>{loja.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="destino">Destino</Label>
                      <Select name="destino" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {lojas.map(loja => (
                            <SelectItem key={loja.id} value={loja.nome}>{loja.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="responsavel">Responsável *</Label>
                    <Select name="responsavel" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o colaborador" />
                      </SelectTrigger>
                      <SelectContent>
                        {colaboradoresComPermissao.map(col => (
                          <SelectItem key={col.id} value={col.id}>{col.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="motivo">Motivo</Label>
                    <Input id="motivo" name="motivo" required />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit">Registrar</Button>
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
                <TableHead>Data</TableHead>
                <TableHead>Acessório</TableHead>
                <TableHead>Qtd</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Motivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movimentacoesFiltradas.map(mov => (
                <TableRow 
                  key={mov.id}
                  className={cn(
                    mov.status === 'Pendente' && 'bg-yellow-500/10',
                    mov.status === 'Recebido' && 'bg-green-500/10'
                  )}
                >
                  <TableCell className="font-mono text-xs">{mov.id}</TableCell>
                  <TableCell>{new Date(mov.data).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>{mov.acessorio}</TableCell>
                  <TableCell>{mov.quantidade}</TableCell>
                  <TableCell>{getLojaNome(mov.origem)}</TableCell>
                  <TableCell>{getLojaNome(mov.destino)}</TableCell>
                  <TableCell>{mov.responsavel}</TableCell>
                  <TableCell>
                    {mov.status === 'Recebido' ? (
                      <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Recebido
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                        <Clock className="h-3 w-3 mr-1" />
                        Pendente
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{mov.motivo}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </EstoqueLayout>
  );
}
