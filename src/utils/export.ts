import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// 扩展jsPDF类型以支持autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export interface ExportColumn {
  key: string;
  title: string;
  width?: number;
  render?: (value: any, record: any) => string;
}

export interface ExportOptions {
  filename?: string;
  title?: string;
  columns: ExportColumn[];
  data: any[];
  format: 'excel' | 'pdf' | 'csv';
}

export class ExportUtils {
  /**
   * 导出数据到Excel
   */
  static exportToExcel(options: ExportOptions): void {
    const { filename = 'export', title, columns, data } = options;

    // 准备表头
    const headers = columns.map(col => col.title);

    // 准备数据
    const rows = data.map(record =>
      columns.map(col => {
        const value = record[col.key];
        return col.render ? col.render(value, record) : value;
      })
    );

    // 创建工作表数据
    const wsData = [headers, ...rows];

    // 创建工作簿和工作表
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // 设置列宽
    const colWidths = columns.map(col => ({ wch: col.width || 15 }));
    ws['!cols'] = colWidths;

    // 设置表头样式
    const headerRange = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!ws[cellAddress]) continue;

      ws[cellAddress].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: 'E6F3FF' } },
        alignment: { horizontal: 'center' },
      };
    }

    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(wb, ws, title || 'Sheet1');

    // 导出文件
    XLSX.writeFile(wb, `${filename}.xlsx`);
  }

  /**
   * 导出数据到PDF
   */
  static exportToPDF(options: ExportOptions): void {
    const { filename = 'export', title, columns, data } = options;

    // 创建PDF文档
    const doc = new jsPDF();

    // 设置中文字体（如果需要）
    // doc.addFont('path/to/chinese-font.ttf', 'chinese', 'normal');
    // doc.setFont('chinese');

    // 添加标题
    if (title) {
      doc.setFontSize(16);
      doc.text(title, 14, 20);
    }

    // 准备表格数据
    const headers = columns.map(col => col.title);
    const rows = data.map(record =>
      columns.map(col => {
        const value = record[col.key];
        const cellValue = col.render ? col.render(value, record) : value;
        return String(cellValue || '');
      })
    );

    // 添加表格
    doc.autoTable({
      head: [headers],
      body: rows,
      startY: title ? 30 : 20,
      styles: {
        fontSize: 10,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [230, 243, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
      },
      columnStyles: columns.reduce((styles, col, index) => {
        if (col.width) {
          styles[index] = { cellWidth: col.width };
        }
        return styles;
      }, {} as any),
      margin: { top: 20, right: 14, bottom: 20, left: 14 },
    });

    // 保存PDF
    doc.save(`${filename}.pdf`);
  }

  /**
   * 导出数据到CSV
   */
  static exportToCSV(options: ExportOptions): void {
    const { filename = 'export', columns, data } = options;

    // 准备CSV内容
    const headers = columns.map(col => col.title);
    const rows = data.map(record =>
      columns.map(col => {
        const value = record[col.key];
        const cellValue = col.render ? col.render(value, record) : value;
        // 处理包含逗号、引号或换行符的值
        const stringValue = String(cellValue || '');
        if (
          stringValue.includes(',') ||
          stringValue.includes('"') ||
          stringValue.includes('\n')
        ) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      })
    );

    // 组合CSV内容
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');

    // 添加BOM以支持中文
    const BOM = '\uFEFF';
    const csvWithBOM = BOM + csvContent;

    // 创建Blob并下载
    const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }

  /**
   * 通用导出方法
   */
  static export(options: ExportOptions): void {
    switch (options.format) {
      case 'excel':
        this.exportToExcel(options);
        break;
      case 'pdf':
        this.exportToPDF(options);
        break;
      case 'csv':
        this.exportToCSV(options);
        break;
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * 格式化日期
   */
  static formatDate(
    date: Date | string,
    format: string = 'YYYY-MM-DD'
  ): string {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    return format
      .replace('YYYY', String(year))
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  }

  /**
   * 格式化数字
   */
  static formatNumber(value: number, decimals: number = 2): string {
    if (typeof value !== 'number' || isNaN(value)) return '';
    return value.toFixed(decimals);
  }

  /**
   * 格式化货币
   */
  static formatCurrency(value: number, currency: string = '¥'): string {
    if (typeof value !== 'number' || isNaN(value)) return '';
    return `${currency}${value.toLocaleString()}`;
  }
}

// 导出类型和工具类
export default ExportUtils;
