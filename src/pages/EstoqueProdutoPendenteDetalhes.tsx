import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { EstoqueLayout } from '@/components/layout/EstoqueLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ArrowLeft, 
  Package, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  FileText,
  Smartphone,
  MapPin,
  Calendar,
  User,
  DollarSign
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  getProdutoPendenteById, 
  salvarParecerEstoque, 
  ProdutoPendente,
  TimelineEntry
} from '@/utils/osApi';
import { getColaboradores, getCargos } from '@/utils/cadastrosApi';

const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default function EstoqueProdutoPendenteDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [produto, setProduto] = useState<ProdutoPendente | null>(null);
  const [colaboradoresEstoque, setColaboradoresEstoque] = useState<{ id: string; nome: string }[]>([]);
  
  // Form state
  const [parecerStatus, setParecerStatus] = useState<string>('');
  const [parecerObservacoes, setParecerObservacoes] = useState('');
  const [parecerResponsavel, setParecerResponsavel] = useState('');

  useEffect(() => {
    if (id) {
      const data = getProdutoPendenteById(id);
      setProduto(data);
    }

    // Carregar colaboradores com permissão de Estoque
    const colaboradores = getColaboradores();
    const cargos = getCargos();
    
    // Mapear IDs de cargos que têm permissão de Estoque
    const cargosComEstoque = cargos.filter(c => 
      c.permissoes.includes('Estoque') || c.permissoes.includes('Admin')
    ).map(c => c.id);
    
    // Filtrar colaboradores cujo cargo (ID) está na lista de cargos com permissão
    const colabsEstoque = colaboradores.filter(c => 
      cargosComEstoque.includes(c.cargo)
    );
    setColaboradoresEstoque(colabsEstoque);
  }, [id]);

  const handleSalvarParecer = () => {
    if (!id || !parecerStatus || !parecerResponsavel) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos do parecer.",
        variant: "destructive"
      });
      return;
    }

    const statusParecer = parecerStatus as 'Análise Realizada – Produto em ótimo estado' | 'Encaminhado para conferência da Assistência';
    
    const resultado = salvarParecerEstoque(id, statusParecer, parecerObservacoes, parecerResponsavel);
    
    if (resultado.produto) {
      // Se foi aprovado direto e migrado para o estoque
      if (resultado.migrado && statusParecer === 'Análise Realizada – Produto em ótimo estado') {
        toast({
          title: "Produto deferido!",
          description: `Produto ID ${id} deferido pelo Estoque – liberado para estoque`,
          className: "bg-green-500 text-white border-green-600"
        });
        navigate('/estoque/produtos-pendentes');
      } else {
        toast({
          title: "Parecer salvo!",
          description: `Produto ${id} encaminhado para a Lista de Reparos (OS).`,
        });
        navigate('/os/produtos-analise');
      }
    }
  };

  const getTimelineIcon = (tipo: TimelineEntry['tipo']) => {
    switch (tipo) {
      case 'entrada':
        return <Package className="h-4 w-4 text-blue-500" />;
      case 'parecer_estoque':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'parecer_assistencia':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'despesa':
        return <DollarSign className="h-4 w-4 text-red-500" />;
      case 'liberacao':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (!produto) {
    return (
      <EstoqueLayout title="Produto não encontrado">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Produto pendente não encontrado.</p>
          <Button className="mt-4" onClick={() => navigate('/estoque/produtos-pendentes')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </EstoqueLayout>
    );
  }

  return (
    <EstoqueLayout title="Detalhes do Produto Pendente">
      <div className="space-y-6">
        {/* Header com botão voltar */}
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/estoque/produtos-pendentes')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h2 className="text-xl font-bold">{produto.modelo}</h2>
            <p className="text-sm text-muted-foreground">IMEI: {produto.imei}</p>
          </div>
          <Badge variant="outline" className={
            produto.origemEntrada === 'Trade-In' 
              ? 'bg-purple-500/10 text-purple-600 border-purple-500/30 ml-auto'
              : 'bg-blue-500/10 text-blue-600 border-blue-500/30 ml-auto'
          }>
            {produto.origemEntrada}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Informações do Produto */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Informações do Produto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">ID</Label>
                  <p className="font-mono">{produto.id}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">IMEI</Label>
                  <p className="font-mono">{produto.imei}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Marca</Label>
                  <p>{produto.marca}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Modelo</Label>
                  <p>{produto.modelo}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Cor</Label>
                  <p>{produto.cor}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Condição</Label>
                  <Badge variant={produto.condicao === 'Novo' ? 'default' : 'secondary'}>
                    {produto.condicao}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Saúde Bateria</Label>
                  <p className={produto.saudeBateria < 80 ? 'text-red-500 font-medium' : ''}>
                    {produto.saudeBateria}%
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Valor de Custo</Label>
                  <p className="font-medium">{formatCurrency(produto.valorCusto)}</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label className="text-muted-foreground">Loja</Label>
                    <p>{produto.loja}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label className="text-muted-foreground">Data Entrada</Label>
                    <p>{new Date(produto.dataEntrada).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
              </div>

              {produto.notaOuVendaId && (
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label className="text-muted-foreground">Referência</Label>
                    <p className="font-mono">{produto.notaOuVendaId}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quadro Parecer Estoque */}
          <Card className={produto.parecerEstoque ? 'border-green-500/30' : 'border-yellow-500/30'}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Parecer Estoque
              </CardTitle>
              <CardDescription>
                {produto.parecerEstoque 
                  ? `Preenchido em ${formatDateTime(produto.parecerEstoque.data)}`
                  : 'Preencha o parecer para liberar ou encaminhar o produto'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {produto.parecerEstoque ? (
                // Exibir parecer já preenchido
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <Badge variant="outline" className={
                      produto.parecerEstoque.status.includes('ótimo estado')
                        ? 'bg-green-500/10 text-green-600 border-green-500/30'
                        : 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                    }>
                      {produto.parecerEstoque.status}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Observações</Label>
                    <p className="text-sm">{produto.parecerEstoque.observacoes}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{produto.parecerEstoque.responsavel}</span>
                  </div>
                </div>
              ) : (
                // Formulário para preencher parecer
                <>
                  <div className="space-y-2">
                    <Label>Status do Parecer *</Label>
                    <Select value={parecerStatus} onValueChange={setParecerStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Análise Realizada – Produto em ótimo estado">
                          Análise Realizada – Produto em ótimo estado
                        </SelectItem>
                        <SelectItem value="Encaminhado para conferência da Assistência">
                          Encaminhado para conferência da Assistência
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Observações</Label>
                    <Textarea
                      placeholder="Descreva as observações sobre o produto..."
                      value={parecerObservacoes}
                      onChange={(e) => setParecerObservacoes(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Responsável *</Label>
                    <Select value={parecerResponsavel} onValueChange={setParecerResponsavel}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o responsável" />
                      </SelectTrigger>
                      <SelectContent>
                        {colaboradoresEstoque.map((colab) => (
                          <SelectItem key={colab.id} value={colab.nome}>
                            {colab.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Data/Hora: {new Date().toLocaleString('pt-BR')} (automático)
                  </div>

                  <Button onClick={handleSalvarParecer} className="w-full">
                    Salvar Parecer Estoque
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Timeline Completa */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Timeline do Produto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {produto.timeline.map((entry, index) => (
                <div key={entry.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border bg-background">
                      {getTimelineIcon(entry.tipo)}
                    </div>
                    {index < produto.timeline.length - 1 && (
                      <div className="w-px flex-1 bg-border" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{entry.titulo}</p>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(entry.data)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{entry.descricao}</p>
                    {entry.responsavel && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {entry.responsavel}
                      </p>
                    )}
                    {entry.valor && (
                      <p className="text-sm font-medium text-red-500 mt-1">
                        {formatCurrency(entry.valor)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </EstoqueLayout>
  );
}
