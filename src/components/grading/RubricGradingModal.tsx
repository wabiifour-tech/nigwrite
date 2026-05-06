/**
 * NigWrite - Rubric Grading Modal
 * Grid/table rubric grading with level selection, per-criterion feedback, weighted totals
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { calculateWeightedRubricScore } from '@/lib/grade-calculator';
import {
  X,
  Save,
  Loader2,
  Check,
  ListChecks,
} from 'lucide-react';

interface RubricLevel {
  id: string;
  label: string;
  description: string;
  score: number;
  order: number;
}

interface RubricCriterion {
  id: string;
  title: string;
  description: string | null;
  maxScore: number;
  weight: number;
  levels: RubricLevel[];
  order: number;
}

interface RubricData {
  id: string;
  title: string;
  description: string | null;
  criteria: RubricCriterion[];
}

interface RubricScoreEntry {
  criteriaId: string;
  levelId?: string;
  score: number;
  feedback?: string;
}

interface RubricGradingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rubric: RubricData | null;
  submissionId: string;
  userId: string;
  existingScores?: RubricScoreEntry[];
  onScoresSaved: (scores: RubricScoreEntry[]) => void;
}

export function RubricGradingModal({
  open,
  onOpenChange,
  rubric,
  submissionId,
  userId,
  existingScores = [],
  onScoresSaved,
}: RubricGradingModalProps) {
  const [selectedLevels, setSelectedLevels] = useState<Record<string, string>>({});
  const [criterionFeedback, setCriterionFeedback] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Initialize from existing scores
  useMemo(() => {
    if (existingScores.length > 0) {
      const levels: Record<string, string> = {};
      const feedback: Record<string, string> = {};
      for (const s of existingScores) {
        if (s.levelId) levels[s.criteriaId] = s.levelId;
        if (s.feedback) feedback[s.criteriaId] = s.feedback;
      }
      setSelectedLevels(levels);
      setCriterionFeedback(feedback);
    }
  }, [existingScores]);

  const handleSelectLevel = useCallback(
    (criteriaId: string, levelId: string) => {
      setSelectedLevels((prev) => ({
        ...prev,
        [criteriaId]: prev[criteriaId] === levelId ? '' : levelId,
      }));
    },
    []
  );

  // Calculate scores
  const calculatedScores = useMemo(() => {
    if (!rubric) return { total: 0, maxTotal: 0, percentage: 0 };

    const scores = rubric.criteria.map((c) => {
      const selectedLevelId = selectedLevels[c.id];
      if (!selectedLevelId) {
        return { score: 0, maxScore: c.maxScore, weight: c.weight };
      }
      const level = c.levels.find((l) => l.id === selectedLevelId);
      return {
        score: level?.score ?? 0,
        maxScore: c.maxScore,
        weight: c.weight,
      };
    });

    return calculateWeightedRubricScore(scores);
  }, [rubric, selectedLevels]);

  const handleSave = useCallback(async () => {
    if (!rubric) return;
    setIsSaving(true);

    try {
      const scores: RubricScoreEntry[] = rubric.criteria.map((c) => {
        const selectedLevelId = selectedLevels[c.id];
        const level = c.levels.find((l) => l.id === selectedLevelId);
        return {
          criteriaId: c.id,
          levelId: selectedLevelId || undefined,
          score: level?.score ?? 0,
          feedback: criterionFeedback[c.id] || undefined,
        };
      });

      const response = await fetch('/api/grading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId,
          gradedBy: userId,
          grade: calculatedScores.percentage,
          gradeScale: '0-100',
          rubricId: rubric.id,
          rubricScores: scores,
        }),
      });

      const result = await response.json();
      if (result.success) {
        onScoresSaved(scores);
        onOpenChange(false);
      }
    } catch {
      // silent
    } finally {
      setIsSaving(false);
    }
  }, [
    rubric,
    submissionId,
    userId,
    selectedLevels,
    criterionFeedback,
    calculatedScores.percentage,
    onScoresSaved,
    onOpenChange,
  ]);

  if (!rubric) return null;

  const getCellBgColor = (criteriaId: string, levelId: string) => {
    return selectedLevels[criteriaId] === levelId ? 'bg-emerald-50 ring-2 ring-emerald-500' : 'hover:bg-gray-50';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-[#008751]" />
            {rubric.title}
          </DialogTitle>
          {rubric.description && (
            <DialogDescription>{rubric.description}</DialogDescription>
          )}
        </DialogHeader>

        {/* Rubric Grid */}
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left p-3 font-semibold border-r w-44 min-w-[160px]">
                    Criterion
                  </th>
                  <th className="text-center p-3 font-semibold border-r w-16">
                    Weight
                  </th>
                  {rubric.criteria[0]?.levels.map((level) => (
                    <th key={level.id} className="text-center p-3 font-semibold border-r last:border-r-0 min-w-[140px]">
                      <div>{level.label}</div>
                      <div className="text-xs font-normal text-muted-foreground">
                        {level.score} pts
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rubric.criteria.map((criterion) => (
                  <tr key={criterion.id} className="border-t">
                    <td className="p-3 border-r">
                      <p className="font-medium text-sm">{criterion.title}</p>
                      {criterion.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {criterion.description}
                        </p>
                      )}
                    </td>
                    <td className="p-3 text-center border-r text-xs text-muted-foreground font-medium">
                      ×{criterion.weight}
                    </td>
                    {criterion.levels.map((level) => (
                      <td
                        key={level.id}
                        className={`p-2.5 border-r last:border-r-0 cursor-pointer transition-all ${getCellBgColor(criterion.id, level.id)}`}
                        onClick={() => handleSelectLevel(criterion.id, level.id)}
                      >
                        <p className="text-xs text-gray-700 leading-relaxed line-clamp-3">
                          {level.description}
                        </p>
                        {selectedLevels[criterion.id] === level.id && (
                          <div className="flex justify-center mt-1">
                            <Check className="h-4 w-4 text-emerald-600" />
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Per-criterion Feedback */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Per-Criterion Feedback (Optional)</h4>
          {rubric.criteria.map((criterion) => (
            <div key={criterion.id} className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{criterion.title}</label>
              <Textarea
                placeholder={`Feedback for ${criterion.title}...`}
                value={criterionFeedback[criterion.id] || ''}
                onChange={(e) =>
                  setCriterionFeedback((prev) => ({
                    ...prev,
                    [criterion.id]: e.target.value,
                  }))
                }
                className="min-h-[50px] text-sm resize-none"
              />
            </div>
          ))}
        </div>

        {/* Score Summary */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-[#008751]">
                {calculatedScores.percentage}%
              </div>
              <div className="text-xs text-muted-foreground">Weighted Score</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {calculatedScores.total}/{calculatedScores.maxTotal}
              </div>
              <div className="text-xs text-muted-foreground">Points</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {Object.keys(selectedLevels).filter(Boolean).length}/{rubric.criteria.length}
              </div>
              <div className="text-xs text-muted-foreground">Criteria Scored</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="gap-1.5 bg-[#008751] hover:bg-[#006b40]"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Rubric Scores
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
