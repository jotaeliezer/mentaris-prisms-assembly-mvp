import { readSupabasePublicConfig } from '../multiplayer/session.js';

export const ASSEMBLY_LIMIT = 5;

const ANON_DISABLED =
  'Saves need anonymous sign-in turned on in the Supabase project, under Authentication.';

let client = null;

function one(row) {
  if (!row) return null;
  if (Array.isArray(row)) return row[0] || null;
  return row;
}

function cleanName(raw) {
  return String(raw || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 24);
}

function describeUser(user) {
  if (!user) return { signedIn: false, anonymous: false, email: '' };
  return {
    signedIn: true,
    anonymous: !!user.is_anonymous,
    email: user.email || '',
  };
}

function cleanEmail(raw) {
  return String(raw || '').trim().toLowerCase();
}

function authError(error, fallback) {
  const message = error && error.message ? error.message : '';
  if (/anonymous/i.test(message)) return ANON_DISABLED;
  if (/invalid login/i.test(message) || /invalid credentials/i.test(message)) {
    return 'That email or password does not match.';
  }
  if (/already registered/i.test(message) || /already been registered/i.test(message)) {
    return 'That email already has an account. Sign in instead.';
  }
  if (/password/i.test(message)) return 'Use a password of at least 6 characters.';
  return fallback;
}

async function openClient() {
  const config = readSupabasePublicConfig();
  if (!config) return { client: null, user: null };
  if (!client) {
    const { createClient } = await import('@supabase/supabase-js');
    client = createClient(config.url, config.key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: 'mentaris-pilot-auth',
      },
    });
  }
  const existing = await client.auth.getSession();
  return { client, user: existing.data.session ? existing.data.session.user : null };
}

async function pilotSession() {
  const opened = await openClient();
  if (!opened.client) return { client: null, userId: '', error: '' };
  if (!opened.user) {
    return { client: opened.client, userId: '', error: 'Choose how to save on the home menu first.' };
  }
  return { client: opened.client, userId: opened.user.id, error: '' };
}

export async function readPilot() {
  const opened = await openClient();
  if (!opened.client) return { configured: false, signedIn: false, anonymous: false, email: '' };
  return { configured: true, ...describeUser(opened.user) };
}

export async function playOnThisBrowser() {
  const opened = await openClient();
  if (!opened.client) return { ok: false, error: 'Saves are not configured.' };
  if (opened.user) return { ok: true, ...describeUser(opened.user), error: '' };
  const signed = await opened.client.auth.signInAnonymously();
  if (signed.error || !signed.data.user) {
    return { ok: false, error: authError(signed.error, 'Could not save on this browser.') };
  }
  return { ok: true, ...describeUser(signed.data.user), error: '' };
}

export async function signInAccount(email, password) {
  const opened = await openClient();
  if (!opened.client) return { ok: false, error: 'Saves are not configured.' };
  const mail = cleanEmail(email);
  if (!mail.includes('@')) return { ok: false, error: 'Enter an email address.' };
  if (String(password || '').length < 6) return { ok: false, error: 'Use a password of at least 6 characters.' };
  if (opened.user && opened.user.is_anonymous) await opened.client.auth.signOut();
  const signed = await opened.client.auth.signInWithPassword({
    email: mail,
    password: String(password),
  });
  if (signed.error || !signed.data.user) {
    return { ok: false, error: authError(signed.error, 'Could not sign in.') };
  }
  return { ok: true, pending: false, ...describeUser(signed.data.user), error: '' };
}

export async function createAccount(email, password) {
  const opened = await openClient();
  if (!opened.client) return { ok: false, error: 'Saves are not configured.' };
  const mail = cleanEmail(email);
  if (!mail.includes('@')) return { ok: false, error: 'Enter an email address.' };
  if (String(password || '').length < 6) return { ok: false, error: 'Use a password of at least 6 characters.' };
  if (opened.user && opened.user.is_anonymous) {
    const updated = await opened.client.auth.updateUser({ email: mail, password: String(password) });
    if (updated.error || !updated.data.user) {
      return { ok: false, error: authError(updated.error, 'Could not add that account.') };
    }
    const next = updated.data.user;
    if (next.new_email && next.is_anonymous) {
      return { ok: true, pending: true, signedIn: true, anonymous: true, email: '', error: '' };
    }
    return { ok: true, pending: false, ...describeUser(next), error: '' };
  }
  const signed = await opened.client.auth.signUp({ email: mail, password: String(password) });
  if (signed.error) return { ok: false, error: authError(signed.error, 'Could not create the account.') };
  if (!signed.data.session) {
    return { ok: true, pending: true, signedIn: false, anonymous: false, email: mail, error: '' };
  }
  return { ok: true, pending: false, ...describeUser(signed.data.user), error: '' };
}

export async function signOutPilot() {
  const opened = await openClient();
  if (!opened.client) return { ok: false, error: 'Saves are not configured.' };
  const { error } = await opened.client.auth.signOut();
  if (error) return { ok: false, error: 'Could not sign out.' };
  return { ok: true, error: '' };
}

export function cloudConfigured() {
  return !!readSupabasePublicConfig();
}

export async function listAssemblies() {
  const session = await pilotSession();
  if (!session.client) return { ok: false, configured: false, assemblies: [], error: '' };
  if (session.error) return { ok: false, configured: true, assemblies: [], error: session.error };
  const { data, error } = await session.client
    .from('assemblies')
    .select('id, name, seed, mission_id, created_at, updated_at, scores(score, layer, cluster), progress(saved_at)')
    .order('updated_at', { ascending: false });
  if (error) return { ok: false, configured: true, assemblies: [], error: 'Could not load assemblies.' };
  const assemblies = (data || []).map((row) => {
    const score = one(row.scores);
    const progress = one(row.progress);
    return {
      id: row.id,
      name: row.name,
      seed: row.seed,
      missionId: row.mission_id,
      updatedAt: row.updated_at,
      savedAt: progress ? progress.saved_at : '',
      score: score ? score.score : 0,
      layer: score ? score.layer : 0,
      cluster: score ? score.cluster : 1,
      started: !!progress,
    };
  });
  return { ok: true, configured: true, assemblies, error: '' };
}

export async function createAssembly({ name, seed, missionId }) {
  const session = await pilotSession();
  if (!session.client) return { ok: false, error: 'Saves are not configured.' };
  if (session.error) return { ok: false, error: session.error };
  const title = cleanName(name);
  if (!title) return { ok: false, error: 'Name the assembly first.' };
  const { count, error: countError } = await session.client
    .from('assemblies')
    .select('id', { count: 'exact', head: true });
  if (countError) return { ok: false, error: 'Could not create the assembly.' };
  if ((count || 0) >= ASSEMBLY_LIMIT) return { ok: false, error: 'Five assemblies is the limit.' };
  const { data, error } = await session.client
    .from('assemblies')
    .insert({
      user_id: session.userId,
      name: title,
      seed: String(seed || '').slice(0, 64),
      mission_id: String(missionId || 'add').slice(0, 32),
    })
    .select('id, name, seed, mission_id')
    .single();
  if (error || !data) {
    const full = error && /5 assemblies/i.test(error.message);
    return { ok: false, error: full ? 'Five assemblies is the limit.' : 'Could not create the assembly.' };
  }
  return {
    ok: true,
    assembly: { id: data.id, name: data.name, seed: data.seed, missionId: data.mission_id },
    error: '',
  };
}

export async function loadProgress(assemblyId) {
  const session = await pilotSession();
  if (!session.client || session.error) return { ok: false, progress: null, error: session.error || 'Saves are not configured.' };
  const { data, error } = await session.client
    .from('progress')
    .select('snapshot')
    .eq('assembly_id', assemblyId)
    .maybeSingle();
  if (error) return { ok: false, progress: null, error: 'Could not load that assembly.' };
  return { ok: true, progress: data ? data.snapshot : null, error: '' };
}

export async function saveAssembly(assemblyId, progress) {
  const session = await pilotSession();
  if (!session.client) return { ok: false, error: 'Saves are not configured.' };
  if (session.error) return { ok: false, error: session.error };
  if (!assemblyId || !progress) return { ok: false, error: 'Nothing to save.' };
  const savedAt = new Date().toISOString();
  const progressWrite = await session.client.from('progress').upsert(
    {
      assembly_id: assemblyId,
      user_id: session.userId,
      snapshot: progress,
      saved_at: savedAt,
    },
    { onConflict: 'assembly_id' }
  );
  if (progressWrite.error) return { ok: false, error: 'Could not save progress.' };
  const scoreWrite = await session.client.from('scores').upsert(
    {
      assembly_id: assemblyId,
      user_id: session.userId,
      score: Math.max(0, Number(progress.solved) || 0),
      layer: Number(progress.layer) || 0,
      cluster: Math.max(1, Number(progress.cluster) || 1),
      updated_at: savedAt,
    },
    { onConflict: 'assembly_id' }
  );
  if (scoreWrite.error) return { ok: false, error: 'Could not save the score.' };
  await session.client.from('assemblies').update({ updated_at: savedAt }).eq('id', assemblyId);
  return { ok: true, error: '' };
}

export async function deleteAssembly(assemblyId) {
  const session = await pilotSession();
  if (!session.client || session.error) return { ok: false, error: session.error || 'Saves are not configured.' };
  const { error } = await session.client.from('assemblies').delete().eq('id', assemblyId);
  if (error) return { ok: false, error: 'Could not delete that assembly.' };
  return { ok: true, error: '' };
}
