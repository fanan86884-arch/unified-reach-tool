import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Flame, Leaf, Apple, Zap, Scale, Heart, 
  ChevronLeft, Info
} from 'lucide-react';

interface PopularDiet {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  calories: string;
  macros: {
    protein: string;
    carbs: string;
    fat: string;
  };
  bestFor: string[];
}

const popularDiets: PopularDiet[] = [
  {
    id: 'cutting',
    name: 'نظام التنشيف',
    nameEn: 'Cutting',
    description: 'نظام منخفض السعرات لحرق الدهون مع الحفاظ على العضلات',
    icon: <Flame className="w-5 h-5" />,
    color: 'text-orange-500 bg-orange-500/10',
    calories: '1600-2000',
    macros: { protein: '40%', carbs: '30%', fat: '30%' },
    bestFor: ['خسارة الدهون', 'إبراز العضلات', 'التحضير للمسابقات'],
  },
  {
    id: 'bulking',
    name: 'نظام التضخيم',
    nameEn: 'Bulking',
    description: 'نظام عالي السعرات لبناء الكتلة العضلية',
    icon: <Zap className="w-5 h-5" />,
    color: 'text-blue-500 bg-blue-500/10',
    calories: '2800-3500',
    macros: { protein: '30%', carbs: '50%', fat: '20%' },
    bestFor: ['زيادة الوزن', 'بناء العضلات', 'زيادة القوة'],
  },
  {
    id: 'maintenance',
    name: 'نظام الثبات',
    nameEn: 'Maintenance',
    description: 'نظام متوازن للحفاظ على الوزن الحالي',
    icon: <Scale className="w-5 h-5" />,
    color: 'text-green-500 bg-green-500/10',
    calories: '2200-2600',
    macros: { protein: '30%', carbs: '45%', fat: '25%' },
    bestFor: ['الحفاظ على الوزن', 'نمط حياة صحي', 'التوازن'],
  },
  {
    id: 'keto',
    name: 'نظام الكيتو',
    nameEn: 'Keto',
    description: 'نظام منخفض الكربوهيدرات وعالي الدهون',
    icon: <Leaf className="w-5 h-5" />,
    color: 'text-purple-500 bg-purple-500/10',
    calories: '1800-2200',
    macros: { protein: '25%', carbs: '5%', fat: '70%' },
    bestFor: ['حرق الدهون', 'تحسين التركيز', 'السكري'],
  },
  {
    id: 'highprotein',
    name: 'نظام عالي البروتين',
    nameEn: 'High Protein',
    description: 'نظام غني بالبروتين لبناء وإصلاح العضلات',
    icon: <Apple className="w-5 h-5" />,
    color: 'text-red-500 bg-red-500/10',
    calories: '2000-2400',
    macros: { protein: '45%', carbs: '35%', fat: '20%' },
    bestFor: ['بناء العضلات', 'التعافي', 'الرياضيين'],
  },
  {
    id: 'balanced',
    name: 'نظام متوازن',
    nameEn: 'Balanced',
    description: 'نظام صحي متوازن لجميع الأهداف',
    icon: <Heart className="w-5 h-5" />,
    color: 'text-pink-500 bg-pink-500/10',
    calories: '2000-2400',
    macros: { protein: '30%', carbs: '40%', fat: '30%' },
    bestFor: ['الصحة العامة', 'المبتدئين', 'الاستدامة'],
  },
];

interface PopularDietsListProps {
  onSelectDiet: (diet: PopularDiet) => void;
}

export const PopularDietsList = ({ onSelectDiet }: PopularDietsListProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Info className="w-5 h-5 text-primary" />
        <h3 className="font-bold">اختر نوع النظام الغذائي</h3>
      </div>
      
      <p className="text-sm text-muted-foreground mb-4">
        اختر نظاماً أساسياً وسيتم تخصيصه حسب بيانات العميل
      </p>

      <div className="grid gap-3">
        {popularDiets.map((diet) => (
          <Card 
            key={diet.id}
            className="p-4 cursor-pointer hover:border-primary transition-all"
            onClick={() => onSelectDiet(diet)}
          >
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${diet.color}`}>
                {diet.icon}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold">{diet.name}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {diet.nameEn}
                  </Badge>
                </div>
                
                <p className="text-xs text-muted-foreground mb-2">
                  {diet.description}
                </p>
                
                <div className="flex flex-wrap gap-2 text-[10px]">
                  <Badge variant="secondary">{diet.calories} سعرة</Badge>
                  <Badge variant="secondary">بروتين {diet.macros.protein}</Badge>
                  <Badge variant="secondary">كارب {diet.macros.carbs}</Badge>
                </div>
              </div>
              
              <ChevronLeft className="w-5 h-5 text-muted-foreground shrink-0" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export { popularDiets };
export type { PopularDiet };
