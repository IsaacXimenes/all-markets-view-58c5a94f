import { useState, useMemo, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { GestaoAdministrativaLayout } from '@/components/layout/GestaoAdministrativaLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Upload, XCircle, CheckCircle2, Image as ImageIcon, Trash2, Info } from 'lucide-react';
import { useCadastroStore } from '@/store/cadastroStore';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import {
  getLoteById,
  salvarConferenciaOperacional,
  MOTIVOS_NAO_POSTAGEM,
  VendaMonitoramento,
  AnexoStory,
  StatusAnexo
} from '@/utils/storiesMonitoramentoApi';

export default function GestaoAdmStoriesConferencia() {
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
  // Temporary attachments in memory (not persisted until save)
  const [tempAnexos, setTempAnexos] = useState<Record<string, AnexoStory[]>>({});

  const selectedVenda = vendas.find(v => v.id === selectedVendaId);
  const isReadOnly = loteOriginal?.status !== 'Pendente Conf. Operacional';

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedVendaId || !e.target.files) return;
    const files = Array.from(e.target.files);

    const existingCount = (tempAnexos[selectedVendaId] || []).length;
    if (existingCount + files.length > 5) {
      toast.error('Máximo de 5 arquivos por venda');
      return;
    }

    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} excede 5MB`);
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} não é uma imagem`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const anexo: AnexoStory = {
          id: `ANX-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          vendaMonitoramentoId: selectedVendaId,
          nome: file.name,
          tipo: file.type,
          tamanho: file.size,
          dataUrl: reader.result as string,
          dataUpload: new Date().toISOString()
        };

        setTempAnexos(prev => ({
          ...prev,
          [selectedVendaId]: [...(prev[selectedVendaId] || []), anexo]
        }));

        // Update venda status
        setVendas(prev => prev.map(v =>
          v.id === selectedVendaId ? { ...v, statusAnexo: 'Anexo Pendente' as StatusAnexo } : v
        ));
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  }, [selectedVendaId, tempAnexos]);

  const handleRemoveAnexo = (vendaId: string, anexoId: string) => {
    setTempAnexos(prev => {
      const updated = { ...prev, [vendaId]: (prev[vendaId] || []).filter(a => a.id !== anexoId) };
      // If no more attachments, reset status
      if (updated[vendaId].length === 0) {
        setVendas(v => v.map(vv => vv.id === vendaId ? { ...vv, statusAnexo: 'Sem Anexo' as StatusAnexo } : vv));
      }
      return updated;
    });
  };

  const handleMotivoChange = (vendaId: string, motivo: string) => {
    setVendas(prev => prev.map(v =>
      v.id === vendaId ? { ...v, motivoNaoPostagem: motivo as any } : v
    ));
  };

  const handleObsChange = (vendaId: string, obs: string) => {
    setVendas(prev => prev.map(v =>
      v.id === vendaId ? { ...v, observacaoConferencia: obs } : v
    ));
  };

  const handleSalvar = () => {
    // Merge temp anexos into vendas
    const vendasFinais = vendas.map(v => {
      const anexos = tempAnexos[v.id] || [];
      const statusAnexo: StatusAnexo = anexos.length > 0 ? 'Anexado' : v.statusAnexo === 'Anexo Pendente' ? 'Anexado' : 'Sem Anexo';
      return { ...v, anexos, statusAnexo };
    });

    salvarConferenciaOperacional(
      competencia,
      loteOriginal!.id,
      vendasFinais,
      user?.colaborador?.id || '',
      user?.colaborador?.nome || 'Usuário'
    );

    toast.success('Conferência operacional salva com sucesso!');
    navigate('/gestao-administrativa/stories');
  };

  if (!loteOriginal) {
    return (
      <GestaoAdministrativaLayout title="Conferência Operacional">
        <Alert><AlertDescription>Lote não encontrado.</AlertDescription></Alert>
      </GestaoAdministrativaLayout>
    );
  }

  const getStatusIcon = (status: StatusAnexo) => {
    switch (status) {
      case 'Sem Anexo': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'Anexo Pendente': return <Upload className="h-4 w-4 text-yellow-500" />;
      case 'Anexado': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'Validado': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'Rejeitado': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return null;
    }
  };

  return (
    <GestaoAdministrativaLayout title="Conferência Operacional">
      <Button variant="ghost" className="mb-4" onClick={() => navigate('/gestao-administrativa/stories')}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Voltar aos Lotes
      </Button>

      <div className="mb-4 flex items-center gap-4">
        <Badge className="text-sm">{loteOriginal.lojaNome}</Badge>
        <Badge variant="outline">{loteOriginal.data.split('-').reverse().join('/')}</Badge>
        <Badge variant="outline">{loteOriginal.totalVendas} vendas</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left - Sales list */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Vendas do Lote</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 max-h-[60vh] overflow-y-auto">
            {vendas.map(v => {
              const anexosCount = (tempAnexos[v.id] || v.anexos || []).length;
              return (
                <div
                  key={v.id}
                  onClick={() => setSelectedVendaId(v.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors border ${
                    selectedVendaId === v.id ? 'border-primary bg-accent' : 'border-transparent hover:bg-muted'
                  }`}
                >
                  {getStatusIcon(anexosCount > 0 ? (v.statusAnexo === 'Sem Anexo' ? 'Anexo Pendente' : v.statusAnexo) : v.statusAnexo)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">#{v.vendaNumero} - {v.clienteNome}</p>
                    <p className="text-xs text-muted-foreground">{v.vendedorNome} • R$ {v.valorVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  {anexosCount > 0 && (
                    <Badge variant="outline" className="text-xs">{anexosCount} 📎</Badge>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Right - Upload area */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              {selectedVenda ? `Anexos - Venda #${selectedVenda.vendaNumero}` : 'Selecione uma venda'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedVenda ? (
              <p className="text-muted-foreground text-center py-8">
                <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                Clique em uma venda na lista para gerenciar os anexos de story.
              </p>
            ) : (
              <div className="space-y-4">
                {/* Upload */}
                {!isReadOnly && (
                  <div>
                    <Label className="mb-2 block">Upload de prints do story</Label>
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted transition-colors border-muted-foreground/30">
                      <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">Clique ou arraste imagens</span>
                      <span className="text-xs text-muted-foreground">JPG, PNG, WebP - max 5MB</span>
                      <input type="file" className="hidden" accept="image/*" multiple onChange={handleFileUpload} />
                    </label>
                  </div>
                )}

                {/* Attached images */}
                {(tempAnexos[selectedVendaId!] || selectedVenda.anexos || []).length > 0 && (
                  <div>
                    <Label className="mb-2 block">Imagens anexadas</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {(tempAnexos[selectedVendaId!] || selectedVenda.anexos || []).map(anexo => (
                        <div key={anexo.id} className="relative group rounded-lg overflow-hidden border">
                          <img src={anexo.dataUrl} alt={anexo.nome} className="w-full h-32 object-cover" />
                          {!isReadOnly && (
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleRemoveAnexo(selectedVendaId!, anexo.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                          <p className="text-xs p-1 truncate">{anexo.nome}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reason for no post */}
                {(tempAnexos[selectedVendaId!] || []).length === 0 && (selectedVenda.anexos || []).length === 0 && (
                  <div>
                    <Label className="mb-2 block">Motivo de não postagem</Label>
                    <Select
                      value={selectedVenda.motivoNaoPostagem || ''}
                      onValueChange={(val) => handleMotivoChange(selectedVendaId!, val)}
                      disabled={isReadOnly}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione o motivo" /></SelectTrigger>
                      <SelectContent>
                        {MOTIVOS_NAO_POSTAGEM.map(m => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Observation */}
                <div>
                  <Label className="mb-2 block">Observação</Label>
                  <Textarea
                    value={selectedVenda.observacaoConferencia || ''}
                    onChange={e => handleObsChange(selectedVendaId!, e.target.value)}
                    placeholder="Observações sobre esta venda..."
                    disabled={isReadOnly}
                    rows={3}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Save button */}
      {!isReadOnly && (
        <div className="mt-6 flex justify-end">
          <Button onClick={handleSalvar} size="lg">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Salvar Conferência Operacional
          </Button>
        </div>
      )}
    </GestaoAdministrativaLayout>
  );
}
