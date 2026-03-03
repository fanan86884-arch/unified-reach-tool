import { Subscriber } from '@/types/subscriber';
import { DailyStatistics } from './DailyStatistics';
import { GeneralStatistics } from './GeneralStatistics';
import { MonthlyRevenue } from './MonthlyRevenue';
import { BarChart3 } from 'lucide-react';

interface StatisticsProps {
  stats: {
    active: Subscriber[];
    expiring: Subscriber[];
    expired: Subscriber[];
    pending: Subscriber[];
    paused: Subscriber[];
    byCaptain: Record<string, Subscriber[]>;
    captains: string[];
  };
  allSubscribers?: Subscriber[];
}

export const Statistics = ({ stats, allSubscribers = [] }: StatisticsProps) => {
  return (
    <div className="space-y-6 pb-20">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-primary" />
        الإحصائيات
      </h2>

      {/* 1. Daily Statistics */}
      <DailyStatistics allSubscribers={allSubscribers} />

      {/* 2. General Statistics */}
      <GeneralStatistics stats={stats} />

      {/* 3. Monthly Revenue */}
      <MonthlyRevenue allSubscribers={allSubscribers} />
    </div>
  );
};
