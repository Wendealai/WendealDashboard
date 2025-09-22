/**
 * Tax Invoice/Receipt Component
 * Displays embedded HTML receipt document
 */

import React from 'react';
import { Card, Typography } from 'antd';

const { Title } = Typography;

/**
 * TaxInvoiceReceipt component that displays the receipt HTML document
 */
const TaxInvoiceReceipt: React.FC = () => {
  // HTML content for the receipt template
  const receiptHtmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Editable Receipt Template</title>
    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Luxon for date handling -->
    <script src="https://cdn.jsdelivr.net/npm/luxon@3.3.0/build/global/luxon.min.js"></script>
    <!-- jsPDF for PDF generation -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>

    <style>
        :root {
            --primary-color: #6b7280; /* 更改为灰色 */
            --primary-dark: #6b7280; /* 灰色 */
            --secondary-color: #6b7280; /* 灰色 */
            --text-color: #6b7280; /* 灰色文字 */
            --light-bg: #f9fafb;
            --accent-color: #6b7280; /* 灰色强调色 */
            --logo-color: #ff5722; /* logo保持橙红色 */
        }

        body {
            font-family: 'Inter', sans-serif;
            color: var(--text-color);
            background-color: var(--background-color);
            padding: 20px;
        }

        .receipt-container {
            position: relative;
            background: white;
            border-radius: 0.75rem;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            overflow: hidden;
            font-size: 0.9rem; /* 缩小整体字体大小 */
        }

        .receipt-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 0.75rem; /* 增加高度使其更显眼 */
            background: linear-gradient(90deg, #6b7280, #374151, #1f2937);
            box-shadow: 0 2px 10px rgba(107, 114, 128, 0.5); /* 添加阴影效果 */
        }

        .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 8rem;
            font-weight: bold;
            color: rgba(243, 244, 246, 0.7);
            pointer-events: none;
            z-index: 0;
            white-space: nowrap;
        }

        .receipt-title {
            color: var(--primary-color);
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.2);
            font-weight: 800; /* 增加字重 */
            letter-spacing: 1px; /* 增加字间距 */
        }

        /* Logo保持橙红色 */
        .logo-text {
            color: var(--logo-color) !important;
        }

        /* Bill To字段样式 - 空内容时隐藏 */
        .bill-to-field:empty::before {
            content: attr(data-placeholder);
            color: #9ca3af;
            opacity: 0.7;
        }

        .bill-to-field:empty {
            opacity: 0.5;
        }

        /* 公司名称改为灰色 */
        .logo-text {
            color: var(--text-color) !important;
        }

        /* TAX INVOICE标题改为灰色 */
        .receipt-title {
            color: var(--text-color) !important;
        }

        /* 总价背景条改为灰色 */
        .total-amount {
            background: linear-gradient(90deg, var(--text-color), var(--text-color)) !important;
            color: white !important;
        }

        /* 打印时隐藏空的Bill To字段和email */
        @media print {
            .bill-to-field:empty {
                display: none !important;
            }
            .bill-to-field {
                display: none !important;
            }
        }

        .table-header {
            background-color: var(--light-bg);
        }

        .table-row:hover {
            background-color: rgba(243, 244, 246, 0.5);
        }

        .total-amount {
            background: linear-gradient(90deg, var(--primary-color), var(--primary-dark));
            color: white;
            border-radius: 0.5rem;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15); /* 添加阴影使其更显眼 */
            font-size: 1.25rem; /* 增大字体 */
            font-weight: 700; /* 加粗 */
        }

        .print-button {
            transition: all 0.3s ease;
            background: linear-gradient(135deg, #1a5276, #154360); /* 更改为深蓝色系 */
            box-shadow: 0 4px 12px rgba(26, 82, 118, 0.5); /* 匹配深蓝色阴影 */
            border: none;
            font-weight: 700;
            position: relative;
            overflow: hidden;
            color: white;
        }

        .print-button::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
            transition: all 0.6s ease;
        }

        .print-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(52, 152, 219, 0.6); /* 增强阴影效果 */
            background: linear-gradient(135deg, #2980b9, #1c638e); /* 悬停时更深的蓝色 */
        }

        .print-button:hover::before {
            left: 100%;
        }

        /* 响应式优化 */
        @media (max-width: 640px) {
            .receipt-container {
                padding: 1.5rem;
                margin: 1rem;
            }

            .watermark {
                font-size: 4rem;
            }
        }

        /* 打印样式 */
        @media print {
            body {
                background-color: white;
                margin: 0;
                padding: 0;
                font-size: 0.85rem; /* 打印时进一步缩小字体 */
            }

            .receipt-container {
                box-shadow: none;
                margin: 0;
                padding: 0.5cm; /* 减小打印页边距 */
                max-width: 100%;
            }

            .no-print {
                display: none !important;
            }

            .watermark {
                opacity: 0.1;
            }

            .page-break {
                page-break-after: always;
            }

            /* 隐藏表单元素，只显示纯文本 */
            input, select, button, .row-actions {
                display: none !important;
            }

            /* 显示输入框的值作为纯文本 */
            .print-text-value {
                display: inline !important;
                font-weight: 600 !important;
                color: #374151 !important;
            }

            /* 移除可编辑字段的边框和背景 */
            .editable-field {
                border: none !important;
                background: none !important;
                box-shadow: none !important;
                padding: 0 !important;
            }

            /* 确保表格内容正确显示 */
            .item-row td {
                padding: 8px 16px !important;
            }

            /* 移除悬停效果 */
            .item-row:hover {
                background: none !important;
            }
        }

        /* PDF生成时的特殊样式 */
        .pdf-generation {
            /* 隐藏所有不需要的元素 */
            button, .no-print, .row-actions {
                display: none !important;
            }

            /* 确保表单元素隐藏 */
            input[type="number"], input[type="date"], select {
                display: none !important;
            }

            /* 显示纯文本值 */
            .print-text-value {
                display: inline !important;
                font-weight: 600 !important;
                color: #374151 !important;
                font-size: inherit !important;
            }

            /* 移除可编辑字段的样式 */
            .editable-field {
                border: none !important;
                background: none !important;
                box-shadow: none !important;
                padding: 0 !important;
            }
        }

        /* 表单样式 */
        .editable-field {
            border: 1px dashed transparent;
            transition: all 0.2s ease;
            padding: 2px 4px;
            border-radius: 4px;
        }

        .editable-field:hover {
            border-color: var(--primary-color);
            background-color: rgba(59, 130, 246, 0.05);
        }

        .editable-field:focus {
            outline: none;
            border-color: var(--primary-color);
            background-color: rgba(59, 130, 246, 0.1);
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
        }

        /* 表格编辑样式 */
        .item-row {
            transition: all 0.2s ease;
            line-height: 1.2; /* 减小行高 */
        }

        /* 减小表格单元格内边距 */
        td, th {
            padding: 0.3rem 0.5rem !important;
        }

        .item-row:hover .row-actions {
            opacity: 1;
        }

        .row-actions {
            opacity: 0;
            transition: opacity 0.2s ease;
        }

        .action-button {
            cursor: pointer;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.75rem;
            transition: all 0.2s ease;
        }

        .action-button:hover {
            background-color: rgba(59, 130, 246, 0.1);
        }

        /* 工具栏样式 */
        .toolbar {
            position: sticky;
            top: 0;
            z-index: 100;
            background-color: var(--card-color);
            backdrop-filter: blur(4px);
            border-bottom: 1px solid var(--border-color);
        }

        /* 日期输入框样式 */
        .date-input {
            border: 1px dashed transparent;
            transition: all 0.2s ease;
            padding: 2px 4px;
            border-radius: 4px;
            background: transparent;
            font-weight: 600;
        }

        .date-input:hover {
            border-color: var(--primary-color);
            background-color: rgba(59, 130, 246, 0.05);
        }

        .date-input:focus {
            outline: none;
            border-color: var(--primary-color);
            background-color: rgba(59, 130, 246, 0.1);
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
        }
    </style>
</head>
<body class="py-8">
    <!-- Toolbar -->
    <div class="toolbar p-2 mb-2 no-print rounded flex justify-end gap-2">
        <button id="add-item-btn" class="bg-gray-400 hover:bg-gray-500 text-white text-sm py-1 px-3 rounded flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Item
        </button>
        <button id="save-template-btn" class="bg-gray-400 hover:bg-gray-500 text-white text-sm py-1 px-3 rounded flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            Save
        </button>
        <button id="load-template-btn" class="bg-gray-400 hover:bg-gray-500 text-white text-sm py-1 px-3 rounded flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Load
        </button>
        <button id="print-pdf-btn" class="bg-gray-400 hover:bg-gray-500 text-white text-sm py-1 px-3 rounded flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
        </button>
    </div>

    <!-- Hidden File Input -->
    <input type="file" id="template-file-input" accept=".json" style="display: none;">

    <div class="max-w-4xl mx-auto px-2 sm:px-4 lg:px-6">
        <div id="receipt" class="receipt-container p-4 sm:p-6 mb-6">
            <!-- Watermark -->
            <div class="watermark">INVOICE</div>

            <!-- Receipt Header -->
            <header class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 relative z-10">
                <div class="mb-6 sm:mb-0">
                    <div class="flex items-center mb-4">
                        <!-- Logo Placeholder -->
                        <div class="w-12 h-12 bg-white rounded-lg flex items-center justify-center mr-3 overflow-hidden p-1 border border-gray-200">
                            <img id="company-logo" src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDIwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTAwIiBmaWxsPSJ3aGl0ZSIvPgo8dGV4dCB4PSIzMCIgeT0iNjUiIGZvbnQtZmFtaWx5PSdjdXJzaXZlLCBzYW5zLXNlcmlmJyBmb250LXNpemU9IjQwcHgiIGZvbnQtd2VpZ2h0PSdib2xkJyBmaWxsPSIjRkY1NTIyIj5Bbm5Sb288L3RleHQ+Cjwvc3ZnPg==" alt="AnnRoo Logo" class="max-w-full max-h-full">
                            <div id="logo-placeholder" class="text-gray-400 hidden">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                        </div>
                        <div>
                            <h1 class="text-xl sm:text-2xl font-bold logo-text" contenteditable="true" class="editable-field" data-placeholder="Company Name" id="company-name">Wendeal Pty Ltd</h1>
                            <p class="text-gray-500" contenteditable="true" class="editable-field" data-placeholder="Company Tagline" id="company-tagline">Premium Quality Products</p>
                        </div>
                    </div>
                    <div class="text-gray-600 text-sm">
                        <p contenteditable="true" class="editable-field" data-placeholder="Company Address" id="company-address">42 Fairland Street, Mount Gravatt East, QLD 4122</p>
                        <p contenteditable="true" class="editable-field" data-placeholder="Company Email" id="company-email">Email: info@annroo.com</p>
                        <p contenteditable="true" class="editable-field" data-placeholder="Company ABN" id="company-abn">ABN: </p>
                    </div>
                </div>

                <div class="text-right z-10">
                    <h2 class="receipt-title text-3xl sm:text-4xl font-bold mb-2">TAX INVOICE</h2>
                    <div class="bg-gray-50 p-4 rounded-lg shadow-sm">
                        <p class="text-gray-600 mb-1">Invoice #: <span contenteditable="true" class="editable-field font-semibold" data-placeholder="Invoice Number" id="receipt-number">Invoice Number</span></p>
                        <p class="text-gray-600 mb-1">Date: <input type="date" class="date-input font-semibold" id="current-date"></p>
                        <p class="text-gray-600">Status:
                            <select id="receipt-status" class="bg-transparent border-none font-semibold text-xs px-2.5 py-0.5 rounded-full focus:outline-none">
                                <option value="PAID" class="bg-green-100 text-green-800">PAID</option>
                                <option value="UNPAID" class="bg-red-100 text-red-800">UNPAID</option>
                            </select>
                        </p>
                    </div>
                </div>
            </header>

            <!-- Customer Information -->
            <section class="mb-6 bg-gray-50 p-4 rounded-lg shadow-sm z-10 relative">
                <h3 class="text-lg font-semibold text-gray-700 border-b border-gray-200 pb-2 mb-4 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" style="color: var(--text-color);" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Bill To:
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <p class="text-gray-800 font-bold text-lg mb-1" contenteditable="true" class="editable-field bill-to-field" data-placeholder="Customer Name" id="customer-name"></p>
                        <p class="text-gray-600" contenteditable="true" class="editable-field bill-to-field" data-placeholder="Customer Address" id="customer-address"></p>
                    </div>
                    <div class="md:text-right">
                        <p class="text-gray-600 flex items-center md:justify-end">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" style="color: var(--text-color);" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span contenteditable="true" class="editable-field bill-to-field" data-placeholder="Customer Email" id="customer-email"></span>
                        </p>
                    </div>
                </div>
            </section>

            <!-- Items/Services List -->
            <section class="z-10 relative mb-6">
                <div class="overflow-hidden rounded-xl shadow-sm">
                    <div class="table-responsive">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead>
                                <tr class="table-header">
                                    <th scope="col" class="px-3 py-2 text-sm font-semibold text-left">Description</th>
                                    <th scope="col" class="px-3 py-2 text-sm font-semibold text-center">Quantity</th>
                                    <th scope="col" class="px-3 py-2 text-sm font-semibold text-right">Total Price (Inc GST)</th>
                                    <th scope="col" class="px-3 py-2 text-sm font-semibold text-right">Unit Price (Ex GST)</th>
                                    <th scope="col" class="px-3 py-2 text-sm font-semibold text-center no-print">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="items-table" class="bg-white divide-y divide-gray-200">
                                <!-- Item/Service Template -->
                                <tr class="table-row item-row" id="item-template" style="display: none;">
                                    <td class="px-3 py-2">
                                        <div contenteditable="true" class="text-gray-800 font-medium editable-field item-name" data-placeholder="Item Name">Item Name</div>
                                        <div contenteditable="true" class="text-gray-500 text-sm editable-field item-description" data-placeholder="Item Description">Item Description</div>
                                    </td>
                                    <td class="px-3 py-2 text-gray-600 text-center">
                                        <input type="number" min="1" value="1" class="w-14 text-center bg-gray-50 border border-gray-200 rounded py-1 item-quantity">
                                    </td>
                                    <td class="px-3 py-2 text-gray-600 text-right">
                                        <div class="flex items-center justify-end">
                                            <span class="mr-1">$</span>
                                            <input type="number" min="0" step="0.01" value="0.00" class="w-20 text-right bg-gray-50 border border-gray-200 rounded py-1 item-total-price">
                                        </div>
                                    </td>
                                    <td class="px-3 py-2 text-gray-800 font-medium text-right item-unit-price">$0.00</td>
                                    <td class="px-3 py-2 text-center no-print">
                                        <div class="row-actions flex justify-center">
                                            <button class="action-button text-red-500 delete-row">
                                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>

                                <!-- 默认商品项目 -->
                                <tr class="table-row item-row">
                                    <td class="px-3 py-2">
                                        <div contenteditable="true" class="text-gray-800 font-medium editable-field item-name" data-placeholder="商品名称">Banneton Proofing Basket</div>
                                        <div contenteditable="true" class="text-gray-500 text-sm editable-field item-description" data-placeholder="商品描述">Premium quality, handcrafted</div>
                                    </td>
                                    <td class="px-3 py-2 text-gray-600 text-center">
                                        <input type="number" min="1" value="7" class="w-14 text-center bg-gray-50 border border-gray-200 rounded py-1 item-quantity">
                                    </td>
                                    <td class="px-3 py-2 text-gray-600 text-right">
                                        <div class="flex items-center justify-end">
                                            <span class="mr-1">$</span>
                                            <input type="number" min="0" step="0.01" value="84.00" class="w-20 text-right bg-gray-50 border border-gray-200 rounded py-1 item-total-price">
                                        </div>
                                    </td>
                                    <td class="px-3 py-2 text-gray-800 font-medium text-right item-unit-price">$10.91</td>
                                    <td class="px-3 py-2 text-center no-print">
                                        <div class="row-actions flex justify-center">
                                            <button class="action-button text-red-500 delete-row">
                                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                <tr class="table-row item-row">
                                    <td class="px-3 py-2">
                                        <div contenteditable="true" class="text-gray-800 font-medium editable-field item-name" data-placeholder="商品名称">Dough Scraper</div>
                                        <div contenteditable="true" class="text-gray-500 text-sm editable-field item-description" data-placeholder="商品描述">Stainless steel with wooden handle</div>
                                    </td>
                                    <td class="px-3 py-2 text-gray-600 text-center">
                                        <input type="number" min="1" value="2" class="w-14 text-center bg-gray-50 border border-gray-200 rounded py-1 item-quantity">
                                    </td>
                                    <td class="px-3 py-2 text-gray-600 text-right">
                                        <div class="flex items-center justify-end">
                                            <span class="mr-1">$</span>
                                            <input type="number" min="0" step="0.01" value="16.00" class="w-20 text-right bg-gray-50 border border-gray-200 rounded py-1 item-total-price">
                                        </div>
                                    </td>
                                    <td class="px-3 py-2 text-gray-800 font-medium text-right item-unit-price">$7.27</td>
                                    <td class="px-3 py-2 text-center no-print">
                                        <div class="row-actions flex justify-center">
                                            <button class="action-button text-red-500 delete-row">
                                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            <!-- Totals Section -->
            <footer class="total-section mt-6 pt-4 z-10 relative">
                <div class="flex justify-end">
                    <div class="w-full max-w-md">
                        <div class="flex justify-between text-gray-600 mb-1 p-1">
                            <p>Subtotal (Ex GST):</p>
                            <p id="subtotal">$90.91</p>
                        </div>
                        <div class="flex justify-between text-gray-600 mb-2 p-1 bg-gray-50 rounded">
                            <p>GST (10%):</p>
                            <p id="tax-amount">$9.09</p>
                        </div>
                        <div class="flex justify-between text-lg font-bold total-amount p-2">
                            <p>Total Paid:</p>
                            <p id="total-amount">$100.00</p>
                        </div>
                    </div>
                </div>

                <!-- Thank You Message -->
                <div class="mt-6 text-center">
                    <p class="font-semibold text-base text-gray-700">Thank you for your business!</p>
                    <div class="mt-2 flex flex-wrap justify-center gap-3 text-xs text-gray-500">
                        <p class="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" style="color: var(--text-color);" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            Payment Method:
                            <select id="payment-method" class="ml-1 bg-transparent border-none font-medium focus:outline-none text-xs">
                                <option value="Cash">Cash</option>
                                <option value="Card">Card</option>
                                <option value="Bank Transfer">Bank Transfer</option>
                                <option value="PayPal">PayPal</option>
                                <option value="Other">Other</option>
                            </select>
                        </p>
                    </div>
                </div>
            </footer>
        </div>

    </div>

    <!-- Logo Upload Dialog -->
    <div id="logo-upload-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden no-print">
        <div class="bg-white rounded-lg p-4 max-w-sm w-full">
            <h3 class="text-base font-bold mb-2">Upload Company Logo</h3>
            <div class="mb-3">
                <input type="file" id="logo-file-input" accept="image/*" class="w-full">
            </div>
            <div class="flex justify-end gap-2">
                <button id="cancel-logo-upload" class="px-3 py-1 bg-gray-200 rounded-lg text-sm">Cancel</button>
                <button id="confirm-logo-upload" class="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm">Confirm</button>
            </div>
        </div>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // 初始化变量
            const receiptContainer = document.getElementById('receipt');
            const itemsTable = document.getElementById('items-table');
            const itemTemplate = document.getElementById('item-template');
            const addItemBtn = document.getElementById('add-item-btn');
            const printButton = document.getElementById('print-button');
            const printPdfBtn = document.getElementById('print-pdf-btn');
            const saveTemplateBtn = document.getElementById('save-template-btn');
            const loadTemplateBtn = document.getElementById('load-template-btn');
            const templateFileInput = document.getElementById('template-file-input');
            const logoPlaceholder = document.getElementById('logo-placeholder');
            const companyLogo = document.getElementById('company-logo');
            const logoUploadModal = document.getElementById('logo-upload-modal');
            const logoFileInput = document.getElementById('logo-file-input');
            const confirmLogoUpload = document.getElementById('confirm-logo-upload');
            const cancelLogoUpload = document.getElementById('cancel-logo-upload');

            // 设置当前日期
            const today = new Date();
            const formattedDate = today.toISOString().split('T')[0];
            const dateElement = document.getElementById('current-date');
            if(dateElement) {
                dateElement.value = formattedDate;
            }

            // 从localStorage加载默认模板
            loadDefaultTemplate();

            // 添加测试功能（仅用于调试）
            window.testSaveLoad = function() {
                console.log('=== Testing Save/Load Functions ===');

                // 测试保存功能
                console.log('Testing saveTemplate...');
                saveTemplate();

                // 测试加载功能
                setTimeout(() => {
                    console.log('Testing loadDefaultTemplate...');
                    loadDefaultTemplate();
                }, 1000);
            };

            // 直接测试加载提供的JSON数据
            window.testLoadJSON = function(jsonString) {
                try {
                    const templateData = JSON.parse(jsonString);
                    console.log('Loading test JSON data:', templateData);
                    loadTemplate(templateData);
                    alert('Test JSON loaded successfully!');
                } catch (error) {
                    console.error('Error parsing test JSON:', error);
                    alert('Invalid JSON format');
                }
            };

            // 设置CSS变量
            document.documentElement.style.setProperty('--primary-color', '#ff5722'); // 更显眼的橙红色
            document.documentElement.style.setProperty('--primary-dark', '#e64a19'); // 更深的橙红色
            document.documentElement.style.setProperty('--secondary-color', '#ffc107'); // 明亮的黄色
            document.documentElement.style.setProperty('--accent-color', '#8e24aa'); // 紫色强调色

            // 添加新商品行
            function addNewItem() {
                const newRow = itemTemplate.cloneNode(true);
                newRow.style.display = '';
                newRow.id = '';

                // 重置输入值
                newRow.querySelector('.item-name').textContent = 'Item Name';
                newRow.querySelector('.item-description').textContent = 'Description';
                newRow.querySelector('.item-quantity').value = '1';
                newRow.querySelector('.item-total-price').value = '0.00';
                newRow.querySelector('.item-unit-price').textContent = '$0.00';

                // 添加事件监听器
                setupItemRowEvents(newRow);

                // 添加到表格
                itemsTable.appendChild(newRow);

                // 更新总计
                updateTotals();
            }

            // 设置商品行事件
            function setupItemRowEvents(row) {
                const quantityInput = row.querySelector('.item-quantity');
                const totalPriceInput = row.querySelector('.item-total-price');
                const deleteBtn = row.querySelector('.delete-row');

                // 数量和总价变化时更新单价和总计
                quantityInput.addEventListener('input', function() {
                    updateItemUnitPrice(row);
                    updateTotals();
                });

                totalPriceInput.addEventListener('input', function() {
                    updateItemUnitPrice(row);
                    updateTotals();
                });

                // Delete row
                deleteBtn.addEventListener('click', function() {
                    if (itemsTable.querySelectorAll('.item-row:not(#item-template)').length > 1) {
                        row.remove();
                        updateTotals();
                    } else {
                        alert('Please keep at least one item');
                    }
                });
            }

            // 更新单个商品的单价（根据数量和总价计算不含GST的单价）
            function updateItemUnitPrice(row) {
                const quantity = parseFloat(row.querySelector('.item-quantity').value) || 1;
                const totalPriceIncGST = parseFloat(row.querySelector('.item-total-price').value) || 0;

                // 计算不含GST的总价
                const totalPriceExGST = totalPriceIncGST / 1.1;

                // 计算不含GST的单价
                const unitPriceExGST = totalPriceExGST / quantity;

                row.querySelector('.item-unit-price').textContent = '$' + unitPriceExGST.toFixed(2);
            }

            // 从localStorage加载默认模板
            function loadDefaultTemplate() {
                const savedTemplate = localStorage.getItem('receiptTemplate');
                if (savedTemplate) {
                    try {
                        const templateData = JSON.parse(savedTemplate);
                        console.log('Loading default template:', templateData);
                        loadTemplate(templateData);
                        console.log('Default template loaded successfully');
                    } catch (error) {
                        console.error('Error loading default template:', error);
                    }
                } else {
                    console.log('No default template found in localStorage');
                }
            }

            // 更新所有总计
            function updateTotals() {
                let totalIncGST = 0;
                const rows = itemsTable.querySelectorAll('.item-row:not(#item-template)');

                rows.forEach(row => {
                    const totalPriceIncGST = parseFloat(row.querySelector('.item-total-price').value) || 0;
                    totalIncGST += totalPriceIncGST;
                });

                // 计算不含GST的小计
                const subtotalExGST = totalIncGST / 1.1;

                // 计算GST金额
                const gstAmount = totalIncGST - subtotalExGST;

                document.getElementById('subtotal').textContent = '$' + subtotalExGST.toFixed(2);
                document.getElementById('tax-amount').textContent = '$' + gstAmount.toFixed(2);
                document.getElementById('total-amount').textContent = '$' + totalIncGST.toFixed(2);
            }

            // 保存模板为JSON
            function saveTemplate() {
                const template = {
                    company: {
                        name: document.getElementById('company-name').textContent,
                        tagline: document.getElementById('company-tagline').textContent,
                        address: document.getElementById('company-address').textContent,
                        email: document.getElementById('company-email').textContent,
                        abn: document.getElementById('company-abn').textContent,
                        logo: companyLogo.src
                    },
                    receipt: {
                        number: document.getElementById('receipt-number').textContent,
                        date: document.getElementById('current-date').value,
                        status: document.getElementById('receipt-status').value
                    },
                    customer: {
                        name: document.getElementById('customer-name').textContent,
                        address: document.getElementById('customer-address').textContent,
                        email: document.getElementById('customer-email').textContent
                    },
                    items: [],
                    payment: {
                        method: document.getElementById('payment-method').value
                    }
                };

                // 获取所有商品项目
                const rows = itemsTable.querySelectorAll('.item-row:not(#item-template)');
                rows.forEach(row => {
                    template.items.push({
                        name: row.querySelector('.item-name').textContent,
                        description: row.querySelector('.item-description').textContent,
                        quantity: row.querySelector('.item-quantity').value,
                        totalPrice: row.querySelector('.item-total-price').value
                    });
                });

                // 保存到localStorage作为默认值
                console.log('Saving template:', template);
                localStorage.setItem('receiptTemplate', JSON.stringify(template));
                console.log('Template saved to localStorage');
                alert('Template saved as default!');

                // 创建下载链接
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(template));
                const downloadAnchorNode = document.createElement('a');
                downloadAnchorNode.setAttribute("href", dataStr);
                downloadAnchorNode.setAttribute("download", "receipt_template.json");
                document.body.appendChild(downloadAnchorNode);
                downloadAnchorNode.click();
                downloadAnchorNode.remove();
            }

            // 加载模板
            function loadTemplate(templateData) {
                console.log('Loading template data:', templateData);
                // 设置公司信息
                document.getElementById('company-name').textContent = templateData.company.name;
                document.getElementById('company-tagline').textContent = templateData.company.tagline;
                document.getElementById('company-address').textContent = templateData.company.address;
                document.getElementById('company-email').textContent = templateData.company.email;
                if (templateData.company.abn) {
                    document.getElementById('company-abn').textContent = templateData.company.abn;
                }

                // 设置Logo
                if (templateData.company.logo && templateData.company.logo !== '') {
                    companyLogo.src = templateData.company.logo;
                    companyLogo.classList.remove('hidden');
                    logoPlaceholder.classList.add('hidden');
                }

                // 设置收据信息
                document.getElementById('receipt-number').textContent = templateData.receipt.number;
                document.getElementById('current-date').value = templateData.receipt.date;
                document.getElementById('receipt-status').value = templateData.receipt.status;

                // 设置客户信息
                document.getElementById('customer-name').textContent = templateData.customer.name;
                document.getElementById('customer-address').textContent = templateData.customer.address;
                document.getElementById('customer-email').textContent = templateData.customer.email;

                // 清除现有商品项目
                const existingRows = itemsTable.querySelectorAll('.item-row:not(#item-template)');
                existingRows.forEach(row => row.remove());

                // 添加商品项目
                console.log('Loading items:', templateData.items);
                templateData.items.forEach(function(item, index) {
                    console.log('Loading item ' + (index + 1) + ':', item);
                    const newRow = itemTemplate.cloneNode(true);
                    newRow.style.display = '';
                    newRow.id = '';

                    newRow.querySelector('.item-name').textContent = item.name;
                    newRow.querySelector('.item-description').textContent = item.description;
                    newRow.querySelector('.item-quantity').value = item.quantity;
                    newRow.querySelector('.item-total-price').value = item.totalPrice;

                    setupItemRowEvents(newRow);
                    itemsTable.appendChild(newRow);
                    updateItemUnitPrice(newRow);
                });
                console.log('Items loaded successfully');

                // 设置付款方式
                document.getElementById('payment-method').value = templateData.payment.method;

                // 更新总计
                updateTotals();
                console.log('Template loaded completely');
            }

            // 打印或保存为PDF
            function printReceipt() {
                // 在打印前添加一个提示
                const printStatus = document.createElement('div');
                printStatus.style.position = 'fixed';
                printStatus.style.top = '20px';
                printStatus.style.left = '50%';
                printStatus.style.transform = 'translateX(-50%)';
                printStatus.style.padding = '10px 20px';
                printStatus.style.background = 'rgba(0, 0, 0, 0.7)';
                printStatus.style.color = 'white';
                printStatus.style.borderRadius = '5px';
                printStatus.style.zIndex = '9999';
                printStatus.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
                printStatus.style.fontSize = '14px';
                printStatus.className = 'no-print';
                printStatus.textContent = 'Preparing to print...';
                document.body.appendChild(printStatus);

                // 在打印前将表单元素转换为纯文本
                prepareForPrinting();

                // 延迟执行打印，给浏览器时间渲染提示
                setTimeout(() => {
                    window.print();
                    // 打印对话框关闭后移除提示并恢复表单元素
                    setTimeout(() => {
                        document.body.removeChild(printStatus);
                        restoreAfterPrinting();
                    }, 1000);
                }, 300);
            }

            // 准备打印：将表单元素转换为纯文本
            function prepareForPrinting() {
                // 处理所有数字输入框
                document.querySelectorAll('input[type="number"]').forEach(input => {
                    const textSpan = document.createElement('span');
                    textSpan.className = 'print-text-value';
                    textSpan.textContent = input.value;
                    textSpan.dataset.forInput = true;
                    textSpan.style.display = 'inline';
                    textSpan.style.fontWeight = '600';
                    textSpan.style.color = '#374151';
                    input.style.display = 'none';
                    input.parentNode.insertBefore(textSpan, input.nextSibling);
                });

                // 处理日期输入框
                document.querySelectorAll('input[type="date"]').forEach(input => {
                    const textSpan = document.createElement('span');
                    textSpan.className = 'print-text-value';
                    textSpan.textContent = input.value;
                    textSpan.dataset.forDate = true;
                    textSpan.style.display = 'inline';
                    textSpan.style.fontWeight = '600';
                    textSpan.style.color = '#374151';
                    input.style.display = 'none';
                    input.parentNode.insertBefore(textSpan, input.nextSibling);
                });

                // 处理所有下拉框
                document.querySelectorAll('select').forEach(select => {
                    const textSpan = document.createElement('span');
                    textSpan.className = 'print-text-value';
                    textSpan.textContent = select.options[select.selectedIndex].text;
                    textSpan.dataset.forSelect = true;
                    textSpan.style.display = 'inline';
                    textSpan.style.fontWeight = '600';
                    textSpan.style.color = '#374151';
                    select.style.display = 'none';
                    select.parentNode.insertBefore(textSpan, select.nextSibling);
                });

                // 隐藏所有按钮和不需要打印的元素
                document.querySelectorAll('button, .no-print').forEach(element => {
                    element.style.display = 'none';
                });
            }

            // 打印后恢复表单元素
            function restoreAfterPrinting() {
                // 移除为打印创建的纯文本元素
                document.querySelectorAll('.print-text-value').forEach(span => {
                    span.parentNode.removeChild(span);
                });

                // 恢复所有表单元素的显示
                document.querySelectorAll('input[type="number"], input[type="date"], select').forEach(element => {
                    element.style.display = '';
                });

                // 恢复按钮和不需要打印的元素
                document.querySelectorAll('button, .no-print').forEach(element => {
                    element.style.display = '';
                });

                // 移除PDF生成类
                receiptContainer.classList.remove('pdf-generation');
            }

            // 使用html2canvas和jsPDF生成PDF
            function generatePDF() {
                // 显示加载状态
                const loadingStatus = document.createElement('div');
                loadingStatus.style.position = 'fixed';
                loadingStatus.style.top = '0';
                loadingStatus.style.left = '0';
                loadingStatus.style.width = '100%';
                loadingStatus.style.height = '100%';
                loadingStatus.style.background = 'rgba(0, 0, 0, 0.5)';
                loadingStatus.style.display = 'flex';
                loadingStatus.style.alignItems = 'center';
                loadingStatus.style.justifyContent = 'center';
                loadingStatus.style.zIndex = '9999';
                loadingStatus.className = 'no-print';

                const statusText = document.createElement('div');
                statusText.style.background = 'white';
                statusText.style.padding = '20px 30px';
                statusText.style.borderRadius = '8px';
                statusText.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.2)';
                statusText.style.fontSize = '16px';
                statusText.style.fontWeight = '500';
                statusText.style.color = '#333';
                statusText.innerHTML = '<div style="display: flex; align-items: center;"><div style="border: 3px solid #f3f3f3; border-top: 3px solid var(--primary-color); border-radius: 50%; width: 24px; height: 24px; margin-right: 12px; animation: spin 1s linear infinite;"></div>Generating PDF, please wait...</div>';

                // 添加旋转动画
                const style = document.createElement('style');
                style.textContent = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
                document.head.appendChild(style);

                loadingStatus.appendChild(statusText);
                document.body.appendChild(loadingStatus);

                // 在生成PDF前将表单元素转换为纯文本
                prepareForPrinting();

                // 添加PDF生成类
                receiptContainer.classList.add('pdf-generation');

                try {
                    const { jsPDF } = window.jspdf;

                    if (!jsPDF) {
                        throw new Error('jsPDF library not loaded correctly');
                    }

                    // 创建一个新的PDF文档
                    const doc = new jsPDF({
                        orientation: 'portrait',
                        unit: 'mm',
                        format: 'a4'
                    });

                    // 使用html2canvas捕获收据内容
                    html2canvas(receiptContainer, {
                        scale: 3, // 提高缩放比例以获得更好的质量
                        useCORS: true,
                        logging: false,
                        allowTaint: true,
                        backgroundColor: '#ffffff',
                        width: receiptContainer.offsetWidth,
                        height: receiptContainer.offsetHeight,
                        scrollX: 0,
                        scrollY: 0,
                        windowWidth: receiptContainer.scrollWidth,
                        windowHeight: receiptContainer.scrollHeight,
                        foreignObjectRendering: false, // 避免某些浏览器的问题
                        removeContainer: false,
                        letterRendering: true, // 改善文字渲染
                        imageTimeout: 15000 // 增加图片加载超时时间
                    }).then(canvas => {
                        try {
                            // 将canvas转换为图像
                            const imgData = canvas.toDataURL('image/jpeg', 1.0);

                            // 获取canvas的宽度和高度
                            const imgWidth = 210; // A4宽度 (mm)
                            const pageHeight = 297; // A4高度 (mm)
                            const imgHeight = canvas.height * imgWidth / canvas.width;
                            let heightLeft = imgHeight;
                            let position = 0;

                            // 添加图像到PDF
                            doc.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
                            heightLeft -= pageHeight;

                            // 如果内容超过一页，添加新页面
                            while (heightLeft >= 0) {
                                position = heightLeft - imgHeight;
                                doc.addPage();
                                doc.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
                                heightLeft -= pageHeight;
                            }

                            // 保存PDF
                            doc.save('receipt.pdf');

                            // 移除加载状态
                            document.body.removeChild(loadingStatus);
                            document.head.removeChild(style);

                            // 恢复表单元素
                            restoreAfterPrinting();
                        } catch (error) {
                            console.error('Error generating PDF:', error);
                            statusText.innerHTML = '<div style="color: #e53e3e;">Error generating PDF: ' + error.message + '</div>';

                            // 恢复表单元素
                            restoreAfterPrinting();

                            // 3秒后移除错误提示
                            setTimeout(() => {
                                document.body.removeChild(loadingStatus);
                                document.head.removeChild(style);
                            }, 3000);
                        }
                    }).catch(error => {
                        console.error('Error capturing receipt content:', error);
                        statusText.innerHTML = '<div style="color: #e53e3e;">Error capturing receipt content: ' + error.message + '</div>';

                        // 恢复表单元素
                        restoreAfterPrinting();

                        // 3秒后移除错误提示
                        setTimeout(() => {
                            document.body.removeChild(loadingStatus);
                            document.head.removeChild(style);
                        }, 3000);
                    });
                } catch (error) {
                    console.error('Error initializing PDF generation:', error);
                    statusText.innerHTML = '<div style="color: #e53e3e;">Error initializing PDF generation: ' + error.message + '</div>';

                    // Restore form elements
                    restoreAfterPrinting();

                    // Remove error message after 3 seconds
                    setTimeout(() => {
                        document.body.removeChild(loadingStatus);
                        if (style.parentNode) {
                            document.head.removeChild(style);
                        }
                    }, 3000);
                }
            }

            // Setup Logo Upload
            function setupLogoUpload() {
                // 确保logo默认显示
                if (companyLogo.src) {
                    companyLogo.classList.remove('hidden');
                    logoPlaceholder.classList.add('hidden');
                }

                logoPlaceholder.addEventListener('click', function() {
                    logoUploadModal.classList.remove('hidden');
                });

                companyLogo.addEventListener('click', function() {
                    logoUploadModal.classList.remove('hidden');
                });

                cancelLogoUpload.addEventListener('click', function() {
                    logoUploadModal.classList.add('hidden');
                });

                confirmLogoUpload.addEventListener('click', function() {
                    const file = logoFileInput.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = function(e) {
                            companyLogo.src = e.target.result;
                            companyLogo.classList.remove('hidden');
                            logoPlaceholder.classList.add('hidden');
                        };
                        reader.readAsDataURL(file);
                    }
                    logoUploadModal.classList.add('hidden');
                });
            }

            // Initialize existing item rows
            const existingRows = itemsTable.querySelectorAll('.item-row:not(#item-template)');
            existingRows.forEach(row => {
                setupItemRowEvents(row);
            });

            // Add event listeners
            addItemBtn.addEventListener('click', addNewItem);
            printButton.addEventListener('click', printReceipt);
            printPdfBtn.addEventListener('click', generatePDF);
            saveTemplateBtn.addEventListener('click', saveTemplate);

            loadTemplateBtn.addEventListener('click', function() {
                templateFileInput.click();
            });

            templateFileInput.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file) {
                    // 检查文件类型
                    if (!file.name.toLowerCase().endsWith('.json')) {
                        alert('Please select a JSON file');
                        templateFileInput.value = '';
                        return;
                    }

                    const reader = new FileReader();
                    reader.onload = function(e) {
                        try {
                            const templateData = JSON.parse(e.target.result);
                            loadTemplate(templateData);
                            alert('Template loaded successfully!');
                        } catch (error) {
                            alert('Invalid template file format');
                            console.error('Load template error:', error);
                        }
                    };
                    reader.onerror = function() {
                        alert('Error reading file');
                    };
                    reader.readAsText(file);
                }
                // 重置文件输入，以便可以重复选择同一个文件
                templateFileInput.value = '';
            });

            // Setup Logo Upload
            setupLogoUpload();

            // Initialize calculations
            updateTotals();

            // Setup receipt status styles
            const receiptStatus = document.getElementById('receipt-status');
            receiptStatus.addEventListener('change', function() {
                const statusValue = this.value;
                this.className = 'bg-transparent border-none font-semibold text-xs px-2.5 py-0.5 rounded-full focus:outline-none';

                // Set styles based on status
                switch(statusValue) {
                    case 'PAID':
                        this.classList.add('bg-green-100', 'text-green-800');
                        break;
                    case 'UNPAID':
                        this.classList.add('bg-red-100', 'text-red-800');
                        break;
                }
            });

            // Trigger status change once to set initial style
            receiptStatus.dispatchEvent(new Event('change'));
        });
    </script>
</body>
</html>`;

  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      <div style={{ height: '100%', minHeight: '900px' }}>
        <iframe
          srcDoc={receiptHtmlContent}
          style={{
            width: '100%',
            height: '100%',
            minHeight: '900px',
            border: 'none',
            borderRadius: '8px',
          }}
          title='Tax Invoice/Receipt Template'
        />
      </div>
    </div>
  );
};

export default TaxInvoiceReceipt;
