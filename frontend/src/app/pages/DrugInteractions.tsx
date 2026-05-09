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
    bg: '#0D0900',
    border: '#78350F',
    headerBg: '#1C1200',
    Icon: ShieldAlert,
  },
  safe: {
    label: 'No Interaction Identified',
    sublabel: 'No direct interaction found in FDA records',
    color: '#16A34A',
    bg: '#030D05',
    border: '#166534',
    headerBg: '#052E16',
    Icon: CheckCircle2,
  },
  unknown: {
    label: 'Insufficient Data',
    sublabel: 'One or both drugs not found in database',
    color: '#6B7280',
    bg: '#0A0A0B',
    border: '#27272A',
    headerBg: '#111113',
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
                background: '#0E0E11',
                border: '1px solid #1C1C1F',
                borderLeft: '3px solid #3B82F6',
                borderRadius: '0 8px 8px 0',
                padding: '12px 16px',
              }}
            >
              <p style={{ margin: '0 0 8px', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 11, fontWeight: 700, color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '0.7px' }}>
                FDA Label Excerpt
              </p>
              <p style={{ margin: 0, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12.5, color: '#A1A1AA', lineHeight: 1.7 }}>
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
                background: '#0E0E11',
                border: '1px solid #1C1C1F',
                borderRadius: 8,
                padding: '12px 16px',
              }}
            >
              <p style={{ margin: '0 0 6px', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 11, fontWeight: 700, color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.7px' }}>
                Clinical Guidance
              </p>
              <p style={{ margin: 0, fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 13.5, color: '#D4D4D8', lineHeight: 1.7 }}>
                {para.replace(/^(Clinical Guidance:|Recommendation:)\s*/, '')}
              </p>
            </div>
          );
        }

        if (isNote) {
          return (
            <p key={i} style={{ margin: 0, fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 12.5, color: '#52525B', lineHeight: 1.6, fontStyle: 'italic' }}>
              {para}
            </p>
          );
        }

        if (isDisclosure) {
          return (
            <p key={i} style={{ margin: 0, fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 12.5, color: '#71717A', lineHeight: 1.6 }}>
              {para}
            </p>
          );
        }

        return (
          <p key={i} style={{ margin: 0, fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 14, color: '#A1A1AA', lineHeight: 1.75 }}>
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
            background: '#18181B',
            border: '1px solid #27272A',
            borderRadius: 7,
            padding: '6px 12px',
            color: copied ? '#22C55E' : '#71717A',
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
        <span style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 12, fontWeight: 600, color: '#93C5FD', background: '#0C1A2E', border: '1px solid #1E3A5F', borderRadius: 5, padding: '3px 10px' }}>
          {result.drug_a}
        </span>
        <span style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 10, fontWeight: 700, color: '#3F3F46' }}>AND</span>
        <span style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 12, fontWeight: 600, color: '#C4B5FD', background: '#1A0A2E', border: '1px solid #3B1F6E', borderRadius: 5, padding: '3px 10px' }}>
          {result.drug_b}
        </span>
        <span style={{ marginLeft: 'auto', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 10, fontWeight: 600, color: '#3F3F46', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
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
          color: '#52525B',
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
          background: '#0E0E11',
          border: '1px solid #27272A',
          borderRadius: 8,
          padding: '11px 14px',
          fontFamily: 'IBM Plex Sans, sans-serif',
          fontSize: 14,
          color: '#F4F4F5',
          outline: 'none',
          boxSizing: 'border-box',
          transition: 'border-color 0.15s',
        }}
        onFocus={e => (e.target.style.borderColor = accentColor)}
        onBlur={e => (e.target.style.borderColor = '#27272A')}
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
  const [history, setHistory] = useState<CheckResult[]>([]);
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
      setHistory(h => [entry, ...h.slice(0, 9)]);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
    } catch {
      setError('Unable to reach the server. Ensure the backend is running on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', background: '#09090B' }}>

      {/* Topbar */}
      <div style={{ height: 56, background: '#0E0E11', borderBottom: '1px solid #1C1C1F', display: 'flex', alignItems: 'center', gap: 14, padding: '0 24px', position: 'sticky', top: 0, zIndex: 20 }}>
        {!isSidebarOpen && (
          <button onClick={() => setIsSidebarOpen(true)} style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7, background: '#18181B', border: '1px solid #27272A', color: '#71717A', cursor: 'pointer' }}>
            <Menu size={17} />
          </button>
        )}
        <FlaskConical size={16} style={{ color: '#7C3AED' }} />
        <h1 style={{ margin: 0, fontFamily: 'DM Sans, sans-serif', fontSize: 15, fontWeight: 600, color: '#F4F4F5', letterSpacing: '-0.2px' }}>
          Drug Interaction Checker
        </h1>
        <span style={{ marginLeft: 'auto', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 10, fontWeight: 700, color: '#3F3F46', textTransform: 'uppercase', letterSpacing: '0.7px' }}>
          FDA openFDA · ChromaDB RAG
        </span>
      </div>

      <div style={{ maxWidth: 820, margin: '0 auto', width: '100%', padding: '40px 24px 80px' }}>

        {/* Page heading */}
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ margin: 0, fontFamily: 'DM Sans, sans-serif', fontSize: 26, fontWeight: 700, color: '#F4F4F5', letterSpacing: '-0.4px' }}>
            Drug Interaction Check
          </h2>
        </div>

        {/* Input panel */}
        <div style={{ background: '#111113', border: '1px solid #1C1C1F', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <InputField
              label="Drug A"
              value={drugA}
              onChange={setDrugA}
              accentColor="#3B82F6"
              placeholder="e.g. Warfarin"
            />

            <div style={{ paddingBottom: 4, flexShrink: 0, color: '#3F3F46', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 12, fontWeight: 700 }}>
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
                background: loading || !drugA.trim() || !drugB.trim() ? '#1C1C1F' : '#7C3AED',
                color: loading || !drugA.trim() || !drugB.trim() ? '#52525B' : '#fff',
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
                  <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #52525B', borderTopColor: '#A78BFA', animation: 'spin 0.6s linear infinite' }} />
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
          <p style={{ margin: '16px 0 0', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 11.5, color: '#3F3F46', lineHeight: 1.5, borderTop: '1px solid #1A1A1D', paddingTop: 12 }}>
            Results are sourced from FDA openFDA drug labels. This tool is for reference only and does not constitute medical advice. Always verify with clinical sources.
          </p>
        </div>

        {/* Result */}
        <div ref={resultRef}>
          {result && <ResultCard result={result} />}
        </div>

        {/* History */}
        {history.length > 1 && (
          <div style={{ marginTop: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Clock size={13} style={{ color: '#3F3F46' }} />
                <span style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 11, fontWeight: 700, color: '#3F3F46', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Recent Checks
                </span>
              </div>
              <button
                onClick={() => setHistory([])}
                style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', color: '#3F3F46', cursor: 'pointer', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 11, padding: 0 }}
              >
                <Trash2 size={11} /> Clear history
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {history.slice(1).map((h, i) => {
                const sev = SEVERITY[getSeverity(h)];
                return (
                  <button
                    key={i}
                    onClick={() => { setDrugA(h.drug_a); setDrugB(h.drug_b); setResult(h); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      background: '#0E0E11',
                      border: '1px solid #1A1A1D',
                      borderRadius: 8,
                      padding: '9px 14px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                      transition: 'border-color 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = '#27272A')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = '#1A1A1D')}
                  >
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: sev.color, flexShrink: 0 }} />
                    <span style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 13, fontWeight: 500, color: '#A1A1AA', flex: 1 }}>
                      {h.drug_a} <span style={{ color: '#3F3F46' }}>+</span> {h.drug_b}
                    </span>
                    <span style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 11, color: sev.color, fontWeight: 600 }}>
                      {sev.label}
                    </span>
                    <span style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 11, color: '#3F3F46' }}>
                      {h.checkedAt}
                    </span>
                    <ChevronRight size={12} style={{ color: '#27272A' }} />
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
