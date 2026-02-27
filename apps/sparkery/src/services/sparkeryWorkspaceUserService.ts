import { getSupabaseConfig } from '@/services/sparkeryDispatch/apiLayer';
import type { User, UserRole } from '@/types/auth';

export type WorkspaceMemberStatus = 'active' | 'invited' | 'suspended';

export interface WorkspaceMember {
  id: string;
  userId: string | null;
  email: string;
  displayName: string;
  role: UserRole;
  status: WorkspaceMemberStatus;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type WorkspaceSource = 'supabase' | 'local';

export interface WorkspaceMemberListResult {
  members: WorkspaceMember[];
  source: WorkspaceSource;
  warning: string | null;
}

interface WorkspaceMemberRow {
  id?: unknown;
  user_id?: unknown;
  email?: unknown;
  display_name?: unknown;
  role?: unknown;
  status?: unknown;
  last_login_at?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
}

interface WorkspaceMemberWriteInput {
  id?: string;
  userId?: string | null;
  email: string;
  displayName: string;
  role: UserRole;
  status: WorkspaceMemberStatus;
  lastLoginAt?: string | null;
}

interface WorkspaceOptions {
  accessToken: string | null;
}

const LOCAL_MEMBERS_KEY = 'sparkery_workspace_members_v1';
const VALID_STATUSES: ReadonlyArray<WorkspaceMemberStatus> = [
  'active',
  'invited',
  'suspended',
];
const VALID_ROLES: ReadonlyArray<UserRole> = [
  'admin',
  'manager',
  'employee',
  'user',
  'guest',
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeRole = (value: unknown): UserRole => {
  const role = toNonEmptyString(value)?.toLowerCase();
  if (role && VALID_ROLES.includes(role as UserRole)) {
    return role as UserRole;
  }
  return 'user';
};

const normalizeStatus = (value: unknown): WorkspaceMemberStatus => {
  const status = toNonEmptyString(value)?.toLowerCase();
  if (status && VALID_STATUSES.includes(status as WorkspaceMemberStatus)) {
    return status as WorkspaceMemberStatus;
  }
  return 'active';
};

const nowIso = (): string => new Date().toISOString();

const toWorkspaceMember = (row: WorkspaceMemberRow): WorkspaceMember => {
  const now = nowIso();
  const email = toNonEmptyString(row.email) || 'unknown@sparkery.local';
  const displayName =
    toNonEmptyString(row.display_name) || email.split('@')[0] || 'User';
  const id = toNonEmptyString(row.id) || crypto.randomUUID();
  return {
    id,
    userId: toNonEmptyString(row.user_id),
    email,
    displayName,
    role: normalizeRole(row.role),
    status: normalizeStatus(row.status),
    lastLoginAt: toNonEmptyString(row.last_login_at),
    createdAt: toNonEmptyString(row.created_at) || now,
    updatedAt: toNonEmptyString(row.updated_at) || now,
  };
};

const readLocalMembers = (): WorkspaceMember[] => {
  try {
    const raw = localStorage.getItem(LOCAL_MEMBERS_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter(isRecord)
      .map(item => toWorkspaceMember(item as WorkspaceMemberRow));
  } catch {
    return [];
  }
};

const saveLocalMembers = (members: WorkspaceMember[]): void => {
  localStorage.setItem(LOCAL_MEMBERS_KEY, JSON.stringify(members));
};

const withSortedMembers = (members: WorkspaceMember[]): WorkspaceMember[] =>
  [...members].sort((a, b) => {
    if (a.status !== b.status) {
      return a.status.localeCompare(b.status);
    }
    return a.displayName.localeCompare(b.displayName);
  });

const ensureLocalMember = (user: User): WorkspaceMember => {
  const members = readLocalMembers();
  const now = nowIso();
  const existingIndex = members.findIndex(
    member => member.email.toLowerCase() === user.email.toLowerCase()
  );
  const nextMember: WorkspaceMember = {
    id:
      existingIndex >= 0
        ? members[existingIndex]!.id
        : `local-${user.id || crypto.randomUUID()}`,
    userId: user.id,
    email: user.email,
    displayName:
      user.firstName ||
      user.profile?.firstName ||
      user.username ||
      user.email.split('@')[0] ||
      'User',
    role: user.role,
    status: 'active',
    lastLoginAt: user.lastLoginAt || now,
    createdAt:
      existingIndex >= 0 ? members[existingIndex]!.createdAt : user.createdAt,
    updatedAt: now,
  };

  if (existingIndex >= 0) {
    members[existingIndex] = nextMember;
  } else {
    members.unshift(nextMember);
  }
  saveLocalMembers(withSortedMembers(members));
  return nextMember;
};

const buildSupabaseHeaders = (
  anonKey: string,
  accessToken: string,
  extraHeaders?: HeadersInit
): HeadersInit => ({
  apikey: anonKey,
  Authorization: `Bearer ${accessToken}`,
  'Content-Type': 'application/json',
  ...(extraHeaders || {}),
});

const parseSupabaseRows = (raw: unknown): WorkspaceMember[] => {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter(isRecord).map(item => toWorkspaceMember(item));
};

const fetchSupabaseMembers = async (
  options: WorkspaceOptions
): Promise<WorkspaceMember[]> => {
  const config = getSupabaseConfig();
  if (!config || !options.accessToken) {
    throw new Error('Supabase workspace user management is not configured');
  }
  const response = await fetch(
    `${config.url.replace(/\/$/, '')}/rest/v1/sparkery_workspace_members?select=id,user_id,email,display_name,role,status,last_login_at,created_at,updated_at&order=created_at.desc`,
    {
      method: 'GET',
      headers: buildSupabaseHeaders(config.anonKey, options.accessToken),
    }
  );
  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Failed to load workspace members (${response.status}): ${details || 'No details'}`
    );
  }
  const payload = (await response.json()) as unknown;
  return parseSupabaseRows(payload);
};

const upsertSupabaseMember = async (
  input: WorkspaceMemberWriteInput,
  options: WorkspaceOptions
): Promise<WorkspaceMember> => {
  const config = getSupabaseConfig();
  if (!config || !options.accessToken) {
    throw new Error('Supabase workspace user management is not configured');
  }

  const response = await fetch(
    `${config.url.replace(/\/$/, '')}/rest/v1/sparkery_workspace_members?on_conflict=email`,
    {
      method: 'POST',
      headers: buildSupabaseHeaders(config.anonKey, options.accessToken, {
        Prefer: 'resolution=merge-duplicates,return=representation',
      }),
      body: JSON.stringify([
        {
          ...(input.id ? { id: input.id } : {}),
          ...(input.userId ? { user_id: input.userId } : {}),
          email: input.email,
          display_name: input.displayName,
          role: input.role,
          status: input.status,
          last_login_at: input.lastLoginAt || null,
        },
      ]),
    }
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Failed to save workspace member (${response.status}): ${details || 'No details'}`
    );
  }

  const payload = (await response.json()) as unknown;
  const rows = parseSupabaseRows(payload);
  if (!rows[0]) {
    throw new Error('Workspace member save response was empty');
  }
  return rows[0];
};

export const listWorkspaceMembers = async (
  options: WorkspaceOptions
): Promise<WorkspaceMemberListResult> => {
  try {
    const members = await fetchSupabaseMembers(options);
    return {
      members: withSortedMembers(members),
      source: 'supabase',
      warning: null,
    };
  } catch (error) {
    return {
      members: withSortedMembers(readLocalMembers()),
      source: 'local',
      warning:
        error instanceof Error
          ? error.message
          : 'Workspace user data is running in local fallback mode.',
    };
  }
};

export const saveWorkspaceMember = async (
  input: WorkspaceMemberWriteInput,
  options: WorkspaceOptions
): Promise<{ member: WorkspaceMember; source: WorkspaceSource }> => {
  try {
    const member = await upsertSupabaseMember(input, options);
    return { member, source: 'supabase' };
  } catch {
    const members = readLocalMembers();
    const now = nowIso();
    const existingIndex = members.findIndex(
      member =>
        member.email.toLowerCase() === input.email.toLowerCase() ||
        (input.id ? member.id === input.id : false)
    );
    const nextMember: WorkspaceMember = {
      id: existingIndex >= 0 ? members[existingIndex]!.id : crypto.randomUUID(),
      userId:
        input.userId !== undefined
          ? input.userId
          : existingIndex >= 0
            ? members[existingIndex]!.userId
            : null,
      email: input.email,
      displayName: input.displayName,
      role: normalizeRole(input.role),
      status: normalizeStatus(input.status),
      lastLoginAt: input.lastLoginAt || null,
      createdAt: existingIndex >= 0 ? members[existingIndex]!.createdAt : now,
      updatedAt: now,
    };
    if (existingIndex >= 0) {
      members[existingIndex] = nextMember;
    } else {
      members.unshift(nextMember);
    }
    saveLocalMembers(withSortedMembers(members));
    return { member: nextMember, source: 'local' };
  }
};

export const syncCurrentUserWorkspaceMembership = async (
  user: User,
  options: WorkspaceOptions
): Promise<WorkspaceMember> => {
  const now = nowIso();
  const payload: WorkspaceMemberWriteInput = {
    userId: user.id,
    email: user.email,
    displayName:
      user.firstName ||
      user.profile?.firstName ||
      user.username ||
      user.email.split('@')[0] ||
      'User',
    role: normalizeRole(user.role),
    status: user.isActive === false ? 'suspended' : 'active',
    lastLoginAt: user.lastLoginAt || now,
  };

  try {
    return await upsertSupabaseMember(payload, options);
  } catch {
    return ensureLocalMember(user);
  }
};

export const resolveWorkspaceRoleForUser = async (
  user: User,
  options: WorkspaceOptions
): Promise<UserRole> => {
  const result = await listWorkspaceMembers(options);
  if (result.members.length === 0) {
    const supabaseMode = Boolean(getSupabaseConfig() && options.accessToken);
    return supabaseMode ? user.role : 'admin';
  }
  const match = result.members.find(
    member => member.email.toLowerCase() === user.email.toLowerCase()
  );
  return match?.role || user.role;
};
