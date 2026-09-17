import { supabase, isSupabaseConfigured } from './supabase';
import type { BusinessType, Role, User } from '../components/mockData';

/**
 * Two modes, never mixed:
 *  • Cloud  (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY set): Supabase Auth + RLS.
 *    PINs are verified by the database; the browser never holds them.
 *  • Local demo (no Supabase config): data stays in this browser only. Demo PINs
 *    are acceptable here because there is no server to protect.
 */
export const AUTH_MODE: 'cloud' | 'local' = isSupabaseConfigured ? 'cloud' : 'local';
export const IS_LOCAL_DEMO = AUTH_MODE === 'local';

export class AuthError extends Error {}

const friendly = (message: string): string => {
  const m = message.toLowerCase();
  if (m.includes('invalid login')) return 'Email or password is incorrect.';
  if (m.includes('email not confirmed')) return 'Confirm your email first. We sent you a link.';
  if (m.includes('already registered') || m.includes('already owns')) return 'This email already has a business account. Sign in instead.';
  if (m.includes('password should be')) return 'Password must be at least 8 characters.';
  if (m.includes('locked')) return 'Too many wrong PINs. Try again in 5 minutes.';
  if (m.includes('not allowed')) return 'Your account does not have access to this.';
  return message;
};

/** Build the app's User from the signed-in Supabase account. */
export async function loadCloudUser(): Promise<User | null> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { data: admin } = await supabase
    .from('platform_super_admins').select('name').eq('user_id', user.id).maybeSingle();
  if (admin) {
    return { id: user.id, name: admin.name, email: user.email ?? '', role: 'superadmin', pin: '', merchantId: 'platform' };
  }

  const { data: membership, error: mErr } = await supabase
    .from('merchant_members')
    .select('merchant_id, role, merchants(name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (mErr) throw new AuthError(friendly(mErr.message));
  if (!membership) return null;

  const { data: staff } = await supabase
    .from('staff').select('name').eq('merchant_id', membership.merchant_id).eq('email', user.email ?? '').maybeSingle();

  const merchant = membership.merchants as unknown as { name: string } | null;
  return {
    id: user.id,
    name: staff?.name ?? user.email ?? 'Staff',
    email: user.email ?? '',
    role: membership.role as Role,
    pin: '',
    merchantId: membership.merchant_id,
    businessName: merchant?.name,
  };
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new AuthError(friendly(error.message));
  const user = await loadCloudUser();
  if (!user) {
    await supabase.auth.signOut();
    throw new AuthError('This account is not linked to any business yet. Ask the owner to invite you.');
  }
  return user;
}

export async function signUpOwner(input: {
  email: string; password: string; ownerName: string; businessName: string; businessType: BusinessType;
}): Promise<{ user: User | null; needsEmailConfirmation: boolean }> {
  if (input.password.length < 8) throw new AuthError('Password must be at least 8 characters.');
  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: { data: { owner_name: input.ownerName, business_name: input.businessName } },
  });
  if (error) throw new AuthError(friendly(error.message));
  if (!data.session) return { user: null, needsEmailConfirmation: true };

  const merchantId = `m_${crypto.randomUUID()}`;
  const { error: rpcErr } = await supabase.rpc('create_merchant', {
    p_merchant_id: merchantId,
    p_name: input.businessName,
    p_type: input.businessType,
    p_owner_name: input.ownerName,
  });
  if (rpcErr) throw new AuthError(friendly(rpcErr.message));
  return { user: await loadCloudUser(), needsEmailConfirmation: false };
}

export async function signOut(): Promise<void> {
  if (AUTH_MODE === 'cloud') await supabase.auth.signOut();
}

/**
 * Owner/manager approval for refunds, voids and data purges.
 * Cloud: checked by the database with lockout. Local demo: checked against local staff.
 */
export async function verifyManagerPin(pin: string, ctx: { merchantId: string; localUsers: User[] }): Promise<{ ok: true; approverName: string; approverRole: Role } | { ok: false; error: string }> {
  if (!/^\d{4,6}$/.test(pin)) return { ok: false, error: 'Enter the 4 to 6 digit PIN.' };

  if (AUTH_MODE === 'local') {
    const approver = ctx.localUsers.find(u => (u.role === 'owner' || u.role === 'manager') && u.pin === pin);
    return approver ? { ok: true, approverName: approver.name, approverRole: approver.role } : { ok: false, error: 'That PIN does not belong to an owner or manager.' };
  }

  const { data, error } = await supabase.rpc('verify_manager_pin', { p_merchant: ctx.merchantId, p_pin: pin });
  if (error) return { ok: false, error: friendly(error.message) };
  const row = Array.isArray(data) ? data[0] : null;
  return row ? { ok: true, approverName: row.staff_name, approverRole: row.staff_role as Role } : { ok: false, error: 'That PIN does not belong to an owner or manager.' };
}

/**
 * Save a staff member and, when given, their PIN.
 * Cloud: the row is written first (the PIN function requires it), then the PIN is hashed server-side.
 * Local demo: nothing to do here; the caller keeps the PIN on the local user record.
 */
export async function saveStaffMember(merchantId: string, staff: Pick<User, 'id' | 'name' | 'email' | 'role'>, pin?: string): Promise<void> {
  if (pin !== undefined && pin !== '' && !/^\d{4,6}$/.test(pin)) throw new AuthError('PIN must be 4 to 6 digits.');
  if (AUTH_MODE === 'local') return;
  const { error: rowErr } = await supabase.from('staff').upsert(
    { id: staff.id, merchant_id: merchantId, name: staff.name, email: staff.email, role: staff.role },
    { onConflict: 'merchant_id,id' },
  );
  if (rowErr) throw new AuthError(friendly(rowErr.message));
  if (pin) {
    const { error } = await supabase.rpc('set_staff_pin', { p_merchant: merchantId, p_staff_id: staff.id, p_pin: pin });
    if (error) throw new AuthError(friendly(error.message));
  }
}
