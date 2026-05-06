/**
 * NigWrite — Developer Tools Panel
 * API Keys, Webhooks, Batch Processing, CSV Import
 */

'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Key,
  Webhook,
  Layers,
  FileUp,
  Plus,
  Copy,
  Check,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  RefreshCw,
  FileText,
  X,
} from 'lucide-react';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────
interface ApiKeyData {
  id: string;
  key: string;
  name: string;
  permissions: string;
  lastUsed: string | null;
  isActive: boolean;
  createdAt: string;
  expiresAt: string;
}

interface WebhookData {
  id: string;
  url: string;
  events: string;
  isActive: boolean;
  lastTriggered: string | null;
  createdAt: string;
  secret?: string;
}

// ──────────────────────────────────────────────
// API Keys Tab
// ──────────────────────────────────────────────
function ApiKeysPanel() {
  const [keys, setKeys] = useState<ApiKeyData[]>([]);
  const [loading, setLoading] = useState(false);
  const [newKeyName, setNewKeyName] = useState('My API Key');
  const [creating, setCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadKeys = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/api-keys?userId=demo');
      const result = await res.json();
      if (result.success) setKeys(result.data);
    } catch {
      setError('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  }, []);

  const createKey = useCallback(async () => {
    setCreating(true);
    setError('');
    try {
      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'demo', name: newKeyName }),
      });
      const result = await res.json();
      if (result.success) {
        setCreatedKey(result.data.key);
        setNewKeyName('My API Key');
        loadKeys();
      } else {
        setError(result.error || 'Failed to create key');
      }
    } catch {
      setError('Network error');
    } finally {
      setCreating(false);
    }
  }, [newKeyName, loadKeys]);

  const revokeKey = useCallback(async (keyId: string) => {
    try {
      await fetch('/api/api-keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyId }),
      });
      setKeys(prev => prev.filter(k => k.id !== keyId));
    } catch {
      // silent
    }
  }, []);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
  }, []);

  return (
    <div className="space-y-4">
      {/* Create New Key */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="h-4 w-4 text-[#008751]" />
            Create New API Key
          </CardTitle>
          <CardDescription>Generate a key to authenticate API requests. The full key is shown only once.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="Key name (e.g., CI Pipeline)"
              className="max-w-xs"
            />
            <Button
              onClick={createKey}
              disabled={creating || !newKeyName.trim()}
              className="gap-1.5 bg-[#008751] hover:bg-[#006b40]"
            >
              {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Generate Key
            </Button>
          </div>

          {createdKey && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
                <AlertCircle className="h-4 w-4" />
                Copy this key now — it will not be shown again!
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-white px-3 py-2 rounded border font-mono break-all">
                  {createdKey}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { copyToClipboard(createdKey); }}
                  className="shrink-0"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setCreatedKey(null)}>
                Dismiss
              </Button>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
        </CardContent>
      </Card>

      {/* Key List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Your API Keys</CardTitle>
            <Button variant="ghost" size="sm" onClick={loadKeys} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {keys.length === 0 && !loading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No API keys yet. Create one above to get started.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {keys.map(k => (
                <div key={k.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium truncate">{k.name}</span>
                      <Badge variant={k.isActive ? 'default' : 'secondary'} className="text-[10px] shrink-0">
                        {k.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <code className="font-mono">{k.key}</code>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(k.createdAt).toLocaleDateString()}
                      </span>
                      {k.lastUsed && (
                        <span>Last used {new Date(k.lastUsed).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => revokeKey(k.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ──────────────────────────────────────────────
// Webhooks Tab
// ──────────────────────────────────────────────
function WebhooksPanel() {
  const [webhooks, setWebhooks] = useState<WebhookData[]>([]);
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState('scan.complete');
  const [creating, setCreating] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadWebhooks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/webhooks?userId=demo');
      const result = await res.json();
      if (result.success) setWebhooks(result.data);
    } catch {
      setError('Failed to load webhooks');
    } finally {
      setLoading(false);
    }
  }, []);

  const createWebhook = useCallback(async () => {
    setCreating(true);
    setError('');
    try {
      const res = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'demo', url, events }),
      });
      const result = await res.json();
      if (result.success) {
        setNewSecret(result.data.secret);
        setUrl('');
        setEvents('scan.complete');
        loadWebhooks();
      } else {
        setError(result.error || 'Failed to create webhook');
      }
    } catch {
      setError('Network error');
    } finally {
      setCreating(false);
    }
  }, [url, events, loadWebhooks]);

  const deleteWebhook = useCallback(async (webhookId: string) => {
    try {
      await fetch('/api/webhooks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookId }),
      });
      setWebhooks(prev => prev.filter(w => w.id !== webhookId));
    } catch {
      // silent
    }
  }, []);

  const toggleWebhook = useCallback(async (webhook: WebhookData) => {
    try {
      const res = await fetch('/api/webhooks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookId: webhook.id, isActive: !webhook.isActive }),
      });
      const result = await res.json();
      if (result.success) {
        setWebhooks(prev => prev.map(w => w.id === webhook.id ? { ...w, isActive: !w.isActive } : w));
      }
    } catch {
      // silent
    }
  }, []);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
  }, []);

  return (
    <div className="space-y-4">
      {/* Create Webhook */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Webhook className="h-4 w-4 text-[#008751]" />
            Create Webhook
          </CardTitle>
          <CardDescription>
            Receive event notifications via HTTP POST. Events are signed with HMAC-SHA256.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="mb-1.5 block text-sm">Endpoint URL</Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-app.com/api/webhook"
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-sm">Events (comma-separated)</Label>
            <Input
              value={events}
              onChange={(e) => setEvents(e.target.value)}
              placeholder="scan.complete, submission.received"
            />
            <p className="text-xs text-muted-foreground mt-1">Available: scan.complete, submission.received. Use * for all events.</p>
          </div>

          <Button
            onClick={createWebhook}
            disabled={creating || !url.trim()}
            className="gap-1.5 bg-[#008751] hover:bg-[#006b40]"
          >
            {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Create Webhook
          </Button>

          {newSecret && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
                <AlertCircle className="h-4 w-4" />
                Save this signing secret — it will not be shown again!
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-white px-3 py-2 rounded border font-mono break-all">
                  {newSecret}
                </code>
                <Button size="sm" variant="outline" onClick={() => copyToClipboard(newSecret)} className="shrink-0">
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setNewSecret(null)}>Dismiss</Button>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>

      {/* Webhook List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Your Webhooks</CardTitle>
            <Button variant="ghost" size="sm" onClick={loadWebhooks} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {webhooks.length === 0 && !loading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No webhooks configured. Create one above.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {webhooks.map(w => (
                <div key={w.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={w.isActive ? 'default' : 'secondary'} className="text-[10px] shrink-0">
                        {w.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <span className="text-sm font-medium truncate">{w.url}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-[10px]">{w.events}</Badge>
                      {w.lastTriggered && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Last triggered {new Date(w.lastTriggered).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleWebhook(w)}
                    >
                      {w.isActive ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteWebhook(w.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event Documentation */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Webhook Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="p-3 rounded-lg border">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="font-mono text-xs">scan.complete</Badge>
                <span className="font-medium">Scan Completed</span>
              </div>
              <p className="text-muted-foreground text-xs">Fired when a document scan finishes. Payload includes reportId, similarityScore, aiScore, and verdict.</p>
            </div>
            <div className="p-3 rounded-lg border">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="font-mono text-xs">submission.received</Badge>
                <span className="font-medium">Submission Received</span>
              </div>
              <p className="text-muted-foreground text-xs">Fired when a student submits a document to an assignment.</p>
            </div>
            <div className="p-2 rounded bg-muted/50 text-xs">
              <strong>Headers:</strong> Each webhook delivery includes <code>X-NigWrite-Signature</code> (HMAC-SHA256), <code>X-NigWrite-Timestamp</code>, and <code>X-NigWrite-Event</code> headers.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ──────────────────────────────────────────────
// Batch Processing Tab
// ──────────────────────────────────────────────
function BatchProcessingPanel() {
  const [documents, setDocuments] = useState<Array<{ title: string; content: string }>>([
    { title: '', content: '' },
  ]);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<Array<{
    index: number;
    title: string;
    success: boolean;
    similarityScore?: number;
    aiScore?: number;
    error?: string;
  }> | null>(null);
  const [zipUploading, setZipUploading] = useState(false);
  const [zipResult, setZipResult] = useState<{
    filesExtracted: number;
    successfulScans: number;
    failedScans: number;
  } | null>(null);

  const addDocument = useCallback(() => {
    if (documents.length >= 10) return;
    setDocuments(prev => [...prev, { title: '', content: '' }]);
  }, [documents.length]);

  const removeDocument = useCallback((index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateDocument = useCallback((index: number, field: 'title' | 'content', value: string) => {
    setDocuments(prev => prev.map((d, i) => i === index ? { ...d, [field]: value } : d));
  }, []);

  const processBatch = useCallback(async () => {
    const validDocs = documents.filter(d => d.content.trim().length >= 10);
    if (validDocs.length === 0) return;

    setProcessing(true);
    setResults(null);
    try {
      const res = await fetch('/api/batch/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documents: validDocs.map(d => ({
            title: d.title || 'Untitled',
            content: d.content,
          })),
        }),
      });
      const result = await res.json();
      if (result.success) {
        setResults(result.data.results);
      }
    } catch {
      // silent
    } finally {
      setProcessing(false);
    }
  }, [documents]);

  const handleZipUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setZipUploading(true);
    setZipResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/batch/upload', {
        method: 'POST',
        body: formData,
      });
      const result = await res.json();
      if (result.success) {
        setZipResult({
          filesExtracted: result.data.filesExtracted,
          successfulScans: result.data.successfulScans,
          failedScans: result.data.failedScans,
        });
        setResults(result.data.results);
      }
    } catch {
      // silent
    } finally {
      setZipUploading(false);
      if (e.target) e.target.value = '';
    }
  }, []);

  const validCount = documents.filter(d => d.content.trim().length >= 10).length;

  return (
    <div className="space-y-4">
      {/* ZIP Upload */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileUp className="h-4 w-4 text-[#008751]" />
            Upload ZIP Archive
          </CardTitle>
          <CardDescription>
            Upload a .zip file containing .txt, .md, or .csv documents. Max 20 files, 50MB.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Input
              type="file"
              accept=".zip"
              onChange={handleZipUpload}
              disabled={zipUploading}
              className="max-w-xs"
            />
            {zipUploading && <Loader2 className="h-4 w-4 animate-spin text-[#008751]" />}
          </div>
          {zipResult && (
            <div className="mt-3 flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1 text-muted-foreground">
                <FileText className="h-3.5 w-3.5" />
                {zipResult.filesExtracted} files extracted
              </span>
              <span className="flex items-center gap-1 text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {zipResult.successfulScans} scanned
              </span>
              {zipResult.failedScans > 0 && (
                <span className="flex items-center gap-1 text-red-500">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {zipResult.failedScans} failed
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Document Entry */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#008751]" />
              Batch Scan ({documents.length}/10 documents)
            </CardTitle>
            <Button variant="outline" size="sm" onClick={addDocument} disabled={documents.length >= 10}>
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          </div>
          <CardDescription>Add up to 10 documents (min 10 characters each) and scan them all at once.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {documents.map((doc, index) => (
            <div key={index} className="p-3 rounded-lg border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Document {index + 1}</span>
                {documents.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => removeDocument(index)} className="h-6 w-6 p-0">
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <Input
                value={doc.title}
                onChange={(e) => updateDocument(index, 'title', e.target.value)}
                placeholder="Document title (optional)"
              />
              <textarea
                value={doc.content}
                onChange={(e) => updateDocument(index, 'content', e.target.value)}
                placeholder="Paste document content here..."
                className="w-full min-h-[80px] rounded-md border px-3 py-2 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-[#008751]/30"
              />
              <div className="flex justify-between">
                <span className="text-[10px] text-muted-foreground">
                  {doc.content.split(/\s+/).filter(w => w.length > 0).length} words
                </span>
                {doc.content.trim().length > 0 && doc.content.trim().length < 10 && (
                  <span className="text-[10px] text-amber-600">Min 10 characters required</span>
                )}
              </div>
            </div>
          ))}

          <Button
            onClick={processBatch}
            disabled={processing || validCount === 0}
            className="w-full gap-2 bg-[#008751] hover:bg-[#006b40]"
          >
            {processing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Scanning {validCount} documents...
              </>
            ) : (
              <>
                <Layers className="h-4 w-4" />
                Batch Scan ({validCount} documents)
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Batch Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {results.map(r => (
                <div key={r.index} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <span className="text-sm font-medium">{r.title}</span>
                    {r.success ? (
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground">
                          Similarity: <span className="font-semibold text-orange-600">{r.similarityScore?.toFixed(1)}%</span>
                        </span>
                        <span className="text-xs text-muted-foreground">
                          AI: <span className="font-semibold text-purple-600">{r.aiScore?.toFixed(1)}%</span>
                        </span>
                      </div>
                    ) : (
                      <p className="text-xs text-red-500 mt-1">{r.error}</p>
                    )}
                  </div>
                  <Badge variant={r.success ? 'default' : 'destructive'} className="text-xs shrink-0">
                    {r.success ? 'Done' : 'Failed'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// CSV Import Tab
// ──────────────────────────────────────────────
function CsvImportPanel() {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    totalRows: number;
    successfulImports: number;
    skippedExisting: number;
    errors: Array<{ row: number; email: string; error: string }>;
  } | null>(null);
  const csvInputRef = useCallback((node: HTMLInputElement | null) => {
    if (node) {
      // Just store ref
    }
  }, []);

  const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/import/csv', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.data);
      }
    } catch {
      // silent
    } finally {
      setImporting(false);
      if (e.target) e.target.value = '';
    }
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileUp className="h-4 w-4 text-[#008751]" />
            Import Student Roster
          </CardTitle>
          <CardDescription>
            Upload a CSV file to bulk-create student accounts. Max 500 rows, 5MB.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="mb-1.5 block text-sm font-medium">Upload CSV File</Label>
            <Input
              type="file"
              accept=".csv"
              onChange={handleImport}
              disabled={importing}
              ref={csvInputRef}
            />
          </div>

          <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-2">
            <p className="font-medium">Required CSV Format:</p>
            <code className="text-xs font-mono block bg-background p-2 rounded">
              name,email,student_id
            </code>
            <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
              <li><strong>name</strong> (required) — Student full name</li>
              <li><strong>email</strong> (required) — Student email (must be unique)</li>
              <li><strong>student_id</strong> (optional) — Matriculation number</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-2">
              Existing emails will be skipped. New accounts get the default password: <code className="bg-background px-1 rounded">ChangeMe123!</code>
            </p>
          </div>

          {importing && (
            <div className="flex items-center gap-2 text-sm text-[#008751]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing CSV...
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#008751]" />
              Import Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-center">
                <div className="text-2xl font-bold text-emerald-700">{result.successfulImports}</div>
                <div className="text-xs text-emerald-600">Imported</div>
              </div>
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-center">
                <div className="text-2xl font-bold text-amber-700">{result.skippedExisting}</div>
                <div className="text-xs text-amber-600">Skipped (existing)</div>
              </div>
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-center">
                <div className="text-2xl font-bold text-red-700">{result.errors.length}</div>
                <div className="text-xs text-red-600">Errors</div>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Errors:</p>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {result.errors.map((err, i) => (
                    <div key={i} className="text-xs text-red-600 flex items-center gap-2">
                      <span className="font-mono bg-red-50 px-1.5 py-0.5 rounded">Row {err.row}</span>
                      <span>{err.email}</span>
                      <span>{err.error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* API Reference Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
            API Reference
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="p-3 rounded-lg border">
            <p className="font-medium mb-1">Batch Scan API</p>
            <code className="text-xs font-mono block bg-muted px-2 py-1 rounded">
              POST /api/batch/scan
            </code>
            <pre className="text-xs mt-2 bg-muted p-2 rounded overflow-x-auto max-h-48">
{`{
  "documents": [
    { "title": "Essay 1", "content": "..." },
    { "title": "Essay 2", "content": "..." }
  ],
  "exclusionSettings": {
    "excludeQuotes": true,
    "excludeBibliography": true
  }
}`}
            </pre>
          </div>
          <div className="p-3 rounded-lg border">
            <p className="font-medium mb-1">Batch Upload API (ZIP)</p>
            <code className="text-xs font-mono block bg-muted px-2 py-1 rounded">
              POST /api/batch/upload
            </code>
            <p className="text-xs text-muted-foreground mt-1">Send as multipart/form-data with a <code>file</code> field containing a .zip file.</p>
          </div>
          <div className="p-3 rounded-lg border">
            <p className="font-medium mb-1">CSV Import API</p>
            <code className="text-xs font-mono block bg-muted px-2 py-1 rounded">
              POST /api/import/csv
            </code>
            <p className="text-xs text-muted-foreground mt-1">Send as multipart/form-data with a <code>file</code> field containing a .csv file.</p>
          </div>
          <div className="p-3 rounded-lg border">
            <p className="font-medium mb-1">API Key Authentication</p>
            <p className="text-xs text-muted-foreground">
              Pass your API key in the <code>X-API-Key</code> header with all requests.
            </p>
            <code className="text-xs font-mono block bg-muted px-2 py-1 rounded mt-1">
              X-API-Key: nig_abc123...
            </code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ──────────────────────────────────────────────
// Main Export
// ──────────────────────────────────────────────
export function DeveloperToolsPanel() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      <div className="text-center mb-2">
        <h2 className="text-2xl font-bold mb-2">Developer Tools</h2>
        <p className="text-muted-foreground">
          API keys, webhooks, batch processing, and CSV import for NigWrite integrations.
        </p>
      </div>

      <Tabs defaultValue="api-keys" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="api-keys" className="gap-1.5 text-xs sm:text-sm">
            <Key className="h-3.5 w-3.5 hidden sm:block" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="gap-1.5 text-xs sm:text-sm">
            <Webhook className="h-3.5 w-3.5 hidden sm:block" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="batch" className="gap-1.5 text-xs sm:text-sm">
            <Layers className="h-3.5 w-3.5 hidden sm:block" />
            Batch
          </TabsTrigger>
          <TabsTrigger value="csv" className="gap-1.5 text-xs sm:text-sm">
            <FileUp className="h-3.5 w-3.5 hidden sm:block" />
            CSV Import
          </TabsTrigger>
        </TabsList>
        <TabsContent value="api-keys" className="mt-4">
          <ApiKeysPanel />
        </TabsContent>
        <TabsContent value="webhooks" className="mt-4">
          <WebhooksPanel />
        </TabsContent>
        <TabsContent value="batch" className="mt-4">
          <BatchProcessingPanel />
        </TabsContent>
        <TabsContent value="csv" className="mt-4">
          <CsvImportPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
