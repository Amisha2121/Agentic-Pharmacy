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
    tip: "Always use your professional judgment alongside the AI's answer.",
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
      "Record what you've dispensed today. Select the medicine, enter the quantity sold, and confirm. Stock in Live Inventory updates automatically.",
    tip: 'Log throughout the day to keep reorder alerts accurate in real time.',
  },
  {
    target: '[data-tour="nav-reorder"]',
    placement: 'right',
    emoji: '🚨',
    title: 'Reorder Alerts',
    description:
      "The system watches stock levels automatically. Amber = running low (under 10 units). Red = out of stock. Dismiss an alert once you've restocked.",
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

// Storage key is now per-user so every new account gets the tour fresh
function getStorageKey(uid?: string) {
  return uid ? `pharma_onboarding_v2_done_${uid}` : 'pharma_onboarding_v2_done';
}
const TOOLTIP_W = 328;
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

// Arrow color matches the tooltip card background (#18181B)
const ARROW_COLOR = '#18181B';
const ARROW_BORDER = '#27272A';

function Arrow({ side }: { side: 'left' | 'right' | 'top' | 'bottom' }) {
  if (side === 'left')
    return (
      <>
        {/* Border layer */}
        <span
          style={{
            position: 'absolute',
            left: -TOOLTIP_GAP - 1,
            top: '50%',
            transform: 'translateY(-50%)',
            borderWidth: '9px 9px 9px 0',
            borderStyle: 'solid',
            borderColor: `transparent ${ARROW_BORDER} transparent transparent`,
          }}
        />
        {/* Fill layer */}
        <span
          style={{
            position: 'absolute',
            left: -TOOLTIP_GAP + 2,
            top: '50%',
            transform: 'translateY(-50%)',
            borderWidth: '8px 8px 8px 0',
            borderStyle: 'solid',
            borderColor: `transparent ${ARROW_COLOR} transparent transparent`,
          }}
        />
      </>
    );
  if (side === 'right')
    return (
      <>
        <span
          style={{
            position: 'absolute',
            right: -TOOLTIP_GAP - 1,
            top: '50%',
            transform: 'translateY(-50%)',
            borderWidth: '9px 0 9px 9px',
            borderStyle: 'solid',
            borderColor: `transparent transparent transparent ${ARROW_BORDER}`,
          }}
        />
        <span
          style={{
            position: 'absolute',
            right: -TOOLTIP_GAP + 2,
            top: '50%',
            transform: 'translateY(-50%)',
            borderWidth: '8px 0 8px 8px',
            borderStyle: 'solid',
            borderColor: `transparent transparent transparent ${ARROW_COLOR}`,
          }}
        />
      </>
    );
  if (side === 'top')
    return (
      <>
        <span
          style={{
            position: 'absolute',
            top: -TOOLTIP_GAP - 1,
            left: '50%',
            transform: 'translateX(-50%)',
            borderWidth: '0 9px 9px 9px',
            borderStyle: 'solid',
            borderColor: `transparent transparent ${ARROW_BORDER} transparent`,
          }}
        />
        <span
          style={{
            position: 'absolute',
            top: -TOOLTIP_GAP + 2,
            left: '50%',
            transform: 'translateX(-50%)',
            borderWidth: '0 8px 8px 8px',
            borderStyle: 'solid',
            borderColor: `transparent transparent ${ARROW_COLOR} transparent`,
          }}
        />
      </>
    );
  // bottom
  return (
    <>
      <span
        style={{
          position: 'absolute',
          bottom: -TOOLTIP_GAP - 1,
          left: '50%',
          transform: 'translateX(-50%)',
          borderWidth: '9px 9px 0 9px',
          borderStyle: 'solid',
          borderColor: `${ARROW_BORDER} transparent transparent transparent`,
        }}
      />
      <span
        style={{
          position: 'absolute',
          bottom: -TOOLTIP_GAP + 2,
          left: '50%',
          transform: 'translateX(-50%)',
          borderWidth: '8px 8px 0 8px',
          borderStyle: 'solid',
          borderColor: `${ARROW_COLOR} transparent transparent transparent`,
        }}
      />
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function OnboardingTour({ uid }: { uid?: string }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [visible, setVisible] = useState(false);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<TooltipPos>({ top: 0, left: 0, arrowSide: null });
  const [tooltipHeight, setTooltipHeight] = useState(280);
  const [show, setShow] = useState(true);

  // Only show once per account (keyed by uid so new accounts always see tour)
  useEffect(() => {
    if (!localStorage.getItem(getStorageKey(uid))) {
      setTimeout(() => setVisible(true), 700);
    }
  }, [uid]);

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
    localStorage.setItem(getStorageKey(uid), 'true');
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
          className="fixed z-[9999] pointer-events-none transition-all duration-300"
          style={{
            top: sp.top,
            left: sp.left,
            width: sp.width,
            height: sp.height,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.72)',
            borderRadius: 10,
            outline: '2px solid rgba(59,130,246,0.45)',
            outlineOffset: '2px',
          }}
        />
      )}

      {/* ── Full overlay for centred steps ── */}
      {!sp && (
        <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm pointer-events-none" />
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
          transform: show ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(6px)',
          transition: 'opacity 0.18s ease, transform 0.18s ease',
        }}
      >
        <div
          className="relative overflow-visible"
          style={{
            background: '#18181B',
            border: '1px solid #27272A',
            borderRadius: 16,
            boxShadow: '0 24px 64px rgba(0,0,0,0.8), 0 0 0 1px rgba(59,130,246,0.08)',
          }}
        >
          {/* Arrow */}
          {tooltipPos.arrowSide && <Arrow side={tooltipPos.arrowSide} />}

          {/* Header — blue gradient matching brand accent */}
          <div
            style={{
              background: 'linear-gradient(135deg, #1D3461 0%, #1E3A5F 50%, #1a2e4a 100%)',
              borderRadius: '16px 16px 0 0',
              padding: '20px 20px 16px',
              borderBottom: '1px solid #27272A',
            }}
          >
            <div className="flex items-start justify-between">
              <span
                style={{
                  fontSize: 36,
                  lineHeight: 1,
                  userSelect: 'none',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))',
                }}
              >
                {step.emoji}
              </span>
              <button
                onClick={handleSkip}
                style={{
                  color: 'rgba(161,161,170,0.7)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4,
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color 0.15s, background 0.15s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.color = '#F4F4F5';
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.color = 'rgba(161,161,170,0.7)';
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }}
                title="Close"
              >
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            <h3
              style={{
                marginTop: 12,
                fontSize: 15,
                fontWeight: 700,
                color: '#F4F4F5',
                lineHeight: 1.4,
                fontFamily: 'DM Sans, sans-serif',
                letterSpacing: '-0.2px',
              }}
            >
              {step.title}
            </h3>

            {/* Step counter dots */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 12 }}>
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  style={{
                    borderRadius: 100,
                    height: 6,
                    width: i === stepIdx ? 20 : 6,
                    background: i === stepIdx ? '#3B82F6' : i < stepIdx ? 'rgba(96,165,250,0.5)' : 'rgba(255,255,255,0.18)',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    flexShrink: 0,
                  }}
                />
              ))}
              <span
                style={{
                  marginLeft: 'auto',
                  fontSize: 11,
                  color: 'rgba(161,161,170,0.7)',
                  fontWeight: 500,
                  fontFamily: 'IBM Plex Sans, sans-serif',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {stepIdx + 1}/{STEPS.length}
              </span>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: '16px 20px 4px' }}>
            <p
              style={{
                color: '#A1A1AA',
                fontSize: 13.5,
                lineHeight: 1.65,
                whiteSpace: 'pre-line',
                fontFamily: 'IBM Plex Sans, sans-serif',
                margin: 0,
              }}
            >
              {step.description}
            </p>
            {step.tip && (
              <div
                style={{
                  marginTop: 12,
                  background: 'rgba(59,130,246,0.08)',
                  border: '1px solid rgba(59,130,246,0.2)',
                  borderRadius: 10,
                  padding: '10px 14px',
                }}
              >
                <p
                  style={{
                    fontSize: 12,
                    color: '#60A5FA',
                    fontWeight: 500,
                    lineHeight: 1.5,
                    fontFamily: 'IBM Plex Sans, sans-serif',
                    margin: 0,
                  }}
                >
                  💡 {step.tip}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 20px 16px',
            }}
          >
            {!isFirst ? (
              <button
                onClick={handleBack}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 13,
                  color: '#71717A',
                  fontWeight: 500,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'IBM Plex Sans, sans-serif',
                  transition: 'color 0.15s',
                  padding: '4px 0',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#A1A1AA')}
                onMouseLeave={e => (e.currentTarget.style.color = '#71717A')}
              >
                <ChevronLeft style={{ width: 16, height: 16 }} /> Back
              </button>
            ) : (
              <button
                onClick={handleSkip}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 13,
                  color: '#71717A',
                  fontWeight: 500,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'IBM Plex Sans, sans-serif',
                  transition: 'color 0.15s',
                  padding: '4px 0',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#A1A1AA')}
                onMouseLeave={e => (e.currentTarget.style.color = '#71717A')}
              >
                <SkipForward style={{ width: 14, height: 14 }} /> Skip tour
              </button>
            )}

            <button
              onClick={handleNext}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: '#3B82F6',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'IBM Plex Sans, sans-serif',
                boxShadow: '0 4px 16px rgba(59,130,246,0.35)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = '#2563EB';
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(59,130,246,0.45)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = '#3B82F6';
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(59,130,246,0.35)';
              }}
            >
              {isLast ? '🎉 Done' : <>Next <ChevronRight style={{ width: 14, height: 14 }} /></>}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
