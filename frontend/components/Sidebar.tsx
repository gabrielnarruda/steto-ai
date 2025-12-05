"use client";

import { useState } from "react";
import {
    ChevronRight,
    ChevronDown,
    FileText,
    Folder,
    Image as ImageIcon,
    Menu,
    User,
    Settings,
    LogOut,
    Search,
    MoreVertical
} from "lucide-react";

interface FileNode {
    name: string;
    type: "file" | "folder";
    path: string;
    children?: FileNode[];
}

interface Patient {
    id: string;
    name: string;
    age?: number;
    gender?: string;
}

interface SidebarProps {
    patients: Patient[];
    selectedPatientId: string | null;
    onSelectPatient: (id: string) => void;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    fileTree: FileNode | null;
    onFileSelect: (path: string) => void;
    selectedFilePath: string | null;
}

export default function Sidebar({
    patients,
    selectedPatientId,
    onSelectPatient,
    isCollapsed,
    onToggleCollapse,
    fileTree,
    onFileSelect,
    selectedFilePath
}: SidebarProps) {
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

    const toggleFolder = (path: string) => {
        const newExpanded = new Set(expandedFolders);
        if (newExpanded.has(path)) {
            newExpanded.delete(path);
        } else {
            newExpanded.add(path);
        }
        setExpandedFolders(newExpanded);
    };

    const getFileIcon = (fileName: string) => {
        const ext = fileName.split('.').pop()?.toLowerCase();
        if (ext === 'md') return <FileText size={16} className="text-blue-500" />;
        if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) return <ImageIcon size={16} className="text-purple-500" />;
        return <FileText size={16} className="text-[var(--text-tertiary)]" />;
    };

    const renderFileTree = (node: FileNode, depth: number = 0) => {
        const isSelected = selectedFilePath === node.path;
        const paddingLeft = depth * 12 + 12;

        if (node.type === "file") {
            return (
                <button
                    key={node.path}
                    onClick={(e) => {
                        e.stopPropagation();
                        onFileSelect(node.path);
                    }}
                    className={`group w-full flex items-center gap-2.5 py-1.5 px-3 text-sm rounded-md transition-all duration-200 mb-0.5
                        ${isSelected
                            ? "bg-[var(--primary-green-subtle)] text-[var(--primary-green)] font-medium"
                            : "text-[var(--text-secondary)] hover:bg-gray-50 hover:text-[var(--text-primary)]"
                        }`}
                    style={{ paddingLeft: `${paddingLeft}px` }}
                >
                    {getFileIcon(node.name)}
                    <span className="truncate">{node.name}</span>
                </button>
            );
        }

        const isExpanded = expandedFolders.has(node.path);

        return (
            <div key={node.path}>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        toggleFolder(node.path);
                    }}
                    className="w-full flex items-center gap-2.5 py-1.5 px-3 text-sm text-[var(--text-secondary)] hover:bg-gray-50 hover:text-[var(--text-primary)] rounded-md transition-all duration-200 mb-0.5"
                    style={{ paddingLeft: `${paddingLeft}px` }}
                >
                    <span className={`transition-transform duration-200 text-[var(--text-tertiary)] ${isExpanded ? 'rotate-90' : ''}`}>
                        <ChevronRight size={14} />
                    </span>
                    <Folder size={16} className="text-yellow-500 fill-yellow-500/20" />
                    <span className="font-medium truncate">{node.name}</span>
                </button>
                {isExpanded && node.children && (
                    <div className="animate-slide-in border-l border-[var(--border-color)] ml-5">
                        {node.children.map(child => renderFileTree(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col bg-[var(--background-sidebar)]">
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-[var(--border-color)] shrink-0">
                {!isCollapsed && (
                    <div className="flex items-center gap-2 animate-slide-in">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--primary-green)] to-[var(--primary-green-hover)] flex items-center justify-center text-white font-bold shadow-md shadow-green-900/10">
                            S
                        </div>
                        <span className="font-bold text-[var(--text-primary)] tracking-tight text-lg">Steto<span className="text-[var(--primary-green)]">AI</span></span>
                    </div>
                )}
                {/* Mobile/Tablet collapse trigger is handled in parent, but we can keep a button here if needed for desktop-only internal collapse if designed that way. 
                    For now, the parent controls collapse state. */}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">
                {!isCollapsed ? (
                    <div className="px-3 space-y-6">
                        {/* Search (Visual only for now) */}
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                            <input
                                type="text"
                                placeholder="Buscar paciente..."
                                className="w-full pl-9 pr-3 py-2 bg-[var(--background-page)] border border-[var(--border-color)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-green)]/20 transition-all"
                            />
                        </div>

                        {/* Patients List */}
                        <div>
                            <h3 className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider px-2 mb-3">
                                Pacientes Recentes
                            </h3>
                            <div className="space-y-1">
                                {patients.length === 0 ? (
                                    <div className="text-sm text-[var(--text-tertiary)] italic px-3 py-2">
                                        Nenhum paciente...
                                    </div>
                                ) : (
                                    patients.map((patient) => (
                                        <div key={patient.id} className="group">
                                            <button
                                                onClick={() => onSelectPatient(patient.id)}
                                                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 border border-transparent
                                                    ${selectedPatientId === patient.id
                                                        ? "bg-white border-[var(--border-color)] shadow-sm"
                                                        : "text-[var(--text-secondary)] hover:bg-[var(--background-page)] hover:text-[var(--text-primary)]"
                                                    }`}
                                            >
                                                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                                                    ${selectedPatientId === patient.id
                                                        ? 'bg-[var(--primary-green-light)] text-[var(--primary-green)]'
                                                        : 'bg-[var(--background-page)] text-[var(--text-tertiary)] group-hover:bg-white group-hover:shadow-sm'}`}>
                                                    {patient.name.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div className="flex-1 text-left">
                                                    <div className={`truncate ${selectedPatientId === patient.id ? 'text-[var(--text-primary)]' : ''}`}>
                                                        {patient.name}
                                                    </div>
                                                    {patient.age && (
                                                        <div className="text-xs text-[var(--text-tertiary)] font-normal">
                                                            {patient.age} anos • {patient.gender === 'M' ? 'Masc' : 'Fem'}
                                                        </div>
                                                    )}
                                                </div>
                                                {selectedPatientId === patient.id && (
                                                    <ChevronDown size={14} className="text-[var(--text-tertiary)]" />
                                                )}
                                            </button>

                                            {/* File Tree (Nested) */}
                                            {selectedPatientId === patient.id && fileTree && (
                                                <div className="mt-2 mb-4 ml-3 pl-3 border-l-2 border-[var(--border-color)] animate-slide-in">
                                                    {fileTree.children?.map(child => renderFileTree(child, 0))}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-4 px-2">
                        {patients.map((patient) => (
                            <button
                                key={patient.id}
                                onClick={() => onSelectPatient(patient.id)}
                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 relative group
                                    ${selectedPatientId === patient.id
                                        ? "bg-[var(--primary-green)] text-white shadow-lg shadow-green-900/20"
                                        : "bg-[var(--background-page)] text-[var(--text-secondary)] hover:bg-white hover:shadow-md"
                                    }`}
                                title={patient.name}
                            >
                                <span className="text-xs font-bold">{patient.name.substring(0, 2).toUpperCase()}</span>

                                {/* Tooltip */}
                                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                                    {patient.name}
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[var(--border-color)] shrink-0">
                <button className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--background-page)] hover:text-[var(--text-primary)] transition-colors ${isCollapsed ? 'justify-center' : ''}`}>
                    <Settings size={18} />
                    {!isCollapsed && <span>Configurações</span>}
                </button>
            </div>
        </div>
    );
}

