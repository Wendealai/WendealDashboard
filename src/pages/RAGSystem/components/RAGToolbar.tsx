import React, { useState } from 'react';
import { Button, Space, Upload, Modal, List, Typography } from 'antd';
import {
  UploadOutlined,
  FolderOpenOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useMessage } from '@/hooks/useMessage';
import type { UploadProps } from 'antd';
import { ragApiService } from '../../../services/ragApi';

/**
 * RAG系统工具栏组件
 * 包含文件上传和知识库查看功能
 */
const RAGToolbar: React.FC = () => {
  const { t } = useTranslation();
  const message = useMessage();
  const [uploading, setUploading] = useState(false);
  const [knowledgeBaseFiles, setKnowledgeBaseFiles] = useState<any[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  /**
   * 处理文件上传
   */
  const handleUpload: UploadProps['customRequest'] = async options => {
    const { file, onSuccess, onError } = options;

    try {
      setUploading(true);

      // 调用RAG API服务上传文件
      const response = await ragApiService.uploadFile(file as File);

      if (response.success) {
        message.success(
          response.message ||
            t('ragSystem.upload.success', { fileName: (file as File).name })
        );
        console.log(
          'File uploaded successfully:',
          response.fileName,
          'ID:',
          response.fileId
        );
        onSuccess?.(file);
      } else {
        message.error(response.error || t('ragSystem.upload.error'));
        onError?.(new Error(response.error || 'Upload failed'));
      }
    } catch (error) {
      console.error('Upload failed:', error);
      message.error(t('ragSystem.upload.error'));
      onError?.(error as Error);
    } finally {
      setUploading(false);
    }
  };

  /**
   * 检查文件类型
   */
  const beforeUpload = (file: File) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
    ];

    const isAllowedType = allowedTypes.includes(file.type);
    if (!isAllowedType) {
      message.error(t('ragSystem.upload.invalidType'));
      return false;
    }

    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error(t('ragSystem.upload.sizeLimit'));
      return false;
    }

    return true;
  };

  /**
   * 查看知识库
   */
  const handleOpenKnowledgeBase = async () => {
    setLoadingFiles(true);

    try {
      // 获取知识库文件列表
      const response = await ragApiService.getKnowledgeBaseFiles();

      if (response.success && response.files) {
        setKnowledgeBaseFiles(response.files);
      } else {
        message.error(response.error || '获取文件列表失败');
        setKnowledgeBaseFiles([]);
      }
    } catch (error) {
      console.error('Failed to load knowledge base files:', error);
      message.error('获取文件列表失败');
      setKnowledgeBaseFiles([]);
    } finally {
      setLoadingFiles(false);
    }

    Modal.info({
      title: t('ragSystem.knowledgeBase.title'),
      content: (
        <div>
          {loadingFiles ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <FolderOpenOutlined
                style={{
                  fontSize: '48px',
                  color: '#1890ff',
                  marginBottom: '16px',
                }}
              />
              <p>正在加载文件列表...</p>
            </div>
          ) : knowledgeBaseFiles.length > 0 ? (
            <List
              dataSource={knowledgeBaseFiles}
              renderItem={file => (
                <List.Item
                  actions={[
                    <Button
                      key='delete'
                      type='text'
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleDeleteFile(file.id, file.name)}
                    >
                      删除
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    title={file.name}
                    description={
                      <div>
                        <Typography.Text type='secondary'>
                          大小: {(file.size / 1024 / 1024).toFixed(2)} MB
                        </Typography.Text>
                        <br />
                        <Typography.Text type='secondary'>
                          上传时间: {file.uploadDate}
                        </Typography.Text>
                        <br />
                        <Typography.Text type='secondary'>
                          类型: {file.type.toUpperCase()}
                        </Typography.Text>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <FolderOpenOutlined
                style={{
                  fontSize: '48px',
                  color: '#1890ff',
                  marginBottom: '16px',
                }}
              />
              <p>知识库中暂无文件</p>
              <p style={{ color: '#666', fontSize: '14px' }}>
                请先上传文档到知识库
              </p>
            </div>
          )}
        </div>
      ),
      width: 800,
    });
  };

  /**
   * 删除知识库文件
   */
  const handleDeleteFile = async (fileId: string, fileName: string) => {
    try {
      const response = await ragApiService.deleteFile(fileId);

      if (response.success) {
        message.success(`文件 "${fileName}" 删除成功`);
        // 重新加载文件列表
        handleOpenKnowledgeBase();
      } else {
        message.error(response.error || '删除文件失败');
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
      message.error('删除文件失败');
    }
  };

  return (
    <div className='rag-toolbar'>
      <Space size='small'>
        {' '}
        {/* 使用更小的间距 */}
        <div className='toolbar-section'>
          <span className='section-title'>
            {t('ragSystem.toolbar.fileManagement')}
          </span>
          <Space size='small'>
            {' '}
            {/* 使用更小的间距 */}
            <Upload
              customRequest={handleUpload}
              beforeUpload={beforeUpload}
              showUploadList={false}
              multiple
            >
              <Button
                icon={<UploadOutlined />}
                loading={uploading}
                type='primary'
                size='small' /* 使用小尺寸按钮 */
              >
                {uploading
                  ? t('ragSystem.toolbar.uploading')
                  : t('ragSystem.toolbar.uploadFile')}
              </Button>
            </Upload>
            <Button
              icon={<FolderOpenOutlined />}
              onClick={handleOpenKnowledgeBase}
              size='small' /* 使用小尺寸按钮 */
            >
              {t('ragSystem.toolbar.viewKnowledgeBase')}
            </Button>
          </Space>
        </div>
      </Space>
    </div>
  );
};

export default RAGToolbar;
