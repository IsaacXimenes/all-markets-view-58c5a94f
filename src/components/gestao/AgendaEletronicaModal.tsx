import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Plus, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import {
  getAnotacoesGestao,
  registrarAnotacaoGestao,
  AnotacaoGestao,
} from '@/utils/agendaGestaoApi';

interface AgendaEletronicaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chaveContexto: string;
  titulo: string;
  subtitulo?: string;
  onAnotacaoRegistrada?: () => void;
}

export function AgendaEletronicaModal({
  open,
  onOpenChange,
  chaveContexto,
  titulo,
  subtitulo,
  onAnotacaoRegistrada,
}: AgendaEletronicaModalProps) {
  const { user } = useAuthStore();
  const [novaAnotacaoOpen, setNovaAnotacaoOpen] = useState(false);
  const [texto, setTexto] = useState('');
  const [importante, setImportante] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const anotacoes = open ? getAnotacoesGestao(chaveContexto) : [];
  // Force re-read when refreshKey changes
  void refreshKey;

  const handleSalvar = () => {
    if (!texto.trim()) {
      toast.error('Digite a observação');
      return;
    }
    registrarAnotacaoGestao(
      chaveContexto,
      user?.colaborador?.nome || 'Não identificado',
      texto.trim(),
      importante
    );
    setTexto('');
    setImportante(false);
    setNovaAnotacaoOpen(false);
    setRefreshKey(k => k + 1);
    onAnotacaoRegistrada?.();
    toast.success('Anotação registrada com sucesso');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl !flex !flex-col max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" /> {titulo}
            </DialogTitle>
            {subtitulo && (
              <p className="text-sm text-muted-foreground">{subtitulo}</p>
            )}
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4">
            <Button size="sm" onClick={() => setNovaAnotacaoOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Registrar Nova Anotação
            </Button>
            {anotacoes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma anotação registrada</p>
            ) : (
              <div className="space-y-3">
                {anotacoes.map(ano => (
                  <div key={ano.id} className={`p-3 rounded-lg border ${ano.importante ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20' : 'bg-muted/50'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{new Date(ano.dataHora).toLocaleString('pt-BR')}</span>
                        <span>•</span>
                        <span>{ano.usuario}</span>
                      </div>
                      {ano.importante && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" /> Importante
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm">{ano.observacao}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Nova Anotação */}
      <Dialog open={novaAnotacaoOpen} onOpenChange={setNovaAnotacaoOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Anotação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data/Hora</Label>
                <Input value={new Date().toLocaleString('pt-BR')} readOnly className="bg-muted cursor-not-allowed" />
              </div>
              <div>
                <Label>Usuário</Label>
                <Input value={user?.colaborador?.nome || 'Não identificado'} readOnly className="bg-muted cursor-not-allowed" />
              </div>
            </div>
            <div>
              <Label>Observação *</Label>
              <Textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Digite a anotação..."
                rows={4}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={importante}
                onCheckedChange={(v) => setImportante(!!v)}
              />
              <Label className="cursor-pointer flex items-center gap-1">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Marcar como Importante
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovaAnotacaoOpen(false)}>Cancelar</Button>
            <Button onClick={handleSalvar}>Salvar Anotação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
