'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BookOpen,
  GraduationCap,
  FileText,
  Users,
  BarChart3,
  ChevronRight,
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface Course {
  id: string;
  title: string;
  code: string | null;
  assignmentCount: number;
  submissionCount: number;
  avgSimilarity: number;
  instructor: string | null;
}

interface CourseAssignment {
  id: string;
  title: string;
  deadline: string | null;
  _count: { submissions: number };
  hasSubmission: boolean;
  creatorName: string | null;
}

function getDaysUntil(deadline: string): number {
  const now = new Date();
  const dl = new Date(deadline);
  const diff = dl.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function StudentCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [courseAssignments, setCourseAssignments] = useState<CourseAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  const loadCourses = useCallback(async () => {
    try {
      const res = await fetch('/api/assignments');
      const data = await res.json();
      if (data.success && data.data) {
        // Group by courseId and aggregate stats
        const courseMap = new Map<string, {
          title: string;
          code: string;
          assignments: typeof data.data;
          instructors: Set<string>;
          similarityScores: number[];
        }>();
        for (const a of data.data) {
          const key = a.courseId || 'general';
          if (!courseMap.has(key)) {
            courseMap.set(key, {
              title: a.title.includes(':') ? a.title.split(':')[0].trim() : a.courseId || 'General',
              code: a.courseId,
              assignments: [],
              instructors: new Set<string>(),
              similarityScores: [],
            });
          }
          courseMap.get(key)!.assignments.push(a);
          if (a.creator?.name) {
            courseMap.get(key)!.instructors.add(a.creator.name);
          }
        }

        const courseList: Course[] = Array.from(courseMap.entries()).map(([, v]) => ({
          id: v.code || 'general',
          title: v.title,
          code: v.code,
          assignmentCount: v.assignments.length,
          submissionCount: v.assignments.reduce((sum: number, a: { _count: { submissions: number } }) => sum + a._count.submissions, 0),
          avgSimilarity: v.similarityScores.length > 0
            ? v.similarityScores.reduce((s: number, n: number) => s + n, 0) / v.similarityScores.length
            : 0,
          instructor: v.instructors.size > 0 ? Array.from(v.instructors).join(', ') : null,
        }));

        setCourses(courseList);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const handleSelectCourse = useCallback((courseId: string) => {
    setSelectedCourse(prev => prev === courseId ? null : courseId);
    if (selectedCourse !== courseId) {
      setLoadingAssignments(true);
      fetch('/api/assignments')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data) {
            const filtered = data.data
              .filter((a: { courseId: string | null }) => a.courseId === courseId || (!a.courseId && courseId === 'general'))
              .map((a: { id: string; title: string; deadline: string | null; _count: { submissions: number }; creator: { name: string | null } | null }) => ({
                id: a.id,
                title: a.title,
                deadline: a.deadline,
                _count: a._count,
                hasSubmission: a._count.submissions > 0,
                creatorName: a.creator?.name || null,
              }));
            setCourseAssignments(filtered);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingAssignments(false));
    }
  }, [selectedCourse]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-8 px-4 space-y-4">
        <Skeleton className="h-12" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h2 className="text-2xl font-bold">My Courses</h2>
        <p className="text-sm text-muted-foreground">{courses.length} course{courses.length !== 1 ? 's' : ''} available</p>
      </div>

      {selectedCourse && (
        <Button variant="ghost" size="sm" onClick={() => setSelectedCourse(null)} className="gap-1">
          <ArrowLeft className="h-4 w-4" />
          Back to courses
        </Button>
      )}

      {selectedCourse ? (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>{courses.find(c => c.id === selectedCourse)?.title || 'Course'}</CardTitle>
                <CardDescription className="mt-1">
                  {courseAssignments.length} assignment{courseAssignments.length !== 1 ? 's' : ''}
                  {courses.find(c => c.id === selectedCourse)?.instructor && (
                    <span className="ml-2">· Instructor: <strong>{courses.find(c => c.id === selectedCourse)?.instructor}</strong></span>
                  )}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingAssignments ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16" />)}
              </div>
            ) : courseAssignments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No assignments for this course yet.</p>
            ) : (
              <div className="space-y-3">
                {courseAssignments.map((assignment) => {
                  const daysLeft = assignment.deadline ? getDaysUntil(assignment.deadline) : null;
                  return (
                    <div key={assignment.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">{assignment.title}</p>
                          {assignment.creatorName && (
                            <span className="text-[10px] text-muted-foreground shrink-0 hidden sm:inline">by {assignment.creatorName}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          {assignment.deadline && (
                            <span className={`text-xs flex items-center gap-1 ${daysLeft !== null && daysLeft <= 3 ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>
                              <Clock className="h-3 w-3" />
                              {daysLeft !== null && daysLeft < 0
                                ? 'Overdue'
                                : assignment.deadline
                                  ? new Date(assignment.deadline).toLocaleDateString()
                                  : 'No deadline'}
                            </span>
                          )}
                          {daysLeft !== null && daysLeft >= 0 && daysLeft <= 7 && (
                            <span className="text-xs text-amber-600 font-medium">
                              {daysLeft === 0 ? 'Due today' : `${daysLeft}d left`}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {assignment.hasSubmission ? (
                          <Badge className="bg-emerald-100 text-emerald-700 text-xs gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Submitted
                          </Badge>
                        ) : daysLeft !== null && daysLeft < 0 ? (
                          <Badge className="bg-red-100 text-red-700 text-xs gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Overdue
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">Pending</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.length === 0 ? (
            <Card className="md:col-span-2 lg:col-span-3">
              <CardContent className="py-12 text-center text-muted-foreground">
                <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No courses enrolled yet</p>
              </CardContent>
            </Card>
          ) : (
            courses.map((course) => (
              <Card
                key={course.id}
                className="hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => handleSelectCourse(course.id)}
              >
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-lg bg-[#008751]/10 flex items-center justify-center shrink-0">
                      <GraduationCap className="h-5 w-5 text-[#008751]" />
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </div>
                  <h3 className="font-semibold text-sm mt-3">{course.title}</h3>
                  {course.code && (
                    <Badge variant="outline" className="text-[10px] mt-1">{course.code}</Badge>
                  )}
                  {course.instructor && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      <Users className="h-3 w-3 inline mr-1" />
                      {course.instructor}
                    </p>
                  )}
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t">
                    <div className="text-center">
                      <FileText className="h-3.5 w-3.5 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-xs font-bold">{course.assignmentCount}</p>
                      <p className="text-[10px] text-muted-foreground">Assignments</p>
                    </div>
                    <div className="text-center">
                      <Users className="h-3.5 w-3.5 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-xs font-bold">{course.submissionCount}</p>
                      <p className="text-[10px] text-muted-foreground">Submissions</p>
                    </div>
                    <div className="text-center">
                      <BarChart3 className="h-3.5 w-3.5 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-xs font-bold">{course.avgSimilarity.toFixed(0)}%</p>
                      <p className="text-[10px] text-muted-foreground">Avg Similarity</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
