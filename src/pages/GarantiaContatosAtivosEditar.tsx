import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { GarantiasLayout } from '@/components/layout/GarantiasLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Save, ArrowLeft, Truck, Phone, User, Shield, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

import { getMotoboys, getProdutosCadastro } from '@/utils/cadastrosApi';
import { 
  getContatosAtivos, 
  updateContatoAtivo, 
  ContatoAtivoGarantia 
} from '@/utils/garantiasApi';
import { getPlanosAtivos, PlanoGarantia, formatCurrency } from '@/utils/planosGarantiaApi';
import { formatIMEI } from '@/utils/imeiMask';

export default function GarantiaContatosAtivosEditar() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const motoboys = getMotoboys();
  const todosPlanos = getPlanosAtivos();
  const produtosCadastro = getProdutosCadastro();
  
  const [contato, setContato] = useState<ContatoAtivoGarantia | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [form, setForm] = useState({
    clienteNome: '',
    clienteTelefone: '',
    clienteEmail: '',
    aparelhoModelo: '',
    aparelhoImei: '',
    aparelhoCondicao: '' as '' | 'Novo' | 'Seminovo',
    motoboyId: '',
    dataEntregaPrevista: '',
    enderecoEntrega: '',
    observacoes: '',
    garantiaExtendidaAderida: false,
    planoGarantiaId: '',
    status: 'Pendente' as 'Pendente' | 'Garantia Criada' | 'Entregue'
  });

  // Load contato data
  useEffect(() => {
    if (id) {
      const contatos = getContatosAtivos();
      const found = contatos.find(c => c.id === id);
      if (found) {
        setContato(found);
        setForm({
          clienteNome: found.cliente.nome,
          clienteTelefone: found.cliente.telefone,
          clienteEmail: found.cliente.email || '',
          aparelhoModelo: found.aparelho.modelo,
          aparelhoImei: found.aparelho.imei,
          aparelhoCondicao: found.aparelho.condicao || '',
          motoboyId: found.logistica.motoboyId,
          dataEntregaPrevista: found.logistica.dataEntregaPrevista.split('T')[0],
          enderecoEntrega: found.logistica.enderecoEntrega,
          observacoes: found.logistica.observacoes || '',
          garantiaExtendidaAderida: found.garantiaEstendida?.aderida || false,
          planoGarantiaId: found.garantiaEstendida?.planoId || '',
          status: found.status
        });
      } else {
        toast.error('Contato não encontrado');
        navigate('/garantias/contatos-ativos');
      }
    }
    setLoading(false);
  }, [id, navigate]);

  // Planos filtrados por modelo e condição
  const planosFiltrados = useMemo(() => {
    if (!form.aparelhoModelo || !form.aparelhoCondicao) {
      return [];
    }
    
    return todosPlanos.filter(plano => {
      if (plano.nome === 'Sem Garantia Adicional') return true;
      
      if (plano.condicao !== 'Ambos' && plano.condicao !== form.aparelhoCondicao) {
        return false;
      }
      
      const modeloNormalizado = form.aparelhoModelo.toLowerCase();
      const modeloEncontrado = plano.modelos.some(m => 
        modeloNormalizado.includes(m.toLowerCase()) || m.toLowerCase().includes(modeloNormalizado)
      );
      
      return modeloEncontrado;
    });
  }, [form.aparelhoModelo, form.aparelhoCondicao, todosPlanos]);

  // Plano selecionado
  const planoSelecionado = useMemo(() => {
    if (!form.planoGarantiaId) return null;
    return todosPlanos.find(p => p.id === form.planoGarantiaId) || null;
  }, [form.planoGarantiaId, todosPlanos]);

  const getMotoboyNome = (id: string) => motoboys.find(m => m.id === id)?.nome || id;

  const handleSalvar = () => {
    if (!form.aparelhoModelo || !form.aparelhoImei || !form.aparelhoCondicao || !form.motoboyId || !form.dataEntregaPrevista) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (form.garantiaExtendidaAderida && !form.planoGarantiaId) {
      toast.error('Selecione um plano de garantia');
      return;
    }

    if (!contato) return;

    const updates: Partial<ContatoAtivoGarantia> = {
      cliente: {
        id: contato.cliente.id,
        nome: form.clienteNome,
        telefone: form.clienteTelefone,
        email: form.clienteEmail
      },
      aparelho: {
        modelo: form.aparelhoModelo,
        imei: form.aparelhoImei,
        condicao: form.aparelhoCondicao
      },
      logistica: {
        motoboyId: form.motoboyId,
        motoboyNome: getMotoboyNome(form.motoboyId),
        dataEntregaPrevista: form.dataEntregaPrevista,
        enderecoEntrega: form.enderecoEntrega,
        observacoes: form.observacoes
      },
      garantiaEstendida: form.garantiaExtendidaAderida && planoSelecionado ? {
        aderida: true,
        planoId: planoSelecionado.id,
        planoNome: planoSelecionado.nome,
        planoMeses: planoSelecionado.meses,
        valor: planoSelecionado.valor
      } : undefined,
      status: form.status
    };

    updateContatoAtivo(contato.id, updates);
    toast.success('Contato atualizado com sucesso!');
    navigate('/garantias/contatos-ativos');
  };

  if (loading) {
    return (
      <GarantiasLayout title="Carregando...">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando dados...</p>
        </div>
      </GarantiasLayout>
    );
  }

  if (!contato) {
    return null;
  }

  return (
    <GarantiasLayout title="Editar Contato Ativo">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/garantias/contatos-ativos')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <Badge variant="outline" className="text-sm">
          ID: {contato.id}
        </Badge>
      </div>

      <div className="space-y-6">
        {/* Cliente Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Nome</Label>
                <Input 
                  value={form.clienteNome} 
                  onChange={e => setForm({...form, clienteNome: e.target.value})}
                />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input 
                  value={form.clienteTelefone} 
                  onChange={e => setForm({...form, clienteTelefone: e.target.value})}
                />
              </div>
              <div>
                <Label>E-mail</Label>
                <Input 
                  value={form.clienteEmail} 
                  onChange={e => setForm({...form, clienteEmail: e.target.value})}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Aparelho Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Aparelho
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Modelo *</Label>
                <Select value={form.aparelhoModelo} onValueChange={v => setForm({...form, aparelhoModelo: v})}>
                  <SelectTrigger><SelectValue placeholder="Selecione o modelo..." /></SelectTrigger>
                  <SelectContent>
                    {produtosCadastro.map(p => (
                      <SelectItem key={p.id} value={p.produto}>{p.marca} - {p.produto}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Condição *</Label>
                <Select value={form.aparelhoCondicao} onValueChange={v => setForm({...form, aparelhoCondicao: v as 'Novo' | 'Seminovo'})}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Novo">Novo</SelectItem>
                    <SelectItem value="Seminovo">Seminovo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>IMEI *</Label>
                <Input 
                  value={form.aparelhoImei} 
                  onChange={e => setForm({...form, aparelhoImei: formatIMEI(e.target.value)})}
                  placeholder="00-000000-000000-0"
                  maxLength={18}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logística Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Logística
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Motoboy *</Label>
                <Select value={form.motoboyId} onValueChange={v => setForm({...form, motoboyId: v})}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {motoboys.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data de Entrega Prevista *</Label>
                <Input 
                  type="date" 
                  value={form.dataEntregaPrevista} 
                  onChange={e => setForm({...form, dataEntregaPrevista: e.target.value})} 
                />
              </div>
              <div className="md:col-span-2">
                <Label>Endereço de Entrega</Label>
                <Input 
                  value={form.enderecoEntrega} 
                  onChange={e => setForm({...form, enderecoEntrega: e.target.value})} 
                />
              </div>
              <div className="md:col-span-2">
                <Label>Observações</Label>
                <Textarea 
                  value={form.observacoes} 
                  onChange={e => setForm({...form, observacoes: e.target.value})}
                  rows={3}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={form.status} onValueChange={v => setForm({...form, status: v as 'Pendente' | 'Garantia Criada' | 'Entregue'})}>
              <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Pendente">Pendente</SelectItem>
                <SelectItem value="Garantia Criada">Garantia Criada</SelectItem>
                <SelectItem value="Entregue">Entregue</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Garantia Estendida Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Garantia Estendida
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Deseja aderir à Garantia Estendida?</Label>
              <Select 
                value={form.garantiaExtendidaAderida ? 'sim' : 'nao'} 
                onValueChange={v => setForm({...form, garantiaExtendidaAderida: v === 'sim', planoGarantiaId: ''})}
              >
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nao">Não</SelectItem>
                  <SelectItem value="sim">Sim</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.garantiaExtendidaAderida && (
              <>
                {!form.aparelhoModelo || !form.aparelhoCondicao ? (
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg text-yellow-800 dark:text-yellow-200">
                    <p className="font-medium">Preencha o modelo e a condição do aparelho</p>
                    <p className="text-sm">Os planos disponíveis serão exibidos de acordo com o aparelho informado.</p>
                  </div>
                ) : planosFiltrados.length === 0 ? (
                  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
                    <p className="font-medium">Nenhum plano disponível</p>
                    <p className="text-sm">Não há planos de garantia cadastrados para o modelo "{form.aparelhoModelo}" na condição "{form.aparelhoCondicao}".</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Planos disponíveis para <strong>{form.aparelhoModelo}</strong> ({form.aparelhoCondicao}):
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {planosFiltrados
                        .filter(p => p.nome !== 'Sem Garantia Adicional')
                        .map(plano => (
                        <div
                          key={plano.id}
                          onClick={() => setForm({...form, planoGarantiaId: plano.id})}
                          className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                            form.planoGarantiaId === plano.id 
                              ? 'border-primary bg-primary/5' 
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          {form.planoGarantiaId === plano.id && (
                            <div className="absolute -top-2 -right-2">
                              <CheckCircle className="h-6 w-6 text-primary fill-background" />
                            </div>
                          )}
                          
                          <div className="space-y-2">
                            <div className="font-semibold">{plano.nome}</div>
                            <div className="text-sm text-muted-foreground">
                              {plano.meses} meses de cobertura
                            </div>
                            <div className="text-lg font-bold text-primary">
                              {formatCurrency(plano.valor)}
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {plano.tipo}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Timeline */}
        {contato.timeline && contato.timeline.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Histórico</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {contato.timeline.map(entry => (
                  <div key={entry.id} className="p-3 bg-muted rounded-lg">
                    <div className="flex justify-between items-start">
                      <span className="font-medium">{entry.descricao}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(entry.dataHora), 'dd/MM/yyyy HH:mm')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={() => navigate('/garantias/contatos-ativos')}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar}>
            <Save className="h-4 w-4 mr-2" />
            Salvar Alterações
          </Button>
        </div>
      </div>
    </GarantiasLayout>
  );
}
