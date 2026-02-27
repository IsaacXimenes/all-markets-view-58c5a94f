import { useState, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { GestaoAdministrativaLayout } from '@/components/layout/GestaoAdministrativaLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, CheckCircle2, XCircle, Image as ImageIcon, Award, Info, ThumbsUp, ThumbsDown, ShieldCheck } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useCadastroStore } from '@/store/cadastroStore';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import {
  getLoteById,
  salvarValidacao,
  VendaMonitoramento,
  StatusAnexo,
  SeloQualidade
} from '@/utils/storiesMonitoramentoApi';

export default function GestaoAdmStoriesValidacao() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const competencia = searchParams.get('comp') || '';
  const { colaboradores } = useCadastroStore();
  const { user } = useAuthStore();

  const loteOriginal = useMemo(() => getLoteById(competencia, decodeURIComponent(id || '')), [competencia, id]);

  const [vendas, setVendas] = useState<VendaMonitoramento[]>(() => {
    if (!loteOriginal) return [];
    return loteOriginal.vendas.map(v => ({
      ...v,
      vendedorNome: colaboradores.find(c => c.id === v.vendedorId)?.nome || v.vendedorId
    }));
  });

  const [selectedVendaId, setSelectedVendaId] = useState<string | null>(null);
  const selectedVenda = vendas.find(v => v.id === selectedVendaId);

  const isReadOnly = loteOriginal?.status === 'Validado';
  const cannotValidate = loteOriginal?.conferidoPor === user?.colaborador?.id;
  const [overrideGestor, setOverrideGestor] = useState(false);
  const colaboradorCompleto = colaboradores.find(c => c.id === user?.colaborador?.id);
  const isGestor = colaboradorCompleto?.eh_gestor ?? user?.colaborador?.cargo?.toLowerCase().includes('gestor') ?? false;
  const bloqueado = cannotValidate && !overrideGestor;

  const handleValidar = (vendaId: string) => {
    setVendas(prev => prev.map(v =>
      v.id === vendaId ? { ...v, statusAnexo: 'Validado' as StatusAnexo } : v
    ));
  };

  const handleRejeitar = (vendaId: string) => {
    setVendas(prev => prev.map(v =>
      v.id === vendaId ? { ...v, statusAnexo: 'Rejeitado' as StatusAnexo } : v
    ));
  };

  const handleSeloChange = (vendaId: string, selo: string) => {
    setVendas(prev => prev.map(v =>
      v.id === vendaId ? { ...v, seloQualidade: (selo === 'nenhum' ? null : selo) as SeloQualidade } : v
    ));
  };

  const handleObsChange = (vendaId: string, obs: string) => {
    setVendas(prev => prev.map(v =>
      v.id === vendaId ? { ...v, observacaoValidacao: obs } : v
    ));
  };

  const handleSalvarValidacao = () => {
    if (bloqueado) {
      toast.error('O validador não pode ser o mesmo que realizou a conferência operacional.');
      return;
    }

    salvarValidacao(
      competencia,
      loteOriginal!.id,
      vendas,
      user?.colaborador?.id || '',
      user?.colaborador?.nome || 'Usuário'
    );

    toast.success('Lote validado com sucesso!');
    navigate('/gestao-administrativa/stories');
  };

  if (!loteOriginal) {
    return (
      <GestaoAdministrativaLayout title="Validação Administrativa">
        <Alert><AlertDescription>Lote não encontrado.</AlertDescription></Alert>
      </GestaoAdministrativaLayout>
    );
  }

  const getStatusIcon = (status: StatusAnexo) => {
    switch (status) {
      case 'Validado': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'Rejeitado': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'Anexado': return <ImageIcon className="h-4 w-4 text-blue-500" />;
      case 'Sem Anexo': return <XCircle className="h-4 w-4 text-muted-foreground" />;
      default: return null;
    }
  };

  return (
    <GestaoAdministrativaLayout title="Validação Administrativa">
      <Button variant="ghost" className="mb-4" onClick={() => navigate('/gestao-administrativa/stories')}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Voltar aos Lotes
      </Button>

      <div className="mb-4 flex items-center gap-4 flex-wrap">
        <Badge className="text-sm">{loteOriginal.lojaNome}</Badge>
        <Badge variant="outline">{loteOriginal.data.split('-').reverse().join('/')}</Badge>
        <Badge variant="outline">{loteOriginal.totalVendas} vendas</Badge>
        {loteOriginal.conferidoPorNome && (
          <Badge variant="secondary">Conferido por: {loteOriginal.conferidoPorNome}</Badge>
        )}
      </div>

      {cannotValidate && !overrideGestor && (
        <Alert className="mb-4" variant="destructive">
          <AlertDescription className="flex flex-col gap-2">
            <span>Você não pode validar este lote pois realizou a conferência operacional.</span>
            {isGestor && (
              <div className="flex items-center gap-2 mt-1">
                <Checkbox 
                  id="overrideGestor" 
                  checked={overrideGestor}
                  onCheckedChange={(checked) => setOverrideGestor(!!checked)}
                />
                <label htmlFor="overrideGestor" className="text-sm cursor-pointer flex items-center gap-1">
                  <ShieldCheck className="h-4 w-4" />
                  Validar como gestor administrativo
                </label>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left - Sales list */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Vendas para Validação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 max-h-[60vh] overflow-y-auto">
            {vendas.map(v => (
              <div
                key={v.id}
                onClick={() => setSelectedVendaId(v.id)}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors border ${
                  selectedVendaId === v.id ? 'border-primary bg-accent' : 'border-transparent hover:bg-muted'
                }`}
              >
                {getStatusIcon(v.statusAnexo)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">#{v.vendaNumero} - {v.clienteNome}</p>
                  <p className="text-xs text-muted-foreground">{v.vendedorNome}</p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {v.statusAnexo}
                </Badge>
                {v.seloQualidade && <Award className="h-4 w-4 text-yellow-500" />}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Right - Validation */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-4 w-4" />
              {selectedVenda ? `Validação - Venda #${selectedVenda.vendaNumero}` : 'Selecione uma venda'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedVenda ? (
              <p className="text-muted-foreground text-center py-8">
                <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                Selecione uma venda para revisar os anexos e validar.
              </p>
            ) : (
              <div className="space-y-4">
                {/* Show attachments */}
                {(selectedVenda.anexos || []).length > 0 ? (
                  <div>
                    <Label className="mb-2 block">Prints do Story</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedVenda.anexos.map(anexo => (
                        <div key={anexo.id} className="rounded-lg overflow-hidden border">
                          <img src={anexo.dataUrl} alt={anexo.nome} className="w-full h-32 object-cover" />
                          <p className="text-xs p-1 truncate">{anexo.nome}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <Label className="mb-2 block">Sem anexos</Label>
                    {selectedVenda.motivoNaoPostagem && (
                      <p className="text-sm text-muted-foreground">Motivo: {selectedVenda.motivoNaoPostagem}</p>
                    )}
                  </div>
                )}

                {selectedVenda.observacaoConferencia && (
                  <div>
                    <Label className="mb-1 block text-xs text-muted-foreground">Obs. da Conferência</Label>
                    <p className="text-sm bg-muted p-2 rounded">{selectedVenda.observacaoConferencia}</p>
                  </div>
                )}

                {/* Validation actions */}
                {(selectedVenda.anexos || []).length > 0 && !isReadOnly && !bloqueado && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleValidar(selectedVendaId!)}
                        variant={selectedVenda.statusAnexo === 'Validado' ? 'default' : 'outline'}
                        className="flex-1"
                      >
                        <ThumbsUp className="h-4 w-4 mr-2" /> Confirmar
                      </Button>
                      <Button
                        onClick={() => handleRejeitar(selectedVendaId!)}
                        variant={selectedVenda.statusAnexo === 'Rejeitado' ? 'destructive' : 'outline'}
                        className="flex-1"
                      >
                        <ThumbsDown className="h-4 w-4 mr-2" /> Rejeitar
                      </Button>
                    </div>

                    {/* Quality seal */}
                    <div>
                      <Label className="mb-2 block">Selo de Qualidade</Label>
                      <Select
                        value={selectedVenda.seloQualidade || 'nenhum'}
                        onValueChange={(val) => handleSeloChange(selectedVendaId!, val)}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nenhum">Nenhum</SelectItem>
                          <SelectItem value="Story Exemplo">⭐ Story Exemplo</SelectItem>
                          <SelectItem value="Excelente Engajamento">🔥 Excelente Engajamento</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Validation observation */}
                <div>
                  <Label className="mb-2 block">Observação da Validação</Label>
                  <Textarea
                    value={selectedVenda.observacaoValidacao || ''}
                    onChange={e => handleObsChange(selectedVendaId!, e.target.value)}
                    placeholder="Observações do supervisor..."
                    disabled={isReadOnly || bloqueado}
                    rows={3}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Save button */}
      {!isReadOnly && !bloqueado && (
        <div className="mt-6 flex justify-end">
          <Button onClick={handleSalvarValidacao} size="lg">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Validar Lote
          </Button>
        </div>
      )}
    </GestaoAdministrativaLayout>
  );
}
