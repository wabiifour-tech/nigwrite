/**
 * NigWrite - Inline Comment Tool
 * Wraps document text with inline commenting capability:
 * - Click to place point comments
 * - Select text to highlight with comments
 * - Comment bubbles with edit/delete/resolve
 */

'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare,
  Plus,
  X,
  Check,
  Trash2,
  Pencil,
  ChevronDown,
  ChevronUp,
  Bookmark,
} from 'lucide-react';

interface InlineComment {
  id: string;
  text: string;
  position: number;
  rangeLength: number;
  color: string;
  isResolved: boolean;
  user?: { name: string | null; email: string } | null;
  createdAt: string;
}

interface InlineCommentToolProps {
  documentContent: string;
  submissionId: string;
  userId: string;
  comments: InlineComment[];
  onCommentAdded?: (comment: InlineComment) => void;
  onCommentUpdated?: (id: string, data: Partial<InlineComment>) => void;
  onCommentDeleted?: (id: string) => void;
  onSaveAsQuickMark?: (text: string) => void;
}

const HIGHLIGHT_COLORS = [
  '#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1',
  '#96CEB4', '#DDA0DD', '#F7DC6F', '#85C1E9',
];

export function InlineCommentTool({
  documentContent,
  submissionId,
  userId,
  comments: initialComments,
  onCommentAdded,
  onCommentUpdated,
  onCommentDeleted,
  onSaveAsQuickMark,
}: InlineCommentToolProps) {
  const [comments, setComments] = useState<InlineComment[]>(initialComments);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [showNewCommentInput, setShowNewCommentInput] = useState(false);
  const [commentPosition, setCommentPosition] = useState<number>(0);
  const [selectedRange, setSelectedRange] = useState<{ start: number; length: number } | null>(null);
  const [selectedColor, setSelectedColor] = useState('#FFD700');
  const contentRef = useRef<HTMLDivElement>(null);
  const [showResolved, setShowResolved] = useState(false);

  useEffect(() => {
    setComments(initialComments);
  }, [initialComments]);

  const visibleComments = useMemo(() => {
    const sorted = [...comments].sort((a, b) => a.position - b.position);
    return showResolved ? sorted : sorted.filter((c) => !c.isResolved);
  }, [comments, showResolved]);

  // Build highlighted content
  const renderContent = useMemo(() => {
    if (!documentContent) return null;

    const unresolvedComments = comments.filter((c) => !c.isResolved && c.rangeLength > 0);
    const segments: Array<{ text: string; commentId?: string; color?: string }> = [];
    let currentPos = 0;

    // Sort by position
    const sorted = [...unresolvedComments].sort((a, b) => a.position - b.position);

    for (const comment of sorted) {
      if (comment.position > currentPos) {
        segments.push({ text: documentContent.slice(currentPos, comment.position) });
      }
      const end = Math.min(comment.position + comment.rangeLength, documentContent.length);
      segments.push({
        text: documentContent.slice(comment.position, end),
        commentId: comment.id,
        color: comment.color,
      });
      currentPos = end;
    }

    if (currentPos < documentContent.length) {
      segments.push({ text: documentContent.slice(currentPos) });
    }

    return segments;
  }, [documentContent, comments]);

  const handleTextSelect = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !contentRef.current) return;

    const range = selection.getRangeAt(0);
    const preRange = range.cloneRange();
    preRange.selectNodeContents(contentRef.current);
    preRange.setEnd(range.startContainer, range.startOffset);
    const start = preRange.toString().length;
    const length = selection.toString().length;

    if (length > 0) {
      setSelectedRange({ start, length });
      setCommentPosition(start);
      setShowNewCommentInput(true);
      setNewCommentText('');
    }
  }, []);

  const handleContentClick = useCallback(
    (e: React.MouseEvent) => {
      if (contentRef.current && !window.getSelection()?.toString()) {
        const range = document.createRange();
        const sel = window.getSelection();
        if (sel && e.target instanceof Text) {
          range.setStart(e.target, 0);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);

          const preRange = range.cloneRange();
          preRange.selectNodeContents(contentRef.current);
          preRange.setEnd(range.startContainer, range.startOffset);
          const pos = preRange.toString().length;

          setCommentPosition(pos);
          setSelectedRange(null);
          setShowNewCommentInput(true);
          setNewCommentText('');
        }
      }
    },
    []
  );

  const handleAddComment = useCallback(async () => {
    if (!newCommentText.trim()) return;

    const commentData = {
      submissionId,
      userId,
      text: newCommentText.trim(),
      position: commentPosition,
      rangeLength: selectedRange?.length || 0,
      color: selectedColor,
    };

    try {
      const response = await fetch('/api/comments/inline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(commentData),
      });

      const result = await response.json();
      if (result.success) {
        setComments((prev) => [...prev, result.data]);
        onCommentAdded?.(result.data);
        setShowNewCommentInput(false);
        setNewCommentText('');
        setSelectedRange(null);
        window.getSelection()?.removeAllRanges();
      }
    } catch {
      // silent
    }
  }, [submissionId, userId, newCommentText, commentPosition, selectedRange, selectedColor, onCommentAdded]);

  const handleResolve = useCallback(
    async (id: string) => {
      try {
        const response = await fetch(`/api/comments/inline/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isResolved: true }),
        });
        const result = await response.json();
        if (result.success) {
          setComments((prev) => prev.map((c) => (c.id === id ? { ...c, isResolved: true } : c)));
          onCommentUpdated?.(id, { isResolved: true });
        }
      } catch {
        // silent
      }
    },
    [onCommentUpdated]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        const response = await fetch(`/api/comments/inline/${id}`, { method: 'DELETE' });
        const result = await response.json();
        if (result.success) {
          setComments((prev) => prev.filter((c) => c.id !== id));
          onCommentDeleted?.(id);
        }
      } catch {
        // silent
      }
    },
    [onCommentDeleted]
  );

  const handleEdit = useCallback(
    async (id: string) => {
      if (!editText.trim()) return;
      try {
        const response = await fetch(`/api/comments/inline/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: editText.trim() }),
        });
        const result = await response.json();
        if (result.success) {
          setComments((prev) => prev.map((c) => (c.id === id ? { ...c, text: editText.trim() } : c)));
          onCommentUpdated?.(id, { text: editText.trim() });
          setEditingCommentId(null);
          setEditText('');
        }
      } catch {
        // silent
      }
    },
    [editText, onCommentUpdated]
  );

  return (
    <div className="rounded-lg border bg-white overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Inline Comments</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {comments.filter((c) => !c.isResolved).length} active
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowResolved(!showResolved)}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            {showResolved ? 'Hide' : 'Show'} resolved
          </button>
        </div>
      </div>

      {/* Document Content with highlights */}
      <div
        ref={contentRef}
        className="max-h-[500px] overflow-y-auto p-4 sm:p-6"
        onMouseUp={handleTextSelect}
        onClick={handleContentClick}
      >
        <div className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">
          {renderContent?.map((seg, i) => {
            if (seg.commentId) {
              return (
                <mark
                  key={i}
                  className="px-0.5 rounded-sm cursor-pointer opacity-80 hover:opacity-100"
                  style={{ backgroundColor: seg.color }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveCommentId(seg.commentId === activeCommentId ? null : seg.commentId!);
                  }}
                >
                  {seg.text}
                </mark>
              );
            }
            return <span key={i}>{seg.text}</span>;
          })}
        </div>
      </div>

      {/* New Comment Input */}
      {showNewCommentInput && (
        <div className="border-t bg-amber-50 p-3 space-y-2">
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium text-muted-foreground mr-1">Highlight:</span>
            {HIGHLIGHT_COLORS.map((color) => (
              <button
                key={color}
                className={`w-5 h-5 rounded-full border-2 transition-all ${
                  selectedColor === color ? 'border-gray-800 scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: color }}
                onClick={() => setSelectedColor(color)}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <Textarea
              placeholder="Type your comment..."
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              className="flex-1 min-h-[36px] h-9 text-sm resize-none py-1.5"
              autoFocus
            />
            <Button size="sm" onClick={handleAddComment} disabled={!newCommentText.trim()} className="bg-[#008751] hover:bg-[#006b40] h-9">
              <Plus className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowNewCommentInput(false);
                setNewCommentText('');
                setSelectedRange(null);
              }}
              className="h-9"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Comments List */}
      <div className="border-t max-h-[250px] overflow-y-auto">
        {visibleComments.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground">
            No comments yet. Select text or click on the document to add comments.
          </div>
        ) : (
          <div className="divide-y">
            {visibleComments.map((comment) => (
              <div
                key={comment.id}
                className={`p-3 transition-colors hover:bg-gray-50 ${
                  comment.isResolved ? 'opacity-50' : ''
                } ${activeCommentId === comment.id ? 'bg-amber-50' : ''}`}
                onClick={() => setActiveCommentId(comment.id === activeCommentId ? null : comment.id)}
              >
                <div className="flex items-start gap-2">
                  <div
                    className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                    style={{ backgroundColor: comment.color }}
                  />
                  <div className="flex-1 min-w-0">
                    {editingCommentId === comment.id ? (
                      <div className="space-y-1.5">
                        <Textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="min-h-[36px] h-9 text-sm resize-none"
                          autoFocus
                        />
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            onClick={() => handleEdit(comment.id)}
                            className="h-7 text-xs bg-[#008751] hover:bg-[#006b40]"
                          >
                            <Check className="h-3 w-3 mr-0.5" /> Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingCommentId(null)}
                            className="h-7 text-xs"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-gray-800">{comment.text}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-muted-foreground">
                            {comment.user?.name || comment.user?.email || 'Instructor'}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(comment.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-1.5">
                          {!comment.isResolved && (
                            <button
                              className="p-1 rounded hover:bg-gray-200 text-muted-foreground hover:text-emerald-600"
                              title="Resolve"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleResolve(comment.id);
                              }}
                            >
                              <Check className="h-3 w-3" />
                            </button>
                          )}
                          <button
                            className="p-1 rounded hover:bg-gray-200 text-muted-foreground hover:text-blue-600"
                            title="Edit"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingCommentId(comment.id);
                              setEditText(comment.text);
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          {onSaveAsQuickMark && (
                            <button
                              className="p-1 rounded hover:bg-gray-200 text-muted-foreground hover:text-amber-600"
                              title="Save as Quick Mark"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSaveAsQuickMark(comment.text);
                              }}
                            >
                              <Bookmark className="h-3 w-3" />
                            </button>
                          )}
                          <button
                            className="p-1 rounded hover:bg-gray-200 text-muted-foreground hover:text-red-600"
                            title="Delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(comment.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
