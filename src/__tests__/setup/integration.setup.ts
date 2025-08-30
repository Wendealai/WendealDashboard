import { server } from '@/mocks/server';
import 'whatwg-fetch';

// 启动MSW服务器
beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'warn',
  });
});

// 每个测试后重置处理器
afterEach(() => {
  server.resetHandlers();
  // 清理本地存储
  localStorage.clear();
  sessionStorage.clear();
  // 清理DOM
  document.body.innerHTML = '';
  // 重置URL
  window.history.replaceState({}, '', '/');
});

// 关闭MSW服务器
afterAll(() => {
  server.close();
});

// 全局错误处理
process.on('unhandledRejection', reason => {
  console.error('Unhandled Rejection in integration test:', reason);
});

// 模拟IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
};

// 模拟ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
};

// 模拟MutationObserver
global.MutationObserver = class MutationObserver {
  constructor() {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  takeRecords() {
    return [];
  }
};

// 模拟window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// 模拟window.scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: jest.fn(),
});

// 模拟console方法以减少测试输出噪音
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render is deprecated') ||
        args[0].includes('Warning: componentWillReceiveProps') ||
        args[0].includes('act(...) is not supported'))
    ) {
      return;
    }
    originalConsoleError.call(console, ...args);
  };

  console.warn = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('componentWillReceiveProps') ||
        args[0].includes('deprecated'))
    ) {
      return;
    }
    originalConsoleWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// 设置测试超时
jest.setTimeout(30000);

// 模拟fetch API
if (!global.fetch) {
  global.fetch = require('whatwg-fetch').fetch;
}

// 模拟URL API
if (!global.URL.createObjectURL) {
  global.URL.createObjectURL = jest.fn(() => 'mock-url');
}

if (!global.URL.revokeObjectURL) {
  global.URL.revokeObjectURL = jest.fn();
}

// 模拟FileReader
global.FileReader = class FileReader {
  result: any = null;
  error: any = null;
  readyState: number = 0;
  onload: any = null;
  onerror: any = null;
  onabort: any = null;
  onloadstart: any = null;
  onloadend: any = null;
  onprogress: any = null;

  readAsDataURL() {
    this.readyState = 2;
    this.result = 'data:image/png;base64,mock-data';
    if (this.onload) {
      this.onload({ target: this });
    }
  }

  readAsText() {
    this.readyState = 2;
    this.result = 'mock text content';
    if (this.onload) {
      this.onload({ target: this });
    }
  }

  abort() {
    this.readyState = 2;
    if (this.onabort) {
      this.onabort({ target: this });
    }
  }

  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() {
    return true;
  }
};

// 模拟Blob
if (!global.Blob) {
  global.Blob = class Blob {
    constructor(parts: any[], options: any = {}) {
      this.size = 0;
      this.type = options.type || '';
    }
    size: number;
    type: string;
    slice() {
      return new Blob([]);
    }
  };
}

// 模拟File
if (!global.File) {
  global.File = class File extends Blob {
    constructor(parts: any[], name: string, options: any = {}) {
      super(parts, options);
      this.name = name;
      this.lastModified = Date.now();
    }
    name: string;
    lastModified: number;
  };
}
