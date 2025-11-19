import { useEffect } from 'react';
import { toast } from 'sonner';
import { ShoppingCart, DollarSign, Cake } from 'lucide-react';

const notifications = [
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
    const timers = notifications.map(notification => {
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

    // Repetir as notificações a cada 2 minutos
    const interval = setInterval(() => {
      notifications.forEach((notification, index) => {
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
