import { server } from '@/mocks/server';
import 'whatwg-fetch';

// Start MSW server
beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'warn',
  });
});

// Reset handlers after each test
afterEach(() => {
  server.resetHandlers();
  // Clear local storage
  localStorage.clear();
  sessionStorage.clear();
  // Clear DOM
  document.body.innerHTML = '';
  // Reset URL
  window.history.replaceState({}, '', '/');
});

// Close MSW server
afterAll(() => {
  server.close();
});

// Global error handling
process.on('unhandledRejection', reason => {
  console.error('Unhandled Rejection in integration test:', reason);
});

// Mock IntersectionObserver
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

// Mock ResizeObserver
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

// Mock MutationObserver
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

// Mock window.matchMedia
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

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: jest.fn(),
});

// Mock console methods to reduce test output noise
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

// Set test timeout
jest.setTimeout(30000);

// Mock fetch API
if (!global.fetch) {
  global.fetch = require('whatwg-fetch').fetch;
}

// Mock URL API
if (!global.URL.createObjectURL) {
  global.URL.createObjectURL = jest.fn(() => 'mock-url');
}

if (!global.URL.revokeObjectURL) {
  global.URL.revokeObjectURL = jest.fn();
}

// Mock FileReader
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

// Mock Blob
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

// Mock File
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
