/**
 * NigWrite - Export Button Component
 * Downloads a scan report as HTML or text file.
 */

'use client';

import { useState } from 'react';
import { Download, Loader2, FileText, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ExportButtonProps {
  reportId: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  format?: 'html' | 'text';
  label?: string;
}

export function ExportButton({
  reportId,
  variant = 'outline',
  size = 'sm',
  format = 'html',
  label = 'Download Report',
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, format }),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = format === 'text' ? 'txt' : 'html';
      a.download = `NigWrite-Report.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Silently fail — user can retry
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleExport}
      disabled={isExporting || !reportId}
      className="gap-1.5"
    >
      {isExporting ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Exporting...
        </>
      ) : format === 'text' ? (
        <>
          <FileText className="h-3.5 w-3.5" />
          {label}
        </>
      ) : (
        <>
          <Download className="h-3.5 w-3.5" />
          {label}
        </>
      )}
    </Button>
  );
}
