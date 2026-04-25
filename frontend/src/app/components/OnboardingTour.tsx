import { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import { X, ChevronRight, SkipForward, ChevronLeft } from 'lucide-react';

// ─── Tour Step Definitions ────────────────────────────────────────────────────

interface TourStep {
  target: string | null; // CSS data-tour selector, null = centred modal
  placement: 'right' | 'left' | 'top' | 'bottom' | 'center';
  emoji: string;
  title: string;
  description: string;
  tip?: string;
}

const STEPS: TourStep[] = [
  {
    target: null,
    placement: 'center',
    emoji: '👋',
    title: 'Welcome to Agentic Pharmacy AI',
    description:
      "This quick tour shows you exactly what each feature does. Click Next to begin — or skip if you'd rather explore on your own.",
  },
  {
    target: '[data-tour="nav-chat"]',
    placement: 'right',
    emoji: '💬',
    title: 'Assistant Chat',
    description:
      'Your main workspace. Talk to the AI in plain language — ask questions, type medicines to add them to stock, or upload a photo of a medicine box.',
    tip: 'Try: "Add Paracetamol 500mg, batch B-4421, expiry June 2026, qty 100"',
  },
  {
    target: '[data-tour="attach-btn"]',
    placement: 'top',
    emoji: '📷',
    title: 'Scan Medicine Labels',
    description:
      'Click this button to upload a photo of any medicine box. The system reads the barcode or label and fills in batch number, expiry date, and category — automatically.',
    tip: 'Works from any angle, even if no barcode is visible.',
  },
  {
    target: '[data-tour="chat-input"]',
    placement: 'top',
    emoji: '💊',
    title: 'Drug Interaction Checker',
    description:
      'Type any drug question here — "Can a patient take Ibuprofen with Aspirin?" — and get a structured safety report instantly.',
    tip: 'Always use your professional judgment alongside the AI\'s answer.',
  },
  {
    target: '[data-tour="nav-inventory"]',
    placement: 'right',
    emoji: '📋',
    title: 'Live Inventory Dashboard',
    description:
      'See all your current stock in one place. Edit stock levels, change categories, or remove outdated entries directly from this tab.',
  },
  {
    target: '[data-tour="nav-sales"]',
    placement: 'right',
    emoji: '🛒',
    title: 'Log Daily Sales',
    description:
      'Record what you\'ve dispensed today. Select the medicine, enter the quantity sold, and confirm. Stock in Live Inventory updates automatically.',
    tip: 'Log throughout the day to keep reorder alerts accurate in real time.',
  },
  {
    target: '[data-tour="nav-reorder"]',
    placement: 'right',
    emoji: '🚨',
    title: 'Reorder Alerts',
    description:
      'The system watches stock levels automatically. Amber = running low (under 10 units). Red = out of stock. Dismiss an alert once you\'ve restocked.',
    tip: 'Make it a habit to check this at the start of each shift.',
  },
  {
    target: '[data-tour="nav-expired"]',
    placement: 'right',
    emoji: '⛔',
    title: 'Expiration Warnings',
    description:
      'Any medicine expiring within 90 days — or already expired — is flagged here, so you can remove it before it becomes a patient risk.',
  },
  {
    target: '[data-tour="nav-settings"]',
    placement: 'right',
    emoji: '⚙️',
    title: 'Account Settings',
    description:
      'Update your display name and manage your account preferences here.',
  },
  {
    target: null,
    placement: 'center',
    emoji: '🎉',
    title: "You're all set!",
    description:
      '📷 New stock → Chat tab\n💊 Safety check → Chat tab\n📦 Running low → Reorder Alerts\n⏰ Expiring soon → Expirations\n💰 Sold something → Log Daily Sales\n\nThe AI is always in the chat whenever you need help.',
  },
];

const STORAGE_KEY = 'pharma_onboarding_v2_done';
const TOOLTIP_W = 320;
const TOOLTIP_GAP = 14; // gap between target and tooltip
const PADDING = 8;       // spotlight padding around target

// ─── Spotlight helpers ────────────────────────────────────────────────────────

interface Rect { top: number; left: number; width: number; height: number }

function getTargetRect(selector: string): Rect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

interface TooltipPos { top: number; left: number; arrowSide: 'left' | 'right' | 'top' | 'bottom' | null }

function calcTooltipPos(rect: Rect, placement: TourStep['placement'], tooltipHeight: number): TooltipPos {
  const W = window.innerWidth;
  const H = window.innerHeight;

  if (placement === 'right') {
    let top = rect.top + rect.height / 2 - tooltipHeight / 2;
    top = Math.max(8, Math.min(H - tooltipHeight - 8, top));
    const left = rect.left + rect.width + TOOLTIP_GAP;
    // Overflow right? Try left.
    if (left + TOOLTIP_W > W - 8) {
      return { top, left: rect.left - TOOLTIP_W - TOOLTIP_GAP, arrowSide: 'right' };
    }
    return { top, left, arrowSide: 'left' };
  }

  if (placement === 'left') {
    let top = rect.top + rect.height / 2 - tooltipHeight / 2;
    top = Math.max(8, Math.min(H - tooltipHeight - 8, top));
    return { top, left: rect.left - TOOLTIP_W - TOOLTIP_GAP, arrowSide: 'right' };
  }

  if (placement === 'top') {
    let left = rect.left + rect.width / 2 - TOOLTIP_W / 2;
    left = Math.max(8, Math.min(W - TOOLTIP_W - 8, left));
    const top = rect.top - tooltipHeight - TOOLTIP_GAP;
    if (top < 8) {
      // Not enough room above — go below
      return { top: rect.top + rect.height + TOOLTIP_GAP, left, arrowSide: 'top' };
    }
    return { top, left, arrowSide: 'bottom' };
  }

  if (placement === 'bottom') {
    let left = rect.left + rect.width / 2 - TOOLTIP_W / 2;
    left = Math.max(8, Math.min(W - TOOLTIP_W - 8, left));
    return { top: rect.top + rect.height + TOOLTIP_GAP, left, arrowSide: 'top' };
  }

  // center
  return {
    top: H / 2 - tooltipHeight / 2,
    left: W / 2 - TOOLTIP_W / 2,
    arrowSide: null,
  };
}

// ─── Arrow component ──────────────────────────────────────────────────────────

function Arrow({ side }: { side: 'left' | 'right' | 'top' | 'bottom' }) {
  const base = 'absolute border-transparent';
  if (side === 'left')
    return (
      <span
        className={base}
        style={{
          left: -TOOLTIP_GAP + 2,
          top: '50%',
          transform: 'translateY(-50%)',
          borderWidth: '8px 8px 8px 0',
          borderRightColor: '#fff',
          position: 'absolute',
        }}
      />
    );
  if (side === 'right')
    return (
      <span
        className={base}
        style={{
          right: -TOOLTIP_GAP + 2,
          top: '50%',
          transform: 'translateY(-50%)',
          borderWidth: '8px 0 8px 8px',
          borderLeftColor: '#fff',
          position: 'absolute',
        }}
      />
    );
  if (side === 'top')
    return (
      <span
        className={base}
        style={{
          top: -TOOLTIP_GAP + 2,
          left: '50%',
          transform: 'translateX(-50%)',
          borderWidth: '0 8px 8px 8px',
          borderBottomColor: '#fff',
          position: 'absolute',
        }}
      />
    );
  // bottom
  return (
    <span
      className={base}
      style={{
        bottom: -TOOLTIP_GAP + 2,
        left: '50%',
        transform: 'translateX(-50%)',
        borderWidth: '8px 8px 0 8px',
        borderTopColor: '#fff',
        position: 'absolute',
      }}
    />
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function OnboardingTour() {
  const [stepIdx, setStepIdx] = useState(0);
  const [visible, setVisible] = useState(false);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<TooltipPos>({ top: 0, left: 0, arrowSide: null });
  const [tooltipHeight, setTooltipHeight] = useState(280);
  const [animating, setAnimating] = useState(false);
  const [show, setShow] = useState(true);

  // Only show once per browser
  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setTimeout(() => setVisible(true), 700);
    }
  }, []);

  const step = STEPS[stepIdx];

  // Recalculate positions whenever step changes or window resizes
  const recalc = useCallback(() => {
    if (!visible) return;
    if (!step.target) {
      setTargetRect(null);
      const H = window.innerHeight;
      const W = window.innerWidth;
      setTooltipPos({ top: H / 2 - tooltipHeight / 2, left: W / 2 - TOOLTIP_W / 2, arrowSide: null });
      return;
    }
    const rect = getTargetRect(step.target);
    setTargetRect(rect);
    if (rect) {
      setTooltipPos(calcTooltipPos(rect, step.placement, tooltipHeight));
    }
  }, [visible, step, tooltipHeight]);

  useLayoutEffect(() => { recalc(); }, [recalc]);

  useEffect(() => {
    window.addEventListener('resize', recalc);
    return () => window.removeEventListener('resize', recalc);
  }, [recalc]);

  // Re-measure tooltip height after render
  const tooltipRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      const h = node.getBoundingClientRect().height;
      if (Math.abs(h - tooltipHeight) > 4) setTooltipHeight(h);
    }
  }, [tooltipHeight]); // eslint-disable-line

  if (!visible) return null;

  const isLast = stepIdx === STEPS.length - 1;
  const isFirst = stepIdx === 0;

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  const goTo = (next: number) => {
    setShow(false);
    setTimeout(() => { setStepIdx(next); setShow(true); }, 180);
  };

  const handleNext = () => isLast ? dismiss() : goTo(stepIdx + 1);
  const handleBack = () => { if (!isFirst) goTo(stepIdx - 1); };
  const handleSkip = () => dismiss();

  // Spotlight rect with padding
  const sp = targetRect
    ? {
        top: targetRect.top - PADDING,
        left: targetRect.left - PADDING,
        width: targetRect.width + PADDING * 2,
        height: targetRect.height + PADDING * 2,
      }
    : null;

  return (
    <>
      {/* ── Full-screen overlay (blocks clicks outside tooltip) ── */}
      <div className="fixed inset-0 z-[9998] pointer-events-all" onClick={handleSkip} />

      {/* ── Spotlight box-shadow mask ── */}
      {sp && (
        <div
          className="fixed z-[9999] rounded-xl pointer-events-none transition-all duration-300"
          style={{
            top: sp.top,
            left: sp.left,
            width: sp.width,
            height: sp.height,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.65)',
            borderRadius: 12,
          }}
        />
      )}

      {/* ── Full overlay for centred steps ── */}
      {!sp && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm pointer-events-none" />
      )}

      {/* ── Tooltip card ── */}
      <div
        ref={tooltipRef}
        className="fixed z-[10000] pointer-events-auto"
        style={{
          top: tooltipPos.top,
          left: tooltipPos.left,
          width: TOOLTIP_W,
          opacity: show ? 1 : 0,
          transform: show ? 'scale(1)' : 'scale(0.95)',
          transition: 'opacity 0.18s ease, transform 0.18s ease',
        }}
      >
        <div className="relative bg-white rounded-2xl shadow-2xl overflow-visible">
          {/* Arrow */}
          {tooltipPos.arrowSide && <Arrow side={tooltipPos.arrowSide} />}

          {/* Header */}
          <div className="bg-gradient-to-r from-[#1E4A4C] to-[#2B6E72] rounded-t-2xl px-5 pt-5 pb-4">
            <div className="flex items-start justify-between">
              <span className="text-4xl leading-none select-none">{step.emoji}</span>
              <button
                onClick={handleSkip}
                className="text-white/50 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <h3 className="mt-3 text-base font-bold text-white leading-snug">{step.title}</h3>

            {/* Step counter dots */}
            <div className="flex items-center gap-1 mt-3">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={`rounded-full transition-all duration-300 ${
                    i === stepIdx ? 'w-5 h-1.5 bg-white' : i < stepIdx ? 'w-1.5 h-1.5 bg-white/50' : 'w-1.5 h-1.5 bg-white/20'
                  }`}
                />
              ))}
              <span className="ml-auto text-[11px] text-white/60 font-medium tabular-nums">
                {stepIdx + 1}/{STEPS.length}
              </span>
            </div>
          </div>

          {/* Body */}
          <div className="px-5 py-4">
            <p className="text-gray-700 text-[13.5px] leading-relaxed whitespace-pre-line">
              {step.description}
            </p>
            {step.tip && (
              <div className="mt-3 bg-[#1E4A4C]/8 border border-[#1E4A4C]/15 rounded-xl px-3.5 py-2.5">
                <p className="text-[12px] text-[#1E4A4C] font-medium leading-snug">💡 {step.tip}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 pb-4 pt-1">
            {!isFirst ? (
              <button
                onClick={handleBack}
                className="flex items-center gap-1 text-[13px] text-gray-400 hover:text-gray-600 font-medium transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            ) : (
              <button
                onClick={handleSkip}
                className="flex items-center gap-1 text-[13px] text-gray-400 hover:text-gray-600 font-medium transition-colors"
              >
                <SkipForward className="w-3.5 h-3.5" /> Skip
              </button>
            )}

            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 bg-[#1E4A4C] hover:bg-[#2B5B5C] text-white px-4 py-2 rounded-xl text-[13px] font-semibold shadow transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
            >
              {isLast ? '🎉 Done' : <>Next <ChevronRight className="w-3.5 h-3.5" /></>}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
