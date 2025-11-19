import { useState, useEffect } from 'react';

export interface StoreData {
  id: string;
  name: string;
  revenue: number;
  change: number;
  changePercent: number;
}

export interface MultiStorePerformance {
  month: string;
  total: number;
  stores: Record<string, number>;
}

export interface BrandRecurrence {
  brand: string;
  value: number;
  topProducts: string[];
}

export interface HourlyTraffic {
  day: string;
  morning: number;    // 06-10h
  midday: number;     // 10-14h
  afternoon: number;  // 14-18h
  evening: number;    // 18-24h
}

export const mockStoresData: StoreData[] = [
  { id: 'loja1', name: 'Centro', revenue: 450000, change: 12000, changePercent: 2.7 },
  { id: 'loja2', name: 'Shopping Paulista', revenue: 680000, change: 25000, changePercent: 3.8 },
  { id: 'loja3', name: 'Jardins', revenue: 520000, change: -8000, changePercent: -1.5 },
  { id: 'loja4', name: 'Vila Olímpia', revenue: 590000, change: 18000, changePercent: 3.1 },
  { id: 'loja5', name: 'Moema', revenue: 410000, change: 9000, changePercent: 2.2 },
  { id: 'loja6', name: 'Pinheiros', revenue: 470000, change: -5000, changePercent: -1.1 }
];

export const generateMultiStorePerformance = (months: number, storeId?: string): MultiStorePerformance[] => {
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const data: MultiStorePerformance[] = [];
  
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    
    const stores: Record<string, number> = {};
    let total = 0;
    
    if (storeId) {
      const store = mockStoresData.find(s => s.id === storeId);
      if (store) {
        const baseRevenue = store.revenue / 12;
        const variation = (Math.random() - 0.5) * 0.3;
        const value = baseRevenue * (1 + variation);
        stores[storeId] = Math.round(value);
        total = Math.round(value);
      }
    } else {
      mockStoresData.forEach(store => {
        const baseRevenue = store.revenue / 12;
        const variation = (Math.random() - 0.5) * 0.3;
        const value = baseRevenue * (1 + variation);
        stores[store.id] = Math.round(value);
        total += Math.round(value);
      });
    }
    
    data.push({
      month: monthNames[date.getMonth()],
      total,
      stores
    });
  }
  
  return data;
};

export const generateBrandRecurrence = (): BrandRecurrence[] => {
  return [
    {
      brand: 'Apple',
      value: 2450000,
      topProducts: ['iPhone 15 Pro Max', 'iPhone 15 Pro', 'AirPods Pro 2ª Geração']
    },
    {
      brand: 'Samsung',
      value: 890000,
      topProducts: ['Galaxy S24 Ultra', 'Galaxy S24', 'Galaxy Buds 2 Pro']
    },
    {
      brand: 'Xiaomi',
      value: 450000,
      topProducts: ['Redmi Note 13 Pro', 'Redmi Note 13', 'Mi Band 8']
    },
    {
      brand: 'JBL',
      value: 320000,
      topProducts: ['JBL Flip 6', 'JBL Charge 5', 'JBL Tune 770NC']
    },
    {
      brand: 'Acessórios',
      value: 680000,
      topProducts: ['Capinha Silicone', 'Carregador MagSafe', 'Película 3D']
    },
    {
      brand: 'Outros',
      value: 210000,
      topProducts: ['Suporte Veicular', 'Power Bank', 'Cabo USB-C']
    }
  ];
};

export const calculateAverageTicket = (storeId?: string) => {
  if (storeId) {
    const store = mockStoresData.find(s => s.id === storeId);
    if (!store) return { overall: 0, byStore: [] };
    
    const avgTicket = Math.round(store.revenue / (Math.random() * 500 + 300));
    return {
      overall: avgTicket,
      byStore: [{ storeId: store.id, name: store.name, ticket: avgTicket }]
    };
  }
  
  const totalRevenue = mockStoresData.reduce((sum, store) => sum + store.revenue, 0);
  const totalTransactions = mockStoresData.length * (Math.random() * 500 + 300);
  const overall = Math.round(totalRevenue / totalTransactions);
  
  const byStore = mockStoresData.map(store => ({
    storeId: store.id,
    name: store.name,
    ticket: Math.round(store.revenue / (Math.random() * 500 + 300))
  }));
  
  return { overall, byStore };
};

export const generateHourlyTraffic = (): HourlyTraffic[] => {
  const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  
  return days.map(day => ({
    day,
    morning: Math.floor(Math.random() * 30000) + 10000,
    midday: Math.floor(Math.random() * 50000) + 30000,
    afternoon: Math.floor(Math.random() * 60000) + 40000,
    evening: Math.floor(Math.random() * 45000) + 25000
  }));
};

export const getLastThreeMonths = () => {
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const months = [];
  
  for (let i = 3; i >= 1; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const totalRevenue = mockStoresData.reduce((sum, store) => sum + store.revenue / 12, 0);
    const variation = (Math.random() - 0.5) * 0.2;
    
    months.push({
      month: monthNames[date.getMonth()],
      total: Math.round(totalRevenue * (1 + variation)),
      change: variation * 100,
      stores: mockStoresData.map(store => ({
        ...store,
        monthRevenue: Math.round(store.revenue / 12 * (1 + (Math.random() - 0.5) * 0.2))
      }))
    });
  }
  
  return months;
};
