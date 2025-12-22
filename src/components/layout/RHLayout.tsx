import React from 'react';
import { PageLayout } from './PageLayout';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate, useLocation } from 'react-router-dom';
import { Users, MessageSquareWarning } from 'lucide-react';

interface RHLayoutProps {
  children: React.ReactNode;
  title: string;
}

const tabs = [
  { id: 'geral', label: 'Geral', path: '/rh', icon: Users },
  { id: 'feedback', label: 'FeedBack', path: '/rh/feedback', icon: MessageSquareWarning },
];

export const RHLayout: React.FC<RHLayoutProps> = ({ children, title }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const getCurrentTab = () => {
    const currentPath = location.pathname;
    const tab = tabs.find(t => t.path === currentPath);
    return tab?.id || 'geral';
  };

  return (
    <PageLayout title={title}>
      <div className="space-y-4">
        <Tabs value={getCurrentTab()} className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-flex">
            {tabs.map(tab => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                onClick={() => navigate(tab.path)}
                className="flex items-center gap-2"
              >
                <tab.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {children}
      </div>
    </PageLayout>
  );
};
