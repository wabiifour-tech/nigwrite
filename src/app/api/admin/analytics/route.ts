/**
 * NigWrite — Admin Analytics API
 * GET /api/admin/analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const analyticsQuerySchema = z.object({
  period: z.enum(['7d', '30d', '90d', 'all']).default('30d'),
  institutionId: z.string().optional(),
});

function getPeriodDate(period: string): Date | null {
  if (period === 'all') return null;
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = analyticsQuerySchema.safeParse({
      period: searchParams.get('period') || '30d',
      institutionId: searchParams.get('institutionId') || undefined,
    });

    if (!query.success) {
      return NextResponse.json({ error: 'Invalid query parameters', details: query.error.issues }, { status: 400 });
    }

    const { period } = query.data;
    const periodDate = getPeriodDate(period);

    // Overview stats
    const totalUsers = await db.user.count({ where: periodDate ? { createdAt: { gte: periodDate } } : {} });
    const totalDocuments = await db.document.count({ where: periodDate ? { createdAt: { gte: periodDate } } : {} });
    const totalScans = await db.scanReport.count({ where: periodDate ? { createdAt: { gte: periodDate } } : {} });
    const totalAssignments = await db.assignment.count({ where: periodDate ? { createdAt: { gte: periodDate } } : {} });
    const totalCourses = await db.course.count({ where: { isActive: true } });

    const activeUsersPeriod = periodDate
      ? await db.user.count({
          where: {
            OR: [
              { documents: { some: { createdAt: { gte: periodDate } } } },
              { submissions: { some: { createdAt: { gte: periodDate } } } },
            ],
          },
        })
      : totalUsers;

    // Similarity stats
    const allReports = await db.scanReport.findMany({
      where: periodDate ? { createdAt: { gte: periodDate } } : {},
      select: { similarityScore: true, aiScore: true, createdAt: true },
    });

    const similarityScores = allReports.map(r => r.similarityScore);
    const avgSimilarity = similarityScores.length > 0
      ? similarityScores.reduce((a, b) => a + b, 0) / similarityScores.length
      : 0;
    const sortedScores = [...similarityScores].sort((a, b) => a - b);
    const medianSimilarity = sortedScores.length > 0
      ? sortedScores[Math.floor(sortedScores.length / 2)]
      : 0;
    const highRiskCount = similarityScores.filter(s => s > 60).length;

    // Score distribution
    const buckets = [
      { range: '0-10', min: 0, max: 10 },
      { range: '11-20', min: 11, max: 20 },
      { range: '21-30', min: 21, max: 30 },
      { range: '31-40', min: 31, max: 40 },
      { range: '41-50', min: 41, max: 50 },
      { range: '51-60', min: 51, max: 60 },
      { range: '61-70', min: 61, max: 70 },
      { range: '71-80', min: 71, max: 80 },
      { range: '81-90', min: 81, max: 90 },
      { range: '91-100', min: 91, max: 100 },
    ];
    const scoreDistribution = buckets.map(b => ({
      range: b.range,
      count: similarityScores.filter(s => s >= b.min && s <= b.max).length,
    }));

    // Daily trend
    const trendDays = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 30;
    const trendStart = new Date(Date.now() - trendDays * 24 * 60 * 60 * 1000);
    const reportsInPeriod = await db.scanReport.findMany({
      where: { createdAt: { gte: trendStart } },
      select: { similarityScore: true, aiScore: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const trendMap = new Map<string, { similaritySum: number; aiSum: number; count: number }>();
    for (let i = 0; i < trendDays; i++) {
      const date = new Date(trendStart.getTime() + i * 24 * 60 * 60 * 1000);
      const key = date.toISOString().split('T')[0];
      trendMap.set(key, { similaritySum: 0, aiSum: 0, count: 0 });
    }
    for (const r of reportsInPeriod) {
      const key = r.createdAt.toISOString().split('T')[0];
      const entry = trendMap.get(key);
      if (entry) {
        entry.similaritySum += r.similarityScore;
        entry.aiSum += r.aiScore;
        entry.count++;
      }
    }
    const trend = Array.from(trendMap.entries()).map(([date, data]) => ({
      date,
      avgScore: data.count > 0 ? Math.round((data.similaritySum / data.count) * 100) / 100 : 0,
      scanCount: data.count,
    }));

    // AI detection stats
    const aiScores = allReports.map(r => r.aiScore);
    const avgAiScore = aiScores.length > 0
      ? aiScores.reduce((a, b) => a + b, 0) / aiScores.length
      : 0;
    const highRiskAiCount = aiScores.filter(s => s > 60).length;

    const aiTrend = Array.from(trendMap.entries()).map(([date, data]) => ({
      date,
      avgAiScore: data.count > 0 ? Math.round((data.aiSum / data.count) * 100) / 100 : 0,
    }));

    // Top matched sources — from flagged segments
    const flaggedSegments = await db.flaggedSegment.findMany({
      where: {
        similarityType: 'plagiarism',
        sourceLink: { not: null },
        ...(periodDate ? { report: { createdAt: { gte: periodDate } } } : {}),
      },
      select: { sourceLink: true, segmentText: true },
    });

    const sourceMap = new Map<string, { title: string; matchCount: number; totalSimilarity: number }>();
    for (const seg of flaggedSegments) {
      const url = seg.sourceLink || '';
      if (!sourceMap.has(url)) {
        const title = url.length > 60 ? url.substring(0, 60) + '...' : url;
        sourceMap.set(url, { title, matchCount: 0, totalSimilarity: 0 });
      }
      const entry = sourceMap.get(url)!;
      entry.matchCount++;
    }
    const topSources = Array.from(sourceMap.values())
      .sort((a, b) => b.matchCount - a.matchCount)
      .slice(0, 10)
      .map(s => ({
        sourceTitle: s.title,
        matchCount: s.matchCount,
        avgMatchPercent: 0,
      }));

    // Department stats from courses
    const coursesWithDept = await db.course.findMany({
      where: { department: { not: null }, isActive: true },
      select: { department: true, id: true },
    });

    const deptMap = new Map<string, { scanCount: number; similaritySum: number }>();
    for (const c of coursesWithDept) {
      const dept = c.department!;
      if (!deptMap.has(dept)) deptMap.set(dept, { scanCount: 0, similaritySum: 0 });
      const entry = deptMap.get(dept)!;
      const submissions = await db.submission.findMany({
        where: { assignment: { courseId: c.id }, reportId: { not: null } },
        include: { report: { select: { similarityScore: true } } },
      });
      for (const s of submissions) {
        entry.scanCount++;
        entry.similaritySum += s.report?.similarityScore || 0;
      }
    }

    const departmentStats = Array.from(deptMap.entries())
      .filter(([_, data]) => data.scanCount > 0)
      .map(([department, data]) => ({
        department,
        avgSimilarity: Math.round((data.similaritySum / data.scanCount) * 100) / 100,
        scanCount: data.scanCount,
      }));

    // Recent activity
    const recentLogs = await db.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, email: true } } },
    });
    const recentActivity = recentLogs.map(log => ({
      id: log.id,
      action: log.action,
      user: log.user?.name || log.user?.email || 'System',
      timestamp: log.createdAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalDocuments,
          totalScans,
          totalAssignments,
          totalCourses,
          activeUsers: activeUsersPeriod,
        },
        similarityStats: {
          averageScore: Math.round(avgSimilarity * 100) / 100,
          medianScore: Math.round(medianSimilarity * 100) / 100,
          scoreDistribution,
          highRiskCount,
          trend,
        },
        aiDetectionStats: {
          averageAiScore: Math.round(avgAiScore * 100) / 100,
          highRiskCount: highRiskAiCount,
          trend: aiTrend,
        },
        topSources,
        departmentStats,
        recentActivity,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch analytics';
    console.error('[Admin Analytics]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
