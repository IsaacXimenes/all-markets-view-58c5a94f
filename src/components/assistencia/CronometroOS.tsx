import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Play, Pause, Square, Timer, Edit, Clock } from 'lucide-react';
import { CronometroOS as CronometroOSType } from '@/utils/assistenciaApi';

interface CronometroOSProps {
  osId: string;
  cronometro?: CronometroOSType;
  onUpdate: (cronometro: CronometroOSType) => void;
  readOnly?: boolean;
  podeEditar?: boolean;
  responsavel?: string;
}

export function calcularTempoLiquido(cron: CronometroOSType): number {
  if (cron.tempoManualMs !== undefined) return cron.tempoManualMs;
  if (!cron.iniciadoEm) return 0;

  const inicio = new Date(cron.iniciadoEm).getTime();
  const fim = cron.finalizadoEm ? new Date(cron.finalizadoEm).getTime() : (cron.status === 'em_andamento' || cron.status === 'pausado' ? Date.now() : inicio);
  
  let totalPausas = 0;
  for (const pausa of cron.pausas) {
    const pInicio = new Date(pausa.inicio).getTime();
    const pFim = pausa.fim ? new Date(pausa.fim).getTime() : (cron.status === 'pausado' ? Date.now() : pInicio);
    totalPausas += pFim - pInicio;
  }

  return Math.max(0, fim - inicio - totalPausas);
}

export function formatarTempo(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function CronometroOSComponent({ osId, cronometro, onUpdate, readOnly = false, podeEditar = false, responsavel = 'Sistema' }: CronometroOSProps) {
  const [tempoAtual, setTempoAtual] = useState(0);
  const [editarOpen, setEditarOpen] = useState(false);
  const [tempoManualHoras, setTempoManualHoras] = useState('0');
  const [tempoManualMinutos, setTempoManualMinutos] = useState('0');

  const cron: CronometroOSType = cronometro || {
    status: 'parado',
    pausas: [],
    tempoLiquidoMs: 0
  };

  // Atualizar display a cada segundo quando em andamento
  useEffect(() => {
    if (cron.status === 'em_andamento') {
      const interval = setInterval(() => {
        setTempoAtual(calcularTempoLiquido(cron));
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setTempoAtual(calcularTempoLiquido(cron));
    }
  }, [cron.status, cron.iniciadoEm, cron.pausas, cron.finalizadoEm, cron.tempoManualMs]);

  const handleIniciar = useCallback(() => {
    onUpdate({
      ...cron,
      status: 'em_andamento',
      iniciadoEm: new Date().toISOString(),
      pausas: [],
      tempoLiquidoMs: 0,
      finalizadoEm: undefined
    });
  }, [cron, onUpdate]);

  const handlePausar = useCallback(() => {
    onUpdate({
      ...cron,
      status: 'pausado',
      pausas: [...cron.pausas, { inicio: new Date().toISOString() }]
    });
  }, [cron, onUpdate]);

  const handleRetomar = useCallback(() => {
    const pausas = [...cron.pausas];
    if (pausas.length > 0 && !pausas[pausas.length - 1].fim) {
      pausas[pausas.length - 1] = { ...pausas[pausas.length - 1], fim: new Date().toISOString() };
    }
    onUpdate({
      ...cron,
      status: 'em_andamento',
      pausas
    });
  }, [cron, onUpdate]);

  const handleFinalizar = useCallback(() => {
    const agora = new Date().toISOString();
    const pausas = [...cron.pausas];
    if (pausas.length > 0 && !pausas[pausas.length - 1].fim) {
      pausas[pausas.length - 1] = { ...pausas[pausas.length - 1], fim: agora };
    }
    const cronFinalizado: CronometroOSType = {
      ...cron,
      status: 'finalizado',
      pausas,
      finalizadoEm: agora,
      tempoLiquidoMs: 0
    };
    cronFinalizado.tempoLiquidoMs = calcularTempoLiquido(cronFinalizado);
    onUpdate(cronFinalizado);
  }, [cron, onUpdate]);

  const handleEditarManual = () => {
    const horas = parseInt(tempoManualHoras) || 0;
    const minutos = parseInt(tempoManualMinutos) || 0;
    const totalMs = (horas * 3600 + minutos * 60) * 1000;
    onUpdate({
      ...cron,
      tempoManualMs: totalMs,
      editadoPor: responsavel
    });
    setEditarOpen(false);
  };

  const getStatusBadge = () => {
    switch (cron.status) {
      case 'parado': return <Badge variant="outline" className="text-muted-foreground"><Clock className="h-3 w-3 mr-1" />Parado</Badge>;
      case 'em_andamento': return <Badge className="bg-emerald-500 hover:bg-emerald-600 animate-pulse"><Play className="h-3 w-3 mr-1" />Em andamento</Badge>;
      case 'pausado': return <Badge className="bg-yellow-500 hover:bg-yellow-600"><Pause className="h-3 w-3 mr-1" />Pausado</Badge>;
      case 'finalizado': return <Badge className="bg-blue-500 hover:bg-blue-600"><Square className="h-3 w-3 mr-1" />Finalizado</Badge>;
    }
  };

  const tempoExibido = cron.tempoManualMs !== undefined ? cron.tempoManualMs : tempoAtual;

  return (
    <Card className="border-primary/20">
      <CardContent className="py-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Timer className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground font-medium">Cronômetro de Bancada</p>
              <p className="text-3xl font-mono font-bold tracking-wider">{formatarTempo(tempoExibido)}</p>
            </div>
            {getStatusBadge()}
            {cron.editadoPor && (
              <span className="text-[10px] text-muted-foreground italic">Editado por {cron.editadoPor}</span>
            )}
          </div>
          
          {!readOnly && (
            <div className="flex items-center gap-2 flex-wrap">
              {cron.status === 'parado' && (
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={handleIniciar}>
                  <Play className="h-4 w-4 mr-1" />
                  Iniciar Serviço
                </Button>
              )}
              {cron.status === 'em_andamento' && (
                <>
                  <Button size="sm" className="bg-yellow-500 hover:bg-yellow-600 text-black" onClick={handlePausar}>
                    <Pause className="h-4 w-4 mr-1" />
                    Pausar
                  </Button>
                  <Button size="sm" variant="destructive" onClick={handleFinalizar}>
                    <Square className="h-4 w-4 mr-1" />
                    Finalizar
                  </Button>
                </>
              )}
              {cron.status === 'pausado' && (
                <>
                  <Button size="sm" className="bg-blue-500 hover:bg-blue-600" onClick={handleRetomar}>
                    <Play className="h-4 w-4 mr-1" />
                    Retomar
                  </Button>
                  <Button size="sm" variant="destructive" onClick={handleFinalizar}>
                    <Square className="h-4 w-4 mr-1" />
                    Finalizar
                  </Button>
                </>
              )}
              {podeEditar && (
                <Button size="sm" variant="outline" onClick={() => {
                  const totalSec = Math.floor(tempoExibido / 1000);
                  setTempoManualHoras(String(Math.floor(totalSec / 3600)));
                  setTempoManualMinutos(String(Math.floor((totalSec % 3600) / 60)));
                  setEditarOpen(true);
                }}>
                  <Edit className="h-4 w-4 mr-1" />
                  Editar Tempo
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>

      <Dialog open={editarOpen} onOpenChange={setEditarOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar Tempo Manualmente</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Horas</Label>
              <Input type="number" min="0" value={tempoManualHoras} onChange={e => setTempoManualHoras(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Minutos</Label>
              <Input type="number" min="0" max="59" value={tempoManualMinutos} onChange={e => setTempoManualMinutos(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditarOpen(false)}>Cancelar</Button>
            <Button onClick={handleEditarManual}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
