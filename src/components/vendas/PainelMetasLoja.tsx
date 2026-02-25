import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp, Headphones, Shield, Wrench, AlertCircle } from 'lucide-react';
import { getMetaByLojaEMes } from '@/utils/metasApi';
import { getVendas } from '@/utils/vendasApi';
import { formatarMoeda } from '@/utils/formatUtils';
import { useCadastroStore } from '@/store/cadastroStore';

interface PainelMetasLojaProps {
  lojaId: string;
}

function getProgressColor(percent: number): string {
  if (percent >= 80) return 'bg-green-500';
  if (percent >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
}

function MetaBar({ label, icon: Icon, atual, meta, formatFn }: {
  label: string;
  icon: any;
  atual: number;
  meta: number;
  formatFn: (v: number) => string;
}) {
  const percent = meta > 0 ? Math.min(100, (atual / meta) * 100) : 0;
  const faltante = Math.max(0, meta - atual);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`text-xs ${percent >= 80 ? 'border-green-500 text-green-700' : percent >= 50 ? 'border-yellow-500 text-yellow-700' : 'border-red-500 text-red-700'}`}>
            {percent.toFixed(0)}%
          </Badge>
        </div>
      </div>
      <div className="relative">
        <Progress value={percent} className="h-2.5" />
        <div
          className={`absolute inset-0 h-2.5 rounded-full transition-all ${getProgressColor(percent)}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{formatFn(atual)} / {formatFn(meta)}</span>
        <span>Falta: {formatFn(faltante)}</span>
      </div>
    </div>
  );
}

export function PainelMetasLoja({ lojaId }: PainelMetasLojaProps) {
  const { obterNomeLoja } = useCadastroStore();
  const agora = new Date();
  const mesAtual = agora.getMonth() + 1;
  const anoAtual = agora.getFullYear();

  const meta = useMemo(() => getMetaByLojaEMes(lojaId, mesAtual, anoAtual), [lojaId, mesAtual, anoAtual]);

  const realizacao = useMemo(() => {
    if (!lojaId) return { faturamento: 0, acessorios: 0, garantia: 0, assistencia: 0 };

    const vendas = getVendas().filter(v => {
      if (v.lojaVenda !== lojaId) return false;
      const d = new Date(v.dataHora);
      return d.getMonth() + 1 === mesAtual && d.getFullYear() === anoAtual;
    });

    let faturamento = 0;
    let acessorios = 0;
    let garantia = 0;

    vendas.forEach(v => {
      faturamento += v.total;
      acessorios += (v.acessorios?.reduce((s, a) => s + a.quantidade, 0) ?? 0);
      garantia += (v.garantiaExtendida?.valor ?? 0);
    });

    return { faturamento, acessorios, garantia, assistencia: 0 };
  }, [lojaId, mesAtual, anoAtual]);

  if (!lojaId) return null;

  if (!meta) {
    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardContent className="py-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <AlertCircle className="h-4 w-4" />
            Meta não cadastrada para {obterNomeLoja(lojaId)} — {String(mesAtual).padStart(2, '0')}/{anoAtual}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          Metas — {obterNomeLoja(lojaId)} — {String(mesAtual).padStart(2, '0')}/{anoAtual}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <MetaBar
          label="Faturamento"
          icon={TrendingUp}
          atual={realizacao.faturamento}
          meta={meta.metaFaturamento}
          formatFn={formatarMoeda}
        />
        <MetaBar
          label="Acessórios"
          icon={Headphones}
          atual={realizacao.acessorios}
          meta={meta.metaAcessorios}
          formatFn={formatarMoeda}
        />
        <MetaBar
          label="Garantia"
          icon={Shield}
          atual={realizacao.garantia}
          meta={meta.metaGarantia}
          formatFn={formatarMoeda}
        />
        <MetaBar
          label="Assistência"
          icon={Wrench}
          atual={realizacao.assistencia}
          meta={meta.metaAssistencia}
          formatFn={formatarMoeda}
        />
      </CardContent>
    </Card>
  );
}
