import { useEffect } from 'react';
import { toast } from 'sonner';
import { ShoppingCart, DollarSign, Cake, ShieldAlert, Shield } from 'lucide-react';
import { getGarantiasExpirandoEm7Dias, getGarantiasExpirandoEm30Dias } from '@/utils/garantiasApi';

const baseNotifications = [
  {
    id: 1,
    type: 'order',
    title: 'Nova solicitação de orçamento',
    description: 'Cliente João',
    icon: ShoppingCart,
    delay: 15000
  },
  {
    id: 2,
    type: 'sale',
    title: 'Venda concluída',
    description: 'R$ 4.290,00 – Vendedor Maria',
    icon: DollarSign,
    delay: 30000
  },
  {
    id: 3,
    type: 'birthday',
    title: 'Aniversário hoje!',
    description: 'Lucas (Técnico – Loja Centro)',
    icon: Cake,
    delay: 45000
  }
];

export function NotificationSystem() {
  useEffect(() => {
    // Notificações base
    const timers = baseNotifications.map(notification => {
      return setTimeout(() => {
        const Icon = notification.icon;
        toast(notification.title, {
          description: notification.description,
          icon: <Icon className="h-4 w-4" />,
          position: 'bottom-right',
          duration: 5000,
        });
      }, notification.delay);
    });

    // Notificações de garantia
    const garantiasUrgentes = getGarantiasExpirandoEm7Dias();
    const garantiasAtencao = getGarantiasExpirandoEm30Dias();
    
    if (garantiasUrgentes.length > 0) {
      const timerUrgente = setTimeout(() => {
        toast('⚠️ Garantias Urgentes!', {
          description: `${garantiasUrgentes.length} garantia${garantiasUrgentes.length > 1 ? 's' : ''} expira${garantiasUrgentes.length > 1 ? 'm' : ''} em 7 dias`,
          icon: <ShieldAlert className="h-4 w-4 text-red-500" />,
          position: 'bottom-right',
          duration: 8000,
        });
      }, 60000);
      timers.push(timerUrgente);
    }
    
    if (garantiasAtencao.length > 0) {
      const timerAtencao = setTimeout(() => {
        toast('Atenção: Garantias próximas', {
          description: `${garantiasAtencao.length} garantia${garantiasAtencao.length > 1 ? 's' : ''} expira${garantiasAtencao.length > 1 ? 'm' : ''} em 30 dias`,
          icon: <Shield className="h-4 w-4 text-yellow-500" />,
          position: 'bottom-right',
          duration: 6000,
        });
      }, 90000);
      timers.push(timerAtencao);
    }

    // Repetir as notificações a cada 2 minutos
    const interval = setInterval(() => {
      baseNotifications.forEach((notification, index) => {
        setTimeout(() => {
          const Icon = notification.icon;
          toast(notification.title, {
            description: notification.description,
            icon: <Icon className="h-4 w-4" />,
            position: 'bottom-right',
            duration: 5000,
          });
        }, index * 15000);
      });
    }, 120000);

    return () => {
      timers.forEach(timer => clearTimeout(timer));
      clearInterval(interval);
    };
  }, []);

  return null;
}
