export type DispatchServiceType = 'bond' | 'airbnb' | 'regular' | 'commercial';

export type DispatchJobStatus =
  | 'pending'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type DispatchPriority = 1 | 2 | 3 | 4 | 5;

export type DispatchEmployeeStatus = 'available' | 'off';

export interface DispatchJob {
  id: string;
  title: string;
  description?: string;
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
  assignedEmployeeId?: string;
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
}

export type UpdateDispatchJobPayload = Partial<
  Omit<DispatchJob, 'id' | 'createdAt' | 'updatedAt'>
>;
