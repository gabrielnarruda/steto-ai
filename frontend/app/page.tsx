"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import MainPanel from "@/components/MainPanel";
import RightPanel from "@/components/RightPanel";
import axios from "axios";
import { Menu, X, PanelRightClose, PanelRightOpen, PanelLeftClose, PanelLeftOpen } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || (typeof window !== "undefined" ? `http://${window.location.hostname}:8000` : "http://127.0.0.1:8000");

interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
}

interface FileNode {
  name: string;
  type: "file" | "folder";
  path: string;
  children?: FileNode[];
}

interface Analysis {
  alerts: Array<{ type: "warning" | "info"; message: string }>;
  suggestions: Array<{ id: string; text: string }>;
}

interface LiveAlert {
  title: string;
  reasoning: string;
  evidence_from_transcript: string;
  urgency_level: "vermelho" | "amarelo" | "verde";
  recommended_actions: string[];
}

export default function Home() {
  // Data State
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [fileTree, setFileTree] = useState<FileNode | null>(null);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [staging, setStaging] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [liveAlerts, setLiveAlerts] = useState<LiveAlert[]>([]);
  const [liveMissingQuestions, setLiveMissingQuestions] = useState<string[]>([]);
  const [liveRecommendedConducts, setLiveRecommendedConducts] = useState<string[]>([]);

  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Desktop default
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true); // Desktop default
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeRightTab, setActiveRightTab] = useState<"analysis" | "staging">("analysis");

  // Fetch Patients
  const fetchPatients = async () => {
    try {
      const response = await axios.get(`${API_URL}/patients/`);
      setPatients(response.data);
    } catch (error) {
      console.error("Error fetching patients:", error);
    }
  };

  // Fetch File Tree
  const fetchFileTree = async (patientId: string) => {
    try {
      const response = await axios.get(`${API_URL}/patients/${patientId}/files`);
      setFileTree(response.data);
    } catch (error) {
      console.error("Error fetching file tree:", error);
    }
  };

  // Fetch File Content
  const fetchFileContent = async (patientId: string, filePath: string) => {
    try {
      const response = await axios.get(`${API_URL}/patients/${patientId}/file`, {
        params: { path: filePath }
      });
      setFileContent(response.data.content);
    } catch (error) {
      console.error("Error fetching file content:", error);
      setFileContent("Erro ao carregar arquivo.");
    }
  };

  // Fetch Staging
  const fetchStaging = async (patientId: string) => {
    try {
      const response = await axios.get(`${API_URL}/patients/${patientId}/staging`);
      setStaging(response.data.content);
    } catch (error) {
      console.error("Error fetching staging:", error);
    }
  };

  // Handlers
  const handleStagingChange = async (content: string) => {
    setStaging(content);
    if (selectedPatientId) {
      try {
        await axios.post(`${API_URL}/patients/${selectedPatientId}/staging`, {
          patient_id: selectedPatientId,
          content,
        });
      } catch (error) {
        console.error("Error updating staging:", error);
      }
    }
  };

  const handleNotaManual = async () => {
    if (!selectedPatientId || !staging) return;

    try {
      await axios.post(`${API_URL}/patients/${selectedPatientId}/prontuario/append`, {
        patient_id: selectedPatientId,
        content: staging,
      });
      alert("Nota adicionada ao prontuário!");
      setStaging("");
      if (selectedFilePath === "Prontuario.md") {
        fetchFileContent(selectedPatientId, selectedFilePath);
      }
    } catch (error) {
      console.error("Error saving note:", error);
      alert("Erro ao salvar nota.");
    }
  };

  const handleAnalyze = async () => {
    if (!selectedPatientId) return;

    try {
      const payload = {
        patient_id: selectedPatientId,
        prontuario: fileContent,
        transcript_partial: staging,
      };
      const clinicalRes = await axios.post(`${API_URL}/api/live-clinical-check`, payload);
      const data = clinicalRes.data || {};
      setLiveAlerts(data.critical_alerts || []);
      setLiveMissingQuestions(data.missing_questions || []);
      setLiveRecommendedConducts(data.recommended_conducts || []);
      setAnalysis({
        alerts: [],
        suggestions: (data.recommended_conducts || []).map((text: string, idx: number) => ({ id: `clinical-${idx}-${Date.now()}`, text })),
      });
      // Auto-open right panel on analysis
      setIsRightPanelOpen(true);
    } catch (error) {
      console.error("Error analyzing:", error);
      alert("Erro ao analisar. Verifique se o backend está rodando.");
    }
  };

  const handleAcceptSuggestion = async (suggestionId: string, text: string) => {
    if (!selectedPatientId) return;

    try {
      await axios.post(
        `${API_URL}/patients/${selectedPatientId}/suggestions/${suggestionId}/accept`,
        { suggestion_text: text }
      );
      fetchStaging(selectedPatientId);
    } catch (error) {
      console.error("Error accepting suggestion:", error);
    }
  };

  const handleChat = async (question: string) => {
    if (!selectedPatientId) return;

    try {
      const response = await axios.post(`${API_URL}/copilot/chat`, {
        patient_id: selectedPatientId,
        question,
      });
      alert(`Copiloto: ${response.data.response}`);
    } catch (error) {
      console.error("Error in chat:", error);
      alert("Erro no chat.");
    }
  };

  // Effects
  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    if (selectedPatientId) {
      fetchFileTree(selectedPatientId);
      setSelectedFilePath("Prontuario.md");
      fetchStaging(selectedPatientId);
      // On mobile, close menu after selection
      setIsMobileMenuOpen(false);
    }
  }, [selectedPatientId]);

  useEffect(() => {
    if (selectedPatientId && selectedFilePath) {
      fetchFileContent(selectedPatientId, selectedFilePath);
    }
  }, [selectedPatientId, selectedFilePath]);

  return (
    <main className="flex h-screen w-full bg-[var(--background-page)] text-[var(--text-primary)] overflow-hidden relative">

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-[var(--border-color)] flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-2">
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 -ml-2 text-[var(--text-secondary)]">
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <span className="font-bold text-[var(--primary-green)]">Steto AI</span>
        </div>
        <button onClick={() => setIsRightPanelOpen(!isRightPanelOpen)} className="p-2 -mr-2 text-[var(--text-secondary)]">
          <PanelRightOpen size={24} />
        </button>
      </div>

      {/* Left Sidebar - Responsive */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          bg-[var(--background-sidebar)] border-r border-[var(--border-color)]
          transition-all duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0 w-64 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
          ${isSidebarOpen ? 'lg:w-72' : 'lg:w-16'}
          pt-14 lg:pt-0
        `}
      >
        <Sidebar
          patients={patients}
          selectedPatientId={selectedPatientId}
          onSelectPatient={setSelectedPatientId}
          isCollapsed={!isSidebarOpen}
          onToggleCollapse={() => setIsSidebarOpen(!isSidebarOpen)}
          fileTree={fileTree}
          onFileSelect={setSelectedFilePath}
          selectedFilePath={selectedFilePath}
        />
      </aside>

      {/* Overlay for mobile sidebar */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Center Section - Main Content */}
      <section className="flex-1 flex flex-col min-w-0 h-full pt-14 lg:pt-0 relative">
        {/* Toggle Buttons (Desktop only) */}
        <div className="hidden lg:flex absolute top-4 left-4 z-10">
          {!isSidebarOpen && (
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-1.5 bg-white border border-[var(--border-color)] rounded-md shadow-sm text-[var(--text-secondary)] hover:text-[var(--primary-green)]"
              title="Expandir Sidebar"
            >
              <PanelLeftOpen size={16} />
            </button>
          )}
        </div>

        <div className="hidden lg:flex absolute top-4 right-4 z-10">
          {!isRightPanelOpen && (
            <button
              onClick={() => setIsRightPanelOpen(true)}
              className="p-1.5 bg-white border border-[var(--border-color)] rounded-md shadow-sm text-[var(--text-secondary)] hover:text-[var(--primary-green)]"
              title="Expandir Painel"
            >
              <PanelRightOpen size={16} />
            </button>
          )}
        </div>

        <MainPanel
          patientId={selectedPatientId}
          prontuario={fileContent}
          staging={staging}
          onStagingChange={handleStagingChange}
          onNotaManual={handleNotaManual}
          onChat={handleChat}
          selectedFileName={selectedFilePath}
          onLiveClinicalUpdate={({ alerts, missing, conducts }) => {
            setLiveAlerts(alerts || []);
            setLiveMissingQuestions(missing || []);
            setLiveRecommendedConducts(conducts || []);
          }}
        />
      </section>

      {/* Right Sidebar - Alerts & Suggestions */}
      <aside
        className={`
          fixed lg:static inset-y-0 right-0 z-40
          bg-white border-l border-[var(--border-color)]
          transition-all duration-300 ease-in-out
          ${isRightPanelOpen ? 'translate-x-0 w-80 lg:w-96' : 'translate-x-full lg:translate-x-0 lg:w-0 lg:border-l-0 lg:overflow-hidden'}
          pt-14 lg:pt-0 shadow-xl lg:shadow-none
        `}
      >
        <div className="h-full flex flex-col relative">
          {/* Close button for mobile/desktop */}
          <button
            onClick={() => setIsRightPanelOpen(false)}
            className="absolute top-3 right-3 p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] z-10"
          >
            <PanelRightClose size={18} />
          </button>

          <RightPanel
            analysis={analysis}
            liveAlerts={liveAlerts}
            liveMissingQuestions={liveMissingQuestions}
            liveRecommendedConducts={liveRecommendedConducts}
            staging={staging}
            onStagingChange={handleStagingChange}
            onAcceptSuggestion={handleAcceptSuggestion}
            onAnalyze={handleAnalyze}
            activeTab={activeRightTab}
            onTabChange={setActiveRightTab}
          />
        </div>
      </aside>
    </main>
  );
}
