type BuildInspectionShareUrlInput = {
  id: string;
  propertyName?: string | undefined;
  propertyAddress?: string | undefined;
  checkOutDate?: string | undefined;
  employeeId?: string | undefined;
  templateId?: string | undefined;
};

const appendParam = (params: URLSearchParams, key: string, value?: string) => {
  if (!value) return;
  const normalized = value.trim();
  if (!normalized) return;
  params.set(key, normalized);
};

export const buildInspectionShareUrl = (
  origin: string,
  input: BuildInspectionShareUrlInput
): string => {
  const params = new URLSearchParams();
  params.set('id', input.id);
  appendParam(params, 'property', input.propertyName);
  appendParam(params, 'addr', input.propertyAddress);
  appendParam(params, 'date', input.checkOutDate);
  appendParam(params, 'employee', input.employeeId);
  appendParam(params, 'templateId', input.templateId);

  const normalizedOrigin = origin.replace(/\/$/, '');
  return `${normalizedOrigin}/cleaning-inspection?${params.toString()}`;
};
