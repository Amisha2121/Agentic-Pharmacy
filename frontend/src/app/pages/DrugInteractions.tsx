import { useState, useRef } from 'react';
import { useOutletContext } from 'react-router';
import {
  Menu, Search, AlertTriangle, CheckCircle2, XCircle,
  FlaskConical, Clock, Trash2, Copy, Check, ChevronRight,
  ShieldAlert, Database, Info,
} from 'lucide-react';
import { authenticatedFetch } from '../utils/api';

interface ContextType {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (v: boolean) => void;
}

interface CheckResult {
  drug_a: string;
  drug_b: string;
  interaction_detected: boolean;
  found: boolean;
  drug_a_in_db: boolean;
  drug_b_in_db: boolean;
  interaction_text: string | null;
  formatted: string;
  checkedAt: string;
}

type Severity = 'interaction' | 'safe' | 'unknown';

const SEVERITY: Record<Severity, {
  label: string;
  sublabel: string;
  color: string;
  bg: string;
  border: string;
  headerBg: string;
  Icon: typeof AlertTriangle;
}> = {
  interaction: {
    label: 'Interaction Detected',
    sublabel: 'Clinically significant — review recommended',
    color: '#D97706',
    bg: '#FEF3C7',
    border: '#FDE68A',
    headerBg: '#FEF3C7',
    Icon: ShieldAlert,
  },
  safe: {
    label: 'No Interaction Identified',
    sublabel: 'No direct interaction found in FDA records',
    color: '#16A34A',
    bg: '#ECFDF5',
    border: '#A7F3D0',
    headerBg: '#ECFDF5',
    Icon: CheckCircle2,
  },
  unknown: {
    label: 'Insufficient Data',
    sublabel: 'One or both drugs not found in database',
    color: '#6B7280',
    bg: '#F9FAFB',
    border: '#E5E7EB',
    headerBg: '#F9FAFB',
    Icon: XCircle,
  },
};

function getSeverity(result: CheckResult): Severity {
  if (result.interaction_detected) return 'interaction';
  if (result.found) return 'safe';
  return 'unknown';
}

// Render formatted text as structured paragraphs — no raw markdown, no emojis
function FormattedText({ text }: { text: string }) {
  const paragraphs = text.split('\n\n').filter(Boolean);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {paragraphs.map((para, i) => {
        const isFdaExcerpt = para.startsWith('FDA Label Excerpt:');
        const isGuidance = para.startsWith('Clinical Guidance:') || para.startsWith('Recommendation:');
        const isNote = para.toLowerCase().startsWith('note:');
        const isDisclosure = para.startsWith('Always disclose') || para.startsWith('When in doubt');

        if (isFdaExcerpt) {
          const lines = para.split('\n');
          return (
            <div
              key={i}
              style={{
                background: '#F9FAFB',
                border: '1px solid #E5E7EB',
                borderLeft: '3px solid #3B82F6',
                borderRadius: '0 8px 8px 0',
                padding: '12px 16px',
              }}
            >
              <p style={{ margin: '0 0 8px', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 11, fontWeight: 700, color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '0.7px' }}>
                FDA Label Excerpt
              </p>
              <p style={{ margin: 0, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12.5, color: '#6B7280', lineHeight: 1.7 }}>
                {lines.slice(1).join('\n')}
              </p>
            </div>
          );
        }

        if (isGuidance) {
          return (
            <div
              key={i}
              style={{
                background: '#F9FAFB',
                border: '1px solid #E5E7EB',
                borderRadius: 8,
                padding: '12px 16px',
              }}
            >
              <p style={{ margin: '0 0 6px', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.7px' }}>
                Clinical Guidance
              </p>
              <p style={{ margin: 0, fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 13.5, color: '#374151', lineHeight: 1.7 }}>
                {para.replace(/^(Clinical Guidance:|Recommendation:)\s*/, '')}
              </p>
            </div>
          );
        }

        if (isNote) {
          return (
            <p key={i} style={{ margin: 0, fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 12.5, color: '#9CA3AF', lineHeight: 1.6, fontStyle: 'italic' }}>
              {para}
            </p>
          );
        }

        if (isDisclosure) {
          return (
            <p key={i} style={{ margin: 0, fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 12.5, color: '#6B7280', lineHeight: 1.6 }}>
              {para}
            </p>
          );
        }

        return (
          <p key={i} style={{ margin: 0, fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 14, color: '#6B7280', lineHeight: 1.75 }}>
            {para}
          </p>
        );
      })}
    </div>
  );
}

function ResultCard({ result }: { result: CheckResult }) {
  const [copied, setCopied] = useState(false);
  const sev = SEVERITY[getSeverity(result)];
  const SevIcon = sev.Icon;

  const copyText = () => {
    navigator.clipboard.writeText(
      `Drug Interaction Report\n${result.drug_a} + ${result.drug_b}\n${result.checkedAt}\n\n${sev.label}\n\n${result.formatted}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        background: sev.bg,
        border: `1px solid ${sev.border}`,
        borderRadius: 12,
        overflow: 'hidden',
        animation: 'result-in 0.3s cubic-bezier(0.16,1,0.3,1)',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: sev.headerBg,
          borderBottom: `1px solid ${sev.border}`,
          padding: '16px 22px',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <SevIcon size={18} style={{ color: sev.color, marginTop: 2, flexShrink: 0 }} />
          <div>
            <p style={{ margin: 0, fontFamily: 'DM Sans, sans-serif', fontSize: 15, fontWeight: 700, color: sev.color, letterSpacing: '-0.2px' }}>
              {sev.label}
            </p>
            <p style={{ margin: '3px 0 0', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 12, color: '#52525B' }}>
              {sev.sublabel}
            </p>
          </div>
        </div>

        <button
          onClick={copyText}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexShrink: 0,
            background: 'white',
            border: '1px solid #E5E7EB',
            borderRadius: 7,
            padding: '6px 12px',
            color: copied ? '#22C55E' : '#6B7280',
            fontFamily: 'IBM Plex Sans, sans-serif',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'color 0.2s',
          }}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy Report'}
        </button>
      </div>

      {/* Drug pair row */}
      <div
        style={{
          padding: '12px 22px',
          borderBottom: `1px solid ${sev.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 12, fontWeight: 600, color: '#2563EB', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 5, padding: '3px 10px' }}>
          {result.drug_a}
        </span>
        <span style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 10, fontWeight: 700, color: '#9CA3AF' }}>AND</span>
        <span style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 12, fontWeight: 600, color: '#7C3AED', background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 5, padding: '3px 10px' }}>
          {result.drug_b}
        </span>
        <span style={{ marginLeft: 'auto', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 10, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          FDA openFDA Drug Labels
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: '20px 22px' }}>
        <FormattedText text={result.formatted} />
      </div>

      {/* Footer — DB status */}
      <div
        style={{
          padding: '10px 22px',
          borderTop: `1px solid ${sev.border}`,
          display: 'flex',
          gap: 20,
          flexWrap: 'wrap',
        }}
      >
        {[
          { drug: result.drug_a, inDb: result.drug_a_in_db },
          { drug: result.drug_b, inDb: result.drug_b_in_db },
        ].map(({ drug, inDb }) => (
          <div key={drug} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Database size={11} style={{ color: inDb ? '#22C55E' : '#52525B' }} />
            <span style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 11, color: inDb ? '#52525B' : '#3F3F46' }}>
              {drug} — {inDb ? 'Found in FDA dataset' : 'Not in FDA dataset'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  accentColor,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  accentColor: string;
  placeholder: string;
}) {
  return (
    <div style={{ flex: 1 }}>
      <label
        style={{
          display: 'block',
          fontFamily: 'IBM Plex Sans, sans-serif',
          fontSize: 11,
          fontWeight: 700,
          color: '#9CA3AF',
          textTransform: 'uppercase',
          letterSpacing: '0.7px',
          marginBottom: 8,
        }}
      >
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          background: '#F9FAFB',
          border: '1px solid #E5E7EB',
          borderRadius: 8,
          padding: '11px 14px',
          fontFamily: 'IBM Plex Sans, sans-serif',
          fontSize: 14,
          color: '#111827',
          outline: 'none',
          boxSizing: 'border-box',
          transition: 'border-color 0.15s',
        }}
        onFocus={e => (e.target.style.borderColor = accentColor)}
        onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
        onKeyDown={e => { if (e.key === 'Enter') (document.getElementById('ddi-check-btn') as HTMLButtonElement)?.click(); }}
      />
    </div>
  );
}

export function DrugInteractions() {
  const { isSidebarOpen, setIsSidebarOpen } = useOutletContext<ContextType>();
  const [drugA, setDrugA] = useState('');
  const [drugB, setDrugB] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [history, setHistory] = useState<CheckResult[]>(() => {
    try {
      const saved = localStorage.getItem('pharmaai_drug_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [error, setError] = useState('');
  const resultRef = useRef<HTMLDivElement>(null);

  const handleCheck = async () => {
    if (!drugA.trim() || !drugB.trim()) { setError('Please enter both drug names.'); return; }
    if (drugA.trim().toLowerCase() === drugB.trim().toLowerCase()) { setError('Please enter two different drugs.'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await authenticatedFetch('/api/ddi-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drug_a: drugA.trim(), drug_b: drugB.trim() }),
      });
      const data = await res.json();
      const entry: CheckResult = {
        ...data,
        drug_a: drugA.trim(),
        drug_b: drugB.trim(),
        checkedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setResult(entry);
      const updatedHistory = [entry, ...history.slice(0, 9)];
      setHistory(updatedHistory);
      localStorage.setItem('pharmaai_drug_history', JSON.stringify(updatedHistory));
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
    } catch {
      setError('Unable to reach the server. Ensure the backend is running on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('pharmaai_drug_history');
  };

  const fillExample = (a: string, b: string) => {
    setDrugA(a);
    setDrugB(b);
  };

  const rerunCheck = (entry: CheckResult) => {
    setDrugA(entry.drug_a);
    setDrugB(entry.drug_b);
    setResult(entry);
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', background: '#F9FAFB' }}>

      {/* Topbar */}
      <div style={{ height: 56, background: '#FFFFFF', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 14, padding: '0 24px', position: 'sticky', top: 0, zIndex: 20 }}>
        {!isSidebarOpen && (
          <button onClick={() => setIsSidebarOpen(true)} style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7, background: '#FFFFFF', border: '1px solid #E5E7EB', color: '#6B7280', cursor: 'pointer' }}>
            <Menu size={17} />
          </button>
        )}
        <FlaskConical size={16} style={{ color: '#8B5CF6' }} />
        <h1 style={{ margin: 0, fontFamily: 'DM Sans, sans-serif', fontSize: 18, fontWeight: 700, color: '#111827', letterSpacing: '-0.2px' }}>
          Drug Interaction Checker
        </h1>
      </div>

      <div style={{ maxWidth: 820, margin: '0 auto', width: '100%', padding: '40px 24px 80px' }}>

        {/* Page heading */}
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ margin: 0, fontFamily: 'DM Sans, sans-serif', fontSize: 24, fontWeight: 700, color: '#111827', letterSpacing: '-0.4px' }}>
            Drug interaction check
          </h2>
        </div>

        {/* Input panel */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <InputField
              label="Drug A"
              value={drugA}
              onChange={setDrugA}
              accentColor="#3B82F6"
              placeholder="e.g. Warfarin"
            />

            <div style={{ paddingBottom: 4, flexShrink: 0, color: '#9CA3AF', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 12, fontWeight: 700 }}>
              AND
            </div>

            <InputField
              label="Drug B"
              value={drugB}
              onChange={setDrugB}
              accentColor="#7C3AED"
              placeholder="e.g. Aspirin"
            />

            <button
              id="ddi-check-btn"
              onClick={handleCheck}
              disabled={loading || !drugA.trim() || !drugB.trim()}
              style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: loading || !drugA.trim() || !drugB.trim() ? '#F3F4F6' : '#7C3AED',
                color: loading || !drugA.trim() || !drugB.trim() ? '#9CA3AF' : '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '11px 22px',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 14,
                fontWeight: 700,
                cursor: loading || !drugA.trim() || !drugB.trim() ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s',
                letterSpacing: '-0.1px',
                marginBottom: 0,
              }}
              onMouseEnter={e => { if (!loading && drugA.trim() && drugB.trim()) e.currentTarget.style.background = '#6D28D9'; }}
              onMouseLeave={e => { if (!loading && drugA.trim() && drugB.trim()) e.currentTarget.style.background = '#7C3AED'; }}
            >
              {loading ? (
                <>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #9CA3AF', borderTopColor: '#A78BFA', animation: 'spin 0.6s linear infinite' }} />
                  Checking
                </>
              ) : (
                <>
                  <Search size={14} />
                  Check
                </>
              )}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 7, color: '#EF4444', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 13 }}>
              <Info size={13} />
              {error}
            </div>
          )}

          {/* Disclaimer */}
          <p style={{ margin: '16px 0 0', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 11.5, color: '#9CA3AF', lineHeight: 1.5, borderTop: '1px solid #E5E7EB', paddingTop: 12 }}>
            Results are sourced from FDA openFDA drug labels. This tool is for reference only and does not constitute medical advice. Always verify with clinical sources.
          </p>
        </div>

        {/* Result */}
        <div ref={resultRef}>
          {result && <ResultCard result={result} />}
        </div>

        {/* Metadata footer */}
        <div style={{ marginTop: 24, padding: '12px 16px', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, textAlign: 'center' }}>
          <p style={{ margin: 0, fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 11, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Data Source: FDA openFDA · ChromaDB RAG
          </p>
        </div>

        {/* Example chips - shown when no result */}
        {!result && history.length === 0 && (
          <div style={{ marginTop: 24, padding: '20px 24px', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 12 }}>
            <p style={{ margin: '0 0 12px', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 12, fontWeight: 600, color: '#6B7280' }}>
              Common drug pairs to check:
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {[
                ['Warfarin', 'Aspirin'],
                ['Metformin', 'Ibuprofen'],
                ['Amoxicillin', 'Alcohol'],
              ].map(([a, b]) => (
                <button
                  key={`${a}-${b}`}
                  onClick={() => fillExample(a, b)}
                  style={{
                    padding: '6px 12px',
                    background: 'white',
                    border: '1px solid #E5E7EB',
                    borderRadius: 8,
                    fontFamily: 'IBM Plex Sans, sans-serif',
                    fontSize: 12,
                    fontWeight: 500,
                    color: '#6B7280',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#7C3AED'; e.currentTarget.style.color = '#7C3AED'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.color = '#6B7280'; }}
                >
                  {a} + {b}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Clock size={13} style={{ color: '#3F3F46' }} />
                <span style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 11, fontWeight: 700, color: '#3F3F46', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Recent Checks
                </span>
              </div>
              <button
                onClick={clearHistory}
                style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', color: '#3F3F46', cursor: 'pointer', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 11, padding: 0 }}
              >
                <Trash2 size={11} /> Clear history
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {history.map((h, i) => {
                const sev = SEVERITY[getSeverity(h)];
                return (
                  <button
                    key={i}
                    onClick={() => rerunCheck(h)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      background: '#FFFFFF',
                      border: '1px solid #E5E7EB',
                      borderRadius: 8,
                      padding: '9px 14px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                      transition: 'border-color 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = '#D1D5DB')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = '#E5E7EB')}
                  >
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: sev.color, flexShrink: 0 }} />
                    <span style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 13, fontWeight: 500, color: '#6B7280', flex: 1 }}>
                      {h.drug_a} <span style={{ color: '#9CA3AF' }}>↔</span> {h.drug_b}
                    </span>
                    <span style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 11, color: sev.color, fontWeight: 600 }}>
                      {sev.label}
                    </span>
                    <span style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 11, color: '#9CA3AF' }}>
                      {h.checkedAt}
                    </span>
                    <ChevronRight size={12} style={{ color: '#D1D5DB' }} />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes result-in {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
