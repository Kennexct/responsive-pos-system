import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { X, Banknote, ArrowDownLeft, ArrowUpRight, ShieldCheck } from 'lucide-react';
import type { CashMovement, RecentOrder, RegisterSession, RegisterSettings, User } from './mockData';
import { formatIDR, formatNumberWithDots } from './mockData';
import { IDR_DENOMINATIONS, cashVariance, countedTotal, needsApproval, summariseSession, type DenominationCount } from '../lib/register';
import { verifyManagerPin } from '../lib/auth';

/** Shared chrome so every register dialog looks and behaves the same. */
function Sheet({ title, subtitle, onClose, children, footer }: {
  title: string; subtitle?: string; onClose: () => void; children: React.ReactNode; footer: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}
        className="absolute inset-0 bg-ink-950/60" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: [0.2, 0.7, 0.2, 1] }}
        className="relative w-full sm:max-w-lg max-h-[92dvh] flex flex-col rounded-t-2xl sm:rounded-xl bg-card text-card-foreground"
      >
        <header className="flex items-start gap-3 p-5 border-b border-border shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold leading-tight">{title}</h2>
            {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 -mr-1 -mt-1 rounded-md text-muted-foreground hover:bg-muted cursor-pointer">
            <X size={18} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">{children}</div>
        <footer className="p-5 border-t border-border shrink-0 space-y-3">{footer}</footer>
      </motion.div>
    </div>
  );
}

const fieldCls = 'w-full h-11 rounded-md border border-border bg-input-background px-3 text-[15px] tabular-nums focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20';
const primaryBtn = 'w-full h-12 rounded-md bg-brand-600 text-white font-semibold hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer dark:bg-brand-400 dark:text-ink-950 dark:hover:bg-brand-300';

function DenominationPad({ counts, onChange }: { counts: DenominationCount; onChange: (counts: DenominationCount) => void }) {
  return (
    <div className="space-y-2">
      {IDR_DENOMINATIONS.map(note => {
        const qty = counts[note] || 0;
        return (
          <div key={note} className="flex items-center gap-3">
            <span className="w-24 text-sm tabular-nums text-muted-foreground">{formatIDR(note)}</span>
            <input
              type="number" min={0} inputMode="numeric" value={qty || ''}
              onChange={e => onChange({ ...counts, [note]: Math.max(0, Number(e.target.value) || 0) })}
              placeholder="0"
              aria-label={`How many ${formatIDR(note)} notes`}
              className={`${fieldCls} flex-1`}
            />
            <span className="w-28 text-right text-sm tabular-nums">{qty > 0 ? formatIDR(note * qty) : '—'}</span>
          </div>
        );
      })}
    </div>
  );
}

export function OpenRegisterModal({ settings, user, onOpen, onClose }: {
  settings: RegisterSettings; user: User;
  onOpen: (session: Omit<RegisterSession, 'id' | 'status'>) => void;
  onClose: () => void;
}) {
  const [float, setFloat] = useState(String(settings.defaultFloat));
  const [note, setNote] = useState('');
  const amount = Math.max(0, Number(float.replace(/\D/g, '')) || 0);

  return (
    <Sheet
      title="Open register"
      subtitle="Count the cash you are starting the shift with."
      onClose={onClose}
      footer={
        <button type="button" className={primaryBtn} onClick={() => onOpen({
          openedAt: new Date().toISOString(),
          openedById: user.id,
          openedByName: user.name,
          openingFloat: amount,
          openingNote: note.trim() || undefined,
        })}>
          Open with {formatIDR(amount)}
        </button>
      }
    >
      <label className="block">
        <span className="text-sm font-medium block mb-1.5">Starting cash</span>
        <input
          value={amount ? formatNumberWithDots(amount) : ''}
          onChange={e => setFloat(e.target.value.replace(/\D/g, ''))}
          inputMode="numeric"
          placeholder="0"
          className={fieldCls}
        />
        <span className="text-xs text-muted-foreground mt-1 block">The float in the drawer before the first sale.</span>
      </label>
      <label className="block">
        <span className="text-sm font-medium block mb-1.5">Note <span className="font-normal text-muted-foreground">— optional</span></span>
        <input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. morning shift, drawer 1" className={fieldCls} />
      </label>
      <p className="text-sm text-muted-foreground">
        Opened by {user.name}. Every sale until you close belongs to this shift.
      </p>
    </Sheet>
  );
}

export function CashMovementModal({ type, sessionId, user, onSave, onClose }: {
  type: 'in' | 'out'; sessionId: string; user: User;
  onSave: (movement: Omit<CashMovement, 'id'>) => void;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const value = Math.max(0, Number(amount.replace(/\D/g, '')) || 0);
  const valid = value > 0 && reason.trim().length > 0;

  return (
    <Sheet
      title={type === 'in' ? 'Cash in' : 'Cash out'}
      subtitle={type === 'in' ? 'Money added to the drawer that is not a sale.' : 'Money taken out that is not a refund.'}
      onClose={onClose}
      footer={
        <button type="button" disabled={!valid} className={primaryBtn} onClick={() => onSave({
          sessionId, type, amount: value, reason: reason.trim(), at: new Date().toISOString(), byName: user.name,
        })}>
          Record {formatIDR(value)}
        </button>
      }
    >
      <label className="block">
        <span className="text-sm font-medium block mb-1.5">Amount</span>
        <input
          value={value ? formatNumberWithDots(value) : ''}
          onChange={e => setAmount(e.target.value.replace(/\D/g, ''))}
          inputMode="numeric" placeholder="0" className={fieldCls}
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium block mb-1.5">Reason</span>
        <input
          value={reason} onChange={e => setReason(e.target.value)}
          placeholder={type === 'in' ? 'e.g. extra change from the bank' : 'e.g. paid the ice supplier'}
          className={fieldCls}
        />
        <span className="text-xs text-muted-foreground mt-1 block">Shown on the close report, so write what an owner would need to understand it.</span>
      </label>
    </Sheet>
  );
}

export function CloseRegisterModal({ session, orders, movements, settings, user, users, merchantId, onCloseRegister, onClose }: {
  session: RegisterSession;
  orders: RecentOrder[];
  movements: CashMovement[];
  settings: RegisterSettings;
  user: User;
  users: User[];
  merchantId: string;
  onCloseRegister: (result: Partial<RegisterSession>) => void;
  onClose: () => void;
}) {
  const [counts, setCounts] = useState<DenominationCount>({});
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const summary = useMemo(() => summariseSession(session, orders, movements), [session, orders, movements]);
  const counted = countedTotal(counts);
  const variance = cashVariance(summary, counted);
  const overThreshold = needsApproval(variance, settings.varianceThreshold);
  // Blind count: the expected figure stays hidden until the cashier commits to a number.
  const showExpected = !settings.blindCount || submitted;

  const finish = async () => {
    setError('');
    if (!submitted) { setSubmitted(true); return; }
    if (overThreshold && !note.trim()) return setError('Explain the difference before closing.');

    let approvedByName: string | undefined;
    if (overThreshold) {
      setBusy(true);
      const check = await verifyManagerPin(pin, { merchantId, localUsers: users });
      setBusy(false);
      if (!check.ok) return setError(check.error);
      approvedByName = check.approverName;
    }

    onCloseRegister({
      closedAt: new Date().toISOString(),
      closedById: user.id,
      closedByName: user.name,
      countedCash: counted,
      denominationCounts: Object.fromEntries(Object.entries(counts).filter(([, n]) => n > 0).map(([k, n]) => [k, n])),
      expectedCash: summary.expectedCash,
      variance,
      closingNote: note.trim() || undefined,
      approvedByName,
      status: 'closed',
    });
  };

  const row = (label: string, value: string, tone = '') => (
    <div className="flex justify-between text-sm tabular-nums">
      <span className="text-muted-foreground">{label}</span><span className={tone}>{value}</span>
    </div>
  );

  return (
    <Sheet
      title="Close register"
      subtitle={`Opened ${new Date(session.openedAt).toLocaleString('id-ID')} by ${session.openedByName}`}
      onClose={onClose}
      footer={
        <>
          {error && <p role="alert" className="text-sm text-chili-600 dark:text-chili-300">{error}</p>}
          <button type="button" className={primaryBtn} disabled={busy} onClick={finish}>
            {!submitted ? `Count is ${formatIDR(counted)}, continue` : busy ? 'Checking…' : 'Close register'}
          </button>
        </>
      }
    >
      <section>
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><Banknote size={16} /> Count the drawer</h3>
        <DenominationPad counts={counts} onChange={c => { setCounts(c); setSubmitted(false); }} />
        <div className="flex justify-between items-baseline mt-3 pt-3 border-t border-dashed border-border">
          <span className="text-sm font-medium">Counted</span>
          <span className="text-xl font-extrabold tabular-nums">{formatIDR(counted)}</span>
        </div>
      </section>

      <section className="rounded-lg border border-border p-4 space-y-1.5">
        <h3 className="text-sm font-semibold mb-2">This shift</h3>
        {row('Opening float', formatIDR(summary.openingFloat))}
        {row('Cash sales', formatIDR(summary.cashSales))}
        {summary.cashRefunds > 0 && row('Cash refunds', `−${formatIDR(summary.cashRefunds)}`)}
        {summary.paidIn > 0 && row('Cash in', formatIDR(summary.paidIn))}
        {summary.paidOut > 0 && row('Cash out', `−${formatIDR(summary.paidOut)}`)}
        <div className="pt-2 mt-1 border-t border-border">
          {showExpected
            ? row('Expected in drawer', formatIDR(summary.expectedCash), 'font-semibold')
            : <p className="text-sm text-muted-foreground">The expected amount appears after you submit your count.</p>}
        </div>
        {showExpected && (
          <div className={`flex justify-between text-sm font-semibold tabular-nums ${
            variance === 0 ? 'text-leaf-600 dark:text-leaf-300' : variance > 0 ? 'text-brand-700 dark:text-brand-300' : 'text-chili-600 dark:text-chili-300'
          }`}>
            <span>{variance === 0 ? 'Balanced' : variance > 0 ? 'Over' : 'Short'}</span>
            <span>{variance === 0 ? formatIDR(0) : `${variance > 0 ? '+' : '−'}${formatIDR(Math.abs(variance))}`}</span>
          </div>
        )}
      </section>

      {summary.byMethod.length > 0 && (
        <section className="rounded-lg border border-border p-4 space-y-1.5">
          <h3 className="text-sm font-semibold mb-2">Other payment methods</h3>
          <p className="text-xs text-muted-foreground mb-2">Not counted in the drawer. Tick these off against your provider's settlement report.</p>
          {summary.byMethod.filter(m => m.method !== 'cash').map(m => (
            <div key={m.method} className="flex justify-between text-sm tabular-nums">
              <span className="capitalize text-muted-foreground">{m.method} <span className="text-xs">({m.orders})</span></span>
              <span>{formatIDR(m.net)}</span>
            </div>
          ))}
        </section>
      )}

      {submitted && (
        <section className="space-y-3">
          <label className="block">
            <span className="text-sm font-medium block mb-1.5">
              Note {overThreshold ? '' : <span className="font-normal text-muted-foreground">— optional</span>}
            </span>
            <input
              value={note} onChange={e => setNote(e.target.value)}
              placeholder={overThreshold ? 'What happened to the difference?' : 'Anything worth remembering'}
              className={fieldCls}
            />
          </label>
          {overThreshold && (
            <label className="block">
              <span className="text-sm font-medium mb-1.5 flex items-center gap-2">
                <ShieldCheck size={15} /> Owner or manager PIN
              </span>
              <input
                type="password" inputMode="numeric" maxLength={6} value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="A difference this size needs approval"
                className={`${fieldCls} tracking-[0.3em]`}
              />
            </label>
          )}
        </section>
      )}
    </Sheet>
  );
}

export const MovementIcon = { in: ArrowDownLeft, out: ArrowUpRight };
