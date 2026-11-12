import React, { useState } from 'react';
import { Worksheet } from '../types/database';
import { exportToSvg, exportToMarkdown, exportToMermaid, generateSQL, downloadFile } from '../lib/exporters';
import { X, Copy, Download, Check, FileCode, FileText, Image, Database } from 'lucide-react';

interface ExportModalProps {
  worksheet: Worksheet;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ worksheet, onClose }) => {
  const [activeTab, setActiveTab] = useState<'svg' | 'markdown' | 'mermaid' | 'sql'>('svg');
  const [copied, setCopied] = useState(false);

  const svgContent = React.useMemo(() => exportToSvg(worksheet), [worksheet]);
  const markdownContent = React.useMemo(() => exportToMarkdown(worksheet), [worksheet]);
  const mermaidContent = React.useMemo(() => exportToMermaid(worksheet), [worksheet]);
  const sqlContent = React.useMemo(() => generateSQL(worksheet), [worksheet]);

  const currentContent =
    activeTab === 'svg'
      ? svgContent
      : activeTab === 'markdown'
      ? markdownContent
      : activeTab === 'mermaid'
      ? mermaidContent
      : sqlContent;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleDownload = () => {
    const baseName = worksheet.name || 'schema';
    if (activeTab === 'svg') {
      downloadFile(`${baseName}.svg`, svgContent, 'image/svg+xml');
    } else if (activeTab === 'markdown') {
      downloadFile(`${baseName}_schema.md`, markdownContent, 'text/markdown');
    } else if (activeTab === 'mermaid') {
      downloadFile(`${baseName}_mermaid.mmd`, mermaidContent, 'text/plain');
    } else if (activeTab === 'sql') {
      downloadFile(`${baseName}_${worksheet.dialect}.sql`, sqlContent, 'text/sql');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-xl shadow-2xl text-slate-100 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div>
            <h3 className="font-semibold text-lg text-white">Export Schema & Diagram</h3>
            <p className="text-xs text-slate-400">
              Export diagram as SVG, Markdown documentation, Mermaid ER syntax, or SQL DDL
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Header */}
        <div className="flex items-center justify-between px-6 border-b border-slate-800 bg-slate-950/40 shrink-0">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('svg')}
              className={`flex items-center gap-2 py-3 text-sm font-medium border-b-2 transition ${
                activeTab === 'svg'
                  ? 'border-sky-500 text-sky-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Image size={16} />
              SVG Diagram
            </button>
            <button
              onClick={() => setActiveTab('markdown')}
              className={`flex items-center gap-2 py-3 text-sm font-medium border-b-2 transition ${
                activeTab === 'markdown'
                  ? 'border-sky-500 text-sky-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText size={16} />
              Markdown Schema
            </button>
            <button
              onClick={() => setActiveTab('mermaid')}
              className={`flex items-center gap-2 py-3 text-sm font-medium border-b-2 transition ${
                activeTab === 'mermaid'
                  ? 'border-sky-500 text-sky-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCode size={16} />
              Mermaid Diagram
            </button>
            <button
              onClick={() => setActiveTab('sql')}
              className={`flex items-center gap-2 py-3 text-sm font-medium border-b-2 transition ${
                activeTab === 'sql'
                  ? 'border-sky-500 text-sky-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Database size={16} />
              SQL DDL ({worksheet.dialect.toUpperCase()})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copied ? 'Copied!' : 'Copy Code'}</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition shadow-sm"
            >
              <Download size={14} />
              <span>Download</span>
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="p-6 overflow-y-auto grow bg-slate-950 font-mono text-xs">
          {activeTab === 'svg' ? (
            <div className="space-y-4">
              <div className="border border-slate-800 rounded-lg p-4 bg-slate-900/40 overflow-auto max-h-[450px] flex items-center justify-center">
                <div
                  className="w-full h-auto min-w-[500px]"
                  dangerouslySetInnerHTML={{ __html: svgContent }}
                />
              </div>
              <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-slate-400 text-xs">
                💡 Full vector standalone SVG with embedded styling, relationship paths, and cardinality tags.
              </div>
            </div>
          ) : (
            <pre className="p-4 rounded-lg bg-slate-900/80 border border-slate-800/80 text-slate-300 leading-relaxed overflow-x-auto whitespace-pre-wrap selection:bg-sky-500/30">
              {currentContent}
            </pre>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-900 border-t border-slate-800 shrink-0 text-xs text-slate-400">
          <span>
            {activeTab === 'svg'
              ? `${worksheet.tables.length} tables, ${worksheet.relations.length} relations mapped`
              : activeTab === 'markdown'
              ? 'Complete DDL + Tables documentation + Notes'
              : activeTab === 'mermaid'
              ? 'Standard erDiagram syntax for GitHub, Notion, Obsidian, and docs'
              : `${worksheet.dialect.toUpperCase()} schema with foreign keys and indexes`}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-200 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

