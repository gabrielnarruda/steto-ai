"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Square, Loader2 } from "lucide-react";

interface VoiceRecorderProps {
    onChunk?: (blob: Blob) => void;
    onStateChange?: (isRecording: boolean) => void;
    onRecordingComplete?: (blob: Blob) => void;
}

const VoiceRecorder = ({ onChunk, onStateChange, onRecordingComplete }: VoiceRecorderProps) => {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);

    const streamRef = useRef<MediaStream | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const isRecordingRef = useRef(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Refs for callbacks to avoid stale closures in the recursive loop
    const onChunkRef = useRef(onChunk);
    const onStateChangeRef = useRef(onStateChange);
    const onRecordingCompleteRef = useRef(onRecordingComplete);

    useEffect(() => { onChunkRef.current = onChunk; }, [onChunk]);
    useEffect(() => { onStateChangeRef.current = onStateChange; }, [onStateChange]);
    useEffect(() => { onRecordingCompleteRef.current = onRecordingComplete; }, [onRecordingComplete]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            setIsRecording(true);
            isRecordingRef.current = true;
            if (onStateChangeRef.current) onStateChangeRef.current(true);

            // Start the recording loop
            recordSegment();

            // Start UI timer
            timerRef.current = setInterval(() => {
                setRecordingTime((prev) => prev + 1);
            }, 1000);

        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("Erro ao acessar o microfone. Verifique as permissões.");
        }
    };

    const recordSegment = () => {
        if (!isRecordingRef.current || !streamRef.current) return;

        // Check supported mime types
        let mimeType = "";
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
            mimeType = "audio/webm;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/webm")) {
            mimeType = "audio/webm";
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
            mimeType = "audio/mp4";
        }

        const options = mimeType ? { mimeType } : undefined;
        const recorder = new MediaRecorder(streamRef.current, options);
        mediaRecorderRef.current = recorder;

        const chunks: Blob[] = [];

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                chunks.push(e.data);
            }
        };

        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: mimeType || "audio/webm" });

            // Emit the full valid file chunk
            if (onChunkRef.current) {
                onChunkRef.current(blob);
            }

            // If still recording, start next segment
            if (isRecordingRef.current) {
                recordSegment();
            } else {
                // Final stop cleanup
                if (onRecordingCompleteRef.current) {
                    onRecordingCompleteRef.current(blob);
                }
                cleanup();
            }
        };

        recorder.start();

        // Stop this segment after 3 seconds to finalize the file
        setTimeout(() => {
            if (recorder.state === "recording") {
                recorder.stop();
            }
        }, 3000);
    };

    const stopRecording = () => {
        setIsRecording(false);
        isRecordingRef.current = false;
        if (onStateChangeRef.current) onStateChangeRef.current(false);

        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop();
        }
    };

    const cleanup = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        setRecordingTime(0);
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    return (
        <div className="flex items-center gap-2">
            {isRecording && (
                <span className="text-xs font-mono text-red-500 animate-pulse">
                    {formatTime(recordingTime)}
                </span>
            )}
            <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`p-2 rounded-full transition-all ${isRecording
                        ? "bg-red-100 text-red-600 hover:bg-red-200"
                        : "text-[var(--primary-green)] hover:bg-[var(--primary-green-subtle)]"
                    }`}
                title={isRecording ? "Parar gravação" : "Iniciar gravação"}
            >
                {isRecording ? <Square size={18} fill="currentColor" /> : <Mic size={20} />}
            </button>
        </div>
    );
};

export default VoiceRecorder;
