/**
 * NigWrite - Grading Toolbar
 * Top toolbar for instructor grading view with grade input, letter grade, feedback, rubric access
 */

'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { calculateLetterGrade } from '@/lib/grade-calculator';
import {
  Save,
  ListChecks,
  Loader2,
  MessageSquare,
} from 'lucide-react';

interface GradingToolbarProps {
  submissionId: string;
  assignmentId: string;
  initialGrade?: number | null;
  initialFeedback?: string | null;
  gradeScale?: string;
  maxGrade?: number;
  rubricId?: string | null;
  onOpenRubric: () => void;
  onGradeSaved: (grade: number, letterGrade: string, feedback: string) => void;
  userId: string;
}

export function GradingToolbar({
  submissionId,
  assignmentId,
  initialGrade,
  initialFeedback,
  gradeScale = '0-100',
  maxGrade = 100,
  rubricId,
  onOpenRubric,
  onGradeSaved,
  userId,
}: GradingToolbarProps) {
  const [grade, setGrade] = useState<string>(initialGrade?.toString() ?? '');
  const [feedback, setFeedback] = useState(initialFeedback ?? '');
  const [isSaving, setIsSaving] = useState(false);

  const numericGrade = parseFloat(grade) || 0;
  const letterGrade = calculateLetterGrade(numericGrade, gradeScale);

  const getGradeColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-amber-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const handleSave = useCallback(async () => {
    if (isNaN(numericGrade) || numericGrade < 0) return;
    setIsSaving(true);

    try {
      const response = await fetch('/api/grading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId,
          gradedBy: userId,
          grade: numericGrade,
          gradeScale,
          feedbackSummary: feedback || undefined,
        }),
      });

      const result = await response.json();
      if (result.success) {
        onGradeSaved(numericGrade, letterGrade, feedback);
      }
    } catch {
      // silent
    } finally {
      setIsSaving(false);
    }
  }, [submissionId, userId, numericGrade, gradeScale, feedback, letterGrade, onGradeSaved]);

  return (
    <div className="border bg-white rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Grade Input */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground">Grade:</label>
          <div className="relative">
            <Input
              type="number"
              min={0}
              max={maxGrade}
              step={0.1}
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="w-24 h-9 text-center font-bold text-lg"
              placeholder="—"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              /{maxGrade}
            </span>
          </div>
        </div>

        {/* Letter Grade Display */}
        {grade && !isNaN(numericGrade) && (
          <Badge
            variant="outline"
            className={`text-base font-bold px-3 py-1 ${getGradeColor(numericGrade)}`}
            style={{ borderColor: 'currentColor' }}
          >
            {letterGrade}
          </Badge>
        )}

        <div className="flex-1" />

        {/* Action Buttons */}
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenRubric}
          className="gap-1.5"
        >
          <ListChecks className="h-4 w-4" />
          Rubric
        </Button>

        <Button
          onClick={handleSave}
          disabled={isSaving || isNaN(numericGrade) || numericGrade < 0}
          className="gap-1.5 bg-[#008751] hover:bg-[#006b40]"
          size="sm"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Grade
        </Button>
      </div>

      {/* Feedback Summary */}
      <div className="flex items-start gap-2">
        <MessageSquare className="h-4 w-4 text-muted-foreground mt-2 shrink-0" />
        <Textarea
          placeholder="Add general feedback for the student..."
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          className="min-h-[60px] text-sm resize-none"
        />
      </div>
    </div>
  );
}
