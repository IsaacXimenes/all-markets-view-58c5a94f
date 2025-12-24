// Sistema de notificações centralizado

export interface Notification {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  targetUsers: string[];
}

let notifications: Notification[] = [];
let notificationCounter = 0;
let listeners: ((notifications: Notification[]) => void)[] = [];

export const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): Notification => {
  notificationCounter++;
  const newNotification: Notification = {
    ...notification,
    id: `NOTIF-${String(notificationCounter).padStart(4, '0')}`,
    timestamp: new Date().toISOString(),
    read: false
  };
  
  notifications.unshift(newNotification);
  notifyListeners();
  return newNotification;
};

export const getNotifications = (userId?: string): Notification[] => {
  if (!userId) return [...notifications];
  return notifications.filter(n => n.targetUsers.includes(userId) || n.targetUsers.length === 0);
};

export const markAsRead = (notificationId: string): void => {
  const index = notifications.findIndex(n => n.id === notificationId);
  if (index !== -1) {
    notifications[index].read = true;
    notifyListeners();
  }
};

export const markAllAsRead = (userId?: string): void => {
  notifications = notifications.map(n => {
    if (!userId || n.targetUsers.includes(userId) || n.targetUsers.length === 0) {
      return { ...n, read: true };
    }
    return n;
  });
  notifyListeners();
};

export const getUnreadCount = (userId?: string): number => {
  const filtered = userId 
    ? notifications.filter(n => n.targetUsers.includes(userId) || n.targetUsers.length === 0)
    : notifications;
  return filtered.filter(n => !n.read).length;
};

export const subscribeToNotifications = (listener: (notifications: Notification[]) => void): () => void => {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
};

const notifyListeners = () => {
  listeners.forEach(listener => listener([...notifications]));
};
