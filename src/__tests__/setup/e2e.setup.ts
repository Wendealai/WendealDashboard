import { server } from '@/mocks/server';
import 'whatwg-fetch';

// Start MSW server
beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'bypass',
  });
});

// Reset handlers after each test
afterEach(() => {
  server.resetHandlers();
  // Clear local storage
  localStorage.clear();
  sessionStorage.clear();
  // Clear cookies
  document.cookie.split(';').forEach(cookie => {
    const eqPos = cookie.indexOf('=');
    const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
  });
  // Clear DOM
  document.body.innerHTML = '';
  // Reset URL
  window.history.replaceState({}, '', '/');
  // Clear event listeners
  window.removeEventListener('beforeunload', () => {});
  window.removeEventListener('unload', () => {});
});

// Close MSW server
afterAll(() => {
  server.close();
});

// Global error handling
process.on('unhandledRejection', reason => {
  console.error('Unhandled Rejection in E2E test:', reason);
});

process.on('uncaughtException', error => {
  console.error('Uncaught Exception in E2E test:', error);
});

// Mock browser APIs
global.IntersectionObserver = class IntersectionObserver {
  constructor(callback: any, options: any = {}) {
    this.callback = callback;
    this.options = options;
  }
  callback: any;
  options: any;
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

global.ResizeObserver = class ResizeObserver {
  constructor(callback: any) {
    this.callback = callback;
  }
  callback: any;
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

global.MutationObserver = class MutationObserver {
  constructor(callback: any) {
    this.callback = callback;
  }
  callback: any;
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

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: query.includes('max-width: 768px') ? false : true,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: jest.fn(),
});

// Mock window.scroll
Object.defineProperty(window, 'scroll', {
  writable: true,
  value: jest.fn(),
});

// Mock window.scrollBy
Object.defineProperty(window, 'scrollBy', {
  writable: true,
  value: jest.fn(),
});

// Mock window.getComputedStyle
Object.defineProperty(window, 'getComputedStyle', {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    getPropertyValue: jest.fn().mockReturnValue(''),
    display: 'block',
    visibility: 'visible',
    opacity: '1',
  })),
});

// Mock window.requestAnimationFrame
Object.defineProperty(window, 'requestAnimationFrame', {
  writable: true,
  value: jest.fn().mockImplementation(cb => setTimeout(cb, 16)),
});

// Mock window.cancelAnimationFrame
Object.defineProperty(window, 'cancelAnimationFrame', {
  writable: true,
  value: jest.fn().mockImplementation(id => clearTimeout(id)),
});

// Mock window.requestIdleCallback
Object.defineProperty(window, 'requestIdleCallback', {
  writable: true,
  value: jest.fn().mockImplementation(cb => setTimeout(cb, 1)),
});

// Mock window.cancelIdleCallback
Object.defineProperty(window, 'cancelIdleCallback', {
  writable: true,
  value: jest.fn().mockImplementation(id => clearTimeout(id)),
});

// Mock navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  writable: true,
  value: {
    writeText: jest.fn().mockResolvedValue(undefined),
    readText: jest.fn().mockResolvedValue(''),
  },
});

// Mock navigator.geolocation
Object.defineProperty(navigator, 'geolocation', {
  writable: true,
  value: {
    getCurrentPosition: jest.fn().mockImplementation(success => {
      success({
        coords: {
          latitude: 40.7128,
          longitude: -74.006,
          accuracy: 10,
        },
      });
    }),
    watchPosition: jest.fn(),
    clearWatch: jest.fn(),
  },
});

// Mock Performance API
Object.defineProperty(window, 'performance', {
  writable: true,
  value: {
    ...window.performance,
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn().mockReturnValue([]),
    getEntriesByType: jest.fn().mockReturnValue([]),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
    now: jest.fn().mockReturnValue(Date.now()),
  },
});

// Mock WebSocket
global.WebSocket = class WebSocket {
  constructor(url: string) {
    this.url = url;
    this.readyState = WebSocket.CONNECTING;
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      if (this.onopen) this.onopen({} as Event);
    }, 100);
  }

  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  url: string;
  readyState: number;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  send(data: any) {
    // Mock sending data
  }

  close() {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) {
      this.onclose({} as CloseEvent);
    }
  }

  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() {
    return true;
  }
};

// Set test timeout
jest.setTimeout(60000);

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

  readAsDataURL(file: any) {
    setTimeout(() => {
      this.readyState = 2;
      this.result = `data:${file.type || 'image/png'};base64,mock-data`;
      if (this.onload) {
        this.onload({ target: this });
      }
    }, 100);
  }

  readAsText(file: any) {
    setTimeout(() => {
      this.readyState = 2;
      this.result = 'mock text content';
      if (this.onload) {
        this.onload({ target: this });
      }
    }, 100);
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
      this.size = parts.reduce((size, part) => size + (part.length || 0), 0);
      this.type = options.type || '';
    }
    size: number;
    type: string;
    slice(start?: number, end?: number, contentType?: string) {
      return new Blob([], { type: contentType });
    }
    stream() {
      return new ReadableStream();
    }
    text() {
      return Promise.resolve('mock text');
    }
    arrayBuffer() {
      return Promise.resolve(new ArrayBuffer(0));
    }
  };
}

// 模拟File
if (!global.File) {
  global.File = class File extends Blob {
    constructor(parts: any[], name: string, options: any = {}) {
      super(parts, options);
      this.name = name;
      this.lastModified = options.lastModified || Date.now();
      this.webkitRelativePath = options.webkitRelativePath || '';
    }
    name: string;
    lastModified: number;
    webkitRelativePath: string;
  };
}

// 抑制特定的控制台输出
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render is deprecated') ||
        args[0].includes('Warning: componentWillReceiveProps') ||
        args[0].includes('act(...) is not supported') ||
        args[0].includes('Download the React DevTools'))
    ) {
      return;
    }
    originalConsoleError.call(console, ...args);
  };

  console.warn = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('componentWillReceiveProps') ||
        args[0].includes('deprecated') ||
        args[0].includes('React DevTools'))
    ) {
      return;
    }
    originalConsoleWarn.call(console, ...args);
  };

  console.log = (...args: any[]) => {
    if (typeof args[0] === 'string' && args[0].includes('React DevTools')) {
      return;
    }
    originalConsoleLog.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  console.log = originalConsoleLog;
});
