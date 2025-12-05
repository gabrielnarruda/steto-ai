"use client";

import { useRef, useEffect } from "react";
import { AlertTriangle, CheckCircle, Lightbulb, Activity } from "lucide-react";

interface AnalysisAlert {
  type: "warning" | "info";
  message: string;
}

interface AnalysisSuggestion {
  id: string;
  text: string;
}

interface Analysis {
  alerts: AnalysisAlert[];
  suggestions: AnalysisSuggestion[];
}

interface LiveAlert {
  title: string;
  reasoning: string;
  evidence_from_transcript: string;
  urgency_level: "vermelho" | "amarelo" | "verde";
  recommended_actions: string[];
}

interface RightPanelProps {
  analysis: Analysis | null;
  liveAlerts: LiveAlert[];
  liveMissingQuestions: string[];
  liveRecommendedConducts: string[];
  staging: string;
  onStagingChange: (value: string) => void;
  onAcceptSuggestion: (suggestionId: string, text: string) => void;
  onAnalyze: () => void;
  activeTab: "analysis" | "staging";
  onTabChange: (tab: "analysis" | "staging") => void;
}

export default function RightPanel({ analysis, liveAlerts, liveMissingQuestions, liveRecommendedConducts, staging, onStagingChange, onAcceptSuggestion, onAnalyze, activeTab, onTabChange }: RightPanelProps) {
  const stagingRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const el = stagingRef.current;
    if (!el) return;
    const maxHeight = 320;
    el.style.height = "auto";
    const newHeight = Math.min(el.scrollHeight, maxHeight);
    el.style.height = `${newHeight}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
    el.scrollTop = el.scrollHeight;
  }, [staging]);

  

  return (
    <div className="w-80 bg-[#F7F9FC] border-l border-gray-100 flex flex-col h-screen overflow-y-auto custom-scrollbar p-6">
      <div className="mb-6 animate-fade-in">
        <button
          onClick={onAnalyze}
          className="w-full bg-gradient-to-r from-[#0E8A3D] to-[#15A049] text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-green-900/20 hover:shadow-green-900/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Activity size={18} />
          Analisar Prontuário
        </button>
      </div>

      <div className="mb-6 animate-fade-in">
        <div className="flex rounded-xl bg-white/70 p-1 shadow-sm">
          <button
            type="button"
            onClick={() => onTabChange("analysis")}
            className={`flex-1 text-xs font-semibold py-2 rounded-lg transition-all ${
              activeTab === "analysis" ? "bg-[#0E8A3D] text-white shadow-sm" : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            Alertas & Sugestões
          </button>
          <button
            type="button"
            onClick={() => onTabChange("staging")}
            className={`flex-1 text-xs font-semibold py-2 rounded-lg transition-all ${
              activeTab === "staging" ? "bg-[#0E8A3D] text-white shadow-sm" : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            Evolução (Rascunho)
          </button>
        </div>
      </div>

      {activeTab === "analysis" && (
        <>
          <div className="mb-8 animate-fade-in delay-100">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <AlertTriangle size={14} className="text-orange-500" />
              Alertas Clínicos
            </h3>
            <div className="space-y-4">
              {liveAlerts && liveAlerts.length > 0 ? (
                liveAlerts.map((a, idx) => (
                  <div
                    key={idx}
                    className={`bg-white rounded-2xl shadow-sm border border-gray-100/50 p-4 hover:shadow-md transition-all duration-300 border-l-4 ${
                      a.urgency_level === "vermelho"
                        ? "border-red-500"
                        : a.urgency_level === "amarelo"
                        ? "border-yellow-400"
                        : "border-green-500"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-gray-800 text-sm">{a.title}</h3>
                      <span className="text-xs uppercase font-bold text-gray-500">{a.urgency_level}</span>
                    </div>
                    <p className="text-xs text-gray-600 mb-1">{a.reasoning}</p>
                    {a.evidence_from_transcript && (
                      <p className="text-[11px] text-gray-500 italic">“{a.evidence_from_transcript}”</p>
                    )}
                    {a.recommended_actions?.length > 0 && (
                      <ul className="mt-2 text-xs text-gray-700 list-disc ml-4 space-y-1">
                        {a.recommended_actions.map((act, i) => (
                          <li key={i}>{act}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-xs text-gray-400 italic">Nenhum alerta disponível no momento.</div>
              )}
            </div>
          </div>

          <div className="mb-8 animate-fade-in delay-150">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Lightbulb size={14} className="text-[#0E8A3D]" />
              Perguntas Faltantes
            </h3>
            <div className="space-y-3">
              {liveMissingQuestions && liveMissingQuestions.length > 0 ? (
                liveMissingQuestions.map((q, idx) => (
                  <div key={idx} className="bg-white rounded-2xl shadow-sm border border-gray-100/50 p-4">
                    <p className="text-sm text-gray-700">{q}</p>
                  </div>
                ))
              ) : (
                <div className="text-xs text-gray-400 italic">Nenhuma pergunta faltante identificada.</div>
              )}
            </div>
          </div>

          <div className="animate-fade-in delay-200">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Lightbulb size={14} className="text-[#0E8A3D]" />
              Condutas Recomendadas
            </h3>
            <div className="space-y-4">
              {liveRecommendedConducts && liveRecommendedConducts.length > 0 ? (
                liveRecommendedConducts.map((text, idx) => (
                  <div
                    key={`cond-${idx}`}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100/50 p-4 group hover:border-[#0E8A3D]/30 transition-colors hover:shadow-md"
                  >
                    <p className="text-sm text-gray-700 mb-3 font-medium">{text}</p>
                    <button
                      onClick={() => onAcceptSuggestion(`clinical-${idx}-${Date.now()}`, text)}
                      className="w-full py-2 bg-gray-50 hover:bg-[#0E8A3D] hover:text-white text-gray-600 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={14} />
                      Aceitar Sugestão
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-xs text-gray-400 italic">Nenhuma conduta recomendada no momento.</div>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === "staging" && (
        <div className="animate-fade-in">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Lightbulb size={14} className="text-[#0E8A3D]" />
            Evolução Diária (Rascunho)
          </h3>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <textarea
              ref={stagingRef}
              value={staging}
              onChange={(e) => onStagingChange(e.target.value)}
              className="w-full min-h-[96px] max-h-[320px] resize-none bg-white border border-gray-200 rounded-xl p-4 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0E8A3D]/20 focus:border-[#0E8A3D]"
              placeholder="Digite suas observações aqui..."
            />
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => onStagingChange("")}
                className="px-4 py-2 text-xs font-medium rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
              >
                Descartar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
