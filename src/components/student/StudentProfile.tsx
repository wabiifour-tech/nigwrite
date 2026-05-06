'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { useTheme } from 'next-themes';
import {
  User,
  Mail,
  Building2,
  Calendar,
  FileText,
  Shield,
  Award,
  TrendingUp,
  Sun,
  Moon,
  Lock,
} from 'lucide-react';

interface ProfileData {
  name: string;
  email: string;
  institution: string;
  joinedDate: string;
  totalWords: number;
  totalSubmissions: number;
  avgSimilarity: number;
  avgAiScore: number;
  originalWorkCount: number;
}

export default function StudentProfile() {
  const [profile, setProfile] = useState<ProfileData>({
    name: '',
    email: '',
    institution: 'Not set',
    joinedDate: '',
    totalWords: 0,
    totalSubmissions: 0,
    avgSimilarity: 0,
    avgAiScore: 0,
    originalWorkCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    async function loadProfile() {
      try {
        // Get scan reports for stats
        const res = await fetch('/api/scan');
        const data = await res.json();
        if (data.success && data.data) {
          const reports = data.data;
          const totalSubmissions = reports.length;
          const avgSimilarity = reports.reduce((s: number, r: { similarityScore: number }) => s + (r.similarityScore || 0), 0) / (totalSubmissions || 1);
          const avgAiScore = reports.reduce((s: number, r: { aiScore: number }) => s + (r.aiScore || 0), 0) / (totalSubmissions || 1);
          const totalWords = reports.reduce((s: number, r: { document: { contentBody: string } }) => {
            const body = r.document?.contentBody || '';
            return s + body.split(/\s+/).filter((w: string) => w.length > 0).length;
          }, 0);
          const originalWorkCount = reports.filter((r: { similarityScore: number }) => (r.similarityScore || 0) <= 25).length;

          setProfile(prev => ({
            ...prev,
            totalSubmissions,
            avgSimilarity,
            avgAiScore,
            totalWords,
            originalWorkCount,
            joinedDate: reports.length > 0
              ? new Date(reports[reports.length - 1].createdAt).toLocaleDateString()
              : 'Today',
          }));
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4 space-y-4">
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      <h2 className="text-2xl font-bold">My Profile</h2>

      {/* Student Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5 text-[#008751]" />
            Student Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3" /> Name
              </Label>
              <p className="text-sm font-medium">{profile.name || 'Student'}</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Mail className="h-3 w-3" /> Email
              </Label>
              <p className="text-sm font-medium">{profile.email || 'Not set'}</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Building2 className="h-3 w-3" /> Institution
              </Label>
              <p className="text-sm font-medium">{profile.institution}</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Joined
              </Label>
              <p className="text-sm font-medium">{profile.joinedDate}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Writing Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[#008751]" />
            Writing Statistics
          </CardTitle>
          <CardDescription>Your performance across all submissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              {
                label: 'Total Words Submitted',
                value: profile.totalWords.toLocaleString(),
                icon: FileText,
                color: 'text-[#008751]',
                bg: 'bg-[#008751]/10',
              },
              {
                label: 'Total Submissions',
                value: profile.totalSubmissions.toString(),
                icon: Shield,
                color: 'text-blue-600',
                bg: 'bg-blue-50',
              },
              {
                label: 'Original Work',
                value: profile.originalWorkCount.toString(),
                icon: Award,
                color: 'text-emerald-600',
                bg: 'bg-emerald-50',
              },
              {
                label: 'Avg. Similarity',
                value: `${profile.avgSimilarity.toFixed(1)}%`,
                icon: TrendingUp,
                color: profile.avgSimilarity < 25 ? 'text-emerald-600' : 'text-amber-600',
                bg: 'bg-emerald-50',
              },
              {
                label: 'Avg. AI Score',
                value: `${profile.avgAiScore.toFixed(1)}%`,
                icon: TrendingUp,
                color: profile.avgAiScore < 25 ? 'text-emerald-600' : 'text-purple-600',
                bg: 'bg-purple-50',
              },
              {
                label: 'Integrity Score',
                value: `${Math.max(0, 100 - profile.avgSimilarity - profile.avgAiScore).toFixed(0)}%`,
                icon: Shield,
                color: 'text-[#008751]',
                bg: 'bg-[#008751]/10',
              },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className={`text-sm font-bold ${color}`}>{value}</p>
                </div>
              </div>
            ))}
          </div>

          {profile.totalSubmissions > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-emerald-600" />
                <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">
                  {profile.avgSimilarity < 15
                    ? "Excellent! Your work shows outstanding originality."
                    : profile.avgSimilarity < 30
                      ? "Good job! Your similarity scores are well within acceptable range."
                      : "Consider reviewing your flagged sections and adding more citations."}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="h-5 w-5 text-muted-foreground" />
            Account Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword" className="text-sm font-medium">
              Change Password
            </Label>
            <div className="space-y-2">
              <Input id="currentPassword" type="password" placeholder="Current password" className="max-w-sm" disabled />
              <Input type="password" placeholder="New password" className="max-w-sm" disabled />
              <Input type="password" placeholder="Confirm new password" className="max-w-sm" disabled />
              <p className="text-xs text-muted-foreground">Password changes are managed through your institution&apos;s authentication system.</p>
            </div>
          </div>

          <div className="pt-2 border-t">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Dark Mode</p>
                <p className="text-xs text-muted-foreground">Toggle between light and dark themes</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="gap-2"
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="h-4 w-4" />
                    Light Mode
                  </>
                ) : (
                  <>
                    <Moon className="h-4 w-4" />
                    Dark Mode
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
