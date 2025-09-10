import { useState, useEffect, useCallback } from 'react';
import type { ParsedSubredditData } from '@/services/redditWebhookService';

/**
 * Reddit数据持久化存储的键名
 */
const REDDIT_DATA_STORAGE_KEY = 'wendeal_reddit_data';
const REDDIT_DATA_TIMESTAMP_KEY = 'wendeal_reddit_data_timestamp';

/**
 * 存储Reddit数据的元数据
 */
interface RedditDataMetadata {
  /** 数据存储时间戳 */
  timestamp: number;
  /** 数据版本，用于处理数据结构变化 */
  version: string;
  /** 数据来源标识 */
  source: 'workflow' | 'cache';
}

/**
 * Reddit数据持久化存储结构
 */
interface RedditDataStorage {
  /** Reddit数据 */
  data: ParsedSubredditData[];
  /** 元数据 */
  metadata: RedditDataMetadata;
}

/**
 * Reddit数据持久化hook选项
 */
interface UseRedditDataPersistenceOptions {
  /** 是否自动从存储中恢复数据 */
  autoRestore?: boolean;
  /** 数据过期时间（毫秒），0表示永不过期 */
  expirationTime?: number;
  /** 存储版本，用于处理数据结构变化 */
  version?: string;
}

/**
 * Reddit数据持久化hook返回值
 */
interface UseRedditDataPersistenceReturn {
  /** 当前Reddit数据 */
  redditData: ParsedSubredditData[];
  /** 是否有持久化的数据 */
  hasPersistedData: boolean;
  /** 数据是否过期 */
  isExpired: boolean;
  /** 数据存储时间 */
  lastUpdated: Date | null;
  /** 保存数据到持久化存储 */
  persistData: (data: ParsedSubredditData[]) => void;
  /** 从持久化存储恢复数据 */
  restoreData: () => ParsedSubredditData[] | null;
  /** 清除持久化数据 */
  clearData: () => void;
  /** 检查数据是否存在且有效 */
  hasValidData: () => boolean;
}

/**
 * Reddit数据持久化hook
 * 提供数据的本地存储和恢复功能，确保数据在页面刷新和重新登录后仍然可用
 */
export const useRedditDataPersistence = ({
  autoRestore = true,
  expirationTime = 0, // 0表示永不过期，强制常驻
  version = '1.0.0',
}: UseRedditDataPersistenceOptions = {}): UseRedditDataPersistenceReturn => {
  // 同步获取初始数据 - 简化逻辑，直接在useState初始化时执行
  const getInitialData = (): ParsedSubredditData[] => {
    if (!autoRestore) return [];

    console.log('RedditDataPersistence: Attempting to load initial data from localStorage');

    const dataStr = localStorage.getItem(REDDIT_DATA_STORAGE_KEY);
    const timestampStr = localStorage.getItem(REDDIT_DATA_TIMESTAMP_KEY);

    console.log('RedditDataPersistence: localStorage dataStr exists:', !!dataStr);
    console.log('RedditDataPersistence: localStorage timestampStr exists:', !!timestampStr);

    if (dataStr) {
      try {
        const data: ParsedSubredditData[] = JSON.parse(dataStr);
        console.log('RedditDataPersistence: Parsed data length:', data?.length || 0);

        if (data && Array.isArray(data) && data.length > 0) {
          console.log('RedditDataPersistence: Successfully loaded persisted data:', data.length, 'items');
          console.log('RedditDataPersistence: Sample data:', data[0]);
          return data;
        } else {
          console.log('RedditDataPersistence: Data is empty or invalid');
        }
      } catch (error) {
        console.error('RedditDataPersistence: Failed to parse persisted data:', error);
        // 清理损坏的数据
        localStorage.removeItem(REDDIT_DATA_STORAGE_KEY);
        localStorage.removeItem(REDDIT_DATA_TIMESTAMP_KEY);
      }
    } else {
      console.log('RedditDataPersistence: No data found in localStorage');
    }

    return [];
  };

  // 获取初始状态
  const initialData = getInitialData();
  console.log('RedditDataPersistence: Initial data loaded:', initialData.length, 'items');

  const [redditData, setRedditData] = useState<ParsedSubredditData[]>(initialData);
  const [hasPersistedData, setHasPersistedData] = useState(initialData.length > 0);
  const [isExpired, setIsExpired] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(initialData.length > 0 ? new Date() : null);

  /**
   * 从localStorage加载Reddit数据
   */
  const loadFromStorage = useCallback((): RedditDataStorage | null => {
    try {
      const dataStr = localStorage.getItem(REDDIT_DATA_STORAGE_KEY);
      const timestampStr = localStorage.getItem(REDDIT_DATA_TIMESTAMP_KEY);

      if (!dataStr || !timestampStr) {
        return null;
      }

      const data: ParsedSubredditData[] = JSON.parse(dataStr);
      const timestamp = parseInt(timestampStr, 10);

      const metadata: RedditDataMetadata = {
        timestamp,
        version,
        source: 'cache',
      };

      return { data, metadata };
    } catch (error) {
      console.error('Failed to load Reddit data from storage:', error);
      // 如果数据损坏，清除存储
      try {
        localStorage.removeItem(REDDIT_DATA_STORAGE_KEY);
        localStorage.removeItem(REDDIT_DATA_TIMESTAMP_KEY);
      } catch (clearError) {
        console.error('Failed to clear corrupted data:', clearError);
      }
      return null;
    }
  }, [version]);

  /**
   * 保存Reddit数据到localStorage
   */
  const saveToStorage = useCallback((data: ParsedSubredditData[]) => {
    try {
      const timestamp = Date.now();
      const storageData: RedditDataStorage = {
        data,
        metadata: {
          timestamp,
          version,
          source: 'workflow',
        },
      };

      localStorage.setItem(REDDIT_DATA_STORAGE_KEY, JSON.stringify(data));
      localStorage.setItem(REDDIT_DATA_TIMESTAMP_KEY, timestamp.toString());

      console.log('Reddit data persisted to storage:', {
        itemCount: data.length,
        timestamp: new Date(timestamp).toISOString(),
      });
    } catch (error) {
      console.error('Failed to save Reddit data to storage:', error);
    }
  }, [version]);

  /**
   * 检查数据是否过期
   */
  const checkExpiration = useCallback(
    (timestamp: number): boolean => {
      // 如果过期时间设置为0，表示永不过期
      if (expirationTime === 0) {
        return false;
      }
      const now = Date.now();
      return now - timestamp > expirationTime;
    },
    [expirationTime]
  );

  /**
   * 持久化数据
   */
  const persistData = useCallback(
    (data: ParsedSubredditData[]) => {
      if (!data || data.length === 0) {
        console.warn('Cannot persist empty Reddit data');
        return;
      }

      setRedditData(data);
      setHasPersistedData(true);
      setIsExpired(false);
      setLastUpdated(new Date());

      saveToStorage(data);
    },
    [saveToStorage]
  );

  /**
   * 从存储恢复数据
   */
  const restoreData = useCallback((): ParsedSubredditData[] | null => {
    const storageData = loadFromStorage();

    if (!storageData) {
      return null;
    }

    const { data, metadata } = storageData;
    const expired = checkExpiration(metadata.timestamp);

    if (expired) {
      console.log('Reddit data has expired, clearing storage');
      clearData();
      return null;
    }

    console.log('Reddit data restored from storage:', {
      itemCount: data.length,
      timestamp: new Date(metadata.timestamp).toISOString(),
      expired,
    });

    setRedditData(data);
    setHasPersistedData(true);
    setIsExpired(expired);
    setLastUpdated(new Date(metadata.timestamp));

    return data;
  }, [loadFromStorage, checkExpiration]);

  /**
   * 清除持久化数据
   */
  const clearData = useCallback(() => {
    try {
      localStorage.removeItem(REDDIT_DATA_STORAGE_KEY);
      localStorage.removeItem(REDDIT_DATA_TIMESTAMP_KEY);

      setRedditData([]);
      setHasPersistedData(false);
      setIsExpired(false);
      setLastUpdated(null);

      console.log('Reddit data cleared from storage');
    } catch (error) {
      console.error('Failed to clear Reddit data from storage:', error);
    }
  }, []);

  /**
   * 检查是否有有效的持久化数据
   */
  const hasValidData = useCallback((): boolean => {
    const storageData = loadFromStorage();
    if (!storageData) return false;

    const expired = checkExpiration(storageData.metadata.timestamp);
    return !expired && storageData.data.length > 0;
  }, [loadFromStorage, checkExpiration]);


  return {
    redditData,
    hasPersistedData,
    isExpired,
    lastUpdated,
    persistData,
    restoreData,
    clearData,
    hasValidData,
  };
};

export default useRedditDataPersistence;
