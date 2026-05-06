/**
 * NigWrite - Score Gauge Component
 * Created by: Wabi The Tech Nurse
 *
 * A circular gauge that visually displays similarity or AI scores.
 * Color-coded: Green (low) → Yellow → Orange → Red (high).
 */

'use client';

import { useEffect, useRef } from 'react';

interface ScoreGaugeProps {
  score: number;
  label: string;
  size?: number;
  strokeWidth?: number;
  description?: string;
}

export function ScoreGauge({
  score,
  label,
  size = 140,
  strokeWidth = 10,
  description,
}: ScoreGaugeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const clampedScore = Math.max(0, Math.min(100, score));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const displaySize = size;
    canvas.width = displaySize * dpr;
    canvas.height = displaySize * dpr;
    canvas.style.width = `${displaySize}px`;
    canvas.style.height = `${displaySize}px`;
    ctx.scale(dpr, dpr);

    const centerX = displaySize / 2;
    const centerY = displaySize / 2;
    const radius = (displaySize - strokeWidth * 2) / 2 - 4;

    // Clear canvas
    ctx.clearRect(0, 0, displaySize, displaySize);

    // Draw background track
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Determine color based on score
    const getColor = (s: number): string => {
      if (s < 25) return '#10b981'; // emerald
      if (s < 50) return '#f59e0b'; // amber
      if (s < 75) return '#f97316'; // orange
      return '#ef4444'; // red
    };

    // Draw progress arc with animation
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (2 * Math.PI * clampedScore) / 100;
    const color = getColor(clampedScore);

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.strokeStyle = color;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Draw glow effect
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.strokeStyle = color;
    ctx.lineWidth = strokeWidth + 4;
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.15;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Draw center text
    ctx.fillStyle = '#111827';
    ctx.font = `bold ${displaySize * 0.22}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.round(clampedScore)}%`, centerX, centerY - 6);

    ctx.fillStyle = '#6b7280';
    ctx.font = `${displaySize * 0.1}px sans-serif`;
    ctx.fillText(label, centerX, centerY + displaySize * 0.15);
  }, [clampedScore, label, size, strokeWidth]);

  const getColorClass = (s: number): string => {
    if (s < 25) return 'text-emerald-600';
    if (s < 50) return 'text-amber-600';
    if (s < 75) return 'text-orange-600';
    return 'text-red-600';
  };

  const getBgClass = (s: number): string => {
    if (s < 25) return 'bg-emerald-50 border-emerald-200';
    if (s < 50) return 'bg-amber-50 border-amber-200';
    if (s < 75) return 'bg-orange-50 border-orange-200';
    return 'bg-red-50 border-red-200';
  };

  return (
    <div className={`flex flex-col items-center p-4 rounded-xl border ${getBgClass(clampedScore)}`}>
      <canvas ref={canvasRef} className="mb-2" />
      {description && (
        <p className={`text-xs text-center font-medium mt-1 ${getColorClass(clampedScore)}`}>
          {description}
        </p>
      )}
    </div>
  );
}
