import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FileSpreadsheet, Download, Upload, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { Subscriber, SubscriberFormData } from '@/types/subscriber';
import { format, parseISO } from 'date-fns';

interface ExcelExportImportProps {
  subscribers: Subscriber[];
  onImport: (data: SubscriberFormData) => Promise<Subscriber | null>;
}

const subscriptionTypeMap: Record<string, Subscriber['subscriptionType']> = {
  'شهري': 'monthly',
  'ربع سنوي': 'quarterly',
  'نصف سنوي': 'semi-annual',
  'سنوي': 'annual',
  'monthly': 'monthly',
  'quarterly': 'quarterly',
  'semi-annual': 'semi-annual',
  'annual': 'annual',
};

const subscriptionTypeLabels: Record<string, string> = {
  'monthly': 'شهري',
  'quarterly': 'ربع سنوي',
  'semi-annual': 'نصف سنوي',
  'annual': 'سنوي',
};

export const ExcelExportImport = ({ subscribers, onImport }: ExcelExportImportProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

  const handleExport = () => {
    setIsExporting(true);
    try {
      const exportData = subscribers.map(sub => ({
        'الاسم': sub.name,
        'الهاتف': sub.phone,
        'نوع الاشتراك': subscriptionTypeLabels[sub.subscriptionType] || sub.subscriptionType,
        'تاريخ البداية': format(parseISO(sub.startDate), 'dd/MM/yyyy'),
        'تاريخ الانتهاء': format(parseISO(sub.endDate), 'dd/MM/yyyy'),
        'المبلغ المدفوع': sub.paidAmount,
        'المبلغ المتبقي': sub.remainingAmount,
        'الكابتن': sub.captain,
        'الحالة': sub.status === 'active' ? 'نشط' : 
                 sub.status === 'expiring' ? 'قارب على الانتهاء' :
                 sub.status === 'expired' ? 'منتهي' :
                 sub.status === 'paused' ? 'موقوف' : sub.status,
        'مؤرشف': sub.isArchived ? 'نعم' : 'لا',
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'المشتركين');

      // Auto-width columns
      const maxWidth = 20;
      worksheet['!cols'] = Object.keys(exportData[0] || {}).map(() => ({ wch: maxWidth }));

      XLSX.writeFile(workbook, `مشتركين_الجيم_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      toast({ title: 'تم تصدير البيانات بنجاح' });
    } catch (error) {
      console.error('Export error:', error);
      toast({ title: 'حدث خطأ أثناء التصدير', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  const parseDate = (dateStr: string): string => {
    // Try to parse different date formats
    if (!dateStr) return new Date().toISOString().split('T')[0];
    
    // Handle dd/MM/yyyy format
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // Handle ISO format
    if (dateStr.includes('-')) {
      return dateStr.split('T')[0];
    }
    
    return new Date().toISOString().split('T')[0];
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          let successCount = 0;
          let errorCount = 0;

          for (const row of jsonData as any[]) {
            try {
              const subscriptionType = subscriptionTypeMap[row['نوع الاشتراك']] || 'monthly';
              
              const subscriberData: SubscriberFormData = {
                name: row['الاسم'] || '',
                phone: String(row['الهاتف'] || ''),
                subscriptionType,
                startDate: parseDate(row['تاريخ البداية']),
                endDate: parseDate(row['تاريخ الانتهاء']),
                paidAmount: Number(row['المبلغ المدفوع']) || 0,
                remainingAmount: Number(row['المبلغ المتبقي']) || 0,
                captain: row['الكابتن'] || 'كابتن خالد',
              };

              if (subscriberData.name && subscriberData.phone) {
                const result = await onImport(subscriberData);
                if (result) {
                  successCount++;
                } else {
                  errorCount++;
                }
              }
            } catch (err) {
              console.error('Error importing row:', err);
              errorCount++;
            }
          }

          toast({ 
            title: `تم استيراد ${successCount} مشترك بنجاح${errorCount > 0 ? ` (${errorCount} فشل)` : ''}` 
          });
        } catch (err) {
          console.error('Import error:', err);
          toast({ title: 'حدث خطأ أثناء قراءة الملف', variant: 'destructive' });
        } finally {
          setIsImporting(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Import error:', error);
      toast({ title: 'حدث خطأ أثناء الاستيراد', variant: 'destructive' });
      setIsImporting(false);
    }

    // Reset input
    event.target.value = '';
  };

  return (
    <Card className="p-4 card-shadow">
      <h3 className="font-bold mb-4 flex items-center gap-2">
        <FileSpreadsheet className="w-5 h-5 text-primary" />
        تصدير واستيراد البيانات
      </h3>
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          variant="outline"
          onClick={handleExport}
          disabled={isExporting || subscribers.length === 0}
          className="flex-1"
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          تصدير إلى Excel
        </Button>
        <div className="flex-1 relative">
          <Input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleImport}
            disabled={isImporting}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          <Button
            variant="outline"
            disabled={isImporting}
            className="w-full pointer-events-none"
          >
            {isImporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            استيراد من Excel
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        صيغة الملف: الاسم، الهاتف، نوع الاشتراك، تاريخ البداية، تاريخ الانتهاء، المبلغ المدفوع، المبلغ المتبقي، الكابتن
      </p>
    </Card>
  );
};
