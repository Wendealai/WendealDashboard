import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import { message } from 'antd';

// API响应接口
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  code?: number;
}

// 分页响应接口
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// 创建axios实例
const createApiInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: '/api',
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // 请求拦截器
  instance.interceptors.request.use(
    config => {
      // 添加认证token
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    error => {
      return Promise.reject(error);
    }
  );

  // 响应拦截器
  instance.interceptors.response.use(
    (response: AxiosResponse<ApiResponse>) => {
      const { data } = response;

      // 如果API返回success为false，抛出错误
      if (data.success === false) {
        const errorMessage = data.message || '请求失败';
        message.error(errorMessage);
        return Promise.reject(new Error(errorMessage));
      }

      return response;
    },
    error => {
      // 处理HTTP错误
      if (error.response) {
        const { status, data } = error.response;

        switch (status) {
          case 401:
            message.error('未授权，请重新登录');
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            window.location.href = '/login';
            break;
          case 403:
            message.error('权限不足');
            break;
          case 404:
            message.error('请求的资源不存在');
            break;
          case 500:
            message.error('服务器内部错误');
            break;
          default:
            message.error(data?.message || '请求失败');
        }
      } else if (error.request) {
        message.error('网络错误，请检查网络连接');
      } else {
        message.error('请求配置错误');
      }

      return Promise.reject(error);
    }
  );

  return instance;
};

// 创建API实例
export const api = createApiInstance();

// 通用API方法
export class ApiService {
  // GET请求
  static async get<T>(url: string, params?: any): Promise<T> {
    const response = await api.get<ApiResponse<T>>(url, { params });
    return response.data.data as T;
  }

  // POST请求
  static async post<T>(url: string, data?: any): Promise<T> {
    const response = await api.post<ApiResponse<T>>(url, data);
    return response.data.data as T;
  }

  // PUT请求
  static async put<T>(url: string, data?: any): Promise<T> {
    const response = await api.put<ApiResponse<T>>(url, data);
    return response.data.data as T;
  }

  // DELETE请求
  static async delete<T>(url: string): Promise<T> {
    const response = await api.delete<ApiResponse<T>>(url);
    return response.data.data as T;
  }

  // PATCH请求
  static async patch<T>(url: string, data?: any): Promise<T> {
    const response = await api.patch<ApiResponse<T>>(url, data);
    return response.data.data as T;
  }
}

export default ApiService;
