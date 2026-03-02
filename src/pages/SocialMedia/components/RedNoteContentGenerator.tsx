/**
 * RedNote Content Generator Component
 * 小红书文案生成器组件 - 3步骤版本
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Card,
  Input,
  Button,
  Space,
  Typography,
  Tag,
  Alert,
  Spin,
  Divider,
  Row,
  Col,
  message as antdMessage,
  Progress,
  Statistic,
  Tabs,
  Select,
  type TabsProps,
} from 'antd';
import {
  EditOutlined,
  SendOutlined,
  CopyOutlined,
  LinkOutlined,
  ReloadOutlined,
  FileTextOutlined,
  FileImageOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import type { RedNoteContentResponse, RedNoteWebhookResponse } from '../types';
import './RedNoteContentGenerator.css';

const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;

/**
 * 小红书文案生成器组件属性接口
 */
interface RedNoteContentGeneratorProps {
  onContentGenerated?: (response: RedNoteContentResponse) => void;
  className?: string;
}

/**
 * 标题生成响应接口
 */
interface TitleGenerationResponse {
  title?: string;
  alternativeTitles?: string[];
  content?: string;
  suggestions?: string[];
  [key: string]: any;
}

/**
 * 内容生成响应接口
 */
interface ContentGenerationResponse {
  发布内容?: {
    标题: string;
    正文: string;
    完整发布文本: string;
    标签数组: string[];
  };
  统计数据?: {
    标题字数: number;
    正文字数: number;
    图片卡片数量: number;
  };
  审核状态?: {
    风险评估: string;
    是否通过审核: boolean;
    违规词修改记录: string[];
  };
  fullReport?: string;
  [key: string]: any;
}

/**
 * 图片生成响应接口
 */
interface ImageGenerationResponse {
  imageUrl?: string;
  status?: string;
  duration?: number;
  [key: string]: any;
}

/**
 * 小红书文案生成器组件 - 3步骤版本
 */
const RedNoteContentGenerator: React.FC<RedNoteContentGeneratorProps> = ({
  onContentGenerated,
  className,
}) => {
  // Step 1: 标题生成相关状态
  const [titleInput, setTitleInput] = useState<string>('');
  const [titleLoading, setTitleLoading] = useState<boolean>(false);
  const [titleProgress, setTitleProgress] = useState<number>(0);
  const [titleProgressText, setTitleProgressText] = useState<string>('');
  const [titleResponse, setTitleResponse] =
    useState<TitleGenerationResponse | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);

  // Step 2: 内容生成相关状态
  const [contentInput, setContentInput] = useState<string>('');
  const [contentLoading, setContentLoading] = useState<boolean>(false);
  const [contentProgress, setContentProgress] = useState<number>(0);
  const [contentProgressText, setContentProgressText] = useState<string>('');
  const [contentResponse, setContentResponse] =
    useState<ContentGenerationResponse | null>(null);
  const [contentError, setContentError] = useState<string | null>(null);

  // Step 3: 图片生成相关状态
  const [imagePromptInput, setImagePromptInput] = useState<string>('');
  const [imageGenerationLoading, setImageGenerationLoading] =
    useState<boolean>(false);
  const [imageGenerationProgress, setImageGenerationProgress] =
    useState<number>(0);
  const [imageGenerationProgressText, setImageGenerationProgressText] =
    useState<string>('');

  // Step 3: 封面图生成相关状态
  const [coverImageInput, setCoverImageInput] = useState<string>('');
  const [coverImageGenerationLoading, setCoverImageGenerationLoading] =
    useState<boolean>(false);
  const [coverImageGenerationProgress, setCoverImageGenerationProgress] =
    useState<number>(0);
  const [
    coverImageGenerationProgressText,
    setCoverImageGenerationProgressText,
  ] = useState<string>('');

  const [imageResponse, setImageResponse] =
    useState<ImageGenerationResponse | null>(null);
  const [coverImageResponse, setCoverImageResponse] = useState<any[] | null>(
    null
  );
  const [imageGenerationError, setImageGenerationError] = useState<
    string | null
  >(null);
  const [coverImageGenerationError, setCoverImageGenerationError] = useState<
    string | null
  >(null);

  // Seeddance 4.0 相关状态
  const [seeddanceActiveTab, setSeeddanceActiveTab] = useState<string>(
    'text-to-image-single'
  );

  // 图片分辨率选择
  const [imageSize, setImageSize] = useState<string>('2048x2048');

  // 文生图-生成单张图
  const [textToImageSingleInput, setTextToImageSingleInput] =
    useState<string>('');
  const [textToImageSingleLoading, setTextToImageSingleLoading] =
    useState<boolean>(false);
  const [textToImageSingleResponse, setTextToImageSingleResponse] =
    useState<any>(null);
  const [textToImageSingleError, setTextToImageSingleError] = useState<
    string | null
  >(null);

  // 文生图-生成组图
  const [textToImageGroupInput, setTextToImageGroupInput] =
    useState<string>('');
  const [textToImageGroupLoading, setTextToImageGroupLoading] =
    useState<boolean>(false);
  const [textToImageGroupResponse, setTextToImageGroupResponse] =
    useState<any>(null);
  const [textToImageGroupError, setTextToImageGroupError] = useState<
    string | null
  >(null);

  // 图生图-单张图生成单张图
  const [imageToImageSingleInput, setImageToImageSingleInput] =
    useState<string>('');
  const [imageToImageSingleImageUrl, setImageToImageSingleImageUrl] =
    useState<string>('');
  const [imageToImageSingleLoading, setImageToImageSingleLoading] =
    useState<boolean>(false);
  const [imageToImageSingleResponse, setImageToImageSingleResponse] =
    useState<any>(null);
  const [imageToImageSingleError, setImageToImageSingleError] = useState<
    string | null
  >(null);

  // 图生图-单张图生成组图
  const [imageToImageGroupInput, setImageToImageGroupInput] =
    useState<string>('');
  const [imageToImageGroupImageUrl, setImageToImageGroupImageUrl] =
    useState<string>('');
  const [imageToImageGroupLoading, setImageToImageGroupLoading] =
    useState<boolean>(false);
  const [imageToImageGroupResponse, setImageToImageGroupResponse] =
    useState<any>(null);
  const [imageToImageGroupError, setImageToImageGroupError] = useState<
    string | null
  >(null);

  // 图生图-多张参考图生成单张图
  const [multiImageToImageSingleInput, setMultiImageToImageSingleInput] =
    useState<string>('');
  const [
    multiImageToImageSingleImageUrls,
    setMultiImageToImageSingleImageUrls,
  ] = useState<string[]>(['', '']);
  const [multiImageToImageSingleLoading, setMultiImageToImageSingleLoading] =
    useState<boolean>(false);
  const [multiImageToImageSingleResponse, setMultiImageToImageSingleResponse] =
    useState<any>(null);
  const [multiImageToImageSingleError, setMultiImageToImageSingleError] =
    useState<string | null>(null);

  // 图生图-多张参考图生成组图
  const [multiImageToImageGroupInput, setMultiImageToImageGroupInput] =
    useState<string>('');
  const [multiImageToImageGroupImageUrls, setMultiImageToImageGroupImageUrls] =
    useState<string[]>(['', '']);
  const [multiImageToImageGroupLoading, setMultiImageToImageGroupLoading] =
    useState<boolean>(false);
  const [multiImageToImageGroupResponse, setMultiImageToImageGroupResponse] =
    useState<any>(null);
  const [multiImageToImageGroupError, setMultiImageToImageGroupError] =
    useState<string | null>(null);

  // 使用 ref 存储当前任务信息，防止被覆盖
  const currentTaskRef = useRef<{
    taskId: string | null;
    statusUrl: string | null;
    intervalId: number | null;
  }>({
    taskId: null,
    statusUrl: null,
    intervalId: null,
  });

  // 数据持久化相关的常量和工具函数
  const STORAGE_KEYS = {
    TITLE_RESPONSE: 'rednote_title_response',
    CONTENT_RESPONSE: 'rednote_content_response',
    IMAGE_RESPONSE: 'rednote_image_response',
    COVER_IMAGE_RESPONSE: 'rednote_cover_image_response',
  };

  const saveToStorage = (key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      console.log(
        '💾 Saved to localStorage:',
        key,
        data ? 'data present' : 'empty data'
      );
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  };

  const loadFromStorage = (key: string) => {
    try {
      const data = localStorage.getItem(key);
      const parsed = data ? JSON.parse(data) : null;
      console.log(
        '📂 Loaded from localStorage:',
        key,
        parsed ? 'data found' : 'no data'
      );
      return parsed;
    } catch (error) {
      console.warn('Failed to load from localStorage:', error);
      return null;
    }
  };

  // 在组件初始化时从localStorage恢复数据
  useEffect(() => {
    console.log('🔄 Initializing component and loading saved data...');

    const savedTitleResponse = loadFromStorage(STORAGE_KEYS.TITLE_RESPONSE);
    const savedContentResponse = loadFromStorage(STORAGE_KEYS.CONTENT_RESPONSE);
    const savedImageResponse = loadFromStorage(STORAGE_KEYS.IMAGE_RESPONSE);
    const savedCoverImageResponse = loadFromStorage(
      STORAGE_KEYS.COVER_IMAGE_RESPONSE
    );

    if (savedTitleResponse) {
      setTitleResponse(savedTitleResponse);
      console.log('🔄 Restored title response from localStorage');
    }

    if (savedContentResponse) {
      setContentResponse(savedContentResponse);
      console.log('🔄 Restored content response from localStorage');
    }

    if (savedImageResponse) {
      setImageResponse(savedImageResponse);
      console.log('🔄 Restored image response from localStorage');
    }

    if (savedCoverImageResponse) {
      setCoverImageResponse(savedCoverImageResponse);
      console.log('🔄 Restored cover image response from localStorage');
    }
  }, []);

  /**
   * Step 1: 生成爆款标题（异步模式）
   */
  const handleGenerateTitle = useCallback(async () => {
    if (!titleInput.trim()) {
      antdMessage.warning('Please enter title input');
      return;
    }

    // 防止重复提交
    if (titleLoading) {
      console.warn(
        '⚠️ Title generation is already running, ignoring duplicate request'
      );
      antdMessage.warning(
        'Title generation is already in progress. Please wait...'
      );
      return;
    }

    setTitleLoading(true);
    setTitleError(null);
    setTitleProgress(10);
    setTitleProgressText('Creating title task...');

    try {
      const webhookUrl = 'https://n8n.wendealai.com/webhook/rednotesubject';

      console.log('📤 Submitting title generation task...');

      // 步骤1: 提交任务，获取任务ID
      const submitResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: titleInput.trim(),
          timestamp: new Date().toISOString(),
        }),
        mode: 'cors',
      });

      if (!submitResponse.ok) {
        throw new Error(
          `Failed to submit title task: ${submitResponse.status}`
        );
      }

      let submitData = await submitResponse.json();

      console.log('📥 Raw response data:', submitData);

      // 处理数组响应
      if (Array.isArray(submitData) && submitData.length > 0) {
        console.log('⚠️ Response is an array, extracting first item');
        submitData = submitData[0];
      }

      console.log('✅ Parsed submit data:', submitData);

      // 检查是否返回了任务ID（异步模式）
      const resolvedTaskId =
        submitData.taskId || submitData.taskid || submitData.id;
      const resolvedStatus = submitData.status;

      console.log('🔍 Extracted taskId:', resolvedTaskId);
      console.log('🔍 Status:', resolvedStatus);

      // 检查是否需要使用轮询模式
      if (
        resolvedTaskId &&
        (resolvedStatus === 'pending' || resolvedStatus === 'processing')
      ) {
        const taskId = resolvedTaskId;

        console.log('✅ Title task created:', taskId);

        // 步骤2: 构建状态查询 URL
        const statusUrl = `https://n8n.wendealai.com/webhook/process-subject-task/task-status/${taskId}`;

        console.log('🔍 Constructed statusUrl:', statusUrl);

        // 存储到 ref 中
        currentTaskRef.current = {
          taskId: taskId,
          statusUrl: statusUrl,
          intervalId: null,
        };
        console.log('💾 Saved to ref:', currentTaskRef.current);

        setTitleProgress(20);
        setTitleProgressText(
          `Task created (ID: ${taskId.slice(-8)}). Processing in background...`
        );

        const initialDelay = 270000; // 4.5 分钟
        const pollInterval = 15000; // 15 秒
        const maxAttempts = 80; // 20 分钟
        let attempts = 0;

        console.log(
          `⏰ Waiting ${initialDelay / 1000}s before first status check...`
        );
        setTitleProgress(25);
        setTitleProgressText(
          `Task submitted. Waiting 4.5 minutes for title generation...`
        );

        // 等待初始延迟
        await new Promise(resolve => setTimeout(resolve, initialDelay));
        console.log('✅ Initial delay complete, starting status checks...');

        setTitleProgress(30);
        setTitleProgressText('Starting status checks...');

        const checkStatus = async (): Promise<void> => {
          return new Promise((resolve, reject) => {
            const intervalId = setInterval(async () => {
              attempts++;
              console.log(`\n${'='.repeat(60)}`);
              console.log(
                `⏰ Interval fired! Attempt ${attempts}/${maxAttempts}`
              );
              console.log(`${'='.repeat(60)}\n`);

              const progress = Math.min(30 + (attempts / maxAttempts) * 65, 95);
              setTitleProgress(progress);

              const totalElapsedSeconds =
                initialDelay / 1000 + attempts * (pollInterval / 1000);
              const elapsedMinutes = Math.floor(totalElapsedSeconds / 60);
              const remainingSeconds = Math.floor(totalElapsedSeconds % 60);

              setTitleProgressText(
                `Processing title... (${elapsedMinutes}m ${remainingSeconds}s elapsed) - Check ${attempts}/${maxAttempts}`
              );

              try {
                const currentTaskId = currentTaskRef.current.taskId;
                const currentStatusUrl = currentTaskRef.current.statusUrl;

                console.log(`🔄 Polling attempt ${attempts}/${maxAttempts}...`);
                console.log(`🔍 Polling URL: ${currentStatusUrl}`);
                console.log(`🔍 TaskId: ${currentTaskId}`);

                if (!currentStatusUrl || !currentTaskId) {
                  console.error('❌ Task info missing from ref!');
                  throw new Error('Task information lost. Please try again.');
                }

                const statusResponse = await fetch(currentStatusUrl, {
                  method: 'GET',
                  mode: 'cors',
                });

                console.log(
                  '📊 Status response status:',
                  statusResponse.status
                );
                console.log('📊 Status response ok:', statusResponse.ok);

                if (!statusResponse.ok) {
                  console.error(
                    '❌ Status check failed with status:',
                    statusResponse.status
                  );
                  if (statusResponse.status === 404) {
                    console.warn('Task not found, will retry...');
                    return;
                  }
                  throw new Error(
                    `Status check failed: ${statusResponse.status}`
                  );
                }

                // 检查响应是否为空
                const responseText = await statusResponse.text();
                console.log('🔍 Raw response text:', responseText);

                if (!responseText || responseText.trim() === '') {
                  console.warn('⚠️ Empty response received, will retry...');
                  return;
                }

                let statusData;
                try {
                  statusData = JSON.parse(responseText);
                  console.log(
                    '✅ Successfully parsed status data:',
                    statusData
                  );
                } catch (parseError) {
                  console.error(
                    '❌ Failed to parse response as JSON:',
                    parseError
                  );
                  console.error('Raw response:', responseText);
                  console.warn('⚠️ JSON parse failed, will retry...');
                  return;
                }
                console.log('📊 Task status:', statusData);

                if (statusData.status === 'completed') {
                  // ✅ 任务完成
                  clearInterval(intervalId);
                  setTitleProgress(100);
                  setTitleProgressText('Title generation complete!');

                  console.log('🎉 Title task completed!');
                  console.log('📄 Result:', statusData.result);

                  // 处理生成的结果
                  const result = statusData.result;

                  console.log('🎉 Task completed! Processing result:', result);

                  setTitleResponse(result);
                  saveToStorage(STORAGE_KEYS.TITLE_RESPONSE, result);

                  antdMessage.success({
                    content: `Title generated successfully! (${statusData.duration || 0}s)`,
                    duration: 5,
                  });
                  setTitleLoading(false);
                  resolve();
                } else if (statusData.status === 'failed') {
                  // ❌ 任务失败
                  clearInterval(intervalId);
                  console.error('❌ Title task failed:', statusData.error);

                  const errorMessage =
                    statusData.error || 'Title processing failed';
                  setTitleError(errorMessage);
                  antdMessage.error({
                    content: `Title generation failed: ${errorMessage}`,
                    duration: 10,
                  });
                  setTitleProgress(0);
                  setTitleProgressText('');
                  setTitleLoading(false);
                  reject(new Error(errorMessage));
                } else if (statusData.status === 'processing') {
                  // 🔄 处理中
                  console.log('⏳ Title is processing...');
                } else if (statusData.status === 'pending') {
                  // ⏰ 等待中
                  console.log('⏰ Title is pending...');
                } else if (statusData.status === 'not_found') {
                  // 🚨 任务未找到
                  console.warn('⚠️ Task not found in database');
                  // 继续轮询，可能任务还在处理中
                } else {
                  // 🤔 未知状态
                  console.warn('⚠️ Unknown status:', statusData.status);
                }
              } catch (pollError: any) {
                console.error('Polling error:', pollError);

                if (attempts > 10 && attempts % 10 === 0) {
                  const currentTaskId = currentTaskRef.current.taskId;
                  console.warn(`⚠️ Polling failed ${attempts} times.`);
                  console.warn(
                    `💡 Check n8n workflow executions for taskId: ${currentTaskId}`
                  );

                  antdMessage.warning({
                    content: `Still waiting for title generation (attempt ${attempts}/${maxAttempts}). This may take several minutes...`,
                    duration: 3,
                  });
                }
              }

              if (attempts >= maxAttempts) {
                clearInterval(intervalId);
                const currentTaskId = currentTaskRef.current.taskId;
                const totalWaitTime =
                  (initialDelay + maxAttempts * pollInterval) / 1000;
                const totalMinutes = Math.floor(totalWaitTime / 60);
                reject(
                  new Error(
                    `Title generation timeout: Exceeded maximum wait time (${totalMinutes} minutes).\n` +
                      `Task ID: ${currentTaskId}\n` +
                      `You can check the status manually in n8n.`
                  )
                );
              }
            }, pollInterval);
          });
        };

        // 执行轮询
        await checkStatus();
        console.log('✅ Title generation checkStatus() completed!');
      } else if (
        resolvedStatus === 'completed' &&
        (submitData.result || submitData.content || submitData.title)
      ) {
        // ✅ 同步响应模式：后端直接返回了完整结果
        console.log(
          '✅ Synchronous response detected - processing result directly'
        );

        setTitleProgress(80);
        setTitleProgressText('Processing direct response...');

        const result =
          submitData.result ||
          submitData.content ||
          submitData.title ||
          submitData;
        console.log('🎉 Direct result received:', result);

        setTitleResponse(result);
        saveToStorage(STORAGE_KEYS.TITLE_RESPONSE, result);

        setTitleProgress(100);
        setTitleProgressText('Title generation complete!');

        antdMessage.success({
          content: `Title generated successfully! (Direct response)`,
          duration: 5,
        });
        setTitleLoading(false);

        console.log('✅ Direct title processing completed!');
      } else {
        // ⚠️ 异常情况：既不是异步也不是完整的同步响应
        console.warn(
          '⚠️ Unexpected response format - missing taskId and result'
        );
        console.warn('Response:', submitData);

        // 改进错误提示，显示后端返回的具体内容
        const errorDetail =
          submitData && typeof submitData === 'object'
            ? JSON.stringify(submitData, null, 2)
            : String(submitData);

        throw new Error(
          `Invalid workflow response: Expected taskId for async processing or result for direct processing.\n\n` +
            `Backend returned: ${errorDetail.substring(0, 500)}${errorDetail.length > 500 ? '...' : ''}`
        );
      }
    } catch (err: any) {
      console.error('Title generation failed:', err);
      const errorMessage = err.message || 'Title generation failed';
      setTitleError(errorMessage);
      antdMessage.error({
        content: errorMessage,
        duration: 10,
      });
      setTitleProgress(0);
      setTitleProgressText('');
    } finally {
      setTitleLoading(false);
      // 清除 ref
      currentTaskRef.current = {
        taskId: null,
        statusUrl: null,
        intervalId: null,
      };
      console.log('🧹 Cleared task ref');
    }
  }, [titleInput]);

  /**
   * Step 2: 根据标题生成内容
   */
  const handleGenerateContent = useCallback(async () => {
    if (!contentInput.trim()) {
      antdMessage.warning('Please enter content input');
      return;
    }

    // 防止重复提交
    if (contentLoading) {
      console.warn(
        '⚠️ Content generation is already running, ignoring duplicate request'
      );
      antdMessage.warning(
        'Content generation is already in progress. Please wait...'
      );
      return;
    }

    setContentLoading(true);
    setContentError(null);
    setContentProgress(10);
    setContentProgressText('Creating content task...');

    try {
      const webhookUrl = 'https://n8n.wendealai.com/webhook/rednotecontent';

      console.log('📤 Submitting content generation task...');

      // 步骤1: 提交任务，获取任务ID
      const submitResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: contentInput.trim(),
          timestamp: new Date().toISOString(),
        }),
        mode: 'cors',
      });

      if (!submitResponse.ok) {
        throw new Error(
          `Failed to submit content task: ${submitResponse.status}`
        );
      }

      let submitData = await submitResponse.json();

      console.log('📥 Raw response data:', submitData);

      // 处理数组响应
      if (Array.isArray(submitData) && submitData.length > 0) {
        console.log('⚠️ Response is an array, extracting first item');
        submitData = submitData[0];
      }

      console.log('✅ Parsed submit data:', submitData);

      // 检查是否返回了任务ID（异步模式）
      const resolvedTaskId =
        submitData.taskId || submitData.taskid || submitData.id;
      const resolvedStatus = submitData.status;

      console.log('🔍 Extracted taskId:', resolvedTaskId);
      console.log('🔍 Status:', resolvedStatus);

      // 检查是否需要使用轮询模式
      if (
        resolvedTaskId &&
        (resolvedStatus === 'pending' || resolvedStatus === 'processing')
      ) {
        const taskId = resolvedTaskId;

        console.log('✅ Content task created:', taskId);

        // 步骤2: 构建状态查询 URL（修复：使用正确的 webhook URL）
        const statusUrl = `https://n8n.wendealai.com/webhook/dd799957-2702-4175-999c-8febc2048cd8/task-status/${taskId}`;

        console.log('🔍 Constructed statusUrl:', statusUrl);

        // 存储到 ref 中
        currentTaskRef.current = {
          taskId: taskId,
          statusUrl: statusUrl,
          intervalId: null,
        };
        console.log('💾 Saved to ref:', currentTaskRef.current);

        setContentProgress(20);
        setContentProgressText(
          `Task created (ID: ${taskId.slice(-8)}). Processing in background...`
        );

        const initialDelay = 270000; // 4.5 分钟
        const pollInterval = 15000; // 15 秒
        const maxAttempts = 80; // 20 分钟
        let attempts = 0;

        console.log(
          `⏰ Waiting ${initialDelay / 1000}s before first status check...`
        );
        setContentProgress(25);
        setContentProgressText(
          `Task submitted. Waiting 4.5 minutes for content generation...`
        );

        // 等待初始延迟
        await new Promise(resolve => setTimeout(resolve, initialDelay));
        console.log('✅ Initial delay complete, starting status checks...');

        setContentProgress(30);
        setContentProgressText('Starting status checks...');

        const checkStatus = async (): Promise<void> => {
          return new Promise((resolve, reject) => {
            const intervalId = setInterval(async () => {
              attempts++;
              console.log(`\n${'='.repeat(60)}`);
              console.log(
                `⏰ Interval fired! Attempt ${attempts}/${maxAttempts}`
              );
              console.log(`${'='.repeat(60)}\n`);

              const progress = Math.min(30 + (attempts / maxAttempts) * 65, 95);
              setContentProgress(progress);

              const totalElapsedSeconds =
                initialDelay / 1000 + attempts * (pollInterval / 1000);
              const elapsedMinutes = Math.floor(totalElapsedSeconds / 60);
              const remainingSeconds = Math.floor(totalElapsedSeconds % 60);

              setContentProgressText(
                `Processing content... (${elapsedMinutes}m ${remainingSeconds}s elapsed) - Check ${attempts}/${maxAttempts}`
              );

              try {
                const currentTaskId = currentTaskRef.current.taskId;
                const currentStatusUrl = currentTaskRef.current.statusUrl;

                console.log(`🔄 Polling attempt ${attempts}/${maxAttempts}...`);
                console.log(`🔍 Polling URL: ${currentStatusUrl}`);
                console.log(`🔍 TaskId: ${currentTaskId}`);

                if (!currentStatusUrl || !currentTaskId) {
                  console.error('❌ Task info missing from ref!');
                  throw new Error('Task information lost. Please try again.');
                }

                const statusResponse = await fetch(currentStatusUrl, {
                  method: 'GET',
                  mode: 'cors',
                });

                console.log(
                  '📊 Status response status:',
                  statusResponse.status
                );
                console.log('📊 Status response ok:', statusResponse.ok);

                if (!statusResponse.ok) {
                  console.error(
                    '❌ Status check failed with status:',
                    statusResponse.status
                  );
                  if (statusResponse.status === 404) {
                    console.warn('Task not found, will retry...');
                    return;
                  }
                  throw new Error(
                    `Status check failed: ${statusResponse.status}`
                  );
                }

                // 检查响应是否为空
                const responseText = await statusResponse.text();
                console.log('🔍 Raw response text:', responseText);

                if (!responseText || responseText.trim() === '') {
                  console.warn('⚠️ Empty response received, will retry...');
                  return;
                }

                let statusData;
                try {
                  statusData = JSON.parse(responseText);
                  console.log(
                    '✅ Successfully parsed status data:',
                    statusData
                  );
                } catch (parseError) {
                  console.error(
                    '❌ Failed to parse response as JSON:',
                    parseError
                  );
                  console.error('Raw response:', responseText);
                  // 不要抛出错误，继续重试
                  console.warn('⚠️ JSON parse failed, will retry...');
                  return;
                }
                console.log('📊 Task status:', statusData);

                if (statusData.status === 'completed') {
                  // ✅ 任务完成
                  clearInterval(intervalId);
                  setContentProgress(100);
                  setContentProgressText('Content generation complete!');

                  console.log('🎉 Content task completed!');
                  console.log('📄 Result:', statusData.result);

                  // 处理生成的结果
                  const result = statusData.result;

                  console.log('🎉 Task completed! Processing result:', result);

                  setContentResponse(result);
                  saveToStorage(STORAGE_KEYS.CONTENT_RESPONSE, result);

                  antdMessage.success({
                    content: `Content generated successfully! (${statusData.duration || 0}s)`,
                    duration: 5,
                  });
                  setContentLoading(false);
                  resolve();
                } else if (statusData.status === 'failed') {
                  // ❌ 任务失败
                  clearInterval(intervalId);
                  console.error('❌ Content task failed:', statusData.error);

                  const errorMessage =
                    statusData.error || 'Content processing failed';
                  setContentError(errorMessage);
                  antdMessage.error({
                    content: `Content generation failed: ${errorMessage}`,
                    duration: 10,
                  });
                  setContentProgress(0);
                  setContentProgressText('');
                  setContentLoading(false);
                  reject(new Error(errorMessage));
                } else if (statusData.status === 'processing') {
                  // 🔄 处理中
                  console.log('⏳ Content is processing...');
                } else if (statusData.status === 'pending') {
                  // ⏰ 等待中
                  console.log('⏰ Content is pending...');
                } else if (statusData.status === 'not_found') {
                  // 🚨 任务未找到
                  console.warn('⚠️ Task not found in database');
                  // 继续轮询，可能任务还在处理中
                } else {
                  // 🤔 未知状态
                  console.warn('⚠️ Unknown status:', statusData.status);
                }
              } catch (pollError: any) {
                console.error('Polling error:', pollError);

                if (attempts > 10 && attempts % 10 === 0) {
                  const currentTaskId = currentTaskRef.current.taskId;
                  console.warn(`⚠️ Polling failed ${attempts} times.`);
                  console.warn(
                    `💡 Check n8n workflow executions for taskId: ${currentTaskId}`
                  );

                  antdMessage.warning({
                    content: `Still waiting for content generation (attempt ${attempts}/${maxAttempts}). This may take several minutes...`,
                    duration: 3,
                  });
                }
              }

              if (attempts >= maxAttempts) {
                clearInterval(intervalId);
                const currentTaskId = currentTaskRef.current.taskId;
                const totalWaitTime =
                  (initialDelay + maxAttempts * pollInterval) / 1000;
                const totalMinutes = Math.floor(totalWaitTime / 60);
                reject(
                  new Error(
                    `Content generation timeout: Exceeded maximum wait time (${totalMinutes} minutes).\n` +
                      `Task ID: ${currentTaskId}\n` +
                      `You can check the status manually in n8n.`
                  )
                );
              }
            }, pollInterval);
          });
        };

        // 执行轮询
        await checkStatus();
        console.log('✅ Content generation checkStatus() completed!');
      } else if (resolvedStatus === 'completed' && submitData.result) {
        // ✅ 同步响应模式：后端直接返回了完整结果
        console.log(
          '✅ Synchronous response detected - processing result directly'
        );

        setContentProgress(80);
        setContentProgressText('Processing direct response...');

        const result = submitData.result;
        console.log('🎉 Direct result received:', result);

        setContentResponse(result);
        saveToStorage(STORAGE_KEYS.CONTENT_RESPONSE, result);

        setContentProgress(100);
        setContentProgressText('Content generation complete!');

        antdMessage.success({
          content: `Content generated successfully! (Direct response)`,
          duration: 5,
        });
        setContentLoading(false);

        console.log('✅ Direct content processing completed!');
      } else {
        // ⚠️ 异常情况：既不是异步也不是完整的同步响应
        console.warn(
          '⚠️ Unexpected response format - missing taskId and result'
        );
        console.warn('Response:', submitData);

        // 改进错误提示，显示后端返回的具体内容
        const errorDetail =
          submitData && typeof submitData === 'object'
            ? JSON.stringify(submitData, null, 2)
            : String(submitData);

        throw new Error(
          `Invalid workflow response: Expected taskId for async processing or result for direct processing.\n\n` +
            `Backend returned: ${errorDetail.substring(0, 500)}${errorDetail.length > 500 ? '...' : ''}`
        );
      }
    } catch (err: any) {
      console.error('Content generation failed:', err);
      const errorMessage = err.message || 'Content generation failed';
      setContentError(errorMessage);
      antdMessage.error({
        content: errorMessage,
        duration: 10,
      });
      setContentProgress(0);
      setContentProgressText('');
    } finally {
      setContentLoading(false);
      // 清除 ref
      currentTaskRef.current = {
        taskId: null,
        statusUrl: null,
        intervalId: null,
      };
      console.log('🧹 Cleared task ref');
    }
  }, [contentInput]);

  /**
   * Step 1: 使用生成的标题 - 将完整AI报告复制到 Step 2 输入框
   */
  const handleUseTitle = useCallback(() => {
    if (!titleResponse) {
      antdMessage.warning('No title content to use');
      return;
    }

    // 优先使用 fullReport（最完整的AI生成内容）
    let contentToUse = '';

    if (titleResponse.fullReport) {
      contentToUse = titleResponse.fullReport;
      console.log(
        '📄 Using fullReport for content generation:',
        contentToUse.length,
        'characters'
      );
    } else if (titleResponse.content) {
      contentToUse = titleResponse.content;
      console.log('📝 Using content (fallback)');
    } else if (titleResponse.title) {
      contentToUse = titleResponse.title;
      console.log('📝 Using title (fallback)');
    } else {
      contentToUse = JSON.stringify(titleResponse, null, 2);
      console.log('📝 Using JSON stringify (final fallback)');
    }

    if (!contentToUse || contentToUse.trim().length === 0) {
      antdMessage.warning('No valid content to use');
      return;
    }

    setContentInput(contentToUse);
    antdMessage.success({
      content: `AI generated content (${contentToUse.length} characters) applied to Step 2 input`,
      duration: 3,
    });

    console.log('✅ Full AI content applied to Step 2 input field');
  }, [titleResponse]);

  /**
   * Step 1: 重置标题生成
   */
  const handleResetTitle = useCallback(() => {
    setTitleInput('');
    setTitleResponse(null);
    setTitleError(null);
    setTitleProgress(0);
    setTitleProgressText('');

    // 清除本地存储的数据
    localStorage.removeItem(STORAGE_KEYS.TITLE_RESPONSE);
    console.log('🗑️ Cleared title response from localStorage');
  }, []);

  /**
   * Step 2: 使用生成的内容 - 将内容复制到 Step 3 输入框
   */
  const handleUseContent = useCallback(() => {
    if (!contentResponse) {
      antdMessage.warning('No content to use');
      return;
    }

    // 优先使用完整报告，如果没有则使用其他内容
    let contentToUse = '';

    if (contentResponse.fullReport) {
      contentToUse = contentResponse.fullReport;
      console.log('📄 Using fullReport, length:', contentToUse.length);
    } else if (contentResponse.发布内容?.完整发布文本) {
      contentToUse = contentResponse.发布内容.完整发布文本;
      console.log('📝 Using complete publish text');
    } else {
      contentToUse = JSON.stringify(contentResponse, null, 2);
      console.log('📝 Using JSON stringify (fallback)');
    }

    if (!contentToUse || contentToUse.trim().length === 0) {
      antdMessage.warning('No valid content to use');
      return;
    }

    setImagePromptInput(contentToUse);
    antdMessage.success({
      content: `Content applied to image prompt input field`,
      duration: 3,
    });

    console.log('✅ Content applied to image prompt input field');
  }, [contentResponse]);

  /**
   * Step 2: 重置内容生成
   */
  const handleResetContent = useCallback(() => {
    setContentInput('');
    setContentResponse(null);
    setContentError(null);
    setContentProgress(0);
    setContentProgressText('');

    // 清除本地存储的数据
    localStorage.removeItem(STORAGE_KEYS.CONTENT_RESPONSE);
    console.log('🗑️ Cleared content response from localStorage');
  }, []);

  /**
   * Step 3: 重置图片生成
   */
  const handleResetImageGeneration = useCallback(() => {
    setImagePromptInput('');
    setImageResponse(null);
    setImageGenerationError(null);
    setImageGenerationProgress(0);
    setImageGenerationProgressText('');

    // 清除本地存储的数据
    localStorage.removeItem(STORAGE_KEYS.IMAGE_RESPONSE);
    console.log('🗑️ Cleared image response from localStorage');
  }, []);

  /**
   * Step 3: 重置封面图生成
   */
  const handleResetCoverImageGeneration = useCallback(() => {
    setCoverImageInput('');
    setCoverImageResponse(null);
    setCoverImageGenerationError(null);
    setCoverImageGenerationProgress(0);
    setCoverImageGenerationProgressText('');

    // 清除本地存储的数据
    localStorage.removeItem(STORAGE_KEYS.COVER_IMAGE_RESPONSE);
    console.log('🗑️ Cleared cover image response from localStorage');
  }, []);

  /**
   * Step 3: 生成图片提示词 - 同步等待版本（100秒内直接返回结果）
   */
  const handleGenerateImage = useCallback(async () => {
    if (!imagePromptInput.trim()) {
      antdMessage.warning('Please enter image prompt input');
      return;
    }

    // 防止重复提交
    if (imageGenerationLoading) {
      console.warn(
        '⚠️ Image generation is already running, ignoring duplicate request'
      );
      antdMessage.warning(
        'Image generation is already in progress. Please wait...'
      );
      return;
    }

    setImageGenerationLoading(true);
    setImageGenerationError(null);
    setImageGenerationProgress(0);
    setImageGenerationProgressText('Preparing to generate image prompt...');

    try {
      const webhookUrl = 'https://n8n.wendealai.com/webhook/rednoteimgprompt';

      const request = {
        content: imagePromptInput.trim(),
        timestamp: new Date().toISOString(),
      };

      console.log('Sending image generation request to webhook:', webhookUrl);
      console.log('Request payload:', request);

      let response;
      try {
        // 设置合理的超时时间（120秒给足够的处理时间）
        response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
          mode: 'cors',
          signal: AbortSignal.timeout(120000), // 120秒超时
        });

        console.log('Image response received, status:', response.status);
      } catch (fetchError: any) {
        console.error('Image fetch error:', fetchError);

        if (
          fetchError.name === 'AbortError' ||
          fetchError.message.includes('timeout')
        ) {
          throw new Error('⏰ 处理超时：图片提示词生成时间超过120秒限制');
        }

        throw new Error(`❌ Unexpected error: ${fetchError.message}`);
      }

      if (!response.ok) {
        let errorText = 'No error details';
        try {
          errorText = await response.text();
        } catch {
          // 忽略错误
        }
        throw new Error(
          `Request failed with status ${response.status}: ${response.statusText}\n${errorText}`
        );
      }

      setImageGenerationProgress(50);
      setImageGenerationProgressText('Processing image prompt response...');

      const data = await response.json();

      console.log('Image response data:', data);

      setImageGenerationProgress(100);
      setImageGenerationProgressText('Image prompt generation complete!');

      // 处理响应数据
      let parsedResponse: any;

      if (Array.isArray(data) && data.length > 0) {
        parsedResponse = data[0];
      } else {
        parsedResponse = data;
      }

      console.log('Parsed image response:', parsedResponse);

      // 处理图片数据（可能是直接结果，也可能是复杂格式）
      let imageResult: ImageGenerationResponse;

      // 检查是否包含Google表格数据格式（与Step 2类似）
      if (parsedResponse.Google表格数据) {
        console.log('📋 Processing Google表格数据 format');
        imageResult = {
          status: 'completed',
          data: parsedResponse, // 保存完整数据供显示使用
          duration: 0, // 同步处理没有duration
        };
      } else {
        // 传统格式
        imageResult = {
          imageUrl: parsedResponse.imageUrl || parsedResponse.result?.imageUrl,
          status: 'completed',
          duration: 0,
          result: parsedResponse,
        };
      }

      setImageResponse(imageResult);
      saveToStorage(STORAGE_KEYS.IMAGE_RESPONSE, imageResult);

      antdMessage.success({
        content: 'Image prompt generated successfully!',
        duration: 5,
      });
    } catch (err: any) {
      console.error('Image generation failed:', err);
      const errorMessage =
        err.message || 'Image generation failed, please try again';
      setImageGenerationError(errorMessage);
      antdMessage.error(errorMessage);
      setImageGenerationProgress(0);
      setImageGenerationProgressText('');
    } finally {
      setImageGenerationLoading(false);
    }
  }, [imagePromptInput]);

  /**
   * Step 3: 生成封面图 - 同步等待版本（120秒内直接返回结果）
   */
  const handleGenerateCoverImage = useCallback(async () => {
    if (!coverImageInput.trim()) {
      antdMessage.warning('Please enter cover image input');
      return;
    }

    // 防止重复提交
    if (coverImageGenerationLoading) {
      console.warn(
        '⚠️ Cover image generation is already running, ignoring duplicate request'
      );
      antdMessage.warning(
        'Cover image generation is already in progress. Please wait...'
      );
      return;
    }

    setCoverImageGenerationLoading(true);
    setCoverImageGenerationError(null);
    setCoverImageGenerationProgress(0);
    setCoverImageGenerationProgressText('Preparing to generate cover image...');

    try {
      const webhookUrl = 'https://n8n.wendealai.com/webhook/RednoteMainImg';

      const request = {
        content: coverImageInput.trim(),
        timestamp: new Date().toISOString(),
      };

      console.log(
        'Sending cover image generation request to webhook:',
        webhookUrl
      );
      console.log('Request payload:', request);

      let response;
      try {
        // 设置合理的超时时间（120秒给足够的处理时间）
        response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
          mode: 'cors',
          signal: AbortSignal.timeout(120000), // 120秒超时
        });

        console.log('Cover image response received, status:', response.status);
      } catch (fetchError: any) {
        console.error('Cover image fetch error:', fetchError);

        if (
          fetchError.name === 'AbortError' ||
          fetchError.message.includes('timeout')
        ) {
          throw new Error('⏰ 处理超时：封面图生成时间超过120秒限制');
        }

        throw new Error(`❌ Unexpected error: ${fetchError.message}`);
      }

      if (!response.ok) {
        let errorText = 'No error details';
        try {
          errorText = await response.text();
        } catch {
          // 忽略错误
        }
        throw new Error(
          `Request failed with status ${response.status}: ${response.statusText}\n${errorText}`
        );
      }

      setCoverImageGenerationProgress(50);
      setCoverImageGenerationProgressText('Processing cover image response...');

      const data = await response.json();

      console.log('Cover image response data:', data);

      setCoverImageGenerationProgress(100);
      setCoverImageGenerationProgressText('Cover image generation complete!');

      // 处理响应数据 - 数组格式
      let parsedResponse: any[];

      if (Array.isArray(data) && data.length > 0) {
        parsedResponse = data;
      } else if (Array.isArray(data)) {
        parsedResponse = data;
      } else {
        // 如果不是数组，包装成数组
        parsedResponse = [data];
      }

      console.log('Parsed cover image response:', parsedResponse);

      // 如果是新的结构化数据格式，添加图片URL（如果有的话）
      if (parsedResponse[0] && parsedResponse[0].imageUrl) {
        // 如果已经有imageUrl，直接使用
      } else if (parsedResponse[0] && parsedResponse[0].apiPayload) {
        // 如果是新的结构化格式，暂时没有图片URL，等待后续生成
        console.log(
          'Structured cover image data received, waiting for image generation...'
        );
      }

      setCoverImageResponse(parsedResponse);
      saveToStorage(STORAGE_KEYS.COVER_IMAGE_RESPONSE, parsedResponse);

      antdMessage.success({
        content: 'Cover image generated successfully!',
        duration: 5,
      });
    } catch (err: any) {
      console.error('Cover image generation failed:', err);
      const errorMessage =
        err.message || 'Cover image generation failed, please try again';
      setCoverImageGenerationError(errorMessage);
      antdMessage.error(errorMessage);
      setCoverImageGenerationProgress(0);
      setCoverImageGenerationProgressText('');
    } finally {
      setCoverImageGenerationLoading(false);
    }
  }, [coverImageInput]);

  /**
   * Seeddance 4.0 API 调用函数 - 直接调用API
   */
  const callSeeddanceAPI = async (payload: any): Promise<any> => {
    // 直接调用Seeddance API
    const response = await fetch(
      'https://ark.cn-beijing.volces.com/api/v3/images/generations',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer e425de80-33fd-4c91-800c-1a5eb3b88cf8',
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `API call failed: ${response.status} ${response.statusText}\n${errorText}`
      );
    }

    return await response.json();
  };

  /**
   * 文生图-生成单张图
   */
  const handleTextToImageSingle = useCallback(async () => {
    if (!textToImageSingleInput.trim()) {
      antdMessage.warning('Please enter prompt');
      return;
    }

    setTextToImageSingleLoading(true);
    setTextToImageSingleError(null);

    try {
      const webhookUrl =
        'https://n8n.wendealai.com/webhook/doubao-txtimage-gen';

      const request = {
        prompt: textToImageSingleInput.trim(),
        size: imageSize,
        timestamp: new Date().toISOString(),
      };

      console.log('Sending text-to-image request to webhook:', webhookUrl);
      console.log('Request payload:', request);

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        mode: 'cors',
      });

      if (!response.ok) {
        let errorText = 'No error details';
        try {
          errorText = await response.text();
        } catch {
          // 忽略错误
        }
        throw new Error(
          `Request failed with status ${response.status}: ${response.statusText}\n${errorText}`
        );
      }

      const result = await response.json();

      // 处理n8n webhook返回的数据格式
      let processedResult;
      if (Array.isArray(result) && result.length > 0) {
        // 如果返回的是数组，取第一个元素
        processedResult = result[0];
      } else {
        processedResult = result;
      }

      setTextToImageSingleResponse(processedResult);
      antdMessage.success('Image generated successfully!');
    } catch (error: any) {
      setTextToImageSingleError(error.message);
      antdMessage.error(`Generation failed: ${error.message}`);
    } finally {
      setTextToImageSingleLoading(false);
    }
  }, [textToImageSingleInput, imageSize]);

  /**
   * 文生图-生成组图
   */
  const handleTextToImageGroup = useCallback(async () => {
    if (!textToImageGroupInput.trim()) {
      antdMessage.warning('Please enter prompt');
      return;
    }

    setTextToImageGroupLoading(true);
    setTextToImageGroupError(null);

    try {
      const webhookUrl = 'https://n8n.wendealai.com/webhook/seedream4txt2imgs';

      const request = {
        prompt: textToImageGroupInput.trim(),
        size: imageSize,
        timestamp: new Date().toISOString(),
      };

      console.log(
        'Sending text-to-image-group request to webhook:',
        webhookUrl
      );
      console.log('Request payload:', request);

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        mode: 'cors',
      });

      if (!response.ok) {
        let errorText = 'No error details';
        try {
          errorText = await response.text();
        } catch {
          // 忽略错误
        }
        throw new Error(
          `Request failed with status ${response.status}: ${response.statusText}\n${errorText}`
        );
      }

      const result = await response.json();

      // 处理n8n webhook返回的数据格式 - 支持流式响应
      let processedResult;
      if (Array.isArray(result) && result.length > 0) {
        const firstItem = result[0];
        if (firstItem.data && typeof firstItem.data === 'string') {
          // 处理流式响应数据
          const streamData = firstItem.data;
          const imageUrls = [];

          // 解析SSE格式的数据
          const lines = streamData.split('\n');
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const jsonData = JSON.parse(line.substring(6));
                if (
                  jsonData.type === 'image_generation.partial_succeeded' &&
                  jsonData.url
                ) {
                  imageUrls.push({
                    url: jsonData.url,
                    size: jsonData.size,
                    index: jsonData.image_index,
                  });
                }
              } catch (e) {
                // 忽略解析错误
              }
            }
          }

          processedResult = {
            images: imageUrls,
            totalImages: imageUrls.length,
            model: 'doubao-seedream-4-0-250828',
            completed: true,
          };
        } else {
          processedResult = firstItem;
        }
      } else {
        processedResult = result;
      }

      setTextToImageGroupResponse(processedResult);
      antdMessage.success(
        `Image group generated successfully! (${processedResult?.images?.length || 0} images)`
      );
    } catch (error: any) {
      setTextToImageGroupError(error.message);
      antdMessage.error(`Generation failed: ${error.message}`);
    } finally {
      setTextToImageGroupLoading(false);
    }
  }, [textToImageGroupInput, imageSize]);

  /**
   * 图生图-单张图生成单张图
   */
  const handleImageToImageSingle = useCallback(async () => {
    if (!imageToImageSingleInput.trim() || !imageToImageSingleImageUrl.trim()) {
      antdMessage.warning('Please enter both prompt and image URL');
      return;
    }

    setImageToImageSingleLoading(true);
    setImageToImageSingleError(null);

    try {
      const webhookUrl = 'https://n8n.wendealai.com/webhook/seedream4img2img';

      const request = {
        prompt: imageToImageSingleInput.trim(),
        imageUrl: imageToImageSingleImageUrl.trim(),
        size: imageSize,
        timestamp: new Date().toISOString(),
      };

      console.log(
        'Sending image-to-image-single request to webhook:',
        webhookUrl
      );
      console.log('Request payload:', request);

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        mode: 'cors',
      });

      if (!response.ok) {
        let errorText = 'No error details';
        try {
          errorText = await response.text();
        } catch {
          // 忽略错误
        }
        throw new Error(
          `Request failed with status ${response.status}: ${response.statusText}\n${errorText}`
        );
      }

      const result = await response.json();

      // 处理n8n webhook返回的数据格式
      let processedResult;
      if (Array.isArray(result) && result.length > 0) {
        // 如果返回的是数组，取第一个元素
        processedResult = result[0];
      } else {
        processedResult = result;
      }

      setImageToImageSingleResponse(processedResult);
      antdMessage.success('Image generated successfully!');
    } catch (error: any) {
      setImageToImageSingleError(error.message);
      antdMessage.error(`Generation failed: ${error.message}`);
    } finally {
      setImageToImageSingleLoading(false);
    }
  }, [imageToImageSingleInput, imageToImageSingleImageUrl, imageSize]);

  /**
   * 图生图-单张图生成组图
   */
  const handleImageToImageGroup = useCallback(async () => {
    if (!imageToImageGroupInput.trim() || !imageToImageGroupImageUrl.trim()) {
      antdMessage.warning('Please enter both prompt and image URL');
      return;
    }

    setImageToImageGroupLoading(true);
    setImageToImageGroupError(null);

    try {
      const webhookUrl = 'https://n8n.wendealai.com/webhook/seedream4img2imgs';

      const request = {
        prompt: imageToImageGroupInput.trim(),
        imageUrl: imageToImageGroupImageUrl.trim(),
        size: imageSize,
        timestamp: new Date().toISOString(),
      };

      console.log(
        'Sending image-to-image-group request to webhook:',
        webhookUrl
      );
      console.log('Request payload:', request);

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        mode: 'cors',
      });

      if (!response.ok) {
        let errorText = 'No error details';
        try {
          errorText = await response.text();
        } catch {
          // 忽略错误
        }
        throw new Error(
          `Request failed with status ${response.status}: ${response.statusText}\n${errorText}`
        );
      }

      const result = await response.json();

      // 处理n8n webhook返回的数据格式
      let processedResult;
      if (Array.isArray(result) && result.length > 0) {
        // 如果返回的是数组，取第一个元素
        processedResult = result[0];
      } else {
        processedResult = result;
      }

      setImageToImageGroupResponse(processedResult);
      antdMessage.success('Image group generated successfully!');
    } catch (error: any) {
      setImageToImageGroupError(error.message);
      antdMessage.error(`Generation failed: ${error.message}`);
    } finally {
      setImageToImageGroupLoading(false);
    }
  }, [imageToImageGroupInput, imageToImageGroupImageUrl, imageSize]);

  /**
   * 图生图-多张参考图生成单张图
   */
  const handleMultiImageToImageSingle = useCallback(async () => {
    if (
      !multiImageToImageSingleInput.trim() ||
      multiImageToImageSingleImageUrls.some(url => !url.trim())
    ) {
      antdMessage.warning('Please enter prompt and all image URLs');
      return;
    }

    setMultiImageToImageSingleLoading(true);
    setMultiImageToImageSingleError(null);

    try {
      const webhookUrl = 'https://n8n.wendealai.com/webhook/seedream4imgs2img';

      const request = {
        prompt: multiImageToImageSingleInput.trim(),
        imageUrls: multiImageToImageSingleImageUrls.filter(url => url.trim()),
        size: imageSize,
        timestamp: new Date().toISOString(),
      };

      console.log(
        'Sending multi-image-to-image-single request to webhook:',
        webhookUrl
      );
      console.log('Request payload:', request);

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        mode: 'cors',
      });

      if (!response.ok) {
        let errorText = 'No error details';
        try {
          errorText = await response.text();
        } catch {
          // 忽略错误
        }
        throw new Error(
          `Request failed with status ${response.status}: ${response.statusText}\n${errorText}`
        );
      }

      const result = await response.json();

      // 处理n8n webhook返回的数据格式
      let processedResult;
      if (Array.isArray(result) && result.length > 0) {
        // 如果返回的是数组，取第一个元素
        processedResult = result[0];
      } else {
        processedResult = result;
      }

      setMultiImageToImageSingleResponse(processedResult);
      antdMessage.success('Image generated successfully!');
    } catch (error: any) {
      setMultiImageToImageSingleError(error.message);
      antdMessage.error(`Generation failed: ${error.message}`);
    } finally {
      setMultiImageToImageSingleLoading(false);
    }
  }, [
    multiImageToImageSingleInput,
    multiImageToImageSingleImageUrls,
    imageSize,
  ]);

  /**
   * 图生图-多张参考图生成组图
   */
  const handleMultiImageToImageGroup = useCallback(async () => {
    if (
      !multiImageToImageGroupInput.trim() ||
      multiImageToImageGroupImageUrls.some(url => !url.trim())
    ) {
      antdMessage.warning('Please enter prompt and all image URLs');
      return;
    }

    setMultiImageToImageGroupLoading(true);
    setMultiImageToImageGroupError(null);

    try {
      const webhookUrl = 'https://n8n.wendealai.com/webhook/seedream4imgs2imgs';

      const request = {
        prompt: multiImageToImageGroupInput.trim(),
        imageUrls: multiImageToImageGroupImageUrls.filter(url => url.trim()),
        size: imageSize,
        timestamp: new Date().toISOString(),
      };

      console.log(
        'Sending multi-image-to-image-group request to webhook:',
        webhookUrl
      );
      console.log('Request payload:', request);

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        mode: 'cors',
      });

      if (!response.ok) {
        let errorText = 'No error details';
        try {
          errorText = await response.text();
        } catch {
          // 忽略错误
        }
        throw new Error(
          `Request failed with status ${response.status}: ${response.statusText}\n${errorText}`
        );
      }

      const result = await response.json();

      // 处理n8n webhook返回的数据格式
      let processedResult;
      if (Array.isArray(result) && result.length > 0) {
        // 如果返回的是数组，取第一个元素
        processedResult = result[0];
      } else {
        processedResult = result;
      }

      setMultiImageToImageGroupResponse(processedResult);
      antdMessage.success('Image group generated successfully!');
    } catch (error: any) {
      setMultiImageToImageGroupError(error.message);
      antdMessage.error(`Generation failed: ${error.message}`);
    } finally {
      setMultiImageToImageGroupLoading(false);
    }
  }, [multiImageToImageGroupInput, multiImageToImageGroupImageUrls, imageSize]);

  /**
   * 显示内容结果的辅助函数（增强版：支持图片提示词数据）
   */
  const renderContentResult = () => {
    if (contentResponse && !contentLoading) {
      return (
        <div style={{ marginTop: 16 }}>
          <Card
            size='small'
            title='Generated Content Result'
            style={{ backgroundColor: 'var(--color-bg-success-soft)' }}
          >
            <Space direction='vertical' style={{ width: '100%' }} size='small'>
              {/* 检查是否为图片提示词数据格式 */}
              {Array.isArray(contentResponse) &&
              contentResponse[0]?.Google表格数据 ? (
                <ImagePromptDisplay data={contentResponse[0]} />
              ) : (
                <>
                  {/* 传统内容格式显示 */}
                  {/* 标题 */}
                  {(contentResponse as ContentGenerationResponse).发布内容
                    ?.标题 && (
                    <div>
                      <Text
                        strong
                        style={{ fontSize: 16, color: 'var(--color-success)' }}
                      >
                        🎯 标题：
                      </Text>
                      <Card
                        size='small'
                        style={{
                          marginTop: 8,
                          backgroundColor: 'var(--color-white)',
                          borderLeft: '3px solid var(--color-success)',
                        }}
                      >
                        <Text strong style={{ fontSize: 15 }}>
                          {
                            (contentResponse as ContentGenerationResponse)
                              .发布内容?.标题
                          }
                        </Text>
                      </Card>
                    </div>
                  )}

                  {/* 正文 */}
                  {(contentResponse as ContentGenerationResponse).发布内容
                    ?.完整发布文本 && (
                    <div>
                      <Text strong style={{ fontSize: 14 }}>
                        📝 正文：
                      </Text>
                      <Card
                        size='small'
                        style={{
                          marginTop: 8,
                          backgroundColor: 'var(--color-white)',
                        }}
                      >
                        <Paragraph
                          style={{
                            whiteSpace: 'pre-wrap',
                            margin: 0,
                            lineHeight: 1.8,
                          }}
                          copyable={{
                            text:
                              (contentResponse as ContentGenerationResponse)
                                .发布内容?.完整发布文本 || '',
                          }}
                        >
                          {
                            (contentResponse as ContentGenerationResponse)
                              .发布内容?.完整发布文本
                          }
                        </Paragraph>
                      </Card>
                    </div>
                  )}

                  {/* 标签 */}
                  {((contentResponse as ContentGenerationResponse).发布内容
                    ?.标签数组?.length ?? 0) > 0 && (
                    <div>
                      <Text strong style={{ fontSize: 14 }}>
                        🏷️ 标签：
                      </Text>
                      <div style={{ marginTop: 8 }}>
                        {(
                          contentResponse as ContentGenerationResponse
                        ).发布内容?.标签数组?.map(
                          (tag: string, index: number) => (
                            <Tag
                              key={index}
                              color='orange'
                              style={{ marginBottom: 4, marginRight: 4 }}
                            >
                              {tag}
                            </Tag>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {/* 完整报告 */}
                  {(contentResponse as any).fullReport && (
                    <div>
                      <Card
                        size='small'
                        title='📄 完整AI生成报告'
                        style={{
                          marginTop: 8,
                          backgroundColor: 'var(--color-bg-muted)',
                        }}
                        extra={
                          <Button
                            size='small'
                            icon={<CopyOutlined />}
                            onClick={() => {
                              navigator.clipboard.writeText(
                                (contentResponse as any).fullReport || ''
                              );
                              antdMessage.success('完整报告已复制到剪贴板');
                            }}
                          >
                            复制完整报告
                          </Button>
                        }
                      >
                        <Paragraph
                          style={{
                            whiteSpace: 'pre-wrap',
                            margin: 0,
                            maxHeight: 300,
                            overflowY: 'auto',
                            fontSize: 12,
                            lineHeight: 1.6,
                          }}
                          ellipsis={{
                            rows: 10,
                            expandable: true,
                            symbol: '展开完整报告',
                          }}
                        >
                          {(contentResponse as any).fullReport}
                        </Paragraph>
                      </Card>
                    </div>
                  )}
                </>
              )}

              {/* 使用内容按钮 */}
              <div style={{ marginTop: 12 }}>
                <Button
                  type='primary'
                  icon={<SendOutlined />}
                  onClick={handleUseContent}
                  size='small'
                >
                  Use for Image Generation
                </Button>
              </div>
            </Space>
          </Card>
        </div>
      );
    }
    return null;
  };

  /**
   * 图片提示词显示组件
   */
  const ImagePromptDisplay: React.FC<{ data: any }> = ({ data }) => {
    const handleCopyPrompt = (prompt: string) => {
      navigator.clipboard.writeText(prompt);
      antdMessage.success('提示词已复制到剪贴板');
    };

    const handleCopyAllPrompts = () => {
      const allPrompts = data.Google表格数据.map(
        (card: any) =>
          `【${card.卡片类型}】${card.核心文字}\n${card.完整提示词}`
      ).join('\n\n');

      navigator.clipboard.writeText(allPrompts);
      antdMessage.success(
        `所有提示词（共${data.Google表格数据.length}张）已复制到剪贴板`
      );
    };

    const handleCopyGoogleSheetData = () => {
      const sheetData = JSON.stringify(data, null, 2);
      navigator.clipboard.writeText(sheetData);
      antdMessage.success('Google表格数据已复制到剪贴板');
    };

    return (
      <div>
        {/* 统计信息和色彩方案 - 两列布局 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 12 }}>
          <Col span={12}>
            <Card
              size='small'
              title='📊 生成统计'
              style={{ backgroundColor: 'var(--color-bg-info-soft)' }}
            >
              <Space
                direction='vertical'
                size='small'
                style={{ width: '100%' }}
              >
                <div>
                  <Text strong>主题风格：</Text>
                  <Text>{data.统计信息?.主题}</Text>
                </div>
                <div>
                  <Text strong>总卡片数：</Text>
                  <Tag color='blue'>{data.统计信息?.总卡片数} 张</Tag>
                </div>
                <div>
                  <Text strong>生成时间：</Text>
                  <Text type='secondary'>{data.统计信息?.生成时间}</Text>
                </div>
                <div>
                  <Text strong>解析状态：</Text>
                  <Tag color={data.统计信息?.解析成功 ? 'green' : 'red'}>
                    {data.统计信息?.解析成功 ? '解析成功' : '解析失败'}
                  </Tag>
                </div>
              </Space>
            </Card>
          </Col>

          <Col span={12}>
            {data.原始数据?.色彩方案 && (
              <Card size='small' title='🎨 色彩方案'>
                <Space
                  direction='vertical'
                  size='small'
                  style={{ width: '100%' }}
                >
                  <div>
                    <Text strong>主色调：</Text>
                    <div style={{ marginTop: 4 }}>
                      {data.原始数据.色彩方案.主色调?.map(
                        (color: string, index: number) => (
                          <Tag
                            key={index}
                            style={{
                              backgroundColor: color,
                              color: 'var(--color-white)',
                              borderColor: color,
                            }}
                          >
                            {color}
                          </Tag>
                        )
                      )}
                    </div>
                  </div>
                  <div>
                    <Text strong>辅助色：</Text>
                    <div style={{ marginTop: 4 }}>
                      {data.原始数据.色彩方案.辅助色?.map(
                        (color: string, index: number) => (
                          <Tag
                            key={index}
                            style={{
                              backgroundColor: color,
                              color: 'var(--color-text)',
                            }}
                          >
                            {color}
                          </Tag>
                        )
                      )}
                    </div>
                  </div>
                </Space>
              </Card>
            )}
          </Col>
        </Row>

        {/* 快捷操作 */}
        <div style={{ marginBottom: 12 }}>
          <Space>
            <Button
              icon={<CopyOutlined />}
              onClick={handleCopyAllPrompts}
              size='small'
            >
              复制所有提示词
            </Button>
            <Button
              icon={<LinkOutlined />}
              onClick={handleCopyGoogleSheetData}
              size='small'
            >
              复制JSON数据
            </Button>
          </Space>
        </div>

        {/* 卡片列表 - 两列布局 */}
        <Row gutter={[12, 12]}>
          {data.Google表格数据?.map((card: any, index: number) => (
            <Col key={card.序号} span={12}>
              <Card
                size='small'
                title={`${card.序号}. ${card.卡片类型}: ${card.核心文字}`}
                style={{ marginBottom: 8 }}
                extra={
                  <Button
                    size='small'
                    icon={<CopyOutlined />}
                    onClick={() => handleCopyPrompt(card.完整提示词)}
                  >
                    复制提示词
                  </Button>
                }
              >
                <Space
                  direction='vertical'
                  size='small'
                  style={{ width: '100%' }}
                >
                  <div>
                    <Text strong>完整提示词：</Text>
                    <Paragraph
                      style={{
                        whiteSpace: 'pre-wrap',
                        marginTop: 8,
                        maxHeight: 150,
                        overflowY: 'auto',
                        backgroundColor: 'var(--color-bg-muted)',
                        padding: 8,
                        borderRadius: 4,
                        fontSize: 12,
                      }}
                      copyable={{ text: card.完整提示词 }}
                    >
                      {card.完整提示词}
                    </Paragraph>
                  </div>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    );
  };

  /**
   * 封面图显示组件 - 支持新的结构化数据格式
   */
  const CoverImageDisplay: React.FC<{ data: any[] }> = ({ data }) => {
    const handleCopyPrompt = (prompt: string) => {
      navigator.clipboard.writeText(prompt);
      antdMessage.success('提示词已复制到剪贴板');
    };

    const handleCopyAllPrompts = () => {
      const allPrompts = data
        .map(
          (item, index) =>
            `【封面图 ${index + 1}】\n${item.imagePrompt || item.生图Prompt || item.封面设计方案?.完整生图Prompt || ''}`
        )
        .join('\n\n');

      navigator.clipboard.writeText(allPrompts);
      antdMessage.success(
        `所有封面图提示词（共${data.length}张）已复制到剪贴板`
      );
    };

    const handleCopyFullData = () => {
      const fullData = JSON.stringify(data, null, 2);
      navigator.clipboard.writeText(fullData);
      antdMessage.success('完整封面图数据已复制到剪贴板');
    };

    return (
      <div>
        {/* 快捷操作 */}
        <div style={{ marginBottom: 12 }}>
          <Space>
            <Button
              icon={<CopyOutlined />}
              onClick={handleCopyAllPrompts}
              size='small'
            >
              复制所有提示词
            </Button>
            <Button
              icon={<LinkOutlined />}
              onClick={handleCopyFullData}
              size='small'
            >
              复制JSON数据
            </Button>
          </Space>
        </div>

        {/* 封面图列表 */}
        <Row gutter={[12, 12]}>
          {data.map((item: any, index: number) => {
            // 检查是否为新的结构化数据格式
            const isStructuredData = item.封面设计方案 || item.rawDesignData;

            if (isStructuredData) {
              // 新结构化数据格式显示
              const designData =
                item.封面设计方案 || item.rawDesignData?.封面设计方案;
              const colors = designData?.色彩方案;
              const layout = designData?.画面布局;
              const character = designData?.Q版人物设计;

              return (
                <Col key={index} span={24}>
                  <Card
                    size='small'
                    title={`🎨 封面设计 ${index + 1}: ${designData?.精简标题 || item.displayTitle || item.封面标题 || `封面图 ${index + 1}`}`}
                    style={{ marginBottom: 8 }}
                    extra={
                      <Button
                        size='small'
                        icon={<CopyOutlined />}
                        onClick={() =>
                          handleCopyPrompt(
                            designData?.完整生图Prompt ||
                              item.imagePrompt ||
                              item.生图Prompt ||
                              ''
                          )
                        }
                      >
                        复制提示词
                      </Button>
                    }
                  >
                    <Space
                      direction='vertical'
                      size='small'
                      style={{ width: '100%' }}
                    >
                      {/* 基本信息 */}
                      <Row gutter={[16, 8]}>
                        <Col span={12}>
                          <div>
                            <Text strong>风格：</Text>
                            <Text>
                              {designData?.推荐风格 ||
                                item.style ||
                                item.推荐风格 ||
                                '扁平插画风'}
                            </Text>
                          </div>
                        </Col>
                        <Col span={12}>
                          <div>
                            <Text strong>分辨率：</Text>
                            <Text>
                              {item.resolution ||
                                item.aspectRatio ||
                                '1080x1440'}
                            </Text>
                          </div>
                        </Col>
                      </Row>

                      {/* 色彩方案 */}
                      {colors && (
                        <div>
                          <Text strong>色彩方案：</Text>
                          <div style={{ marginTop: 4 }}>
                            <Space>
                              {colors.主色调 && (
                                <Tag
                                  style={{
                                    backgroundColor:
                                      colors.主色调 === '薄荷绿'
                                        ? 'var(--color-success)'
                                        : colors.主色调 === '暖黄色'
                                          ? 'var(--color-warning)'
                                          : colors.主色调 === '米白'
                                            ? 'var(--color-bg-muted)'
                                            : colors.主色调 === '深灰'
                                              ? 'var(--color-text-secondary)'
                                              : 'var(--color-success)',
                                    color:
                                      colors.主色调 === '米白' ||
                                      colors.主色调 === '暖黄色'
                                        ? 'var(--color-text)'
                                        : 'var(--color-white)',
                                    borderColor:
                                      colors.主色调 === '薄荷绿'
                                        ? 'var(--color-success)'
                                        : colors.主色调 === '暖黄色'
                                          ? 'var(--color-warning)'
                                          : colors.主色调 === '米白'
                                            ? 'var(--color-bg-muted)'
                                            : colors.主色调 === '深灰'
                                              ? 'var(--color-text-secondary)'
                                              : 'var(--color-success)',
                                  }}
                                >
                                  主色: {colors.主色调}
                                </Tag>
                              )}
                              {colors.辅助色 && (
                                <Tag
                                  style={{
                                    backgroundColor:
                                      colors.辅助色 === '薄荷绿'
                                        ? 'var(--color-success)'
                                        : colors.辅助色 === '暖黄色'
                                          ? 'var(--color-warning)'
                                          : colors.辅助色 === '米白'
                                            ? 'var(--color-bg-muted)'
                                            : colors.辅助色 === '深灰'
                                              ? 'var(--color-text-secondary)'
                                              : 'var(--color-warning)',
                                    color:
                                      colors.辅助色 === '米白' ||
                                      colors.辅助色 === '暖黄色'
                                        ? 'var(--color-text)'
                                        : 'var(--color-white)',
                                  }}
                                >
                                  辅助: {colors.辅助色}
                                </Tag>
                              )}
                              {colors.背景色 && (
                                <Tag
                                  style={{
                                    backgroundColor:
                                      colors.背景色 === '薄荷绿'
                                        ? 'var(--color-success)'
                                        : colors.背景色 === '暖黄色'
                                          ? 'var(--color-warning)'
                                          : colors.背景色 === '米白'
                                            ? 'var(--color-bg-muted)'
                                            : colors.背景色 === '深灰'
                                              ? 'var(--color-text-secondary)'
                                              : 'var(--color-bg-muted)',
                                    color:
                                      colors.背景色 === '米白' ||
                                      colors.背景色 === '暖黄色'
                                        ? 'var(--color-text)'
                                        : 'var(--color-white)',
                                  }}
                                >
                                  背景: {colors.背景色}
                                </Tag>
                              )}
                            </Space>
                          </div>
                          <div style={{ marginTop: 4 }}>
                            <Text type='secondary' style={{ fontSize: 12 }}>
                              情绪: {colors.情绪 || item.色彩情绪}
                            </Text>
                          </div>
                        </div>
                      )}

                      {/* 画面布局信息 */}
                      {layout && (
                        <div>
                          <Text strong>画面布局：</Text>
                          <div style={{ marginTop: 4, fontSize: 12 }}>
                            <div>标题位置: {layout.标题位置}</div>
                            <div>标题大小: {layout.标题大小}</div>
                            <div>主视觉位置: {layout.主视觉位置}</div>
                            <div>装饰元素: {layout.装饰元素}</div>
                          </div>
                        </div>
                      )}

                      {/* Q版人物设计 */}
                      {character && (
                        <div>
                          <Text strong>Q版人物设计：</Text>
                          <div style={{ marginTop: 4, fontSize: 12 }}>
                            <div>描述: {character.人物描述}</div>
                            <div>位置: {character.人物位置}</div>
                            <div>大小: {character.人物大小}</div>
                            <div>姿态: {character.动作姿态}</div>
                            <div>表情: {character.表情}</div>
                          </div>
                        </div>
                      )}

                      {/* 完整提示词 */}
                      <div>
                        <Text strong>完整生图Prompt：</Text>
                        <Paragraph
                          style={{
                            whiteSpace: 'pre-wrap',
                            marginTop: 8,
                            maxHeight: 200,
                            overflowY: 'auto',
                            backgroundColor: 'var(--color-bg-muted)',
                            padding: 8,
                            borderRadius: 4,
                            fontSize: 12,
                          }}
                          copyable={{
                            text:
                              designData?.完整生图Prompt ||
                              item.imagePrompt ||
                              item.生图Prompt ||
                              '',
                          }}
                        >
                          {designData?.完整生图Prompt ||
                            item.imagePrompt ||
                            item.生图Prompt ||
                            '暂无提示词'}
                        </Paragraph>
                      </div>

                      {/* 设计要点 */}
                      {designData?.设计要点提示 && (
                        <div>
                          <Text strong>设计要点：</Text>
                          <div style={{ marginTop: 4 }}>
                            {Array.isArray(designData.设计要点提示) ? (
                              designData.设计要点提示.map(
                                (tip: string, tipIndex: number) => (
                                  <div
                                    key={tipIndex}
                                    style={{ marginBottom: 4 }}
                                  >
                                    <Text
                                      style={{
                                        fontSize: 12,
                                        color: tip.includes('✅')
                                          ? 'var(--color-success)'
                                          : tip.includes('⚠️')
                                            ? 'var(--color-warning)'
                                            : 'var(--color-text-secondary)',
                                      }}
                                    >
                                      {tip}
                                    </Text>
                                  </div>
                                )
                              )
                            ) : (
                              <div style={{ marginBottom: 4 }}>
                                <Text
                                  style={{
                                    fontSize: 12,
                                    whiteSpace: 'pre-wrap',
                                    color: 'var(--color-text-secondary)',
                                  }}
                                >
                                  {designData.设计要点提示}
                                </Text>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 验证状态 */}
                      {item.validation && (
                        <div>
                          <Text strong>验证状态：</Text>
                          <div style={{ marginTop: 4 }}>
                            <Tag
                              color={
                                item.validation.allPassed ? 'green' : 'red'
                              }
                            >
                              {item.validation.allPassed
                                ? '验证通过'
                                : '验证失败'}
                            </Tag>
                          </div>
                        </div>
                      )}

                      {/* 创建时间 */}
                      {item.创建时间 && (
                        <div>
                          <Text type='secondary' style={{ fontSize: 12 }}>
                            创建时间: {new Date(item.创建时间).toLocaleString()}
                          </Text>
                        </div>
                      )}
                    </Space>
                  </Card>
                </Col>
              );
            } else {
              // 旧格式数据显示
              return (
                <Col key={index} span={24}>
                  <Card
                    size='small'
                    title={`🎨 封面图 ${index + 1}: ${item.displayTitle || item.封面标题 || item.title || `封面图 ${index + 1}`}`}
                    style={{ marginBottom: 8 }}
                    extra={
                      <Button
                        size='small'
                        icon={<CopyOutlined />}
                        onClick={() =>
                          handleCopyPrompt(
                            item.imagePrompt || item.生图Prompt || ''
                          )
                        }
                      >
                        复制提示词
                      </Button>
                    }
                  >
                    <Space
                      direction='vertical'
                      size='small'
                      style={{ width: '100%' }}
                    >
                      {/* 基本信息 */}
                      <Row gutter={[16, 8]}>
                        <Col span={12}>
                          <div>
                            <Text strong>风格：</Text>
                            <Text>
                              {item.style || item.推荐风格 || '扁平插画风'}
                            </Text>
                          </div>
                        </Col>
                        <Col span={12}>
                          <div>
                            <Text strong>分辨率：</Text>
                            <Text>
                              {item.resolution ||
                                item.aspectRatio ||
                                '1080x1440'}
                            </Text>
                          </div>
                        </Col>
                      </Row>

                      {/* 色彩方案 */}
                      {(item.mainColor || item.主色调) && (
                        <div>
                          <Text strong>色彩方案：</Text>
                          <div style={{ marginTop: 4 }}>
                            <Space>
                              {item.mainColor && (
                                <Tag
                                  style={{
                                    backgroundColor: item.mainColor,
                                    color: 'var(--color-white)',
                                    borderColor: item.mainColor,
                                  }}
                                >
                                  主色: {item.mainColor}
                                </Tag>
                              )}
                              {item.accentColor && (
                                <Tag
                                  style={{
                                    backgroundColor: item.accentColor,
                                    color: 'var(--color-text)',
                                  }}
                                >
                                  辅助: {item.accentColor}
                                </Tag>
                              )}
                              {item.backgroundColor && (
                                <Tag
                                  style={{
                                    backgroundColor: item.backgroundColor,
                                    color: 'var(--color-text)',
                                  }}
                                >
                                  背景: {item.backgroundColor}
                                </Tag>
                              )}
                            </Space>
                          </div>
                        </div>
                      )}

                      {/* 完整提示词 */}
                      <div>
                        <Text strong>完整生图Prompt：</Text>
                        <Paragraph
                          style={{
                            whiteSpace: 'pre-wrap',
                            marginTop: 8,
                            maxHeight: 200,
                            overflowY: 'auto',
                            backgroundColor: 'var(--color-bg-muted)',
                            padding: 8,
                            borderRadius: 4,
                            fontSize: 12,
                          }}
                          copyable={{
                            text: item.imagePrompt || item.生图Prompt || '',
                          }}
                        >
                          {item.imagePrompt || item.生图Prompt || '暂无提示词'}
                        </Paragraph>
                      </div>

                      {/* 设计要点 */}
                      {item.designTips && (
                        <div>
                          <Text strong>设计要点：</Text>
                          <div style={{ marginTop: 4 }}>
                            {Array.isArray(item.designTips) ? (
                              item.designTips.map(
                                (tip: string, tipIndex: number) => (
                                  <div
                                    key={tipIndex}
                                    style={{ marginBottom: 4 }}
                                  >
                                    <Text
                                      style={{
                                        fontSize: 12,
                                        color: tip.includes('✅')
                                          ? 'var(--color-success)'
                                          : tip.includes('⚠️')
                                            ? 'var(--color-warning)'
                                            : 'var(--color-text-secondary)',
                                      }}
                                    >
                                      {tip}
                                    </Text>
                                  </div>
                                )
                              )
                            ) : (
                              <div style={{ marginBottom: 4 }}>
                                <Text
                                  style={{
                                    fontSize: 12,
                                    whiteSpace: 'pre-wrap',
                                    color: 'var(--color-text-secondary)',
                                  }}
                                >
                                  {item.designTips}
                                </Text>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </Space>
                  </Card>
                </Col>
              );
            }
          })}
        </Row>
      </div>
    );
  };

  /**
   * Step 2: 复制内容到剪贴板
   */
  const handleCopyContent = useCallback(async () => {
    let contentToCopy = '';

    if (contentResponse?.发布内容?.完整发布文本) {
      contentToCopy = contentResponse.发布内容.完整发布文本;
    } else if (contentResponse?.fullReport) {
      contentToCopy = contentResponse.fullReport;
    }

    if (contentToCopy) {
      try {
        await navigator.clipboard.writeText(contentToCopy);
        antdMessage.success('Content copied to clipboard');
      } catch (err) {
        antdMessage.error('Copy failed, please copy manually');
      }
    }
  }, [contentResponse]);

  return (
    <div className={`rednote-content-generator ${className || ''}`}>
      {/* Step 1: Title Generation Error Alert */}
      {titleError && (
        <Alert
          message='Title Generation Failed'
          description={titleError}
          type='error'
          closable
          onClose={() => setTitleError(null)}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Step 1: Title Generation Module */}
      <Card
        title={
          <Space>
            <FileTextOutlined />
            <span>Step 1: Generate Title</span>
          </Space>
        }
        extra={
          <Space>
            <Button
              type='primary'
              icon={<SendOutlined />}
              onClick={handleGenerateTitle}
              loading={titleLoading}
              disabled={!titleInput.trim() || titleLoading}
            >
              {titleLoading
                ? 'Generating'
                : titleResponse
                  ? 'Regenerate'
                  : 'Generate'}
            </Button>
            {titleResponse && (
              <Button
                type='default'
                icon={<CopyOutlined />}
                onClick={handleUseTitle}
                disabled={titleLoading}
              >
                Use
              </Button>
            )}
            <Button
              icon={<ReloadOutlined />}
              onClick={handleResetTitle}
              disabled={titleLoading}
            >
              Reset
            </Button>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <div>
          <Text strong style={{ marginBottom: 8, display: 'block' }}>
            Title Input <Text type='danger'>*</Text>
          </Text>
          <TextArea
            value={titleInput}
            onChange={e => setTitleInput(e.target.value)}
            placeholder='Enter a subject or topic to generate title ideas...'
            rows={4}
            maxLength={10000}
            showCount
            disabled={titleLoading}
          />
        </div>

        {/* Title Progress Display */}
        {titleLoading && (
          <div style={{ marginTop: 16 }}>
            <Progress percent={titleProgress} status='active' />
            <Text type='secondary' style={{ marginTop: 8, display: 'block' }}>
              {titleProgressText}
            </Text>
          </div>
        )}
      </Card>

      {/* Step 1: Generated Title Result */}
      <Card
        title={
          <Space>
            <FileTextOutlined />
            <span>Step 1: Generated Title Result</span>
          </Space>
        }
        extra={
          titleResponse && (
            <Space>
              <Button
                type='primary'
                icon={<SendOutlined />}
                onClick={handleUseTitle}
              >
                Use for Content Generation
              </Button>
              <Button icon={<ReloadOutlined />} onClick={handleResetTitle}>
                Regenerate
              </Button>
            </Space>
          )
        }
        style={{ marginBottom: 16 }}
      >
        {!titleResponse && !titleLoading && !titleError && (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: 'var(--color-text-tertiary)',
            }}
          >
            <FileTextOutlined
              style={{ fontSize: '64px', marginBottom: '16px' }}
            />
            <div style={{ fontSize: '16px' }}>
              Title generation result will appear here
            </div>
          </div>
        )}

        {titleLoading && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <Spin size='large' />
            <div style={{ marginTop: 16 }}>
              <Text type='secondary'>{titleProgressText}</Text>
            </div>
          </div>
        )}

        {titleResponse && !titleLoading && (
          <div>
            <Card
              size='small'
              title='Generated Title'
              style={{ backgroundColor: 'var(--color-bg-success-soft)' }}
            >
              <Space
                direction='vertical'
                style={{ width: '100%' }}
                size='small'
              >
                {/* 显示标题 */}
                {titleResponse.title && (
                  <div>
                    <Text
                      strong
                      style={{ fontSize: 16, color: 'var(--color-success)' }}
                    >
                      🎯 Generated Title：
                    </Text>
                    <Card
                      size='small'
                      style={{
                        marginTop: 8,
                        backgroundColor: 'var(--color-white)',
                        borderLeft: '3px solid var(--color-success)',
                      }}
                    >
                      <Text strong style={{ fontSize: 15 }}>
                        {titleResponse.title}
                      </Text>
                    </Card>
                  </div>
                )}

                {/* 显示备选标题 */}
                {titleResponse.alternativeTitles &&
                  titleResponse.alternativeTitles.length > 0 && (
                    <div>
                      <Text strong style={{ fontSize: 14 }}>
                        📝 Alternative Titles：
                      </Text>
                      <div style={{ marginTop: 8 }}>
                        {titleResponse.alternativeTitles.map(
                          (altTitle: string, index: number) => (
                            <Card
                              key={index}
                              size='small'
                              style={{
                                marginBottom: 8,
                                backgroundColor: 'var(--color-white)',
                              }}
                            >
                              <Text>
                                {index + 1}. {altTitle}
                              </Text>
                            </Card>
                          )
                        )}
                      </div>
                    </div>
                  )}

                {/* 显示建议 */}
                {titleResponse.suggestions &&
                  titleResponse.suggestions.length > 0 && (
                    <div>
                      <Text strong style={{ fontSize: 14 }}>
                        💡 Suggestions：
                      </Text>
                      <div style={{ marginTop: 8 }}>
                        {titleResponse.suggestions.map(
                          (suggestion: string, index: number) => (
                            <div key={index} style={{ marginBottom: 8 }}>
                              <Tag
                                color='green'
                                style={{ padding: '4px 12px', fontSize: 13 }}
                              >
                                {index + 1}. {suggestion}
                              </Tag>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                {/* 显示完整报告（优先显示 fullReport） */}
                {titleResponse.fullReport && (
                  <div>
                    <Card
                      size='small'
                      title={
                        <span>
                          <FileTextOutlined style={{ marginRight: 8 }} />
                          📄 Full AI Report
                        </span>
                      }
                      style={{
                        marginTop: 8,
                        backgroundColor: 'var(--color-bg-muted)',
                      }}
                      extra={
                        <Button
                          size='small'
                          icon={<CopyOutlined />}
                          onClick={() => {
                            navigator.clipboard.writeText(
                              titleResponse.fullReport || ''
                            );
                            antdMessage.success(
                              'Full report copied to clipboard'
                            );
                          }}
                        >
                          Copy Report
                        </Button>
                      }
                    >
                      <Paragraph
                        style={{
                          whiteSpace: 'pre-wrap',
                          margin: 0,
                          maxHeight: 400,
                          overflowY: 'auto',
                          fontSize: 12,
                          lineHeight: 1.6,
                        }}
                        ellipsis={{
                          rows: 15,
                          expandable: true,
                          symbol: 'Expand full report',
                        }}
                      >
                        {titleResponse.fullReport}
                      </Paragraph>
                    </Card>
                  </div>
                )}

                {/* 显示标签 */}
                {titleResponse.tags && titleResponse.tags.length > 0 && (
                  <div>
                    <Text strong style={{ fontSize: 14 }}>
                      🏷️ Tags：
                    </Text>
                    <div style={{ marginTop: 8 }}>
                      {titleResponse.tags.map((tag: string, index: number) => (
                        <Tag
                          key={index}
                          color='blue'
                          style={{ marginBottom: 4, marginRight: 4 }}
                        >
                          {tag}
                        </Tag>
                      ))}
                    </div>
                  </div>
                )}

                {/* 显示生成时间和统计信息 */}
                {titleResponse.generatedAt && (
                  <div>
                    <Text
                      type='secondary'
                      style={{
                        fontSize: 12,
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      ⏰ Generated at:{' '}
                      {new Date(titleResponse.generatedAt).toLocaleString()} |
                      📊{' '}
                      {titleResponse.wordCount
                        ? `${titleResponse.wordCount} words`
                        : 'Word count unavailable'}
                    </Text>
                  </div>
                )}

                {/* 兼容性：显示原始 content（如果 fullReport 不存在） */}
                {!titleResponse.fullReport && titleResponse.content && (
                  <div>
                    <Card
                      size='small'
                      title={
                        <span>
                          <FileTextOutlined style={{ marginRight: 8 }} />
                          📝 Generated Content
                        </span>
                      }
                      style={{
                        marginTop: 8,
                        backgroundColor: 'var(--color-border-secondary)',
                      }}
                      extra={
                        <Button
                          size='small'
                          icon={<CopyOutlined />}
                          onClick={() => {
                            navigator.clipboard.writeText(
                              titleResponse.content || ''
                            );
                            antdMessage.success('Content copied to clipboard');
                          }}
                        >
                          Copy Content
                        </Button>
                      }
                    >
                      <Paragraph
                        style={{
                          whiteSpace: 'pre-wrap',
                          margin: 0,
                          maxHeight: 300,
                          overflowY: 'auto',
                          fontSize: 12,
                          lineHeight: 1.6,
                        }}
                        ellipsis={{
                          rows: 10,
                          expandable: true,
                          symbol: 'Expand content',
                        }}
                      >
                        {titleResponse.content}
                      </Paragraph>
                    </Card>
                  </div>
                )}
              </Space>
            </Card>
          </div>
        )}
      </Card>

      {/* Step 2: Content Generation Error Alert */}
      {contentError && (
        <Alert
          message='Content Generation Failed'
          description={contentError}
          type='error'
          closable
          onClose={() => setContentError(null)}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Step 2: Content Generation Module */}
      <Card
        title={
          <Space>
            <EditOutlined />
            <span>Step 2: Generate Content</span>
          </Space>
        }
        extra={
          <Space>
            <Button
              type='primary'
              icon={<SendOutlined />}
              onClick={handleGenerateContent}
              loading={contentLoading}
              disabled={!contentInput.trim() || contentLoading}
            >
              {contentLoading ? 'Generating' : 'Generate Content'}
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleResetContent}
              disabled={contentLoading}
            >
              Reset
            </Button>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <div>
          <Text strong style={{ marginBottom: 8, display: 'block' }}>
            Content Input <Text type='danger'>*</Text>
          </Text>
          <TextArea
            value={contentInput}
            onChange={e => setContentInput(e.target.value)}
            placeholder='Enter title to generate content...'
            rows={12}
            maxLength={10000}
            showCount
            disabled={contentLoading}
          />
        </div>

        {/* Content Progress Display */}
        {contentLoading && (
          <div style={{ marginTop: 16 }}>
            <Progress percent={contentProgress} status='active' />
            <Text type='secondary' style={{ marginTop: 8, display: 'block' }}>
              {contentProgressText}
            </Text>
          </div>
        )}
      </Card>

      {/* Step 3: Generated Content Result */}
      <Card
        title={
          <Space>
            <FileTextOutlined />
            <span>Step 2: Generated Content Result</span>
          </Space>
        }
        extra={
          contentResponse && (
            <Space>
              <Button
                type='primary'
                icon={<SendOutlined />}
                onClick={handleUseContent}
              >
                Use for Image Generation
              </Button>
              <Button icon={<CopyOutlined />} onClick={handleCopyContent}>
                Copy Content
              </Button>
              <Button icon={<ReloadOutlined />} onClick={handleResetContent}>
                Regenerate
              </Button>
            </Space>
          )
        }
        style={{ marginBottom: 16 }}
      >
        {!contentResponse && !contentLoading && !contentError && (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: 'var(--color-text-tertiary)',
            }}
          >
            <FileTextOutlined
              style={{ fontSize: '64px', marginBottom: '16px' }}
            />
            <div style={{ fontSize: '16px' }}>
              Content generation result will appear here
            </div>
          </div>
        )}

        {contentLoading && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <Spin size='large' />
            <div style={{ marginTop: 16 }}>
              <Text type='secondary'>{contentProgressText}</Text>
            </div>
          </div>
        )}

        {renderContentResult()}
      </Card>

      {/* Step 3: Image Generation Error Alert */}
      {imageGenerationError && (
        <Alert
          message='Image Generation Failed'
          description={imageGenerationError}
          type='error'
          closable
          onClose={() => setImageGenerationError(null)}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Step 3: Image Generation Module */}
      <Card
        title={
          <Space>
            <FileImageOutlined />
            <span>Step 3: Generate Image Prompt</span>
          </Space>
        }
        extra={
          <Space>
            <Button
              type='primary'
              icon={<SendOutlined />}
              onClick={handleGenerateImage}
              loading={imageGenerationLoading}
              disabled={!imagePromptInput.trim() || imageGenerationLoading}
              size='small'
            >
              {imageGenerationLoading ? 'Generating' : 'Generate Image'}
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleResetImageGeneration}
              disabled={imageGenerationLoading}
              size='small'
            >
              Reset
            </Button>
          </Space>
        }
        style={{ marginTop: 16 }}
      >
        <div>
          <Text strong style={{ marginBottom: 8, display: 'block' }}>
            Image Prompt Input <Text type='danger'>*</Text>
          </Text>
          <TextArea
            value={imagePromptInput}
            onChange={e => setImagePromptInput(e.target.value)}
            placeholder='Enter content to generate image prompt...'
            rows={8}
            maxLength={10000}
            showCount
            disabled={imageGenerationLoading}
          />
        </div>

        {/* Image Generation Progress Display */}
        {imageGenerationLoading && (
          <div style={{ marginTop: 16 }}>
            <Progress percent={imageGenerationProgress} status='active' />
            <Text type='secondary' style={{ marginTop: 8, display: 'block' }}>
              {imageGenerationProgressText}
            </Text>
          </div>
        )}

        {/* Image Generation Result Display */}
        {imageResponse && !imageGenerationLoading && (
          <div style={{ marginTop: 16 }}>
            <Card
              size='small'
              title='Generated Image Prompt Result'
              style={{ backgroundColor: 'var(--color-bg-success-soft)' }}
            >
              <Space
                direction='vertical'
                style={{ width: '100%' }}
                size='small'
              >
                {/* 检查是否为图片提示词数据格式 */}
                {imageResponse.data?.Google表格数据 ? (
                  <ImagePromptDisplay data={imageResponse.data} />
                ) : (
                  <>
                    {/* 传统图片URL显示 */}
                    {imageResponse.imageUrl && (
                      <div style={{ textAlign: 'center' }}>
                        <img
                          src={imageResponse.imageUrl}
                          alt='Generated'
                          style={{
                            maxWidth: '100%',
                            maxHeight: '400px',
                            borderRadius: '8px',
                            boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                          }}
                        />
                        <div style={{ marginTop: 12 }}>
                          <Button
                            type='primary'
                            icon={<DownloadOutlined />}
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = imageResponse.imageUrl || '';
                              link.download = `generated-image-${Date.now()}.png`;
                              link.click();
                            }}
                          >
                            Download Image
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* 其他结果数据 */}
                    {imageResponse.result && (
                      <Card size='small' title='📄 Raw Response'>
                        <Paragraph
                          style={{
                            whiteSpace: 'pre-wrap',
                            margin: 0,
                            maxHeight: 200,
                            overflowY: 'auto',
                            backgroundColor: 'var(--color-bg-muted)',
                            padding: 8,
                            borderRadius: 4,
                            fontSize: 12,
                          }}
                          copyable={{
                            text: JSON.stringify(imageResponse.result, null, 2),
                          }}
                        >
                          {JSON.stringify(imageResponse.result, null, 2)}
                        </Paragraph>
                      </Card>
                    )}
                  </>
                )}
              </Space>
            </Card>
          </div>
        )}

        {/* Step 3: Cover Image Generation Error Alert */}
        {coverImageGenerationError && (
          <Alert
            message='Cover Image Generation Failed'
            description={coverImageGenerationError}
            type='error'
            closable
            onClose={() => setCoverImageGenerationError(null)}
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Step 3: Cover Image Generation Module */}
        <Card
          title={
            <Space>
              <FileImageOutlined />
              <span>Step 3: Generate Cover Image</span>
            </Space>
          }
          extra={
            <Space>
              <Button
                type='primary'
                icon={<SendOutlined />}
                onClick={handleGenerateCoverImage}
                loading={coverImageGenerationLoading}
                disabled={
                  !coverImageInput.trim() || coverImageGenerationLoading
                }
                size='small'
              >
                {coverImageGenerationLoading
                  ? 'Generating'
                  : 'Generate Cover Image'}
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleResetCoverImageGeneration}
                disabled={coverImageGenerationLoading}
                size='small'
              >
                Reset
              </Button>
            </Space>
          }
          style={{ marginTop: 16 }}
        >
          <div>
            <Text strong style={{ marginBottom: 8, display: 'block' }}>
              Cover Image Input <Text type='danger'>*</Text>
            </Text>
            <TextArea
              value={coverImageInput}
              onChange={e => setCoverImageInput(e.target.value)}
              placeholder='Enter content to generate cover image...'
              rows={8}
              maxLength={10000}
              showCount
              disabled={coverImageGenerationLoading}
            />
          </div>

          {/* Cover Image Generation Progress Display */}
          {coverImageGenerationLoading && (
            <div style={{ marginTop: 16 }}>
              <Progress
                percent={coverImageGenerationProgress}
                status='active'
              />
              <Text type='secondary' style={{ marginTop: 8, display: 'block' }}>
                {coverImageGenerationProgressText}
              </Text>
            </div>
          )}

          {/* Cover Image Generation Result Display */}
          {coverImageResponse && !coverImageGenerationLoading && (
            <div style={{ marginTop: 16 }}>
              <Card
                size='small'
                title='Generated Cover Image Result'
                style={{ backgroundColor: 'var(--color-bg-success-soft)' }}
              >
                <Space
                  direction='vertical'
                  style={{ width: '100%' }}
                  size='small'
                >
                  {/* 只显示完整生图Prompt */}
                  {coverImageResponse.map((item: any, index: number) => (
                    <div key={index}>
                      <Text strong>完整生图Prompt：</Text>
                      <Paragraph
                        style={{
                          whiteSpace: 'pre-wrap',
                          marginTop: 8,
                          maxHeight: 200,
                          overflowY: 'auto',
                          backgroundColor: 'var(--color-bg-muted)',
                          padding: 8,
                          borderRadius: 4,
                          fontSize: 12,
                        }}
                        copyable={{
                          text: item.生图Prompt || item.imagePrompt || '',
                        }}
                      >
                        {item.生图Prompt || item.imagePrompt || '暂无提示词'}
                      </Paragraph>
                    </div>
                  ))}
                </Space>
              </Card>
            </div>
          )}
        </Card>
      </Card>

      {/* Seeddance 4.0 Image Generation Section */}
      <Card
        title={
          <Space>
            <FileImageOutlined />
            <span>Seeddance 4.0 Image Generation</span>
          </Space>
        }
        style={{ marginTop: 24, marginBottom: 16 }}
        extra={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Text strong style={{ fontSize: 14 }}>
              分辨率:
            </Text>
            <Select
              value={imageSize}
              onChange={setImageSize}
              style={{ width: 140 }}
              size='small'
            >
              <Select.Option value='2048x2048'>
                社交媒体 (2048x2048)
              </Select.Option>
              <Select.Option value='2560x1440'>
                视频封面 (2560x1440)
              </Select.Option>
              <Select.Option value='1440x2560'>
                手机故事 (1440x2560)
              </Select.Option>
              <Select.Option value='2304x1728'>
                博客文章 (2304x1728)
              </Select.Option>
              <Select.Option value='1728x2304'>海报 (1728x2304)</Select.Option>
              <Select.Option value='3024x1296'>横幅 (3024x1296)</Select.Option>
              <Select.Option value='2048x2048'>通用 (2048x2048)</Select.Option>
            </Select>
          </div>
        }
      >
        <Tabs
          activeKey={seeddanceActiveTab}
          onChange={setSeeddanceActiveTab}
          type='card'
          size='small'
        >
          {/* 文生图-生成单张图 */}
          <Tabs.TabPane tab='文生图-生成单张图' key='text-to-image-single'>
            <div style={{ padding: '16px 0' }}>
              <Text strong style={{ marginBottom: 8, display: 'block' }}>
                Prompt <Text type='danger'>*</Text>
              </Text>
              <TextArea
                value={textToImageSingleInput}
                onChange={e => setTextToImageSingleInput(e.target.value)}
                placeholder='星际穿越，黑洞，黑洞里冲出一辆快支离破碎的复古列车，抢视觉冲击力，电影大片，末日既视感，动感，对比色，oc渲染，光线追踪，动态模糊，景深，超现实主义，深蓝，画面通过细腻的丰富的色彩层次塑造主体与场景，质感真实，暗黑风背景的光影效果营造出氛围，整体兼具艺术幻想感，夸张的广角透视效果，耀光，反射，极致的光影，强引力，吞噬'
                rows={6}
                maxLength={10000}
                showCount
                disabled={textToImageSingleLoading}
              />
              <div style={{ marginTop: 16 }}>
                <Button
                  type='primary'
                  icon={<SendOutlined />}
                  onClick={handleTextToImageSingle}
                  loading={textToImageSingleLoading}
                  disabled={
                    !textToImageSingleInput.trim() || textToImageSingleLoading
                  }
                >
                  {textToImageSingleLoading
                    ? 'Generating...'
                    : 'Generate Image'}
                </Button>
              </div>

              {/* Error Display */}
              {textToImageSingleError && (
                <Alert
                  message='Generation Failed'
                  description={textToImageSingleError}
                  type='error'
                  closable
                  onClose={() => setTextToImageSingleError(null)}
                  style={{ marginTop: 16 }}
                />
              )}

              {/* Result Display */}
              {textToImageSingleResponse && !textToImageSingleLoading && (
                <div style={{ marginTop: 16 }}>
                  <Card
                    size='small'
                    title='Generated Image'
                    style={{ backgroundColor: 'var(--color-bg-success-soft)' }}
                  >
                    <div style={{ textAlign: 'center' }}>
                      <img
                        src={
                          textToImageSingleResponse.data?.[0]?.url ||
                          textToImageSingleResponse.url
                        }
                        alt='Generated'
                        style={{
                          maxWidth: '100%',
                          maxHeight: '400px',
                          borderRadius: '8px',
                          boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                        }}
                      />
                      <div style={{ marginTop: 12 }}>
                        <Space>
                          <Button
                            type='primary'
                            icon={<DownloadOutlined />}
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href =
                                textToImageSingleResponse.data?.[0]?.url ||
                                textToImageSingleResponse.url;
                              link.download = `seeddance-image-${Date.now()}.png`;
                              link.click();
                            }}
                          >
                            Download Image
                          </Button>
                          <Button
                            icon={<CopyOutlined />}
                            onClick={() => {
                              const imageUrl =
                                textToImageSingleResponse.data?.[0]?.url ||
                                textToImageSingleResponse.url;
                              navigator.clipboard.writeText(imageUrl);
                              antdMessage.success(
                                'Image URL copied to clipboard'
                              );
                            }}
                          >
                            Copy URL
                          </Button>
                        </Space>
                      </div>
                      {/* 显示图片信息 */}
                      <div style={{ marginTop: 12, textAlign: 'left' }}>
                        <Text type='secondary' style={{ fontSize: 12 }}>
                          Size:{' '}
                          {textToImageSingleResponse.data?.[0]?.size ||
                            'Unknown'}{' '}
                          | Model:{' '}
                          {textToImageSingleResponse.model || 'Unknown'} |
                          Created:{' '}
                          {textToImageSingleResponse.created
                            ? new Date(
                                textToImageSingleResponse.created * 1000
                              ).toLocaleString()
                            : 'Unknown'}
                        </Text>
                      </div>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          </Tabs.TabPane>

          {/* 文生图-生成组图 */}
          <Tabs.TabPane tab='文生图-生成组图' key='text-to-image-group'>
            <div style={{ padding: '16px 0' }}>
              <Text strong style={{ marginBottom: 8, display: 'block' }}>
                Prompt <Text type='danger'>*</Text>
              </Text>
              <TextArea
                value={textToImageGroupInput}
                onChange={e => setTextToImageGroupInput(e.target.value)}
                placeholder='生成一组共4张连贯插画，核心为同一庭院一角的四季变迁，以统一风格展现四季独特色彩、元素与氛围'
                rows={6}
                maxLength={10000}
                showCount
                disabled={textToImageGroupLoading}
              />
              <div style={{ marginTop: 16 }}>
                <Button
                  type='primary'
                  icon={<SendOutlined />}
                  onClick={handleTextToImageGroup}
                  loading={textToImageGroupLoading}
                  disabled={
                    !textToImageGroupInput.trim() || textToImageGroupLoading
                  }
                >
                  {textToImageGroupLoading
                    ? 'Generating...'
                    : 'Generate Image Group'}
                </Button>
              </div>

              {/* Error Display */}
              {textToImageGroupError && (
                <Alert
                  message='Generation Failed'
                  description={textToImageGroupError}
                  type='error'
                  closable
                  onClose={() => setTextToImageGroupError(null)}
                  style={{ marginTop: 16 }}
                />
              )}

              {/* Result Display */}
              {textToImageGroupResponse && !textToImageGroupLoading && (
                <div style={{ marginTop: 16 }}>
                  <Card
                    size='small'
                    title={`Generated Image Group (${textToImageGroupResponse?.images?.length || 0} images)`}
                    style={{ backgroundColor: 'var(--color-bg-success-soft)' }}
                  >
                    <Row gutter={[16, 16]}>
                      {textToImageGroupResponse.images?.map(
                        (item: any, index: number) => (
                          <Col key={item.index || index} span={12}>
                            <div style={{ textAlign: 'center' }}>
                              <img
                                src={item.url}
                                alt={`Generated ${item.index || index + 1}`}
                                style={{
                                  maxWidth: '100%',
                                  maxHeight: '200px',
                                  borderRadius: '8px',
                                  boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                                }}
                              />
                              <div style={{ marginTop: 8 }}>
                                <Space>
                                  <Button
                                    size='small'
                                    icon={<DownloadOutlined />}
                                    onClick={() => {
                                      const link = document.createElement('a');
                                      link.href = item.url;
                                      link.download = `seeddance-txt2img-group-${item.index || index + 1}-${Date.now()}.png`;
                                      link.click();
                                    }}
                                  >
                                    Download
                                  </Button>
                                  <Button
                                    size='small'
                                    icon={<CopyOutlined />}
                                    onClick={() => {
                                      navigator.clipboard.writeText(item.url);
                                      antdMessage.success(
                                        'Image URL copied to clipboard'
                                      );
                                    }}
                                  >
                                    Copy URL
                                  </Button>
                                </Space>
                              </div>
                              <div
                                style={{
                                  marginTop: 4,
                                  fontSize: 12,
                                  color: 'var(--color-text-secondary)',
                                }}
                              >
                                Size: {item.size}
                              </div>
                            </div>
                          </Col>
                        )
                      )}
                    </Row>
                  </Card>
                </div>
              )}
            </div>
          </Tabs.TabPane>

          {/* 图生图-单张图生成单张图 */}
          <Tabs.TabPane
            tab='图生图-单张图生成单张图'
            key='image-to-image-single'
          >
            <div style={{ padding: '16px 0' }}>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Text strong style={{ marginBottom: 8, display: 'block' }}>
                    Prompt <Text type='danger'>*</Text>
                  </Text>
                  <TextArea
                    value={imageToImageSingleInput}
                    onChange={e => setImageToImageSingleInput(e.target.value)}
                    placeholder='生成狗狗趴在草地上的近景画面'
                    rows={4}
                    maxLength={10000}
                    showCount
                    disabled={imageToImageSingleLoading}
                  />
                </Col>
                <Col span={12}>
                  <Text strong style={{ marginBottom: 8, display: 'block' }}>
                    Reference Image URL <Text type='danger'>*</Text>
                  </Text>
                  <Input
                    value={imageToImageSingleImageUrl}
                    onChange={e =>
                      setImageToImageSingleImageUrl(e.target.value)
                    }
                    placeholder='https://ark-project.tos-cn-beijing.volces.com/doc_image/seedream4_imageToimage.png'
                    disabled={imageToImageSingleLoading}
                  />
                </Col>
              </Row>
              <div style={{ marginTop: 16 }}>
                <Button
                  type='primary'
                  icon={<SendOutlined />}
                  onClick={handleImageToImageSingle}
                  loading={imageToImageSingleLoading}
                  disabled={
                    !imageToImageSingleInput.trim() ||
                    !imageToImageSingleImageUrl.trim() ||
                    imageToImageSingleLoading
                  }
                >
                  {imageToImageSingleLoading
                    ? 'Generating...'
                    : 'Generate Image'}
                </Button>
              </div>

              {/* Error Display */}
              {imageToImageSingleError && (
                <Alert
                  message='Generation Failed'
                  description={imageToImageSingleError}
                  type='error'
                  closable
                  onClose={() => setImageToImageSingleError(null)}
                  style={{ marginTop: 16 }}
                />
              )}

              {/* Result Display */}
              {imageToImageSingleResponse && !imageToImageSingleLoading && (
                <div style={{ marginTop: 16 }}>
                  <Card
                    size='small'
                    title='Generated Image'
                    style={{ backgroundColor: 'var(--color-bg-success-soft)' }}
                  >
                    <div style={{ textAlign: 'center' }}>
                      <img
                        src={
                          imageToImageSingleResponse.data?.[0]?.url ||
                          imageToImageSingleResponse.url
                        }
                        alt='Generated'
                        style={{
                          maxWidth: '100%',
                          maxHeight: '400px',
                          borderRadius: '8px',
                          boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                        }}
                      />
                      <div style={{ marginTop: 12 }}>
                        <Button
                          type='primary'
                          icon={<DownloadOutlined />}
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href =
                              imageToImageSingleResponse.data?.[0]?.url ||
                              imageToImageSingleResponse.url;
                            link.download = `seeddance-image-to-image-${Date.now()}.png`;
                            link.click();
                          }}
                        >
                          Download Image
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          </Tabs.TabPane>

          {/* 图生图-单张图生成组图 */}
          <Tabs.TabPane tab='图生图-单张图生成组图' key='image-to-image-group'>
            <div style={{ padding: '16px 0' }}>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Text strong style={{ marginBottom: 8, display: 'block' }}>
                    Prompt <Text type='danger'>*</Text>
                  </Text>
                  <TextArea
                    value={imageToImageGroupInput}
                    onChange={e => setImageToImageGroupInput(e.target.value)}
                    placeholder='参考这个LOGO，做一套户外运动品牌视觉设计，品牌名称为GREEN，包括包装袋、帽子、纸盒、手环、挂绳等。绿色视觉主色调，趣味、简约现代风格'
                    rows={4}
                    maxLength={10000}
                    showCount
                    disabled={imageToImageGroupLoading}
                  />
                </Col>
                <Col span={12}>
                  <Text strong style={{ marginBottom: 8, display: 'block' }}>
                    Reference Image URL <Text type='danger'>*</Text>
                  </Text>
                  <Input
                    value={imageToImageGroupImageUrl}
                    onChange={e => setImageToImageGroupImageUrl(e.target.value)}
                    placeholder='https://ark-project.tos-cn-beijing.volces.com/doc_image/seedream4_imageToimages.png'
                    disabled={imageToImageGroupLoading}
                  />
                </Col>
              </Row>
              <div style={{ marginTop: 16 }}>
                <Button
                  type='primary'
                  icon={<SendOutlined />}
                  onClick={handleImageToImageGroup}
                  loading={imageToImageGroupLoading}
                  disabled={
                    !imageToImageGroupInput.trim() ||
                    !imageToImageGroupImageUrl.trim() ||
                    imageToImageGroupLoading
                  }
                >
                  {imageToImageGroupLoading
                    ? 'Generating...'
                    : 'Generate Image Group'}
                </Button>
              </div>

              {/* Error Display */}
              {imageToImageGroupError && (
                <Alert
                  message='Generation Failed'
                  description={imageToImageGroupError}
                  type='error'
                  closable
                  onClose={() => setImageToImageGroupError(null)}
                  style={{ marginTop: 16 }}
                />
              )}

              {/* Result Display */}
              {imageToImageGroupResponse && !imageToImageGroupLoading && (
                <div style={{ marginTop: 16 }}>
                  <Card
                    size='small'
                    title='Generated Image Group'
                    style={{ backgroundColor: 'var(--color-bg-success-soft)' }}
                  >
                    <Row gutter={[16, 16]}>
                      {imageToImageGroupResponse.data?.map(
                        (item: any, index: number) => (
                          <Col key={index} span={12}>
                            <div style={{ textAlign: 'center' }}>
                              <img
                                src={item.url}
                                alt={`Generated ${index + 1}`}
                                style={{
                                  maxWidth: '100%',
                                  maxHeight: '200px',
                                  borderRadius: '8px',
                                  boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                                }}
                              />
                              <div style={{ marginTop: 8 }}>
                                <Button
                                  size='small'
                                  icon={<DownloadOutlined />}
                                  onClick={() => {
                                    const link = document.createElement('a');
                                    link.href = item.url;
                                    link.download = `seeddance-image-to-group-${index + 1}-${Date.now()}.png`;
                                    link.click();
                                  }}
                                >
                                  Download
                                </Button>
                              </div>
                            </div>
                          </Col>
                        )
                      )}
                    </Row>
                  </Card>
                </div>
              )}
            </div>
          </Tabs.TabPane>

          {/* 图生图-多张参考图生成单张图 */}
          <Tabs.TabPane
            tab='图生图-多张参考图生成单张图'
            key='multi-image-to-image-single'
          >
            <div style={{ padding: '16px 0' }}>
              <Text strong style={{ marginBottom: 8, display: 'block' }}>
                Prompt <Text type='danger'>*</Text>
              </Text>
              <TextArea
                value={multiImageToImageSingleInput}
                onChange={e => setMultiImageToImageSingleInput(e.target.value)}
                placeholder='将图1的服装换为图2的服装'
                rows={4}
                maxLength={10000}
                showCount
                disabled={multiImageToImageSingleLoading}
              />
              <div style={{ marginTop: 16 }}>
                <Text strong style={{ marginBottom: 8, display: 'block' }}>
                  Reference Image URLs <Text type='danger'>*</Text>
                </Text>
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Input
                      value={multiImageToImageSingleImageUrls[0]}
                      onChange={e => {
                        const newUrls = [...multiImageToImageSingleImageUrls];
                        newUrls[0] = e.target.value;
                        setMultiImageToImageSingleImageUrls(newUrls);
                      }}
                      placeholder='https://ark-project.tos-cn-beijing.volces.com/doc_image/seedream4_imagesToimage_1.png'
                      disabled={multiImageToImageSingleLoading}
                    />
                  </Col>
                  <Col span={12}>
                    <Input
                      value={multiImageToImageSingleImageUrls[1]}
                      onChange={e => {
                        const newUrls = [...multiImageToImageSingleImageUrls];
                        newUrls[1] = e.target.value;
                        setMultiImageToImageSingleImageUrls(newUrls);
                      }}
                      placeholder='https://ark-project.tos-cn-beijing.volces.com/doc_image/seedream4_imagesToimage_2.png'
                      disabled={multiImageToImageSingleLoading}
                    />
                  </Col>
                </Row>
              </div>
              <div style={{ marginTop: 16 }}>
                <Button
                  type='primary'
                  icon={<SendOutlined />}
                  onClick={handleMultiImageToImageSingle}
                  loading={multiImageToImageSingleLoading}
                  disabled={
                    !multiImageToImageSingleInput.trim() ||
                    multiImageToImageSingleImageUrls.some(url => !url.trim()) ||
                    multiImageToImageSingleLoading
                  }
                >
                  {multiImageToImageSingleLoading
                    ? 'Generating...'
                    : 'Generate Image'}
                </Button>
              </div>

              {/* Error Display */}
              {multiImageToImageSingleError && (
                <Alert
                  message='Generation Failed'
                  description={multiImageToImageSingleError}
                  type='error'
                  closable
                  onClose={() => setMultiImageToImageSingleError(null)}
                  style={{ marginTop: 16 }}
                />
              )}

              {/* Result Display */}
              {multiImageToImageSingleResponse &&
                !multiImageToImageSingleLoading && (
                  <div style={{ marginTop: 16 }}>
                    <Card
                      size='small'
                      title='Generated Image'
                      style={{
                        backgroundColor: 'var(--color-bg-success-soft)',
                      }}
                    >
                      <div style={{ textAlign: 'center' }}>
                        <img
                          src={
                            multiImageToImageSingleResponse.data?.[0]?.url ||
                            multiImageToImageSingleResponse.url
                          }
                          alt='Generated'
                          style={{
                            maxWidth: '100%',
                            maxHeight: '400px',
                            borderRadius: '8px',
                            boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                          }}
                        />
                        <div style={{ marginTop: 12 }}>
                          <Button
                            type='primary'
                            icon={<DownloadOutlined />}
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href =
                                multiImageToImageSingleResponse.data?.[0]
                                  ?.url || multiImageToImageSingleResponse.url;
                              link.download = `seeddance-multi-image-single-${Date.now()}.png`;
                              link.click();
                            }}
                          >
                            Download Image
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </div>
                )}
            </div>
          </Tabs.TabPane>

          {/* 图生图-多张参考图生成组图 */}
          <Tabs.TabPane
            tab='图生图-多张参考图生成组图'
            key='multi-image-to-image-group'
          >
            <div style={{ padding: '16px 0' }}>
              <Text strong style={{ marginBottom: 8, display: 'block' }}>
                Prompt <Text type='danger'>*</Text>
              </Text>
              <TextArea
                value={multiImageToImageGroupInput}
                onChange={e => setMultiImageToImageGroupInput(e.target.value)}
                placeholder='生成3张女孩和奶牛玩偶在游乐园开心地坐过山车的图片，涵盖早晨、中午、晚上'
                rows={4}
                maxLength={10000}
                showCount
                disabled={multiImageToImageGroupLoading}
              />
              <div style={{ marginTop: 16 }}>
                <Text strong style={{ marginBottom: 8, display: 'block' }}>
                  Reference Image URLs <Text type='danger'>*</Text>
                </Text>
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Input
                      value={multiImageToImageGroupImageUrls[0]}
                      onChange={e => {
                        const newUrls = [...multiImageToImageGroupImageUrls];
                        newUrls[0] = e.target.value;
                        setMultiImageToImageGroupImageUrls(newUrls);
                      }}
                      placeholder='https://ark-project.tos-cn-beijing.volces.com/doc_image/seedream4_imagesToimages_1.png'
                      disabled={multiImageToImageGroupLoading}
                    />
                  </Col>
                  <Col span={12}>
                    <Input
                      value={multiImageToImageGroupImageUrls[1]}
                      onChange={e => {
                        const newUrls = [...multiImageToImageGroupImageUrls];
                        newUrls[1] = e.target.value;
                        setMultiImageToImageGroupImageUrls(newUrls);
                      }}
                      placeholder='https://ark-project.tos-cn-beijing.volces.com/doc_image/seedream4_imagesToimages_2.png'
                      disabled={multiImageToImageGroupLoading}
                    />
                  </Col>
                </Row>
              </div>
              <div style={{ marginTop: 16 }}>
                <Button
                  type='primary'
                  icon={<SendOutlined />}
                  onClick={handleMultiImageToImageGroup}
                  loading={multiImageToImageGroupLoading}
                  disabled={
                    !multiImageToImageGroupInput.trim() ||
                    multiImageToImageGroupImageUrls.some(url => !url.trim()) ||
                    multiImageToImageGroupLoading
                  }
                >
                  {multiImageToImageGroupLoading
                    ? 'Generating...'
                    : 'Generate Image Group'}
                </Button>
              </div>

              {/* Error Display */}
              {multiImageToImageGroupError && (
                <Alert
                  message='Generation Failed'
                  description={multiImageToImageGroupError}
                  type='error'
                  closable
                  onClose={() => setMultiImageToImageGroupError(null)}
                  style={{ marginTop: 16 }}
                />
              )}

              {/* Result Display */}
              {multiImageToImageGroupResponse &&
                !multiImageToImageGroupLoading && (
                  <div style={{ marginTop: 16 }}>
                    <Card
                      size='small'
                      title='Generated Image Group'
                      style={{
                        backgroundColor: 'var(--color-bg-success-soft)',
                      }}
                    >
                      <Row gutter={[16, 16]}>
                        {multiImageToImageGroupResponse.data?.map(
                          (item: any, index: number) => (
                            <Col key={index} span={12}>
                              <div style={{ textAlign: 'center' }}>
                                <img
                                  src={item.url}
                                  alt={`Generated ${index + 1}`}
                                  style={{
                                    maxWidth: '100%',
                                    maxHeight: '200px',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                                  }}
                                />
                                <div style={{ marginTop: 8 }}>
                                  <Button
                                    size='small'
                                    icon={<DownloadOutlined />}
                                    onClick={() => {
                                      const link = document.createElement('a');
                                      link.href = item.url;
                                      link.download = `seeddance-multi-image-group-${index + 1}-${Date.now()}.png`;
                                      link.click();
                                    }}
                                  >
                                    Download
                                  </Button>
                                </div>
                              </div>
                            </Col>
                          )
                        )}
                      </Row>
                    </Card>
                  </div>
                )}
            </div>
          </Tabs.TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default RedNoteContentGenerator;
