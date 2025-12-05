"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, FileEdit, Send, Paperclip, Sparkles, Save, Maximize2, Minimize2, FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import dynamic from "next/dynamic";

// Dynamic import of the wrapper component
const VoiceRecorder = dynamic(() => import("./VoiceRecorder"), {
  ssr: false,
  loading: () => <div className="w-6 h-6 rounded-full bg-gray-100 animate-pulse" />,
});

interface MainPanelProps {
  patientId: string | null;
  prontuario: string;
  staging: string;
  onStagingChange: (content: string) => void;
  onNotaManual: () => void;
  onChat: (question: string) => void;
  selectedFileName?: string | null;
  onLiveClinicalUpdate?: (d: { alerts: AlertType[]; missing: string[]; conducts: string[] }) => void;
}

type DiarizedSegment = {
  id?: string | number;
  start?: number;
  end?: number;
  speaker?: string;
  text?: string;
  type?: string;
};

type AlertType = {
  title: string;
  reasoning: string;
  evidence_from_transcript: string;
  urgency_level: "vermelho" | "amarelo" | "verde";
  recommended_actions: string[];
};

export default function MainPanel({
  patientId,
  prontuario,
  staging,
  onStagingChange,
  onNotaManual,
  onChat,
  selectedFileName,
  onLiveClinicalUpdate,
}: MainPanelProps) {
  const [chatInput, setChatInput] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Live recording state
  const [isRecording, setIsRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [segments, setSegments] = useState<DiarizedSegment[]>([]);

  // Refs for accessing latest state in callbacks/effects
  const liveTranscriptRef = useRef<string>("");
  const segmentsRef = useRef<DiarizedSegment[]>([]);
  const stagingRef = useRef<string>("");
  const prontuarioRef = useRef<string>("");

  const [isSafetyCheckLoading, setIsSafetyCheckLoading] = useState(false);
  const safetyInFlightRef = useRef<boolean>(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || (typeof window !== "undefined" ? `http://${window.location.hostname}:8000` : "http://127.0.0.1:8000");

  // Helpers
  const speakerLabel = useCallback((sp?: string) => (sp === "SPEAKER_1" ? "Médica" : "Paciente"), []);

  const dedupeSegments = (list: DiarizedSegment[]): DiarizedSegment[] => {
    const seen = new Set<string>();
    const result: DiarizedSegment[] = [];
    for (const s of list) {
      const key =
        s.id != null
          ? `id:${s.id}`
          : `t:${s.start}-${s.end}-${(s.text || "").slice(0, 50)}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(s);
      }
    }
    return result;
  };

  const formatSegmentsForStaging = useCallback((segs: DiarizedSegment[]): string => {
    const sorted = [...segs]
      .filter((s) => s && (s.text ?? "").trim() !== "")
      .sort((a, b) => {
        const as = typeof a.start === "number" ? a.start : Number.MAX_SAFE_INTEGER;
        const bs = typeof b.start === "number" ? b.start : Number.MAX_SAFE_INTEGER;
        return as - bs;
      });

    const lines: string[] = [];
    let currentSpeaker: string | null = null;
    let bufferText = "";

    for (const s of sorted) {
      const name = speakerLabel(s.speaker);
      const t = (s.text || "").trim();
      if (!t) continue;

      if (currentSpeaker === null) {
        currentSpeaker = name;
        bufferText = t;
      } else if (name === currentSpeaker) {
        bufferText = bufferText ? `${bufferText} ${t}` : t;
      } else {
        lines.push(`${currentSpeaker}: ${bufferText}`);
        currentSpeaker = name;
        bufferText = t;
      }
    }

    if (bufferText) {
      lines.push(`${currentSpeaker}: ${bufferText}`);
    }

    return lines.join("\n\n");
  }, [speakerLabel]);

  // Sync refs
  useEffect(() => { liveTranscriptRef.current = liveTranscript; }, [liveTranscript]);
  useEffect(() => { segmentsRef.current = segments; }, [segments]);
  useEffect(() => { stagingRef.current = staging; }, [staging]);
  useEffect(() => { prontuarioRef.current = prontuario; }, [prontuario]);

  // --- Live Clinical Analysis Logic ---
  // Use ref for onLiveClinicalUpdate to avoid resetting the interval when parent re-renders
  const onLiveClinicalUpdateRef = useRef(onLiveClinicalUpdate);
  useEffect(() => { onLiveClinicalUpdateRef.current = onLiveClinicalUpdate; }, [onLiveClinicalUpdate]);

  const runSafetyCheck = useCallback(async () => {
    console.log("runSafetyCheck called. PatientId:", patientId, "Staging length:", stagingRef.current?.length);
    if (!patientId) return;
    const text = stagingRef.current || "";
    const pront = prontuarioRef.current || "";

    // Only run if we have some content
    if (!text || text.trim().length < 10) {
      console.log("runSafetyCheck skipped: text too short", text.length);
      return;
    }
    if (safetyInFlightRef.current) {
      console.log("runSafetyCheck skipped: already in flight");
      return;
    }

    safetyInFlightRef.current = true;
    try {
      console.log("Sending live-clinical-check request...");
      setIsSafetyCheckLoading(true);
      const res = await fetch(`${API_BASE}/api/live-clinical-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: patientId,
          prontuario: pront,
          transcript_partial: text,
        }),
      });
      if (!res.ok) {
        console.error("live-clinical-check failed:", res.status);
        return;
      }
      const data = await res.json();
      console.log("live-clinical-check success:", data);
      const alerts: AlertType[] = data?.critical_alerts || [];
      const missing: string[] = data?.missing_questions || [];
      const conducts: string[] = data?.recommended_conducts || [];

      if (onLiveClinicalUpdateRef.current) {
        onLiveClinicalUpdateRef.current({ alerts, missing, conducts });
      }
    } catch (e) {
      console.error("Erro em live-clinical-check:", e);
    } finally {
      safetyInFlightRef.current = false;
      setIsSafetyCheckLoading(false);
    }
  }, [patientId, API_BASE]);

  // Periodic analysis loop
  useEffect(() => {
    console.log("Analysis loop effect. isRecording:", isRecording);
    if (!isRecording) return;

    // Run check every 10 seconds while recording
    const interval = window.setInterval(() => {
      console.log("Interval fired. calling runSafetyCheck");
      void runSafetyCheck();
    }, 10000);
    return () => window.clearInterval(interval);
  }, [isRecording, runSafetyCheck]);


  // --- Audio Chunk Handling ---
  const handleAudioChunk = async (blob: Blob) => {
    try {
      const form = new FormData();
      // Ensure we send a filename with extension so backend recognizes it
      const file = new File([blob], `chunk_${Date.now()}.webm`, { type: blob.type });
      form.append("file", file);

      const res = await fetch(`${API_BASE}/api/transcribe-legacy/live`, {
        method: "POST",
        body: form
      });

      if (res.ok) {
        const d = (await res.json().catch(() => ({}))) as { text?: string; segments?: DiarizedSegment[] };

        // Update transcript state
        if (d?.text) {
          setLiveTranscript((prev) => {
            const newTranscript = prev ? prev + " " + d.text : d.text || "";
            return newTranscript;
          });
        }

        // Direct append to staging as requested
        if (d?.text) {
          const currentStaging = stagingRef.current || "";
          // Add a space if there is existing content and it doesn't end with whitespace
          const separator = currentStaging && !/\s$/.test(currentStaging) ? " " : "";
          const newStaging = currentStaging + separator + d.text;
          onStagingChange(newStaging);
        }

        // Keep segments logic just for internal state if needed, but don't overwrite staging with it
        let newSegments: DiarizedSegment[] = [];
        if (d?.segments && Array.isArray(d.segments) && d.segments.length > 0) {
          newSegments = d.segments;
        }

        if (newSegments.length > 0) {
          const nextSegs = dedupeSegments([...(segmentsRef.current || []), ...newSegments] as DiarizedSegment[]);
          setSegments(nextSegs);
        }
      }
    } catch (err) {
      console.error("Error sending audio chunk:", err);
    }
  };

  const handleChatSubmit = () => {
    if (chatInput.trim()) {
      onChat(chatInput);
      setChatInput("");
    }
  };

  if (!patientId) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-[var(--text-tertiary)] bg-[var(--background-page)]">
        <div className="w-24 h-24 bg-white rounded-full shadow-sm flex items-center justify-center mb-6">
          <Sparkles size={48} className="text-[var(--primary-green-light)]" strokeWidth={1.5} />
        </div>
        <h2 className="text-xl font-semibold text-[var(--text-secondary)]">Selecione um paciente</h2>
        <p className="text-sm mt-2 max-w-xs text-center">Escolha um paciente na barra lateral para visualizar o prontuário e iniciar o atendimento.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative bg-[var(--background-page)]">

      {/* Top Bar - File Info */}
      <header className="h-16 px-6 flex items-center justify-between bg-white border-b border-[var(--border-color)] shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[var(--primary-green-subtle)] rounded-lg text-[var(--primary-green)]">
            <FileText size={20} />
          </div>
          <div>
            <h1 className="font-semibold text-[var(--text-primary)] text-lg leading-tight">
              {selectedFileName || "Prontuário"}
            </h1>
            <p className="text-xs text-[var(--text-tertiary)]">
              Visualização e Edição
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 text-[var(--text-secondary)] hover:bg-[var(--background-page)] rounded-lg transition-colors"
            title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>
      </header>

      {/* Main Content Area - Split View */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">

        {/* Left: Prontuario Viewer (Read Only / Reference) */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 pb-[500px] custom-scrollbar bg-white">
          <article className="prose-medical max-w-3xl mx-auto pb-[100px]">
            {prontuario ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {prontuario}
              </ReactMarkdown>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-[var(--text-tertiary)]">
                <p>Carregando prontuário...</p>
              </div>
            )}
          </article>
        </div>
      </div>

      {/* Floating Chat & Input Area */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl z-20">
        <div className="bg-white/90 backdrop-blur-md border border-[var(--border-color)] shadow-float rounded-2xl p-2 flex flex-col gap-2 transition-all duration-300 focus-within:shadow-2xl focus-within:scale-[1.01]">

          {/* Staging / Quick Note Input */}
          {staging && (
            <div className="px-4 py-2 border-b border-[var(--border-color)] max-h-32 overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-[var(--primary-green)] uppercase tracking-wider">Rascunho / Transcrição</span>
                <button
                  onClick={onNotaManual}
                  className="text-xs flex items-center gap-1 bg-[var(--primary-green)] text-white px-2 py-0.5 rounded hover:bg-[var(--primary-green-hover)] transition-colors"
                >
                  <Save size={12} /> Salvar no Prontuário
                </button>
              </div>
              <textarea
                value={staging}
                onChange={(e) => onStagingChange(e.target.value)}
                className="w-full text-sm bg-transparent border-none focus:ring-0 resize-none text-[var(--text-primary)] placeholder-gray-400"
                placeholder="Digite suas anotações ou fale para transcrever..."
                rows={2}
              />
            </div>
          )}

          {/* Chat Input */}
          <div className="flex items-center gap-2 px-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleChatSubmit()}
                placeholder="Pergunte ao Copiloto ou digite uma nota..."
                className="w-full pl-4 pr-10 py-3 bg-transparent text-sm focus:outline-none text-[var(--text-primary)]"
              />
              <button
                onClick={handleChatSubmit}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-[var(--primary-green)] hover:bg-[var(--primary-green-subtle)] rounded-lg transition-colors"
                disabled={!chatInput.trim()}
              >
                <Send size={18} />
              </button>
            </div>

            <div className="h-8 w-[1px] bg-[var(--border-color)] mx-1"></div>

            {/* Audio Recorder */}
            <div className="flex items-center justify-center p-1">
              <VoiceRecorder
                onChunk={handleAudioChunk}
                onStateChange={setIsRecording}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
