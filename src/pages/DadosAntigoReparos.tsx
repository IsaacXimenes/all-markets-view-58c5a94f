import { DadosSistemaAntigoLayout } from '@/components/layout/DadosSistemaAntigoLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Hammer } from 'lucide-react';

export default function DadosAntigoReparos() {
  return (
    <DadosSistemaAntigoLayout title="Dados - Sistema Antigo">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hammer className="h-5 w-5" />
            Reparos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Nenhum dado importado ainda. Envie o arquivo para popular esta aba.</p>
        </CardContent>
      </Card>
    </DadosSistemaAntigoLayout>
  );
}
