/**
 * NigWrite - Share Report Dialog Component
 * Dialog for creating and managing share links for plagiarism reports.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Share2,
  Copy,
  Check,
  Trash2,
  Link2,
  Lock,
  Eye,
  Clock,
  Loader2,
  AlertCircle,
  Mail,
  Send,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

interface ShareLink {
  id: string;
  shareToken: string;
  expiresAt: string | null;
  viewCount: number;
  maxViews: number | null;
  hasPassword: boolean;
  createdAt: string;
  creator: { id: string; name: string | null; email: string } | null;
}

interface ShareReportDialogProps {
  reportId: string;
  userId: string;
  reportTitle?: string;
  children?: React.ReactNode;
}

function formatExpiry(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  if (diffMs < 0) return 'Expired';

  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 1) return '1 day';
  if (diffDays <= 7) return `${diffDays} days`;
  if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks`;
  return `${Math.ceil(diffDays / 30)} months`;
}

function truncateToken(token: string): string {
  return `${token.substring(0, 8)}...${token.substring(token.length - 8)}`;
}

export function ShareReportDialog({
  reportId,
  userId,
  reportTitle,
  children,
}: ShareReportDialogProps) {
  const [open, setOpen] = useState(false);
  const [shares, setShares] = useState<ShareLink[]>([]);
  const [loadingShares, setLoadingShares] = useState(false);

  // Form state
  const [enablePassword, setEnablePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [expiry, setExpiry] = useState<string>('never');
  const [maxViews, setMaxViews] = useState<string>('');

  // Email state
  const [emailTo, setEmailTo] = useState('');
  const [emailMessage, setEmailMessage] = useState('');

  // Action state
  const [creating, setCreating] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadShares = useCallback(async () => {
    setLoadingShares(true);
    try {
      const response = await fetch(`/api/reports/share?reportId=${reportId}`);
      const result = await response.json();
      if (result.success) {
        setShares(result.data);
      }
    } catch {
      // silent
    } finally {
      setLoadingShares(false);
    }
  }, [reportId]);

  useEffect(() => {
    if (open) {
      loadShares();
      setError('');
      setSuccessMsg('');
    }
  }, [open, loadShares]);

  const getExpiryDate = (option: string): string | null => {
    if (option === 'never') return null;
    const now = new Date();
    if (option === '1day') return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    if (option === '1week') return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    if (option === '1month') return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    return null;
  };

  const handleCreateShare = async () => {
    setCreating(true);
    setError('');
    setSuccessMsg('');

    try {
      const response = await fetch('/api/reports/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId,
          userId,
          expiresAt: getExpiryDate(expiry),
          password: enablePassword ? password : null,
          maxViews: maxViews ? parseInt(maxViews) : null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccessMsg(`Share link created: /shared/report/${result.data.token}`);
        setShares(prev => [
          {
            id: result.data.id,
            shareToken: result.data.token,
            expiresAt: result.data.expiresAt,
            viewCount: 0,
            maxViews: result.data.maxViews,
            hasPassword: enablePassword,
            createdAt: result.data.createdAt,
            creator: null,
          },
          ...prev,
        ]);
        // Reset form
        setPassword('');
        setEnablePassword(false);
        setExpiry('never');
        setMaxViews('');
      } else {
        setError(result.error || 'Failed to create share link');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (shareToken: string) => {
    try {
      const response = await fetch('/api/reports/unshare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareToken }),
      });

      const result = await response.json();
      if (result.success) {
        setShares(prev => prev.filter(s => s.shareToken !== shareToken));
      }
    } catch {
      // silent
    }
  };

  const handleCopyLink = async (token: string) => {
    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/shared/report/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch {
      // Fallback
    }
  };

  const handleSendEmail = async () => {
    if (!emailTo.trim()) return;
    // Create a share link and then send email notification
    setCreating(true);
    try {
      const response = await fetch('/api/reports/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId,
          userId,
          expiresAt: getExpiryDate(expiry),
        }),
      });
      const result = await response.json();
      if (result.success) {
        setSuccessMsg(`Report shared with ${emailTo}`);
        setEmailTo('');
        setEmailMessage('');
        loadShares();
      }
    } catch {
      // silent
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <Share2 className="h-3.5 w-3.5" />
            Share
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-[#008751]" />
            Share Report
          </DialogTitle>
        </DialogHeader>

        {/* Messages */}
        {error && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
        {successMsg && (
          <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-sm">
            <Check className="h-4 w-4 shrink-0" />
            {successMsg}
          </div>
        )}

        {/* Create new share link */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold">Generate Share Link</h4>

          {/* Expiration */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Expiration
            </Label>
            <Select value={expiry} onValueChange={setExpiry}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1day">1 day</SelectItem>
                <SelectItem value="1week">1 week</SelectItem>
                <SelectItem value="1month">1 month</SelectItem>
                <SelectItem value="never">Never</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Password Protection
              </Label>
              <Switch checked={enablePassword} onCheckedChange={setEnablePassword} />
            </div>
            {enablePassword && (
              <Input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-8 text-xs"
              />
            )}
          </div>

          {/* Max views */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <Eye className="h-3 w-3" />
              Max Views (leave empty for unlimited)
            </Label>
            <Input
              type="number"
              placeholder="e.g., 100"
              value={maxViews}
              onChange={(e) => setMaxViews(e.target.value)}
              className="h-8 text-xs"
              min={1}
            />
          </div>

          {/* Generate button */}
          <Button
            onClick={handleCreateShare}
            disabled={creating || (enablePassword && !password.trim())}
            className="w-full gap-1.5 bg-[#008751] hover:bg-[#006b40]"
            size="sm"
          >
            {creating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Link2 className="h-3.5 w-3.5" />
                Generate Share Link
              </>
            )}
          </Button>
        </div>

        <Separator />

        {/* Active share links */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Active Share Links</h4>
          {loadingShares ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : shares.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              No active share links. Create one above.
            </p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {shares.map((share) => (
                <div
                  key={share.id}
                  className="flex items-center gap-2 p-2.5 rounded-lg border text-xs"
                >
                  <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-mono truncate text-muted-foreground">
                      /shared/report/{truncateToken(share.shareToken)}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-muted-foreground">
                      <span className="flex items-center gap-0.5">
                        <Eye className="h-2.5 w-2.5" />
                        {share.viewCount}{share.maxViews ? `/${share.maxViews}` : ''}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        {formatExpiry(share.expiresAt)}
                      </span>
                      {share.hasPassword && (
                        <Badge variant="outline" className="text-[9px] h-4 px-1">
                          <Lock className="h-2 w-2" />
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 shrink-0"
                    onClick={() => handleCopyLink(share.shareToken)}
                  >
                    {copiedToken === share.shareToken ? (
                      <Check className="h-3 w-3 text-emerald-600" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 shrink-0 text-red-500 hover:text-red-700"
                    onClick={() => handleRevoke(share.shareToken)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Send via email */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-1.5">
            <Mail className="h-4 w-4" />
            Send via Email
          </h4>
          <div className="space-y-2">
            <Input
              type="email"
              placeholder="Recipient email address"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              className="h-8 text-xs"
            />
            <Textarea
              placeholder="Optional message..."
              value={emailMessage}
              onChange={(e) => setEmailMessage(e.target.value)}
              className="text-xs min-h-[60px]"
              rows={2}
            />
            <Button
              onClick={handleSendEmail}
              disabled={!emailTo.trim() || creating}
              variant="outline"
              size="sm"
              className="w-full gap-1.5 text-xs"
            >
              <Send className="h-3 w-3" />
              Send Email
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
