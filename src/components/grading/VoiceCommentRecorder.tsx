/**
 * NigWrite - Voice Comment Recorder
 * Record, playback, and upload voice comments using MediaRecorder API
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Mic,
  MicOff,
  Square,
  Play,
  Pause,
  Trash2,
  Loader2,
  Volume2,
  Send,
} from 'lucide-react';

interface VoiceComment {
  id: string;
  audioData: string;
  duration: number;
  user?: { name: string | null; email: string } | null;
  createdAt: string;
}

interface VoiceCommentRecorderProps {
  submissionId: string;
  userId: string;
  existingVoiceComments?: VoiceComment[];
}

export function VoiceCommentRecorder({
  submissionId,
  userId,
  existingVoiceComments = [],
}: VoiceCommentRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedAudio, setRecordedAudio] = useState<string | null>(null);
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [voiceComments, setVoiceComments] = useState<VoiceComment[]>(existingVoiceComments);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setVoiceComments(existingVoiceComments);
  }, [existingVoiceComments]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          setRecordedAudio(base64);
          setRecordedDuration(recordingDuration);
        };
        reader.readAsDataURL(blob);

        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch {
      // Microphone not available
    }
  }, [recordingDuration]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  const discardRecording = useCallback(() => {
    setRecordedAudio(null);
    setRecordedDuration(0);
  }, []);

  const uploadRecording = useCallback(async () => {
    if (!recordedAudio) return;
    setIsUploading(true);

    try {
      const response = await fetch('/api/comments/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId,
          userId,
          audioData: recordedAudio,
          duration: recordedDuration,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setVoiceComments((prev) => [result.data, ...prev]);
        setRecordedAudio(null);
        setRecordedDuration(0);
      }
    } catch {
      // silent
    } finally {
      setIsUploading(false);
    }
  }, [submissionId, userId, recordedAudio, recordedDuration]);

  const togglePlayback = useCallback(
    (id: string, audioData: string) => {
      if (playingId === id) {
        audioRef.current?.pause();
        setPlayingId(null);
        return;
      }

      if (audioRef.current) {
        audioRef.current.pause();
      }

      const audio = new Audio(audioData);
      audioRef.current = audio;
      setPlayingId(id);
      audio.play();
      audio.onended = () => setPlayingId(null);
    },
    [playingId]
  );

  const deleteVoiceComment = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/comments/voice?submissionId=${submissionId}`, {
        method: 'GET',
      });
      // For deletion, we would need a DELETE endpoint, but for now just remove locally
      setVoiceComments((prev) => prev.filter((vc) => vc.id !== id));
    } catch {
      // silent
    }
  }, [submissionId]);

  return (
    <div className="border bg-white rounded-xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Volume2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold">Voice Comments</span>
        {voiceComments.length > 0 && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {voiceComments.length}
          </Badge>
        )}
      </div>

      {/* Existing Voice Comments */}
      {voiceComments.length > 0 && (
        <div className="space-y-2">
          {voiceComments.map((vc) => (
            <div
              key={vc.id}
              className="flex items-center gap-3 p-2.5 rounded-lg border bg-gray-50"
            >
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => togglePlayback(vc.id, vc.audioData)}
              >
                {playingId === vc.id ? (
                  <Pause className="h-3.5 w-3.5" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
              </Button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">
                    {vc.user?.name || vc.user?.email || 'Instructor'}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDuration(vc.duration)}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(vc.createdAt).toLocaleString()}
                </span>
              </div>
              <button
                className="p-1.5 rounded hover:bg-red-100 text-muted-foreground hover:text-red-600"
                onClick={() => deleteVoiceComment(vc.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Recording Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        {!isRecording && !recordedAudio && (
          <Button
            variant="outline"
            size="sm"
            onClick={startRecording}
            className="gap-1.5 border-red-300 text-red-600 hover:bg-red-50"
          >
            <Mic className="h-4 w-4" />
            Record Voice Comment
          </Button>
        )}

        {isRecording && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-red-600">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-mono font-bold">{formatDuration(recordingDuration)}</span>
              <span className="text-xs text-red-500">Recording...</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={stopRecording}
              className="gap-1.5 border-gray-400"
            >
              <Square className="h-4 w-4" />
              Stop
            </Button>
          </div>
        )}

        {recordedAudio && !isRecording && (
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                const audio = new Audio(recordedAudio);
                audio.play();
              }}
            >
              <Play className="h-3.5 w-3.5" />
            </Button>
            <span className="text-sm font-mono text-muted-foreground">
              {formatDuration(recordedDuration)}
            </span>
            <Button
              size="sm"
              onClick={uploadRecording}
              disabled={isUploading}
              className="gap-1.5 bg-[#008751] hover:bg-[#006b40]"
            >
              {isUploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              Send
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={discardRecording}
              className="gap-1.5 text-muted-foreground"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Discard
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
