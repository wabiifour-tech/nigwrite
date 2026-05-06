/**
 * NigWrite — Course Management Component
 * Searchable, paginated table with CRUD and enrollment management.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Search, Plus, Edit, Trash2, BookOpen, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Loader2, Users, Calendar, BarChart3,
} from 'lucide-react';

interface InstructorData { id: string; name: string | null; email: string }
interface CourseData {
  id: string;
  name: string;
  code: string;
  description: string | null;
  department: string | null;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  instructor: InstructorData | null;
  institution: { id: string; name: string } | null;
  _count: { enrollments: number; assignments: number };
}

interface CourseDetail extends CourseData {
  enrollments: { id: string; role: string; user: { id: string; name: string | null; email: string } }[];
  assignments: { id: string; title: string; _count: { submissions: number } }[];
  stats: { totalSubmissions: number; avgSimilarity: number; avgAiScore: number; highRiskSubmissions: number };
}

export function CourseManagement() {
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [courseDetail, setCourseDetail] = useState<CourseDetail | null>(null);

  // Create dialog
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', code: '', description: '', department: '', startDate: '', endDate: '' });
  const [creating, setCreating] = useState(false);

  // Edit dialog
  const [editingCourse, setEditingCourse] = useState<CourseData | null>(null);
  const [editForm, setEditForm] = useState({ name: '', code: '', description: '', department: '', startDate: '', endDate: '', isActive: true });

  // Enroll dialog
  const [showEnroll, setShowEnroll] = useState(false);
  const [enrollCourseId, setEnrollCourseId] = useState('');
  const [enrollEmail, setEnrollEmail] = useState('');
  const [enrolling, setEnrolling] = useState(false);

  const limit = 20;

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set('department', search);
      const res = await fetch(`/api/admin/courses?${params}`);
      const result = await res.json();
      if (result.success) {
        setCourses(result.data.courses);
        setTotalPages(result.data.pagination.totalPages);
      }
    } catch { /* silent */ } finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  const loadCourseDetail = async (courseId: string) => {
    try {
      const res = await fetch(`/api/admin/courses/${courseId}`);
      const result = await res.json();
      if (result.success) setCourseDetail(result.data);
    } catch { /* silent */ }
  };

  const toggleExpand = (courseId: string) => {
    if (expandedCourse === courseId) {
      setExpandedCourse(null);
      setCourseDetail(null);
    } else {
      setExpandedCourse(courseId);
      loadCourseDetail(courseId);
    }
  };

  const handleCreate = async () => {
    if (!createForm.name || !createForm.code) return;
    setCreating(true);
    try {
      const res = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      const result = await res.json();
      if (result.success) {
        setShowCreate(false);
        setCreateForm({ name: '', code: '', description: '', department: '', startDate: '', endDate: '' });
        fetchCourses();
      } else alert(result.error || 'Failed');
    } catch { alert('Network error'); }
    finally { setCreating(false); }
  };

  const handleUpdate = async () => {
    if (!editingCourse) return;
    try {
      const res = await fetch(`/api/admin/courses/${editingCourse.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        setEditingCourse(null);
        fetchCourses();
        if (expandedCourse === editingCourse.id) loadCourseDetail(editingCourse.id);
      }
    } catch { /* silent */ }
  };

  const handleArchive = async (id: string) => {
    try {
      await fetch(`/api/admin/courses/${id}`, { method: 'DELETE' });
      fetchCourses();
      if (expandedCourse === id) { setExpandedCourse(null); setCourseDetail(null); }
    } catch { /* silent */ }
  };

  const handleEnroll = async () => {
    if (!enrollEmail.trim()) return;
    setEnrolling(true);
    try {
      // First find the user by email
      const searchRes = await fetch(`/api/admin/users?search=${encodeURIComponent(enrollEmail)}&limit=1`);
      const searchResult = await searchRes.json();
      const user = searchResult.data?.users?.[0];
      if (!user) { alert('User not found with that email'); setEnrolling(false); return; }

      const res = await fetch(`/api/admin/courses/${enrollCourseId}/enrollments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, role: 'student' }),
      });
      if (res.ok) {
        setShowEnroll(false);
        setEnrollEmail('');
        if (expandedCourse) loadCourseDetail(expandedCourse);
        fetchCourses();
      } else {
        const result = await res.json();
        alert(result.error || 'Failed to enroll');
      }
    } catch { alert('Network error'); }
    finally { setEnrolling(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-xl font-bold flex items-center gap-2"><BookOpen className="h-5 w-5" /> Course Management</h2>
        <Button onClick={() => setShowCreate(true)} className="gap-2 bg-[#008751] hover:bg-[#006b40]">
          <Plus className="h-4 w-4" /> Add Course
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Filter by department..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="pl-9 max-w-sm"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="w-8" />
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Code</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Name</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground hidden md:table-cell">Department</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground hidden lg:table-cell">Instructor</th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground">Students</th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground hidden sm:table-cell">Assignments</th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b"><td colSpan={9} className="py-3 px-4"><Skeleton className="h-5 w-full" /></td></tr>
                )) : courses.length === 0 ? (
                  <tr><td colSpan={9} className="py-12 text-center text-muted-foreground">
                    <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />No courses found
                  </td></tr>
                ) : courses.map(course => (
                  <>
                    <tr key={course.id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => toggleExpand(course.id)}>
                      <td className="py-3 px-2">
                        {expandedCourse === course.id
                          ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="font-mono text-xs">{course.code}</Badge>
                      </td>
                      <td className="py-3 px-4 font-medium">{course.name}</td>
                      <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">{course.department || '—'}</td>
                      <td className="py-3 px-4 text-muted-foreground text-xs hidden lg:table-cell">{course.instructor?.name || '—'}</td>
                      <td className="py-3 px-4 text-center">{course._count.enrollments}</td>
                      <td className="py-3 px-4 text-center hidden sm:table-cell">{course._count.assignments}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={course.isActive ? 'default' : 'secondary'} className={course.isActive ? 'bg-emerald-100 text-emerald-700' : ''}>
                          {course.isActive ? 'Active' : 'Archived'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditForm({ name: course.name, code: course.code, description: course.description || '', department: course.department || '', startDate: course.startDate?.split('T')[0] || '', endDate: course.endDate?.split('T')[0] || '', isActive: course.isActive }); setEditingCourse(course); }}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          {course.isActive && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleArchive(course.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedCourse === course.id && courseDetail && (
                      <tr key={`${course.id}-detail`}>
                        <td colSpan={9} className="p-0">
                          <div className="bg-muted/20 border-t">
                            <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                              <div className="rounded-lg border p-3 bg-background">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><Users className="h-3.5 w-3.5" /> Enrollments</div>
                                <div className="font-semibold">{courseDetail.enrollments.length}</div>
                                <div className="mt-2 space-y-1 max-h-24 overflow-y-auto">
                                  {courseDetail.enrollments.map(e => (
                                    <div key={e.id} className="text-xs text-muted-foreground truncate">{e.user.name || e.user.email}</div>
                                  ))}
                                  {courseDetail.enrollments.length === 0 && <div className="text-xs text-muted-foreground">No enrollments</div>}
                                </div>
                                {course.isActive && (
                                  <Button variant="ghost" size="sm" className="mt-2 text-xs gap-1 w-full" onClick={() => { setEnrollCourseId(course.id); setShowEnroll(true); }}>
                                    <Plus className="h-3 w-3" /> Enroll User
                                  </Button>
                                )}
                              </div>
                              <div className="rounded-lg border p-3 bg-background">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><BarChart3 className="h-3.5 w-3.5" /> Statistics</div>
                                <div className="space-y-2 text-sm">
                                  <div>Submissions: <span className="font-semibold">{courseDetail.stats.totalSubmissions}</span></div>
                                  <div>Avg Similarity: <span className={`font-semibold ${courseDetail.stats.avgSimilarity > 60 ? 'text-red-600' : courseDetail.stats.avgSimilarity > 30 ? 'text-orange-600' : 'text-emerald-600'}`}>{courseDetail.stats.avgSimilarity.toFixed(1)}%</span></div>
                                  <div>Avg AI Score: <span className={`font-semibold ${courseDetail.stats.avgAiScore > 60 ? 'text-red-600' : 'text-emerald-600'}`}>{courseDetail.stats.avgAiScore.toFixed(1)}%</span></div>
                                  <div>High-Risk: <span className="font-semibold text-red-600">{courseDetail.stats.highRiskSubmissions}</span></div>
                                </div>
                              </div>
                              <div className="rounded-lg border p-3 bg-background md:col-span-2">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><Calendar className="h-3.5 w-3.5" /> Assignments</div>
                                <div className="space-y-1 max-h-48 overflow-y-auto">
                                  {courseDetail.assignments.map(a => (
                                    <div key={a.id} className="flex items-center justify-between py-1 text-xs border-b last:border-b-0">
                                      <span className="truncate">{a.title}</span>
                                      <Badge variant="secondary" className="ml-2 shrink-0">{a._count.submissions} submissions</Badge>
                                    </div>
                                  ))}
                                  {courseDetail.assignments.length === 0 && <div className="text-xs text-muted-foreground">No assignments</div>}
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Course</DialogTitle><DialogDescription>Create a new course</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Course Name</Label><Input value={createForm.name} onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))} /></div>
              <div><Label>Course Code</Label><Input placeholder="CS101" value={createForm.code} onChange={e => setCreateForm(p => ({ ...p, code: e.target.value }))} /></div>
            </div>
            <div><Label>Department</Label><Input value={createForm.department} onChange={e => setCreateForm(p => ({ ...p, department: e.target.value }))} /></div>
            <div><Label>Description</Label><Input value={createForm.description} onChange={e => setCreateForm(p => ({ ...p, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start Date</Label><Input type="date" value={createForm.startDate} onChange={e => setCreateForm(p => ({ ...p, startDate: e.target.value }))} /></div>
              <div><Label>End Date</Label><Input type="date" value={createForm.endDate} onChange={e => setCreateForm(p => ({ ...p, endDate: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating} className="bg-[#008751] hover:bg-[#006b40]">
              {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingCourse} onOpenChange={() => setEditingCourse(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Course</DialogTitle><DialogDescription>Update course details</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Course Name</Label><Input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} /></div>
              <div><Label>Course Code</Label><Input value={editForm.code} onChange={e => setEditForm(p => ({ ...p, code: e.target.value }))} /></div>
            </div>
            <div><Label>Department</Label><Input value={editForm.department} onChange={e => setEditForm(p => ({ ...p, department: e.target.value }))} /></div>
            <div><Label>Description</Label><Input value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start Date</Label><Input type="date" value={editForm.startDate} onChange={e => setEditForm(p => ({ ...p, startDate: e.target.value }))} /></div>
              <div><Label>End Date</Label><Input type="date" value={editForm.endDate} onChange={e => setEditForm(p => ({ ...p, endDate: e.target.value }))} /></div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Status</Label>
              <Button variant={editForm.isActive ? 'default' : 'secondary'} size="sm" onClick={() => setEditForm(p => ({ ...p, isActive: !p.isActive }))} className={editForm.isActive ? 'bg-emerald-100 text-emerald-700' : ''}>
                {editForm.isActive ? 'Active' : 'Archived'}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCourse(null)}>Cancel</Button>
            <Button onClick={handleUpdate} className="bg-[#008751] hover:bg-[#006b40]">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enroll Dialog */}
      <Dialog open={showEnroll} onOpenChange={setShowEnroll}>
        <DialogContent>
          <DialogHeader><DialogTitle>Enroll User</DialogTitle><DialogDescription>Enter the user&apos;s email address to enroll</DialogDescription></DialogHeader>
          <div><Label>Email Address</Label><Input type="email" placeholder="user@example.com" value={enrollEmail} onChange={e => setEnrollEmail(e.target.value)} /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEnroll(false)}>Cancel</Button>
            <Button onClick={handleEnroll} disabled={enrolling} className="bg-[#008751] hover:bg-[#006b40]">
              {enrolling && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Enroll
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
