/**
 * Airtable Service Unit Tests
 * 测试Airtable服务的所有功能
 */

import {
  AirtableService,
  createAirtableService,
  defaultAirtableConfig,
} from '../airtableService';
import type {
  OpportunityRecord,
  AirtableConfig,
} from '@/types/smartOpportunities';

// Mock Airtable
jest.mock('airtable', () => {
  const mockBase = {
    select: jest.fn().mockReturnThis(),
    all: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  };

  const mockAirtable = {
    configure: jest.fn(),
    base: jest.fn(() => mockBase),
  };

  return {
    __esModule: true,
    default: jest.fn(() => mockAirtable),
  };
});

describe('AirtableService', () => {
  let service: AirtableService;
  let mockBase: any;
  let mockAirtable: any;

  const mockConfig: AirtableConfig = {
    apiKey: 'test-api-key',
    baseId: 'test-base-id',
    tableName: 'test-table',
  };

  const mockRecord: OpportunityRecord = {
    id: 'rec123',
    fields: {
      businessName: 'Test Business',
      industry: 'Technology',
      city: 'New York',
      country: 'USA',
      description: 'A test business opportunity',
      contactInfo: 'contact@test.com',
      createdTime: '2024-01-01T00:00:00Z',
    },
    createdTime: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup Airtable mock
    const AirtableMock = require('airtable').default;
    mockAirtable = AirtableMock();
    mockBase = mockAirtable.base();

    service = new AirtableService(mockConfig);
  });

  describe('constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(mockAirtable.configure).toHaveBeenCalledWith({
        apiKey: mockConfig.apiKey,
        endpointUrl: 'https://api.airtable.com',
        requestTimeout: 30000,
      });
      expect(mockAirtable.base).toHaveBeenCalledWith(mockConfig.baseId);
    });
  });

  describe('getAllRecords', () => {
    it('should fetch all records successfully', async () => {
      const mockRecords = [
        {
          id: 'rec1',
          fields: mockRecord.fields,
          _rawJson: { createdTime: mockRecord.createdTime },
        },
        {
          id: 'rec2',
          fields: { ...mockRecord.fields, businessName: 'Another Business' },
          _rawJson: { createdTime: mockRecord.createdTime },
        },
      ];

      mockBase.all.mockResolvedValue(mockRecords);

      const result = await service.getAllRecords();

      expect(mockBase.select).toHaveBeenCalledWith({
        pageSize: 100,
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'rec1',
        fields: mockRecord.fields,
        createdTime: mockRecord.createdTime,
      });
    });

    it('should handle pagination correctly', async () => {
      const firstPageRecords = [
        {
          id: 'rec1',
          fields: mockRecord.fields,
          _rawJson: { createdTime: mockRecord.createdTime },
        },
      ];

      const secondPageRecords = [
        {
          id: 'rec2',
          fields: { ...mockRecord.fields, businessName: 'Second Business' },
          _rawJson: { createdTime: mockRecord.createdTime },
        },
      ];

      // First call returns records with offset
      mockBase.all
        .mockResolvedValueOnce({
          ...firstPageRecords,
          _params: { offset: 'offset1' },
        })
        .mockResolvedValueOnce(secondPageRecords);

      const result = await service.getAllRecords();

      expect(mockBase.all).toHaveBeenCalledTimes(2);
      expect(mockBase.select).toHaveBeenNthCalledWith(2, {
        pageSize: 100,
        offset: 'offset1',
      });
      expect(result).toHaveLength(2);
    });

    it('should apply filter and sort options', async () => {
      const mockRecords = [mockRecord];
      mockBase.all.mockResolvedValue(
        mockRecords.map(r => ({
          id: r.id,
          fields: r.fields,
          _rawJson: { createdTime: r.createdTime },
        }))
      );

      const options = {
        filterByFormula: 'industry = "Technology"',
        sort: [{ field: 'businessName', direction: 'asc' as const }],
        fields: ['businessName', 'industry'],
      };

      await service.getAllRecords(options);

      expect(mockBase.select).toHaveBeenCalledWith({
        pageSize: 100,
        filterByFormula: options.filterByFormula,
        sort: options.sort,
        fields: options.fields,
      });
    });

    it('should handle API errors', async () => {
      const error = new Error('API Error');
      mockBase.all.mockRejectedValue(error);

      await expect(service.getAllRecords()).rejects.toThrow();
    });
  });

  describe('getRecord', () => {
    it('should fetch a single record successfully', async () => {
      const mockAirtableRecord = {
        id: mockRecord.id,
        fields: mockRecord.fields,
        _rawJson: { createdTime: mockRecord.createdTime },
      };

      mockBase.find.mockResolvedValue(mockAirtableRecord);

      const result = await service.getRecord('rec123');

      expect(mockBase.find).toHaveBeenCalledWith('rec123');
      expect(result).toEqual(mockRecord);
    });

    it('should return null for non-existent record', async () => {
      const error = new Error('NOT_FOUND');
      mockBase.find.mockRejectedValue(error);

      const result = await service.getRecord('nonexistent');

      expect(result).toBeNull();
    });

    it('should throw error for other API failures', async () => {
      const error = new Error('API Error');
      mockBase.find.mockRejectedValue(error);

      await expect(service.getRecord('rec123')).rejects.toThrow();
    });
  });

  describe('createRecord', () => {
    it('should create a record successfully', async () => {
      const newRecordFields = mockRecord.fields;
      const mockAirtableRecord = {
        id: 'new-rec-id',
        fields: newRecordFields,
        _rawJson: { createdTime: mockRecord.createdTime },
      };

      mockBase.create.mockResolvedValue(mockAirtableRecord);

      const result = await service.createRecord(newRecordFields);

      expect(mockBase.create).toHaveBeenCalledWith(newRecordFields);
      expect(result.id).toBe('new-rec-id');
    });
  });

  describe('updateRecord', () => {
    it('should update a record successfully', async () => {
      const updateFields = { businessName: 'Updated Business' };
      const mockAirtableRecord = {
        id: mockRecord.id,
        fields: { ...mockRecord.fields, ...updateFields },
        _rawJson: { createdTime: mockRecord.createdTime },
      };

      mockBase.update.mockResolvedValue(mockAirtableRecord);

      const result = await service.updateRecord(mockRecord.id, updateFields);

      expect(mockBase.update).toHaveBeenCalledWith(mockRecord.id, updateFields);
      expect(result.fields.businessName).toBe('Updated Business');
    });
  });

  describe('deleteRecord', () => {
    it('should delete a record successfully', async () => {
      mockBase.destroy.mockResolvedValue({ id: mockRecord.id });

      const result = await service.deleteRecord(mockRecord.id);

      expect(mockBase.destroy).toHaveBeenCalledWith(mockRecord.id);
      expect(result).toBe(true);
    });
  });

  describe('searchRecords', () => {
    it('should search records with criteria', async () => {
      const mockRecords = [mockRecord];
      mockBase.all.mockResolvedValue(
        mockRecords.map(r => ({
          id: r.id,
          fields: r.fields,
          _rawJson: { createdTime: r.createdTime },
        }))
      );

      const searchCriteria = {
        industry: 'Technology',
        city: 'New York',
        country: 'USA',
        limit: 10,
      };

      const result = await service.searchRecords(searchCriteria);

      expect(mockBase.select).toHaveBeenCalledWith({
        pageSize: 100,
        filterByFormula:
          'AND(FIND("Technology", {industry}), FIND("New York", {city}), FIND("USA", {country}))',
        maxRecords: 10,
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      const networkError = new Error('Failed to fetch');
      mockBase.all.mockRejectedValue(networkError);

      try {
        await service.getAllRecords();
      } catch (error: any) {
        expect(error.message).toContain('网络连接失败');
        expect(error.name).toBe('AirtableServiceError');
      }
    });

    it('should handle authentication errors', async () => {
      const authError = new Error('401 Unauthorized');
      mockBase.all.mockRejectedValue(authError);

      try {
        await service.getAllRecords();
      } catch (error: any) {
        expect(error.message).toContain('API密钥无效');
        expect(error.name).toBe('AirtableServiceError');
      }
    });

    it('should handle validation errors', async () => {
      const validationError = new Error('400 Bad Request');
      mockBase.all.mockRejectedValue(validationError);

      try {
        await service.getAllRecords();
      } catch (error: any) {
        expect(error.message).toContain('请求参数无效');
        expect(error.name).toBe('AirtableServiceError');
      }
    });
  });

  describe('createAirtableService', () => {
    it('should create a service instance', () => {
      const serviceInstance = createAirtableService(mockConfig);
      expect(serviceInstance).toBeInstanceOf(AirtableService);
    });
  });

  describe('default configuration', () => {
    it('should have default configuration', () => {
      expect(defaultAirtableConfig.apiKey).toBeDefined();
      expect(defaultAirtableConfig.baseId).toBeDefined();
      expect(defaultAirtableConfig.tableName).toBeDefined();
    });
  });
});
