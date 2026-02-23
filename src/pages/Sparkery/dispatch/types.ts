export type DispatchServiceType = 'bond' | 'airbnb' | 'regular' | 'commercial';

export type DispatchJobStatus =
  | 'pending'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type DispatchPriority = 1 | 2 | 3 | 4 | 5;
export type DispatchWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type DispatchPricingMode = 'recurring_fixed' | 'one_time_manual';

export type DispatchEmployeeStatus = 'available' | 'off';

export interface DispatchEmployeeLocation {
  lat: number;
  lng: number;
  updatedAt: string;
  source: 'gps' | 'manual' | 'mobile';
  accuracyM?: number;
  label?: string;
}

export interface DispatchJob {
  id: string;
  title: string;
  description?: string;
  notes?: string;
  imageUrls?: string[];
  customerProfileId?: string;
  customerName?: string;
  customerAddress?: string;
  customerPhone?: string;
  serviceType: DispatchServiceType;
  propertyType?: 'apartment' | 'townhouse' | 'house';
  estimatedDurationHours?: number;
  status: DispatchJobStatus;
  priority: DispatchPriority;
  scheduledDate: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  assignedEmployeeIds?: string[];
  pricingMode?: DispatchPricingMode;
  feeCurrency?: 'AUD';
  baseFee?: number;
  manualAdjustment?: number;
  receivableTotal?: number;
  financeConfirmedAt?: string;
  financeConfirmedBy?: string;
  financeLockedAt?: string;
  financeLockReason?: string;
  paymentReceivedAt?: string | null;
  paymentReceivedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DispatchCustomerProfile {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  defaultJobTitle?: string;
  defaultDescription?: string;
  defaultNotes?: string;
  recurringEnabled?: boolean;
  recurringWeekday?: DispatchWeekday;
  recurringWeekdays?: DispatchWeekday[];
  recurringStartTime?: string;
  recurringEndTime?: string;
  recurringServiceType?: DispatchServiceType;
  recurringPriority?: DispatchPriority;
  recurringFee?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DispatchEmployee {
  id: string;
  name: string;
  nameCN?: string;
  phone?: string;
  skills: DispatchServiceType[];
  status: DispatchEmployeeStatus;
  currentLocation?: DispatchEmployeeLocation;
}

export interface UpsertDispatchEmployeePayload {
  id?: string;
  name: string;
  nameCN?: string;
  phone?: string;
  skills: DispatchServiceType[];
  status: DispatchEmployeeStatus;
}

export interface EmployeeSchedule {
  id: string;
  employeeId: string;
  date: string;
  timeStart: string;
  timeEnd: string;
  status: 'available' | 'assigned' | 'unavailable' | 'off';
}

export interface DispatchFilters {
  serviceType?: DispatchServiceType;
  status?: DispatchJobStatus;
  priority?: DispatchPriority;
  assignedEmployeeId?: string;
}

export interface CreateDispatchJobPayload {
  title: string;
  description?: string;
  notes?: string;
  imageUrls?: string[];
  customerProfileId?: string;
  customerName?: string;
  customerAddress?: string;
  customerPhone?: string;
  serviceType: DispatchServiceType;
  propertyType?: 'apartment' | 'townhouse' | 'house';
  estimatedDurationHours?: number;
  priority: DispatchPriority;
  scheduledDate: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  recurringEnabled?: boolean;
  recurringWeekday?: DispatchWeekday;
  recurringWeekdays?: DispatchWeekday[];
  pricingMode?: DispatchPricingMode;
  feeCurrency?: 'AUD';
  baseFee?: number;
  manualAdjustment?: number;
}

export interface UpsertDispatchCustomerProfilePayload {
  id?: string;
  name: string;
  address?: string;
  phone?: string;
  defaultJobTitle?: string;
  defaultDescription?: string;
  defaultNotes?: string;
  recurringEnabled?: boolean;
  recurringWeekday?: DispatchWeekday;
  recurringWeekdays?: DispatchWeekday[];
  recurringStartTime?: string;
  recurringEndTime?: string;
  recurringServiceType?: DispatchServiceType;
  recurringPriority?: DispatchPriority;
  recurringFee?: number;
}

export type UpdateDispatchJobPayload = Partial<
  Omit<DispatchJob, 'id' | 'createdAt' | 'updatedAt'>
>;
