/**
 * Dependency Resolver Unit Tests
 * 依赖解析器单元测试
 */

import {
  DependencyResolver,
  dependencyResolver,
} from '../../../utils/diagnostic/DependencyResolver';
import type { ExportInfo } from '../../../types/exportDiagnostic';
import { FileSystemUtils } from '../../../utils/exportDiagnosticUtils';

// Mock FileSystemUtils
jest.mock('../../../utils/exportDiagnosticUtils', () => ({
  FileSystemUtils: {
    readFileContent: jest.fn(),
    fileExists: jest.fn(),
  },
}));

const mockFileSystemUtils = FileSystemUtils as jest.Mocked<
  typeof FileSystemUtils
>;

describe('DependencyResolver', () => {
  let resolver: DependencyResolver;
  const mockExports: ExportInfo[] = [
    {
      name: 'ComponentA',
      type: 'named',
      location: {
        filePath: '/src/components/ComponentA.ts',
        line: 1,
        column: 1,
        codeSnippet: 'export const ComponentA',
      },
      isUsed: true,
      referenceCount: 1,
      lastModified: new Date(),
    },
    {
      name: 'ComponentB',
      type: 'named',
      location: {
        filePath: '/src/components/ComponentB.ts',
        line: 1,
        column: 1,
        codeSnippet: 'export const ComponentB',
      },
      isUsed: true,
      referenceCount: 1,
      lastModified: new Date(),
    },
  ];

  beforeEach(() => {
    resolver = new DependencyResolver({
      filePatterns: ['**/*.{ts,tsx}'],
      ignorePatterns: ['**/node_modules/**'],
      maxDepth: 5,
      timeout: 10000,
      enableCache: false,
      cacheExpiry: 300000,
      severityThreshold: 'info',
    });
    jest.clearAllMocks();
  });

  describe('依赖解析', () => {
    it('应该解析ES6 import语句', async () => {
      const fileContent = `
        import { ComponentA } from './ComponentA';
        import ComponentB from './ComponentB';
        import * as utils from '../utils';
      `;

      mockFileSystemUtils.readFileContent.mockResolvedValue(fileContent);
      mockFileSystemUtils.fileExists.mockResolvedValue(true);

      const dependencies = await resolver.resolveFileDependencies(
        '/src/components/Main.ts',
        mockExports
      );

      expect(dependencies).toHaveLength(3);
      expect(dependencies[0]).toMatchObject({
        from: '/src/components/Main.ts',
        to: '/src/components/ComponentA.ts',
        importName: 'ComponentA',
        importType: 'named',
      });
      expect(dependencies[1]).toMatchObject({
        importType: 'default',
      });
      expect(dependencies[2]).toMatchObject({
        importType: 'namespace',
      });
    });

    it('应该解析CommonJS require语句', async () => {
      const fileContent = `
        const ComponentA = require('./ComponentA');
        const utils = require('../utils');
      `;

      mockFileSystemUtils.readFileContent.mockResolvedValue(fileContent);
      mockFileSystemUtils.fileExists.mockResolvedValue(true);

      const dependencies = await resolver.resolveFileDependencies(
        '/src/components/Main.ts',
        mockExports
      );

      expect(dependencies).toHaveLength(2);
      expect(dependencies[0]).toMatchObject({
        importType: 'named',
      });
    });

    it('应该解析动态import', async () => {
      const fileContent = `
        const moduleA = import('./ComponentA');
        import('./utils').then(utils => {});
      `;

      mockFileSystemUtils.readFileContent.mockResolvedValue(fileContent);
      mockFileSystemUtils.fileExists.mockResolvedValue(true);

      const dependencies = await resolver.resolveFileDependencies(
        '/src/components/Main.ts',
        mockExports
      );

      expect(dependencies).toHaveLength(2);
      expect(dependencies.every(dep => dep.importType === 'namespace')).toBe(
        true
      );
    });

    it('应该处理文件不存在的情况', async () => {
      mockFileSystemUtils.readFileContent.mockRejectedValue(
        new Error('File not found')
      );

      const dependencies = await resolver.resolveFileDependencies(
        '/nonexistent/file.ts',
        mockExports
      );

      expect(dependencies).toHaveLength(0);
    });
  });

  describe('模块路径解析', () => {
    it('应该解析相对路径', () => {
      const result = (resolver as any).resolveModulePath(
        '/src/components/Main.ts',
        './ComponentA'
      );
      expect(result).toBe('/src/components/ComponentA.ts');
    });

    it('应该解析上级目录路径', () => {
      const result = (resolver as any).resolveModulePath(
        '/src/components/Main.ts',
        '../utils/helpers'
      );
      expect(result).toBe('/src/utils/helpers.ts');
    });

    it('应该处理文件扩展名', () => {
      mockFileSystemUtils.fileExists.mockImplementation(path => {
        return Promise.resolve(path.endsWith('.tsx'));
      });

      const result = (resolver as any).resolveModulePath(
        '/src/components/Main.ts',
        './ComponentA'
      );
      expect(result).toBe('/src/components/ComponentA.tsx');
    });

    it('应该处理index文件', () => {
      mockFileSystemUtils.fileExists
        .mockResolvedValueOnce(false) // ComponentA.ts
        .mockResolvedValueOnce(true); // ComponentA/index.ts

      const result = (resolver as any).resolveModulePath(
        '/src/components/Main.ts',
        './ComponentA'
      );
      expect(result).toBe('/src/components/ComponentA/index.ts');
    });
  });

  describe('循环依赖检测', () => {
    it('应该检测简单的循环依赖', () => {
      const graph = {
        nodes: new Set(['A', 'B', 'C']),
        edges: [
          { from: 'A', to: 'B' },
          { from: 'B', to: 'C' },
          { from: 'C', to: 'A' },
        ],
        cycles: [],
      };

      const cycles = (resolver as any).detectCycles(graph);
      expect(cycles).toHaveLength(1);
      expect(cycles[0]).toEqual(['A', 'B', 'C', 'A']);
    });

    it('应该检测多个循环依赖', () => {
      const graph = {
        nodes: new Set(['A', 'B', 'C', 'D']),
        edges: [
          { from: 'A', to: 'B' },
          { from: 'B', to: 'A' }, // 循环1
          { from: 'C', to: 'D' },
          { from: 'D', to: 'C' }, // 循环2
        ],
        cycles: [],
      };

      const cycles = (resolver as any).detectCycles(graph);
      expect(cycles).toHaveLength(2);
    });

    it('应该处理无循环的图', () => {
      const graph = {
        nodes: new Set(['A', 'B', 'C']),
        edges: [
          { from: 'A', to: 'B' },
          { from: 'B', to: 'C' },
        ],
        cycles: [],
      };

      const cycles = (resolver as any).detectCycles(graph);
      expect(cycles).toHaveLength(0);
    });
  });

  describe('依赖问题分析', () => {
    it('应该检测缺失的导入', () => {
      const graph = {
        nodes: new Set(['/src/Main.ts', '/src/Component.ts']),
        edges: [
          {
            from: '/src/Main.ts',
            to: '/src/Component.ts',
            importName: 'NonExistentExport',
            importType: 'named',
            location: {
              filePath: '/src/Main.ts',
              line: 1,
              column: 1,
              codeSnippet: "import { NonExistentExport } from './Component'",
            },
          },
        ],
        cycles: [],
      };

      const issues = resolver.analyzeDependencyIssues(graph, mockExports);
      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe('missing_export');
    });

    it('应该检测循环依赖问题', () => {
      const graph = {
        nodes: new Set(['A', 'B']),
        edges: [],
        cycles: [['A', 'B', 'A']],
      };

      const issues = resolver.analyzeDependencyIssues(graph, mockExports);
      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe('circular_dependency');
    });
  });

  describe('依赖统计', () => {
    it('应该计算依赖统计信息', () => {
      const graph = {
        nodes: new Set(['A', 'B', 'C']),
        edges: [
          { from: 'A', to: 'B' },
          { from: 'A', to: 'C' },
          { from: 'B', to: 'C' },
        ],
        cycles: [],
      };

      const stats = resolver.getDependencyStats(graph);
      expect(stats.totalFiles).toBe(3);
      expect(stats.totalDependencies).toBe(3);
      expect(stats.averageDependenciesPerFile).toBe(1);
      expect(stats.cyclesDetected).toBe(0);
      expect(stats.mostConnectedFile).toBe('A');
    });
  });

  describe('工具方法', () => {
    it('应该验证文件类型', () => {
      expect(
        resolver.validateFileType({ name: 'test.pdf', type: 'application/pdf' })
      ).toBe(false);
      expect(
        resolver.validateFileType({ name: 'test.ts', type: 'text/plain' })
      ).toBe(true);
      expect(
        resolver.validateFileType({ name: 'test.tsx', type: 'text/plain' })
      ).toBe(true);
    });

    it('应该验证文件大小', () => {
      const smallFile = { size: 1000 };
      const largeFile = { size: 20 * 1024 * 1024 }; // 20MB

      expect(resolver.validateFileSize(smallFile, 10)).toBe(true); // 10MB limit
      expect(resolver.validateFileSize(largeFile, 10)).toBe(false);
    });

    it('应该格式化文件大小', () => {
      expect(resolver.formatFileSize(0)).toBe('0 Bytes');
      expect(resolver.formatFileSize(1024)).toBe('1 KB');
      expect(resolver.formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(resolver.formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
    });

    it('应该生成批处理名称', () => {
      const name1 = resolver.generateBatchName('test');
      const name2 = resolver.generateBatchName('test');

      expect(name1).toMatch(
        /^test-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-[a-z0-9]{6}$/
      );
      expect(name2).toMatch(
        /^test-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-[a-z0-9]{6}$/
      );
      expect(name1).not.toBe(name2);
    });
  });

  describe('默认实例', () => {
    it('应该导出默认实例', () => {
      expect(dependencyResolver).toBeInstanceOf(DependencyResolver);
    });
  });
});
