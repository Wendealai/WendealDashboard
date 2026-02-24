import { useMemo } from 'react';
import type { User } from '@/types/auth';
import { getSparkeryTelemetrySessionId } from '@/services/sparkeryTelemetry';

interface DispatchTelemetryContext {
  userId?: string;
  actorRole?: string;
  sessionId?: string;
}

export const useDispatchTelemetryContext = (
  authUser: User | null | undefined
): DispatchTelemetryContext | undefined => {
  const telemetryUserId = authUser?.id;
  const telemetryActorRole = authUser?.role;
  const telemetrySessionId = useMemo(
    () => getSparkeryTelemetrySessionId(),
    [telemetryActorRole, telemetryUserId]
  );

  return useMemo(() => {
    const context = {
      ...(telemetryUserId ? { userId: telemetryUserId } : {}),
      ...(telemetryActorRole ? { actorRole: telemetryActorRole } : {}),
      ...(telemetrySessionId ? { sessionId: telemetrySessionId } : {}),
    };
    return Object.keys(context).length > 0 ? context : undefined;
  }, [telemetryActorRole, telemetrySessionId, telemetryUserId]);
};
