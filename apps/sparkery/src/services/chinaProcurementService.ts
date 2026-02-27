interface SupabaseConfig {
  url: string;
  anonKey: string;
}

type SupabaseRuntime = typeof globalThis & {
  __WENDEAL_SUPABASE_CONFIG__?: {
    url?: string;
    anonKey?: string;
  };
};

export interface ProcurementDraftMeta {
  id: string;
  name: string;
  supplierName: string;
  productName: string;
  createdAt: string;
  updatedAt: string;
  imageCount: number;
  itemCount: number;
  progress: number;
}

export interface ProcurementPurchaseItem {
  id: string;
  productName: string;
  unitPrice: number;
  quantity: number;
}

export interface ProcurementDraftData {
  meta: ProcurementDraftMeta;
  currentRecord: Record<string, any>;
  purchaseItems: ProcurementPurchaseItem[];
  gstEnabled: boolean;
}

interface SupabaseProcurementDraftRow {
  id: string;
  meta_name: string;
  meta_supplier_name: string;
  meta_product_name: string;
  created_at: string;
  updated_at: string;
  image_count: number;
  item_count: number;
  progress: number;
  record_payload: Record<string, any>;
  purchase_items: ProcurementPurchaseItem[];
  gst_enabled: boolean;
}

interface SupabaseDailySequenceRow {
  date_key: string;
  seq: number;
  updated_at: string;
}

const getSupabaseConfig = (): SupabaseConfig => {
  const runtime = globalThis as SupabaseRuntime;
  const url = runtime.__WENDEAL_SUPABASE_CONFIG__?.url?.trim();
  const anonKey = runtime.__WENDEAL_SUPABASE_CONFIG__?.anonKey?.trim();

  if (!url || !anonKey) {
    throw new Error('Supabase is not configured');
  }

  return { url, anonKey };
};

const supabaseFetch = async <T>(
  path: string,
  options: RequestInit = {}
): Promise<T> => {
  const config = getSupabaseConfig();
  const requestUrl = `${config.url.replace(/\/$/, '')}${path}`;
  const response = await fetch(requestUrl, {
    ...options,
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Supabase request failed (${response.status}): ${details || 'No details'}`
    );
  }

  try {
    return (await response.json()) as T;
  } catch {
    return [] as T;
  }
};

const toDraftMeta = (
  row: SupabaseProcurementDraftRow
): ProcurementDraftMeta => ({
  id: row.id,
  name: row.meta_name,
  supplierName: row.meta_supplier_name,
  productName: row.meta_product_name,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  imageCount: row.image_count,
  itemCount: row.item_count,
  progress: row.progress,
});

const toDraftData = (
  row: SupabaseProcurementDraftRow
): ProcurementDraftData => ({
  meta: toDraftMeta(row),
  currentRecord: row.record_payload || {},
  purchaseItems: row.purchase_items || [],
  gstEnabled: row.gst_enabled,
});

const toDraftRow = (
  draft: ProcurementDraftData
): SupabaseProcurementDraftRow => ({
  id: draft.meta.id,
  meta_name: draft.meta.name,
  meta_supplier_name: draft.meta.supplierName,
  meta_product_name: draft.meta.productName,
  created_at: draft.meta.createdAt,
  updated_at: draft.meta.updatedAt,
  image_count: draft.meta.imageCount,
  item_count: draft.meta.itemCount,
  progress: draft.meta.progress,
  record_payload: draft.currentRecord,
  purchase_items: draft.purchaseItems,
  gst_enabled: draft.gstEnabled,
});

export async function loadDraftIndex(): Promise<ProcurementDraftMeta[]> {
  const rows = await supabaseFetch<SupabaseProcurementDraftRow[]>(
    '/rest/v1/china_procurement_drafts?select=*&order=updated_at.desc.nullslast,id.asc'
  );
  return rows.map(toDraftMeta);
}

export async function saveDraft(draft: ProcurementDraftData): Promise<void> {
  const row = toDraftRow(draft);
  const result = await supabaseFetch<SupabaseProcurementDraftRow[]>(
    '/rest/v1/china_procurement_drafts?on_conflict=id',
    {
      method: 'POST',
      headers: {
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify([row]),
    }
  );

  if (!result[0]) {
    throw new Error('Supabase draft upsert returned no rows');
  }
}

export async function loadDraftData(
  draftId: string
): Promise<ProcurementDraftData | null> {
  const rows = await supabaseFetch<SupabaseProcurementDraftRow[]>(
    `/rest/v1/china_procurement_drafts?select=*&id=eq.${draftId}`
  );
  const row = rows[0];
  return row ? toDraftData(row) : null;
}

export async function deleteDraft(draftId: string): Promise<void> {
  await supabaseFetch<SupabaseProcurementDraftRow[]>(
    `/rest/v1/china_procurement_drafts?id=eq.${draftId}`,
    {
      method: 'DELETE',
      headers: {
        Prefer: 'return=representation',
      },
    }
  );
}

export async function renameDraft(
  draftId: string,
  newName: string
): Promise<void> {
  const rows = await supabaseFetch<SupabaseProcurementDraftRow[]>(
    `/rest/v1/china_procurement_drafts?select=*&id=eq.${draftId}`
  );
  const existing = rows[0];
  if (!existing) {
    throw new Error('Draft not found');
  }

  const updated: SupabaseProcurementDraftRow = {
    ...existing,
    meta_name: newName.trim() || existing.meta_name,
    updated_at: new Date().toISOString(),
  };

  const result = await supabaseFetch<SupabaseProcurementDraftRow[]>(
    '/rest/v1/china_procurement_drafts?on_conflict=id',
    {
      method: 'POST',
      headers: {
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify([updated]),
    }
  );

  if (!result[0]) {
    throw new Error('Draft rename failed');
  }
}

export async function getDailySequence(dateKey?: string): Promise<number> {
  const key =
    dateKey || new Date().toISOString().slice(0, 10).replace(/-/g, '');

  const existingRows = await supabaseFetch<SupabaseDailySequenceRow[]>(
    `/rest/v1/china_procurement_daily_sequences?select=*&date_key=eq.${key}`
  );
  const current = existingRows[0]?.seq || 0;
  const next = current + 1;

  const upsertPayload: SupabaseDailySequenceRow = {
    date_key: key,
    seq: next,
    updated_at: new Date().toISOString(),
  };

  const result = await supabaseFetch<SupabaseDailySequenceRow[]>(
    '/rest/v1/china_procurement_daily_sequences?on_conflict=date_key',
    {
      method: 'POST',
      headers: {
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify([upsertPayload]),
    }
  );

  return result[0]?.seq || next;
}
