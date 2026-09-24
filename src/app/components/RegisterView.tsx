import { useMemo, useState } from 'react';
import { Banknote, ArrowDownLeft, ArrowUpRight, Lock, Printer, CircleDot, History } from 'lucide-react';
import type { CashMovement, RecentOrder, RegisterSession, RegisterSettings, User } from './mockData';
import { formatIDR } from './mockData';
import { summariseSession } from '../lib/register';
import { escapeHtml } from '../lib/escapeHtml';

interface RegisterViewProps {
  sessions: RegisterSession[];
  movements: CashMovement[];
  orders: RecentOrder[];
  settings: RegisterSettings;
  currentUser: User;
  businessName: string;
  onOpenRegister: () => void;
  onCloseRegister: () => void;
  onCashMovement: (type: 'in' | 'out') => void;
}

const card = 'rounded-xl border border-border bg-card p-5';
const ghostBtn = 'h-11 px-4 rounded-md border border-border font-medium text-sm hover:bg-muted cursor-pointer flex items-center justify-center gap-2';

export function RegisterView({ sessions, movements, orders, settings, currentUser, businessName, onOpenRegister, onCloseRegister, onCashMovement }: RegisterViewProps) {
  const open = sessions.find(s => s.status === 'open');
  const past = useMemo(
    () => sessions.filter(s => s.status === 'closed').sort((a, b) => (b.closedAt ?? '').localeCompare(a.closedAt ?? '')).slice(0, 20),
    [sessions],
  );
  const [expanded, setExpanded] = useState<string | null>(null);

  const summary = open ? summariseSession(open, orders, movements) : null;
  const sessionMovements = open ? movements.filter(m => m.sessionId === open.id) : [];
  const canClose = currentUser.role !== 'cashier' || open?.openedById === currentUser.id;

  const printReport = (session: RegisterSession, title: string) => {
    const s = summariseSession(session, orders, movements);
    const line = (label: string, value: string) => `<div class="row"><span>${escapeHtml(label)}</span><span>${escapeHtml(value)}</span></div>`;
    const html = `<html><head><title>${escapeHtml(title)}</title><style>
      body{font-family:ui-monospace,monospace;width:280px;margin:0 auto;padding:12px;font-size:12px;color:#000}
      .center{text-align:center}.bold{font-weight:700}
      .row{display:flex;justify-content:space-between;margin:2px 0}
      .div{border-top:1px dashed #000;margin:8px 0}
    </style></head><body>
      <div class="center bold">${escapeHtml(businessName)}</div>
      <div class="center">${escapeHtml(title)}</div>
      <div class="center">${escapeHtml(new Date().toLocaleString('id-ID'))}</div>
      <div class="div"></div>
      ${line('Opened', new Date(session.openedAt).toLocaleString('id-ID'))}
      ${line('Cashier', session.openedByName)}
      ${session.closedAt ? line('Closed', new Date(session.closedAt).toLocaleString('id-ID')) : ''}
      <div class="div"></div>
      ${line('Opening float', formatIDR(s.openingFloat))}
      ${line('Cash sales', formatIDR(s.cashSales))}
      ${s.cashRefunds ? line('Cash refunds', `-${formatIDR(s.cashRefunds)}`) : ''}
      ${s.paidIn ? line('Cash in', formatIDR(s.paidIn)) : ''}
      ${s.paidOut ? line('Cash out', `-${formatIDR(s.paidOut)}`) : ''}
      ${line('Expected cash', formatIDR(s.expectedCash))}
      ${session.countedCash !== undefined ? line('Counted cash', formatIDR(session.countedCash)) : ''}
      ${session.variance !== undefined ? line(session.variance === 0 ? 'Balanced' : session.variance > 0 ? 'Over' : 'Short', formatIDR(Math.abs(session.variance))) : ''}
      <div class="div"></div>
      ${s.byMethod.map(m => line(`${m.method} (${m.orders})`, formatIDR(m.net))).join('')}
      ${line('Total sales', formatIDR(s.totalSales))}
      ${s.totalRefunds ? line('Refunds', `-${formatIDR(s.totalRefunds)}`) : ''}
      ${session.closingNote ? `<div class="div"></div><div>Note: ${escapeHtml(session.closingNote)}</div>` : ''}
      ${session.approvedByName ? `<div>Approved by: ${escapeHtml(session.approvedByName)}</div>` : ''}
    </body></html>`;
    const win = window.open('', '', 'width=380,height=640');
    if (win) { win.document.write(html); win.document.close(); win.focus(); setTimeout(() => win.print(), 400); }
  };

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-5">
      {!open ? (
        <div className={`${card} text-center py-12`}>
          <Lock className="mx-auto text-muted-foreground" size={28} />
          <h2 className="mt-4 font-semibold text-lg">The register is closed</h2>
          <p className="mt-1 text-muted-foreground text-sm max-w-sm mx-auto">
            {settings.requireOpenRegister
              ? 'Open it with the cash already in the drawer before the first sale of the shift.'
              : 'Open a shift to track cash, or keep selling without one.'}
          </p>
          <button type="button" onClick={onOpenRegister}
            className="mt-6 h-12 px-6 rounded-md bg-brand-600 text-white font-semibold hover:bg-brand-700 cursor-pointer dark:bg-brand-400 dark:text-ink-950">
            Open register
          </button>
        </div>
      ) : (
        <>
          <div className={card}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 text-sm font-medium text-leaf-600 dark:text-leaf-300">
                  <CircleDot size={14} /> Shift open
                </p>
                <h2 className="mt-1 font-semibold">{open.openedByName}</h2>
                <p className="text-sm text-muted-foreground">
                  Since {new Date(open.openedAt).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                  , float {formatIDR(open.openingFloat)}
                </p>
              </div>
              <button type="button" onClick={() => printReport(open, 'X-Report (shift so far)')} className={ghostBtn}>
                <Printer size={15} /> X-report
              </button>
            </div>

            <div className="mt-5 grid sm:grid-cols-3 gap-3">
              {[
                { label: 'Expected in drawer', value: summary!.expectedCash, strong: true },
                { label: 'Cash sales', value: summary!.cashSales },
                { label: 'All sales', value: summary!.totalSales },
              ].map(stat => (
                <div key={stat.label} className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className={`tabular-nums ${stat.strong ? 'text-xl font-extrabold' : 'text-lg font-semibold'}`}>{formatIDR(stat.value)}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => onCashMovement('in')} className={ghostBtn}><ArrowDownLeft size={15} /> Cash in</button>
              <button type="button" onClick={() => onCashMovement('out')} className={ghostBtn}><ArrowUpRight size={15} /> Cash out</button>
              <button
                type="button"
                onClick={onCloseRegister}
                disabled={!canClose}
                title={canClose ? undefined : 'Only the cashier who opened this shift, or a manager, can close it'}
                className="h-11 px-4 rounded-md bg-ink-900 text-ink-50 font-semibold text-sm hover:bg-ink-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer dark:bg-ink-100 dark:text-ink-900"
              >
                Close register
              </button>
            </div>
          </div>

          <div className={card}>
            <h3 className="font-semibold text-sm mb-3">Takings by payment method</h3>
            {summary!.byMethod.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sales in this shift yet.</p>
            ) : (
              <div className="space-y-2">
                {summary!.byMethod.map(m => (
                  <div key={m.method} className="flex justify-between text-sm tabular-nums">
                    <span className="capitalize">{m.method} <span className="text-muted-foreground text-xs">({m.orders} orders)</span></span>
                    <span className="font-medium">{formatIDR(m.net)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {sessionMovements.length > 0 && (
            <div className={card}>
              <h3 className="font-semibold text-sm mb-3">Cash in and out</h3>
              <div className="space-y-2">
                {sessionMovements.map(m => (
                  <div key={m.id} className="flex justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2 min-w-0">
                      {m.type === 'in' ? <ArrowDownLeft size={14} className="text-leaf-600 shrink-0" /> : <ArrowUpRight size={14} className="text-chili-600 shrink-0" />}
                      <span className="truncate">{m.reason}</span>
                      <span className="text-muted-foreground text-xs shrink-0">{m.byName}</span>
                    </span>
                    <span className="tabular-nums shrink-0">{m.type === 'in' ? '+' : '−'}{formatIDR(m.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className={card}>
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><History size={15} /> Closed shifts</h3>
        {past.length === 0 ? (
          <p className="text-sm text-muted-foreground">No shift has been closed yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {past.map(s => {
              const isOpenRow = expanded === s.id;
              const variance = s.variance ?? 0;
              return (
                <div key={s.id} className="py-3">
                  <button type="button" onClick={() => setExpanded(isOpenRow ? null : s.id)} className="w-full flex items-center justify-between gap-3 text-left cursor-pointer">
                    <span className="min-w-0">
                      <span className="block text-sm font-medium truncate">
                        {new Date(s.closedAt ?? s.openedAt).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        {s.autoClosed && <span className="ml-2 text-xs text-turmeric-700 dark:text-turmeric-300">closed by system</span>}
                      </span>
                      <span className="block text-xs text-muted-foreground">{s.openedByName}</span>
                    </span>
                    <span className={`text-sm font-semibold tabular-nums shrink-0 ${
                      variance === 0 ? 'text-leaf-600 dark:text-leaf-300' : variance > 0 ? 'text-brand-700 dark:text-brand-300' : 'text-chili-600 dark:text-chili-300'
                    }`}>
                      {variance === 0 ? 'Balanced' : `${variance > 0 ? '+' : '−'}${formatIDR(Math.abs(variance))}`}
                    </span>
                  </button>

                  {isOpenRow && (
                    <div className="mt-3 rounded-lg border border-border p-3 space-y-1.5">
                      {[
                        ['Opening float', formatIDR(s.openingFloat)],
                        ['Expected', formatIDR(s.expectedCash ?? 0)],
                        ['Counted', formatIDR(s.countedCash ?? 0)],
                        ['Closed by', s.closedByName ?? '—'],
                        ...(s.approvedByName ? [['Approved by', s.approvedByName]] : []),
                      ].map(([label, value]) => (
                        <div key={label} className="flex justify-between text-sm tabular-nums">
                          <span className="text-muted-foreground">{label}</span><span>{value}</span>
                        </div>
                      ))}
                      {s.closingNote && <p className="text-sm text-muted-foreground pt-1">{s.closingNote}</p>}
                      <button type="button" onClick={() => printReport(s, 'Z-Report (shift closed)')} className={`${ghostBtn} mt-2 w-full`}>
                        <Printer size={15} /> Print Z-report
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground flex items-center gap-2">
        <Banknote size={14} /> Expected cash = opening float + cash sales − cash refunds + cash in − cash out.
      </p>
    </div>
  );
}
