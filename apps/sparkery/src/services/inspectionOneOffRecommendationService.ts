import {
  buildOneOffSectionPreset,
  ONE_OFF_SECTION_BUNDLES,
  type OneOffCleaningType,
  type OneOffPropertyType,
} from '@/pages/Sparkery/inspectionOneOff';

type SupabaseRuntime = typeof globalThis & {
  __WENDEAL_SUPABASE_CONFIG__?: {
    url?: string;
  };
};

export interface OneOffRecommendationRequest {
  cleaningType?: OneOffCleaningType;
  propertyType?: OneOffPropertyType;
  customerName?: string;
  currentSectionIds?: string[];
  recentDriftScore?: number;
}

export interface OneOffRecommendationResponse {
  source: 'cloud' | 'local';
  scenarioKey: string;
  recommendedSectionIds: string[];
  recommendedBundleIds: string[];
  governance: {
    maxSections: number;
    maxChecklistItemsPerSection: number;
    maxTotalChecklistItems: number;
    maxPayloadBytes: number;
  };
  notes: string[];
  generatedAt: string;
}

const buildScenarioKey = (
  cleaningType?: OneOffCleaningType,
  propertyType?: OneOffPropertyType
): string => `${cleaningType || 'unknown'}::${propertyType || 'unknown'}`;

const getSparkeryApiBaseUrl = (): string | null => {
  const runtime = globalThis as SupabaseRuntime;
  const supabaseUrl = runtime.__WENDEAL_SUPABASE_CONFIG__?.url?.trim();
  if (!supabaseUrl) {
    return null;
  }
  return `${supabaseUrl.replace(/\/$/, '')}/functions/v1/sparkery-api`;
};

const buildLocalFallback = (
  request: OneOffRecommendationRequest
): OneOffRecommendationResponse => {
  const recommendedSectionIds = buildOneOffSectionPreset(
    request.cleaningType,
    request.propertyType
  );
  const recommendedBundleIds = ONE_OFF_SECTION_BUNDLES.filter(bundle =>
    bundle.sectionIds.some(sectionId =>
      recommendedSectionIds.includes(sectionId)
    )
  ).map(bundle => bundle.id);

  return {
    source: 'local',
    scenarioKey: buildScenarioKey(request.cleaningType, request.propertyType),
    recommendedSectionIds,
    recommendedBundleIds,
    governance: {
      maxSections: 18,
      maxChecklistItemsPerSection: 40,
      maxTotalChecklistItems: 320,
      maxPayloadBytes: 180000,
    },
    notes: [
      'Fallback recommendation generated locally.',
      'Cloud recommendation endpoint unavailable or not configured.',
    ],
    generatedAt: new Date().toISOString(),
  };
};

export async function fetchOneOffTemplateRecommendations(
  request: OneOffRecommendationRequest
): Promise<OneOffRecommendationResponse> {
  const baseUrl = getSparkeryApiBaseUrl();
  if (!baseUrl) {
    return buildLocalFallback(request);
  }

  try {
    const response = await fetch(
      `${baseUrl}/sparkery/v1/inspection/one-off-recommendations`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      }
    );
    if (!response.ok) {
      throw new Error(`recommendation request failed: ${response.status}`);
    }
    const payload = (await response.json()) as {
      ok?: boolean;
      source?: string;
      scenarioKey?: string;
      recommendedSectionIds?: unknown;
      recommendedBundleIds?: unknown;
      governance?: unknown;
      notes?: unknown;
      generatedAt?: string;
    };

    return {
      source: payload.source === 'cloud' ? 'cloud' : 'local',
      scenarioKey:
        typeof payload.scenarioKey === 'string'
          ? payload.scenarioKey
          : buildScenarioKey(request.cleaningType, request.propertyType),
      recommendedSectionIds: Array.isArray(payload.recommendedSectionIds)
        ? payload.recommendedSectionIds.filter(item => typeof item === 'string')
        : [],
      recommendedBundleIds: Array.isArray(payload.recommendedBundleIds)
        ? payload.recommendedBundleIds.filter(item => typeof item === 'string')
        : [],
      governance:
        payload.governance && typeof payload.governance === 'object'
          ? (payload.governance as OneOffRecommendationResponse['governance'])
          : {
              maxSections: 18,
              maxChecklistItemsPerSection: 40,
              maxTotalChecklistItems: 320,
              maxPayloadBytes: 180000,
            },
      notes: Array.isArray(payload.notes)
        ? payload.notes.filter(item => typeof item === 'string')
        : [],
      generatedAt:
        typeof payload.generatedAt === 'string'
          ? payload.generatedAt
          : new Date().toISOString(),
    };
  } catch {
    return buildLocalFallback(request);
  }
}
