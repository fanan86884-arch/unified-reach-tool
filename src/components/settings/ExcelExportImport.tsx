import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FileSpreadsheet, Download, Upload, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { Subscriber, SubscriberFormData } from '@/types/subscriber';
import { format, parseISO } from 'date-fns';
import { useLanguage } from '@/i18n/LanguageContext';

interface ExcelExportImportProps {
  subscribers: Subscriber[];
  onImport: (data: SubscriberFormData) => Promise<{ success: boolean; subscriber?: Subscriber; error?: string }>;
}

const subscriptionTypeMap: Record<string, Subscriber['subscriptionType']> = {
  'شهري': 'monthly', 'ربع سنوي': 'quarterly', 'نصف سنوي': 'semi-annual', 'سنوي': 'annual',
  'Monthly': 'monthly', 'Quarterly': 'quarterly', 'Semi-Annual': 'semi-annual', 'Annual': 'annual',
  'monthly': 'monthly', 'quarterly': 'quarterly', 'semi-annual': 'semi-annual', 'annual': 'annual',
};

export const ExcelExportImport = ({ subscribers, onImport }: ExcelExportImportProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleExport = () => {
    setIsExporting(true);
    try {
      const exportData = subscribers.map(sub => ({
        [t.form.name]: sub.name,
        [t.subscribers.phone]: sub.phone,
        [t.form.subscriptionType]: t.subscriptionTypes[sub.subscriptionType as keyof typeof t.subscriptionTypes] || sub.subscriptionType,
        [t.form.startDate]: format(parseISO(sub.startDate), 'dd/MM/yyyy'),
        [t.form.endDate]: format(parseISO(sub.endDate), 'dd/MM/yyyy'),
        [t.form.paidAmount]: sub.paidAmount,
        [t.form.remainingAmount]: sub.remainingAmount,
        [t.subscribers.captain]: sub.captain,
        [t.filters.status]: t.status[sub.status as keyof typeof t.status] || sub.status,
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, t.nav.subscribers);

      const maxWidth = 20;
      worksheet['!cols'] = Object.keys(exportData[0] || {}).map(() => ({ wch: maxWidth }));

      XLSX.writeFile(workbook, `subscribers_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      toast({ title: t.excel.exportSuccess });
    } catch (error) {
      console.error('Export error:', error);
      toast({ title: t.excel.exportError, variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  const parseDate = (dateStr: string): string => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    if (dateStr.includes('-')) return dateStr.split('T')[0];
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
              const nameVal = row[t.form.name] || row['الاسم'] || row['Name'] || '';
              const phoneVal = row[t.subscribers.phone] || row['الهاتف'] || row['Phone'] || '';
              const typeVal = row[t.form.subscriptionType] || row['نوع الاشتراك'] || row['Subscription Type'] || '';
              const startVal = row[t.form.startDate] || row['تاريخ البداية'] || row['Start Date'] || '';
              const endVal = row[t.form.endDate] || row['تاريخ الانتهاء'] || row['End Date'] || '';
              const paidVal = row[t.form.paidAmount] || row['المبلغ المدفوع'] || row['Paid Amount'] || 0;
              const remainVal = row[t.form.remainingAmount] || row['المبلغ المتبقي'] || row['Remaining Amount'] || 0;
              const captainVal = row[t.subscribers.captain] || row['الكابتن'] || row['Captain'] || '';

              const subscriptionType = subscriptionTypeMap[typeVal] || 'monthly';
              
              const subscriberData: SubscriberFormData = {
                name: nameVal, phone: String(phoneVal), subscriptionType,
                startDate: parseDate(startVal), endDate: parseDate(endVal),
                paidAmount: Number(paidVal) || 0, remainingAmount: Number(remainVal) || 0,
                captain: captainVal || 'Captain',
                gender: 'male',
                subscriptionCategory: 'gym',
              };

              if (subscriberData.name && subscriberData.phone) {
                const result = await onImport(subscriberData);
                if (result.success) successCount++; else errorCount++;
              }
            } catch (err) { console.error('Error importing row:', err); errorCount++; }
          }

          toast({ title: `${t.excel.importSuccess.replace('{count}', String(successCount))}${errorCount > 0 ? ` (${errorCount} failed)` : ''}` });
        } catch (err) {
          console.error('Import error:', err);
          toast({ title: t.excel.importReadError, variant: 'destructive' });
        } finally { setIsImporting(false); }
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Import error:', error);
      toast({ title: t.excel.importError, variant: 'destructive' });
      setIsImporting(false);
    }
    event.target.value = '';
  };

  return (
    <Card className="p-4 card-shadow">
      <h3 className="font-bold mb-4 flex items-center gap-2">
        <FileSpreadsheet className="w-5 h-5 text-primary" />
        {t.excel.title}
      </h3>
      <div className="flex flex-col sm:flex-row gap-3">
        <Button variant="outline" onClick={handleExport} disabled={isExporting || subscribers.length === 0} className="flex-1">
          {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {t.excel.exportToExcel}
        </Button>
        <div className="flex-1 relative">
          <Input type="file" accept=".xlsx,.xls" onChange={handleImport} disabled={isImporting} className="absolute inset-0 opacity-0 cursor-pointer" />
          <Button variant="outline" disabled={isImporting} className="w-full pointer-events-none">
            {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {t.excel.importFromExcel}
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-2">{t.excel.fileFormat}</p>
    </Card>
  );
};
