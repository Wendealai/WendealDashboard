import { createContext, useContext } from 'react';

export interface QuoteDraftData {
  customerName: string;
  email: string;
  phone: string;
  propertyAddress: string;
  propertyType: 'apartment' | 'townhouse' | 'house';
  houseLevel?: 'single' | 'double';
  roomType: string;
  customRoomType?: string;
  hasCarpet: boolean;
  carpetRooms: number;
  garage: boolean;
  glassDoorWindowCount: number;
  oven: boolean;
  fridge: boolean;
  wallStainsCount: number;
  acFilterCount: number;
  blindsCount: number;
  moldCount: number;
  heavySoiling: boolean;
  rubbishRemoval: boolean;
  rubbishRemovalNotes?: string;
  preferredDate: string;
  additionalNotes: string;
  isSparkeryNewCustomer: boolean;
}

interface QuoteDraftContextType {
  draftData: QuoteDraftData | null;
  setDraftData: (data: QuoteDraftData | null) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const QuoteDraftContext = createContext<QuoteDraftContextType>({
  draftData: null,
  setDraftData: () => {},
  activeTab: 'quote-calculator',
  setActiveTab: () => {},
});

export const useQuoteDraft = () => useContext(QuoteDraftContext);
