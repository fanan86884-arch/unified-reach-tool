import { Subscriber } from '@/types/subscriber';
import { DailyStatistics } from './DailyStatistics';
import { GeneralStatistics } from './GeneralStatistics';
import { MonthlyRevenue } from './MonthlyRevenue';
import { BarChart3 } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';

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
  const { t } = useLanguage();

  return (
    <div className="space-y-6 pb-20">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-primary" />
        {t.statistics.title}
      </h2>

      <DailyStatistics allSubscribers={allSubscribers} />
      <GeneralStatistics stats={stats} allSubscribers={allSubscribers} />
      <MonthlyRevenue allSubscribers={allSubscribers} />
    </div>
  );
};
