/**
 * NigWrite - Quick Marks Panel
 * Collapsible panel showing reusable comment templates grouped by category
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  PanelRightClose,
  PanelRightOpen,
  Search,
  Plus,
  X,
  Bookmark,
  GripVertical,
  Loader2,
} from 'lucide-react';

interface QuickMark {
  id: string;
  title: string;
  text: string;
  category: string;
  color: string;
  useCount: number;
}

interface QuickMarksPanelProps {
  userId: string;
  onSelectQuickMark?: (text: string, color: string) => void;
  onNewCommentText?: string | null;
}

const DEFAULT_CATEGORIES = ['General', 'Grammar', 'Structure', 'Clarity', 'Citation', 'Content'];

export function QuickMarksPanel({
  userId,
  onSelectQuickMark,
  onNewCommentText,
}: QuickMarksPanelProps) {
  const [quickMarks, setQuickMarks] = useState<QuickMark[]>([]);
  const [isOpen, setIsOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isLoading, setIsLoading] = useState(false);

  // Create form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newText, setNewText] = useState('');
  const [newCategory, setNewCategory] = useState('General');
  const [isCreating, setIsCreating] = useState(false);

  // Auto-fill text if provided (from "Save as Quick Mark")
  useEffect(() => {
    if (onNewCommentText) {
      setNewText(onNewCommentText);
      setNewTitle(onNewCommentText.slice(0, 50));
      setShowCreateForm(true);
    }
  }, [onNewCommentText]);

  const loadQuickMarks = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ userId });
      if (selectedCategory !== 'All') params.set('category', selectedCategory);
      const response = await fetch(`/api/comments/quickmarks?${params}`);
      const result = await response.json();
      if (result.success) {
        setQuickMarks(result.data);
      }
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, [userId, selectedCategory]);

  useEffect(() => {
    loadQuickMarks();
  }, [loadQuickMarks]);

  // Group by category
  const filtered = searchQuery
    ? quickMarks.filter(
        (qm) =>
          qm.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          qm.text.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : quickMarks;

  const grouped = filtered.reduce<Record<string, QuickMark[]>>((acc, qm) => {
    const cat = qm.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(qm);
    return acc;
  }, {});

  const handleCreate = useCallback(async () => {
    if (!newTitle.trim() || !newText.trim()) return;
    setIsCreating(true);
    try {
      const response = await fetch('/api/comments/quickmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          title: newTitle.trim(),
          text: newText.trim(),
          category: newCategory,
        }),
      });
      const result = await response.json();
      if (result.success) {
        setQuickMarks((prev) => [result.data, ...prev]);
        setNewTitle('');
        setNewText('');
        setShowCreateForm(false);
      }
    } catch {
      // silent
    } finally {
      setIsCreating(false);
    }
  }, [userId, newTitle, newText, newCategory]);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await fetch(`/api/comments/quickmarks?id=${id}`, { method: 'DELETE' });
        setQuickMarks((prev) => prev.filter((qm) => qm.id !== id));
      } catch {
        // silent
      }
    },
    []
  );

  const categories = ['All', ...DEFAULT_CATEGORIES];

  return (
    <div className="flex">
      {/* Toggle button */}
      {!isOpen && (
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => setIsOpen(true)}
          title="Open Quick Marks"
        >
          <PanelRightOpen className="h-4 w-4" />
        </Button>
      )}

      {/* Panel */}
      {isOpen && (
        <div className="w-72 border bg-white rounded-lg overflow-hidden flex flex-col max-h-[600px]">
          {/* Header */}
          <div className="px-3 py-2.5 bg-gray-50 border-b flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5">
              <Bookmark className="h-3.5 w-3.5 text-amber-600" />
              <span className="text-sm font-semibold">Quick Marks</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {quickMarks.length}
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setShowCreateForm(!showCreateForm)}
                title="Create Quick Mark"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsOpen(false)}
              >
                <PanelRightClose className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="px-3 py-2 border-b shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search marks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 text-sm pl-8"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="px-3 py-2 border-b flex flex-wrap gap-1 shrink-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`text-[10px] px-2 py-0.5 rounded-full transition-colors ${
                  selectedCategory === cat
                    ? 'bg-[#008751] text-white'
                    : 'bg-gray-100 text-muted-foreground hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Create Form */}
          {showCreateForm && (
            <div className="px-3 py-3 border-b bg-amber-50 space-y-2 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">New Quick Mark</span>
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setShowCreateForm(false)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <Input
                placeholder="Title..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="h-8 text-sm"
              />
              <Textarea
                placeholder="Comment text..."
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                className="min-h-[50px] text-sm resize-none"
              />
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full h-8 text-sm border rounded-md px-2 bg-white"
              >
                {DEFAULT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={!newTitle.trim() || !newText.trim() || isCreating}
                className="w-full h-8 text-xs bg-[#008751] hover:bg-[#006b40]"
              >
                {isCreating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3 mr-1" />}
                Save Quick Mark
              </Button>
            </div>
          )}

          {/* Quick Marks List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                {searchQuery ? 'No matches found.' : 'No quick marks yet.'}
              </div>
            ) : (
              Object.entries(grouped).map(([category, marks]) => (
                <div key={category}>
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1">
                    {category}
                  </div>
                  <div className="space-y-1">
                    {marks.map((qm) => (
                      <div
                        key={qm.id}
                        className="p-2 rounded-md border hover:bg-gray-50 cursor-pointer group transition-colors"
                        onClick={() => onSelectQuickMark?.(qm.text, qm.color)}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', qm.text);
                          e.dataTransfer.setData('application/color', qm.color);
                        }}
                      >
                        <div className="flex items-start gap-1.5">
                          <GripVertical className="h-3 w-3 text-muted-foreground mt-0.5 opacity-0 group-hover:opacity-100 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{qm.title}</p>
                            <p className="text-[11px] text-muted-foreground line-clamp-2">{qm.text}</p>
                          </div>
                          <button
                            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-100 text-muted-foreground hover:text-red-600 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(qm.id);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
