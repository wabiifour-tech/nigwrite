/**
 * NigWrite — Settings Panel
 * System settings with thresholds, file settings, etc.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings, RotateCcw, Loader2, Save } from 'lucide-react';

interface SettingItem {
  id: string;
  key: string;
  value: string;
  description: string | null;
}

const DEFAULT_VALUES: Record<string, string> = {
  similarity_threshold_warning: '25',
  similarity_threshold_flagged: '40',
  similarity_threshold_critical: '60',
  ai_threshold_flagged: '60',
  default_exclusion_settings: JSON.stringify({ excludeQuotes: true, excludeBibliography: true, excludeCitations: true, excludeSmallMatches: 0 }),
  max_file_size_mb: '50',
  allowed_file_types: JSON.stringify(['txt', 'md', 'csv', 'pdf', 'docx', 'doc']),
};

const SETTING_LABELS: Record<string, string> = {
  similarity_threshold_warning: 'Similarity Warning Threshold (%)',
  similarity_threshold_flagged: 'Similarity Flagged Threshold (%)',
  similarity_threshold_critical: 'Similarity Critical Threshold (%)',
  ai_threshold_flagged: 'AI Detection Flagged Threshold (%)',
  default_exclusion_settings: 'Default Exclusion Settings',
  max_file_size_mb: 'Max File Size (MB)',
  allowed_file_types: 'Allowed File Types',
};

const SETTING_DESCRIPTIONS: Record<string, string> = {
  similarity_threshold_warning: 'Reports with similarity above this will show a warning badge',
  similarity_threshold_flagged: 'Reports with similarity above this will be flagged',
  similarity_threshold_critical: 'Reports with similarity above this are critical / high-risk',
  ai_threshold_flagged: 'AI detection score above this will flag the document',
  default_exclusion_settings: 'JSON configuration for default text exclusions during scanning',
  max_file_size_mb: 'Maximum upload file size in megabytes',
  allowed_file_types: 'Comma-separated list or JSON array of allowed file extensions',
};

export function SettingsPanel() {
  const [settings, setSettings] = useState<SettingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings');
      const result = await res.json();
      if (result.success) {
        setSettings(result.data);
        const vals: Record<string, string> = {};
        for (const s of result.data) vals[s.key] = s.value;
        setLocalValues(vals);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const updateValue = (key: string, value: string) => {
    setLocalValues(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = settings.map(s => ({
        key: s.key,
        value: localValues[s.key] || s.value,
      }));
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: updates }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch { /* silent */ }
    finally { setSaving(false); }
  };

  const handleReset = () => {
    setLocalValues({ ...DEFAULT_VALUES });
    setSaved(false);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2"><Settings className="h-5 w-5" /> System Settings</h2>
        <Card><CardContent className="space-y-4 p-6">{Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</CardContent></Card>
      </div>
    );
  }

  const isJsonSetting = (key: string) => key === 'default_exclusion_settings' || key === 'allowed_file_types';

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-xl font-bold flex items-center gap-2"><Settings className="h-5 w-5" /> System Settings</h2>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={handleReset}>
            <RotateCcw className="h-4 w-4" /> Reset to Defaults
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2 bg-[#008751] hover:bg-[#006b40]">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saved ? 'Saved!' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Plagiarism Thresholds */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Plagiarism Detection Thresholds</CardTitle>
          <CardDescription>Configure when similarity scores trigger warnings and flags</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {['similarity_threshold_warning', 'similarity_threshold_flagged', 'similarity_threshold_critical'].map(key => (
            <div key={key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <Label className="text-sm font-medium">{SETTING_LABELS[key]}</Label>
                <p className="text-xs text-muted-foreground">{SETTING_DESCRIPTIONS[key]}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={localValues[key] || ''}
                  onChange={e => updateValue(key, e.target.value)}
                  className="w-24 text-right"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* AI Detection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI Detection Threshold</CardTitle>
          <CardDescription>Configure when AI detection score triggers a flag</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <Label className="text-sm font-medium">{SETTING_LABELS.ai_threshold_flagged}</Label>
              <p className="text-xs text-muted-foreground">{SETTING_DESCRIPTIONS.ai_threshold_flagged}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Input
                type="number"
                min={0}
                max={100}
                value={localValues.ai_threshold_flagged || ''}
                onChange={e => updateValue('ai_threshold_flagged', e.target.value)}
                className="w-24 text-right"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">File Upload Settings</CardTitle>
          <CardDescription>Configure file upload limits and allowed types</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <Label className="text-sm font-medium">{SETTING_LABELS.max_file_size_mb}</Label>
              <p className="text-xs text-muted-foreground">{SETTING_DESCRIPTIONS.max_file_size_mb}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Input
                type="number"
                min={1}
                max={200}
                value={localValues.max_file_size_mb || ''}
                onChange={e => updateValue('max_file_size_mb', e.target.value)}
                className="w-24 text-right"
              />
              <span className="text-sm text-muted-foreground">MB</span>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">{SETTING_LABELS.allowed_file_types}</Label>
            <p className="text-xs text-muted-foreground mb-2">{SETTING_DESCRIPTIONS.allowed_file_types}</p>
            <Input
              value={localValues.allowed_file_types || ''}
              onChange={e => updateValue('allowed_file_types', e.target.value)}
              placeholder='.txt, .pdf, .docx, .md, .csv'
            />
          </div>
        </CardContent>
      </Card>

      {/* Exclusion Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Default Exclusion Settings</CardTitle>
          <CardDescription>JSON configuration for default text exclusions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="font-mono text-xs bg-muted p-3 rounded-lg whitespace-pre-wrap max-h-40 overflow-y-auto">
            {localValues.default_exclusion_settings || '{}'}
          </div>
          <Input
            className="mt-2 font-mono text-xs"
            value={localValues.default_exclusion_settings || ''}
            onChange={e => updateValue('default_exclusion_settings', e.target.value)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
