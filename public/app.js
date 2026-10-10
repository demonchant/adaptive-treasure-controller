const $ = (selector) => document.querySelector(selector);
const money = (cents) => `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
let csrf = null; let state = null; let busy = false; let toastTimer; let balanceRefreshInFlight = false; let balanceRefreshPromise = null;

function toast(message, isError = false) {
  const element = $('#toast'); element.textContent = message; element.className = `toast show${isError ? ' error' : ''}`;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { element.className = 'toast'; }, 4200);
}
async function api(path, body) {
  const response = await fetch(path, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', ...(csrf ? { 'X-CSRF-Token': csrf } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? `Request failed (${response.status})`);
  return data;
}
function setBusy(value) { busy = value; document.querySelectorAll('button').forEach((button) => { button.disabled = value; }); }
async function refreshState() { state = await api('/api/state'); render(); }
async function refreshBalance({ silent = false, allowBusy = false } = {}) {
  if (balanceRefreshInFlight) return balanceRefreshPromise;
  if ((busy && !allowBusy) || document.visibilityState !== 'visible') return false;
  balanceRefreshInFlight = true;
  balanceRefreshPromise = (async () => {
    try {
      const result = await api('/api/balance/refresh', {});
      await refreshState();
      if (!silent) toast(`Airwallex USD available balance refreshed: ${money(result.balance.availableCents)}`);
      return true;
    } catch (error) {
      if (!silent) toast(error.message, true);
      else $('#provider-status').textContent = 'Auto-sync paused · balance unavailable';
      return false;
    } finally {
      balanceRefreshInFlight = false;
      balanceRefreshPromise = null;
    }
  })();
  return balanceRefreshPromise;
}
async function ensureFreshBalance() {
  if (!state?.balanceStale) return;
  const refreshed = await refreshBalance({ silent: true, allowBusy: true });
  if (!refreshed || state?.balanceStale) throw new Error('Could not refresh the Airwallex balance. Try again when the connection is available.');
}
function render() {
  const balance = state?.balance;
  $('#available-value').textContent = balance ? money(balance.availableCents) : '—';
  $('#reserve-value').textContent = money(state?.reserveCents ?? 0);
  $('#headroom-value').textContent = balance && !state.balanceStale ? money(Math.max(0, balance.availableCents - (state.reserveCents ?? 0))) : '—';
  $('#balance-time').textContent = balance ? `${state.balanceStale ? 'STALE · ' : ''}${new Date(balance.capturedAt).toLocaleString()}` : 'Refresh Airwallex to begin';
  $('#headroom-foot').textContent = state?.balanceStale ? 'Refresh before planning or approval' : 'Pending balance excluded';
  $('#obligation-count').textContent = String(state?.obligations?.length ?? 0);
  $('#provider-status').textContent = state?.sandboxConfigured ? 'Airwallex connected · auto-sync on' : 'Credentials not configured';
  const feeBanner = $('#fee-policy-banner');
  feeBanner.classList.toggle('hidden', Boolean(state?.feeCapConfigured));
  feeBanner.innerHTML = state?.feeCapConfigured ? '' : '<strong>Transfer fee cap is not configured.</strong> Add a verified per transfer ceiling from your Airwallex USD fee schedule as MAX_TRANSFER_FEE_USD on the server, then recalculate. Approval and execution are disabled until then.';
  $('#obligations-list').innerHTML = (state?.obligations ?? []).map((item) => `<div class="obligation-item"><div><div class="obligation-title">${escapeHtml(item.name)} <span class="priority ${item.priority}">${item.priority}</span></div><div class="obligation-detail">DUE ${new Date(item.dueAt).toLocaleDateString()} · ${item.beneficiaryId ? 'beneficiary linked' : 'no beneficiary ID'}</div></div><span class="amount">${money(item.amountCents)}</span></div>`).join('') || '<div class="empty-state"><p>No obligations yet. Add manually entered commitments to plan.</p></div>';
  const plan = state?.plan;
  $('#plan-state').classList.toggle('hidden', Boolean(plan)); $('#plan-summary').classList.toggle('hidden', !plan);
  if (plan) {
    $('#plan-summary').innerHTML = `<div class="summary-cell"><span>SAFE HEADROOM</span><strong>${money(plan.headroomCents)}</strong></div><div class="summary-cell"><span>PLANNED SPEND${state.feeCapConfigured ? ' · FEE CAP INCLUDED' : ''}</span><strong>${money(plan.plannedSpendCents)}</strong></div><div class="summary-cell"><span>REMAINS ABOVE FLOOR</span><strong>${money(plan.remainingCents)}</strong></div>`;
    $('#decisions-list').innerHTML = `${state.planStale ? '<div class="banner warning"><strong>Inputs changed.</strong> Recalculate this plan before approval.</div>' : ''}${state.balanceStale ? '<div class="banner warning"><strong>Balance is stale.</strong> Refresh before approval or execution.</div>' : ''}${state.feeCapConfigured ? `<div class="banner"><strong>Payer pays transfer fees.</strong> Each payment reserves up to ${money(state.maxTransferFeeCents)} in fees; the beneficiary receives the obligation amount.</div>` : ''}` + plan.decisions.map((decision) => {
      const obligation = state.obligations.find((item) => item.id === decision.obligationId);
      const approved = state.approvals?.some((item) => item.revision === plan.revision && item.obligation_id === decision.obligationId);
      const operations = state.operations?.filter((item) => item.obligation_id === decision.obligationId) ?? [];
      const active = operations.some((item) => ['SUBMITTING', 'OUTCOME_UNKNOWN', 'COST_UNVERIFIED', 'COST_MISMATCH', 'CREATED', 'IN_APPROVAL', 'SCHEDULED', 'PROCESSING', 'SENT'].includes(item.state));
      const approve = state.feeCapConfigured && decision.action === 'PAY' && !approved && !state.planStale && !state.balanceStale ? `<button class="button secondary" data-approve="${decision.obligationId}">Approve exact action</button>` : '';
      const execute = state.feeCapConfigured && approved && !active && obligation?.beneficiaryId ? `<button class="button primary" data-execute="${decision.obligationId}">Execute sandbox transfer</button>` : '';
      const approvedNotice = approved && !obligation?.beneficiaryId ? '<span class="muted">Approved for this plan · add an Airwallex beneficiary ID before execution.</span>' : '';
      const capDetails = state.feeCapConfigured && decision.action === 'PAY' ? `<div class="decision-reason">Beneficiary receives ${money(decision.amountCents)} · maximum payer debit ${money(decision.maxPayerCostCents)} (fee cap ${money(decision.feeCapCents)})</div>` : '';
      return `<article class="decision-item"><div><div class="decision-name">${escapeHtml(obligation?.name ?? 'Unknown obligation')}</div><div class="decision-reason">${escapeHtml(decision.reason)}${decision.overdue ? ' · OVERDUE' : ''}</div>${capDetails}<div class="decision-actions">${approve}${execute}${approvedNotice}</div></div><div><span class="decision-badge ${decision.action}">${decision.action}</span><div class="amount" style="margin-top:8px">${money(decision.amountCents)}</div></div></article>`;
    }).join('') || '<div class="empty-state"><p>No open obligations to allocate.</p></div>';
  }
  $('#operations-list').innerHTML = (state?.operations?.length ? state.operations.map((item) => `<div class="operation-item"><div><div class="operation-state">${escapeHtml(item.state)} ${item.provider_transfer_id ? `· ${escapeHtml(item.provider_transfer_id)}` : ''}</div><div class="operation-detail">Request ${escapeHtml(item.request_id)} · Updated ${new Date(item.updated_at).toLocaleString()}${item.response?.status === 'PAID' ? ' · Provider reports PAID as of this check; status may later change.' : ''}</div></div>${['OUTCOME_UNKNOWN', 'SUBMITTING', 'COST_UNVERIFIED', 'COST_MISMATCH'].includes(item.state) ? `<button class="button secondary small" data-reconcile="${item.id}">Reconcile</button>` : ''}</div>`).join('') : '<p class="muted">No transfer operations yet.</p>');
  $('#refresh-balance').textContent = busy ? 'Working…' : '↻ Refresh Airwallex balance';
}
function escapeHtml(text) { return String(text).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }
async function run(button, action) {
  if (busy) return; setBusy(true);
  try { await action(button); await refreshState(); }
  catch (error) { toast(error.message, true); }
  finally { setBusy(false); render(); }
}

$('#refresh-balance').addEventListener('click', () => run(null, async () => { await refreshBalance({ allowBusy: true }); }));
$('#logout').addEventListener('click', async () => { try { await api('/api/logout', {}); location.reload(); } catch (error) { toast(error.message, true); } });
$('#calculate-plan').addEventListener('click', () => run(null, async () => { await ensureFreshBalance(); const result = await api('/api/plan', {}); toast(`Plan revision ${result.plan.revision} calculated from available funds.`); }));
$('#obligation-form').addEventListener('submit', (event) => run(null, async () => {
  event.preventDefault(); const form = event.currentTarget; const data = Object.fromEntries(new FormData(form));
  await api('/api/obligations', { ...data, dueAt: new Date(`${data.dueAt}T23:59:59`).toISOString() }); form.reset(); form.elements.priority.value = 'NORMAL'; toast('Obligation added as operator-entered data. Recalculate the plan.');
}));
document.addEventListener('click', (event) => {
  const target = event.target.closest('button[data-approve],button[data-execute],button[data-reconcile]'); if (!target) return;
  if (target.dataset.approve) return run(target, async () => {
    await ensureFreshBalance();
    if (state.planStale) throw new Error('The balance changed. Recalculate the plan before approving.');
    const plan = state.plan; const id = target.dataset.approve; const decision = plan.decisions.find((item) => item.obligationId === id);
    const digest = JSON.stringify({ revision: plan.revision, obligationId: id, amountCents: decision.amountCents, feeCapCents: decision.feeCapCents, maxPayerCostCents: decision.maxPayerCostCents, availableCents: plan.availableCents, reserveCents: plan.reserveCents, inputHash: plan.inputHash, action: decision.action, overdue: decision.overdue, reason: decision.reason });
    await api('/api/approve', { revision: plan.revision, obligationId: id, digest }); toast('Exact plan action approved. Execute is a separate step.');
  });
  if (target.dataset.execute) return run(target, async () => { await api('/api/execute', { revision: state.plan.revision, obligationId: target.dataset.execute }); toast('Transfer submitted to Airwallex sandbox; verify provider state below.'); });
  if (target.dataset.reconcile) return run(target, async () => { const result = await api('/api/reconcile', { operationId: target.dataset.reconcile }); toast(`Provider reconciliation result: ${result.operation.state}`); });
});

const session = await api('/api/session');
csrf = session.csrf;
if (session.authenticated) {
  $('#sign-in').classList.add('hidden');
  $('#workspace').classList.remove('hidden');
  $('#logout').classList.remove('hidden');
  $('#user-email').textContent = session.user?.email ?? '';
  try {
    await refreshState();
    if (state.sandboxConfigured) await refreshBalance({ silent: true });
    window.setInterval(() => {
      if (document.visibilityState === 'visible' && !busy && state?.sandboxConfigured) void refreshBalance({ silent: true });
    }, 45_000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && !busy && state?.sandboxConfigured) void refreshBalance({ silent: true });
    });
  } catch (error) { toast(error.message, true); }
} else {
  $('#workspace').classList.add('hidden');
  $('#sign-in').classList.remove('hidden');
  if (!session.googleConfigured) {
    $('#google-login').classList.add('hidden');
    $('#login-error').textContent = 'Sign-in is not configured. Add the Google OAuth settings on the server.';
  }
}
$('#obligation-form').elements.dueAt.value = new Date().toISOString().slice(0, 10);
