/**
 * International Social Media Content Generator Component
 * 国际社交媒体文案生成器组件
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Card,
  Input,
  Button,
  Space,
  Typography,
  Select,
  Tag,
  Alert,
  Spin,
  Row,
  Col,
  Divider,
  Progress,
  Tabs,
} from 'antd';
import { useMessage } from '@/hooks/useMessage';
import {
  EditOutlined,
  SendOutlined,
  CopyOutlined,
  LinkOutlined,
  ReloadOutlined,
  TwitterOutlined,
  LinkedinOutlined,
  InstagramOutlined,
  FacebookOutlined,
} from '@ant-design/icons';
import type {
  SocialMediaContentRequest,
  SocialMediaContentResponse,
  SocialMediaWebhookResponse,
} from '../types';

const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

/**
 * International Social Media Content Generator Component Props Interface
 */
interface InternationalSocialMediaGeneratorProps {
  onContentGenerated?: (response: SocialMediaContentResponse) => void;
  className?: string;
}

/**
 * Platform Configuration Interface
 */
interface PlatformConfig {
  name: string;
  icon: React.ReactNode;
  placeholder: string;
  contentTypes: Array<{ value: string; label: string; emoji: string }>;
  toneOptions: Array<{ value: string; label: string; emoji: string }>;
  techniqueOptions: Array<{ value: string; label: string; emoji: string }>;
  successFactors: Array<{ value: string; label: string; emoji: string }>;
  maxLength?: number;
  webhookUrl: string;
}

/**
 * 国际社交媒体文案生成器组件
 */
const InternationalSocialMediaGenerator: React.FC<
  InternationalSocialMediaGeneratorProps
> = ({ onContentGenerated, className }) => {
  const message = useMessage();

  // 状态管理
  const [activeTab, setActiveTab] = useState<
    'twitter' | 'linkedin' | 'instagram' | 'facebook'
  >('twitter');
  const [inputContent, setInputContent] = useState<string>('');
  const [contentType, setContentType] = useState<string>('news_updates');
  const [tone, setTone] = useState<string>('professional');
  const [writingTechnique, setWritingTechnique] =
    useState<string>('thread_format');
  const [successFactor, setSuccessFactor] = useState<string>('value');
  const [targetAudience, setTargetAudience] = useState<string>('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [progressText, setProgressText] = useState<string>('');
  const [generatedResponse, setGeneratedResponse] =
    useState<SocialMediaContentResponse | null>(null);
  const [webhookResponse, setWebhookResponse] =
    useState<SocialMediaWebhookResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTweetType, setSelectedTweetType] = useState<
    'single' | 'thread'
  >('single');

  // 根据当前平台设置默认值
  useEffect(() => {
    const currentConfig = platformConfigs[activeTab];
    if (currentConfig) {
      setContentType(currentConfig.contentTypes[0]?.value || '');
      setTone(currentConfig.toneOptions[0]?.value || '');
      setWritingTechnique(currentConfig.techniqueOptions[0]?.value || '');
      setSuccessFactor(currentConfig.successFactors[0]?.value || '');
    }
  }, [activeTab]);

  /**
   * Platform Configurations
   */
  const platformConfigs: Record<string, PlatformConfig> = {
    twitter: {
      name: 'Twitter',
      icon: <TwitterOutlined />,
      placeholder:
        'Enter the content you want to generate for Twitter posts, such as opinions, news, ideas, articles, etc...',
      webhookUrl: 'https://n8n.wendealai.com/webhook/socialmediagen',
      contentTypes: [
        { value: 'news_updates', label: 'News & Updates', emoji: '📰' },
        { value: 'opinions_views', label: 'Opinions & Views', emoji: '💭' },
        { value: 'industry_insights', label: 'Industry Insights', emoji: '🔍' },
        { value: 'tips_tricks', label: 'Tips & Tricks', emoji: '💡' },
        { value: 'conversations', label: 'Conversations', emoji: '💬' },
        { value: 'humor_memes', label: 'Humor & Memes', emoji: '😂' },
        { value: 'questions_polls', label: 'Questions & Polls', emoji: '❓' },
        { value: 'behind_scenes', label: 'Behind the Scenes', emoji: '👀' },
      ],
      toneOptions: [
        { value: 'professional', label: 'Professional', emoji: '💼' },
        { value: 'conversational', label: 'Conversational', emoji: '💬' },
        { value: 'humorous', label: 'Humorous', emoji: '😄' },
        { value: 'thoughtful', label: 'Thoughtful', emoji: '🤔' },
        { value: 'urgent', label: 'Urgent', emoji: '⚡' },
        { value: 'inspirational', label: 'Inspirational', emoji: '✨' },
        { value: 'controversial', label: 'Controversial', emoji: '🔥' },
        { value: 'educational', label: 'Educational', emoji: '📚' },
      ],
      techniqueOptions: [
        { value: 'thread_format', label: 'Thread Format', emoji: '🧵' },
        { value: 'question_hook', label: 'Question Hook', emoji: '❓' },
        { value: 'bold_statement', label: 'Bold Statement', emoji: '💥' },
        { value: 'story_telling', label: 'Story Telling', emoji: '📖' },
        { value: 'data_driven', label: 'Data Driven', emoji: '📊' },
        { value: 'call_to_action', label: 'Call to Action', emoji: '🚀' },
        { value: 'visual_thread', label: 'Visual Thread', emoji: '🖼️' },
        { value: 'controversy_spark', label: 'Controversy Spark', emoji: '⚡' },
      ],
      successFactors: [
        { value: 'timing', label: 'Perfect Timing', emoji: '⏰' },
        { value: 'relevance', label: 'Current Relevance', emoji: '🎯' },
        { value: 'engagement', label: 'High Engagement', emoji: '💬' },
        { value: 'visuals', label: 'Strong Visuals', emoji: '🖼️' },
        { value: 'hashtags', label: 'Strategic Hashtags', emoji: '🏷️' },
        { value: 'call_to_action', label: 'Clear CTA', emoji: '🎯' },
        { value: 'authenticity', label: 'Authenticity', emoji: '💯' },
        { value: 'value', label: 'Real Value', emoji: '💎' },
      ],
    },
    linkedin: {
      name: 'LinkedIn',
      icon: <LinkedinOutlined />,
      placeholder:
        'Enter the content you want to generate for LinkedIn posts, such as professional insights, industry analysis, work experience, articles, etc...',
      webhookUrl: 'https://n8n.wendealai.com/webhook/socialmediagen',
      contentTypes: [
        { value: 'career_advice', label: 'Career Advice', emoji: '🎯' },
        { value: 'industry_news', label: 'Industry News', emoji: '📰' },
        { value: 'company_culture', label: 'Company Culture', emoji: '🏢' },
        { value: 'professional_tips', label: 'Professional Tips', emoji: '💡' },
        { value: 'leadership', label: 'Leadership', emoji: '👑' },
        { value: 'networking', label: 'Networking', emoji: '🤝' },
        { value: 'skill_development', label: 'Skill Development', emoji: '📚' },
        { value: 'workplace_stories', label: 'Workplace Stories', emoji: '📖' },
      ],
      toneOptions: [
        { value: 'professional', label: 'Professional', emoji: '💼' },
        {
          value: 'thought_leadership',
          label: 'Thought Leadership',
          emoji: '🎓',
        },
        { value: 'motivational', label: 'Motivational', emoji: '💪' },
        { value: 'educational', label: 'Educational', emoji: '📖' },
        { value: 'collaborative', label: 'Collaborative', emoji: '🤝' },
        { value: 'innovative', label: 'Innovative', emoji: '💡' },
        { value: 'empathetic', label: 'Empathetic', emoji: '❤️' },
        { value: 'strategic', label: 'Strategic', emoji: '🎯' },
      ],
      techniqueOptions: [
        { value: 'framework_sharing', label: 'Framework Sharing', emoji: '📋' },
        { value: 'case_study', label: 'Case Study', emoji: '📊' },
        { value: 'lessons_learned', label: 'Lessons Learned', emoji: '💭' },
        {
          value: 'question_professional',
          label: 'Professional Question',
          emoji: '❓',
        },
        {
          value: 'achievement_highlight',
          label: 'Achievement Highlight',
          emoji: '🏆',
        },
        { value: 'trend_analysis', label: 'Trend Analysis', emoji: '📈' },
        { value: 'advice_thread', label: 'Advice Thread', emoji: '🧵' },
        {
          value: 'challenge_solution',
          label: 'Challenge Solution',
          emoji: '🔧',
        },
      ],
      successFactors: [
        {
          value: 'credibility',
          label: 'Professional Credibility',
          emoji: '🏆',
        },
        { value: 'value', label: 'Actionable Value', emoji: '💎' },
        { value: 'networking', label: 'Networking Focus', emoji: '🤝' },
        { value: 'career_growth', label: 'Career Growth', emoji: '📈' },
        {
          value: 'industry_relevance',
          label: 'Industry Relevance',
          emoji: '🎯',
        },
        { value: 'engagement', label: 'Professional Engagement', emoji: '💬' },
        { value: 'authority', label: 'Authority Building', emoji: '👑' },
        { value: 'practicality', label: 'Practical Application', emoji: '🔧' },
      ],
    },
    instagram: {
      name: 'Instagram',
      icon: <InstagramOutlined />,
      placeholder:
        'Enter the content you want to generate for Instagram posts, such as lifestyle, travel, food, beauty, articles, etc...',
      webhookUrl: 'https://n8n.wendealai.com/webhook/socialmediagen',
      contentTypes: [
        { value: 'lifestyle', label: 'Lifestyle', emoji: '🌟' },
        { value: 'fashion_beauty', label: 'Fashion & Beauty', emoji: '💄' },
        { value: 'travel', label: 'Travel', emoji: '✈️' },
        { value: 'food_cooking', label: 'Food & Cooking', emoji: '🍳' },
        { value: 'fitness_health', label: 'Fitness & Health', emoji: '💪' },
        { value: 'art_creative', label: 'Art & Creative', emoji: '🎨' },
        { value: 'behind_scenes', label: 'Behind the Scenes', emoji: '👀' },
        { value: 'daily_life', label: 'Daily Life', emoji: '📱' },
      ],
      toneOptions: [
        { value: 'aesthetic', label: 'Aesthetic', emoji: '✨' },
        { value: 'playful', label: 'Playful', emoji: '😊' },
        { value: 'inspirational', label: 'Inspirational', emoji: '💫' },
        { value: 'authentic', label: 'Authentic', emoji: '💯' },
        { value: 'trendy', label: 'Trendy', emoji: '🔥' },
        { value: 'minimalist', label: 'Minimalist', emoji: '🎯' },
        { value: 'bold', label: 'Bold', emoji: '💥' },
        { value: 'cozy', label: 'Cozy', emoji: '🧸' },
      ],
      techniqueOptions: [
        { value: 'visual_story', label: 'Visual Story', emoji: '📸' },
        { value: 'caption_series', label: 'Caption Series', emoji: '🔗' },
        {
          value: 'question_engagement',
          label: 'Question Engagement',
          emoji: '❓',
        },
        { value: 'quote_sharing', label: 'Quote Sharing', emoji: '💬' },
        { value: 'tutorial_step', label: 'Tutorial Step', emoji: '📝' },
        { value: 'mood_board', label: 'Mood Board', emoji: '🎨' },
        { value: 'challenge_tag', label: 'Challenge Tag', emoji: '🏷️' },
        { value: 'memory_share', label: 'Memory Share', emoji: '💭' },
      ],
      successFactors: [
        { value: 'visual_appeal', label: 'Visual Appeal', emoji: '🖼️' },
        { value: 'authenticity', label: 'Authenticity', emoji: '💯' },
        { value: 'storytelling', label: 'Storytelling', emoji: '📖' },
        { value: 'engagement', label: 'Community Engagement', emoji: '💬' },
        { value: 'trending', label: 'Trending Audio', emoji: '🎵' },
        { value: 'consistency', label: 'Brand Consistency', emoji: '🎯' },
        { value: 'emotion', label: 'Emotional Connection', emoji: '❤️' },
        { value: 'value', label: 'Inspirational Value', emoji: '💎' },
      ],
    },
    facebook: {
      name: 'Facebook',
      icon: <FacebookOutlined />,
      placeholder:
        'Enter the content you want to generate for Facebook posts, such as news, opinions, events, products, articles, etc...',
      webhookUrl: 'https://n8n.wendealai.com/webhook/socialmediagen',
      contentTypes: [
        { value: 'news_events', label: 'News & Events', emoji: '📰' },
        { value: 'personal_stories', label: 'Personal Stories', emoji: '📖' },
        { value: 'community', label: 'Community', emoji: '👥' },
        { value: 'entertainment', label: 'Entertainment', emoji: '🎭' },
        { value: 'education', label: 'Education', emoji: '📚' },
        { value: 'business', label: 'Business', emoji: '💼' },
        { value: 'lifestyle', label: 'Lifestyle', emoji: '🌟' },
        { value: 'questions', label: 'Questions', emoji: '❓' },
      ],
      toneOptions: [
        { value: 'friendly', label: 'Friendly', emoji: '😊' },
        { value: 'informative', label: 'Informative', emoji: '📝' },
        { value: 'engaging', label: 'Engaging', emoji: '💬' },
        { value: 'humorous', label: 'Humorous', emoji: '😄' },
        { value: 'empathetic', label: 'Empathetic', emoji: '❤️' },
        { value: 'authoritative', label: 'Authoritative', emoji: '🎓' },
        { value: 'conversational', label: 'Conversational', emoji: '💭' },
        { value: 'promotional', label: 'Promotional', emoji: '📢' },
      ],
      techniqueOptions: [
        { value: 'story_format', label: 'Story Format', emoji: '📖' },
        {
          value: 'question_engagement',
          label: 'Question Engagement',
          emoji: '❓',
        },
        { value: 'list_format', label: 'List Format', emoji: '📋' },
        { value: 'poll_creation', label: 'Poll Creation', emoji: '📊' },
        { value: 'event_promotion', label: 'Event Promotion', emoji: '🎉' },
        { value: 'tip_sharing', label: 'Tip Sharing', emoji: '💡' },
        { value: 'memory_recall', label: 'Memory Recall', emoji: '💭' },
        { value: 'call_to_action', label: 'Call to Action', emoji: '🚀' },
      ],
      successFactors: [
        { value: 'shareability', label: 'Shareability', emoji: '📤' },
        { value: 'conversation', label: 'Conversation Starter', emoji: '💬' },
        { value: 'emotion', label: 'Emotional Connection', emoji: '❤️' },
        { value: 'value', label: 'Real Value', emoji: '💎' },
        { value: 'timing', label: 'Perfect Timing', emoji: '⏰' },
        { value: 'visuals', label: 'Strong Visuals', emoji: '🖼️' },
        { value: 'relevance', label: 'Community Relevance', emoji: '🎯' },
        { value: 'authenticity', label: 'Authenticity', emoji: '💯' },
      ],
    },
  };

  /**
   * Get current platform configuration
   */
  const currentPlatform =
    platformConfigs[activeTab as keyof typeof platformConfigs] ||
    platformConfigs.twitter;

  /**
   * Add keyword
   */
  const handleAddKeyword = useCallback(() => {
    if (keywordInput.trim() && !keywords.includes(keywordInput.trim())) {
      setKeywords(prev => [...prev, keywordInput.trim()]);
      setKeywordInput('');
    }
  }, [keywordInput, keywords]);

  /**
   * Remove keyword
   */
  const handleRemoveKeyword = useCallback((keyword: string) => {
    setKeywords(prev => prev.filter(k => k !== keyword));
  }, []);

  /**
   * Simulate progress updates
   */
  const simulateProgress = useCallback(() => {
    const steps = [
      { progress: 20, text: 'Analyzing input content...' },
      {
        progress: 40,
        text: `Generating ${currentPlatform?.name || 'content'} posts...`,
      },
      { progress: 60, text: 'Optimizing post structure...' },
      { progress: 80, text: 'Adding tags and keywords...' },
      { progress: 95, text: 'Saving to Google Sheet...' },
      { progress: 100, text: 'Generation completed!' },
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        const step = steps[currentStep]!;
        setProgress(step.progress);
        setProgressText(step.text);
        currentStep++;
      } else {
        clearInterval(interval);
      }
    }, 800);

    return interval;
  }, [currentPlatform?.name]);

  /**
   * Generate content
   */
  const handleGenerateContent = useCallback(async () => {
    if (!inputContent.trim()) {
      message.warning('Please enter content to generate posts');
      return;
    }

    setLoading(true);
    setError(null);
    setProgress(0);
    setProgressText('Starting content generation...');

    const progressInterval = simulateProgress();

    try {
      // 创建请求对象
      const request: SocialMediaContentRequest = {
        id: `social_${Date.now()}`,
        platform: activeTab,
        inputContent: inputContent.trim(),
        contentType,
        tone,
        writingTechnique,
        successFactor,
        ...(targetAudience.trim() && { targetAudience: targetAudience.trim() }),
        ...(keywords.length > 0 && { keywords }),
        createdAt: new Date().toISOString(),
      };

      // 调用实际的webhook API - 增加3分钟超时
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 minutes timeout

      const response = await fetch(currentPlatform?.webhookUrl || '', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform: request.platform,
          inputContent: request.inputContent,
          contentType: request.contentType,
          tone: request.tone,
          writingTechnique: request.writingTechnique,
          successFactor: request.successFactor,
          targetAudience: request.targetAudience,
          keywords: request.keywords,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseText = await response.text();

      // 清理markdown标记并解析JSON
      let cleanedResponseText = responseText;
      if (cleanedResponseText.startsWith('```json')) {
        cleanedResponseText = cleanedResponseText
          .replace(/^```json\s*/, '')
          .replace(/\s*```$/, '');
      }

      let parsedWebhookResponse;
      try {
        const parsedData = JSON.parse(cleanedResponseText);
        console.log('🔍 Webhook parsing - parsedData type:', typeof parsedData);
        console.log('🔍 Webhook parsing - isArray:', Array.isArray(parsedData));

        // 如果返回的是数组，取第一个元素
        if (Array.isArray(parsedData) && parsedData.length > 0) {
          console.log(
            '🔍 Webhook parsing - extracting from array, has json key:',
            !!parsedData[0].json
          );
          parsedWebhookResponse = parsedData[0]?.json || parsedData[0];
        } else if (parsedData.json) {
          // 如果是包含json属性的对象
          console.log('🔍 Webhook parsing - extracting from json property');
          parsedWebhookResponse = parsedData.json;
        } else {
          // 直接就是数据对象
          console.log('🔍 Webhook parsing - using data directly');
          parsedWebhookResponse = parsedData;
        }

        console.log(
          '🔍 Webhook parsing - final keys:',
          Object.keys(parsedWebhookResponse || {})
        );
        console.log(
          '🔍 Webhook parsing - has linkedin_post:',
          !!parsedWebhookResponse?.linkedin_post
        );
        console.log(
          '🔍 Webhook parsing - has quick_publish:',
          !!parsedWebhookResponse?.quick_publish
        );

        // 验证数据结构 - 适配新的数据格式，保留所有可能的字段
        if (
          !parsedWebhookResponse.single_tweet &&
          !parsedWebhookResponse.thread &&
          !parsedWebhookResponse.content &&
          !parsedWebhookResponse.linkedin_post &&
          !parsedWebhookResponse.instagram_post &&
          !parsedWebhookResponse.facebook_post
        ) {
          console.warn('Webhook响应数据结构不完整，使用备用格式');
          // 如果数据结构不完整，保留所有现有字段并添加基础结构
          parsedWebhookResponse = {
            content: cleanedResponseText,
            hashtags: parsedWebhookResponse.hashtags || [],
            engagement:
              parsedWebhookResponse.engagement ||
              parsedWebhookResponse.engagement_optimization ||
              {},
            analytics: parsedWebhookResponse.analytics || {},
            optimization: parsedWebhookResponse.optimization || {},
            // 保留所有其他可能存在的字段
            alternative_versions: parsedWebhookResponse.alternative_versions,
            hashtag_strategy: parsedWebhookResponse.hashtag_strategy,
            research_data: parsedWebhookResponse.research_data,
            analysis: parsedWebhookResponse.analysis,
            search_enhanced_data: parsedWebhookResponse.search_enhanced_data,
            performance:
              parsedWebhookResponse.performance ||
              parsedWebhookResponse.performance_prediction,
            visual_strategy: parsedWebhookResponse.visual_strategy,
            location_tag: parsedWebhookResponse.location_tag,
            mention_suggestions: parsedWebhookResponse.mention_suggestions,
            // 保留平台特定的字段
            linkedin_post: parsedWebhookResponse.linkedin_post,
            instagram_post: parsedWebhookResponse.instagram_post,
            facebook_post: parsedWebhookResponse.facebook_post,
            quick_publish: parsedWebhookResponse.quick_publish,
            generated_at: parsedWebhookResponse.generated_at,
            ...parsedWebhookResponse, // 保留所有其他字段
          };
        }
      } catch (error) {
        console.error('❌ JSON parsing failed:', error);
        // 如果JSON解析失败，尝试将整个响应作为内容处理
        console.warn('⚠️ Using fallback: treating response as raw content');
        parsedWebhookResponse = {
          content: cleanedResponseText,
          error: 'JSON parsing failed',
          rawResponse: cleanedResponseText,
        };
      }

      setWebhookResponse(parsedWebhookResponse);

      // Debug logging for data processing
      console.log('Data Processing Debug - activeTab:', activeTab);
      console.log(
        'Data Processing Debug - parsedWebhookResponse keys:',
        Object.keys(parsedWebhookResponse || {})
      );

      // 创建兼容的响应对象 - 适配新的数据格式
      let generatedContent = '';
      let hashtags: string[] = [];

      if (activeTab === 'twitter' && parsedWebhookResponse.single_tweet) {
        // Twitter单条推文格式
        generatedContent =
          parsedWebhookResponse.single_tweet.ready_to_post ||
          parsedWebhookResponse.single_tweet.content;
        hashtags = parsedWebhookResponse.hashtag_strategy?.all_tags_string
          ? parsedWebhookResponse.hashtag_strategy.all_tags_string
              .split(' ')
              .filter((tag: string) => tag.startsWith('#'))
          : parsedWebhookResponse.single_tweet.hashtags
            ? parsedWebhookResponse.single_tweet.hashtags
                .split(' ')
                .filter((tag: string) => tag.startsWith('#'))
            : [];
      } else if (activeTab === 'twitter' && parsedWebhookResponse.thread) {
        // Twitter线程格式 - 使用第一个推文作为主要内容
        generatedContent = parsedWebhookResponse.thread.ready_to_post
          ? parsedWebhookResponse.thread.ready_to_post[0]
          : parsedWebhookResponse.thread.tweets
            ? parsedWebhookResponse.thread.tweets[0]
            : cleanedResponseText;
        hashtags = parsedWebhookResponse.hashtag_strategy?.all_tags_string
          ? parsedWebhookResponse.hashtag_strategy.all_tags_string
              .split(' ')
              .filter((tag: string) => tag.startsWith('#'))
          : [];
      } else if (
        activeTab === 'linkedin' &&
        (parsedWebhookResponse.linkedin_post ||
          parsedWebhookResponse.quick_publish)
      ) {
        // LinkedIn格式 - 处理嵌套数据结构
        console.log('Data Processing Debug - LinkedIn section entered');
        const linkedinPost = parsedWebhookResponse.linkedin_post;
        const quickPublish = parsedWebhookResponse.quick_publish;

        console.log('Data Processing Debug - linkedinPost:', linkedinPost);
        console.log('Data Processing Debug - quickPublish:', quickPublish);

        // 优先级：quick_publish.post_ready > linkedin_post.ready_to_post > linkedin_post.content
        generatedContent =
          quickPublish?.post_ready ||
          linkedinPost?.ready_to_post ||
          linkedinPost?.content ||
          '';

        console.log(
          'Data Processing Debug - generatedContent:',
          generatedContent
        );
        console.log(
          'Data Processing Debug - generatedContent length:',
          generatedContent?.length
        );

        // 处理标签策略
        const hashtagStrategy = parsedWebhookResponse.hashtag_strategy;
        const allTagsString = hashtagStrategy?.all_tags_string || '';

        if (allTagsString) {
          hashtags = allTagsString
            .split(' ')
            .filter((tag: string) => tag.startsWith('#'));
        } else if (linkedinPost?.hashtags) {
          hashtags = linkedinPost.hashtags
            .split(' ')
            .filter((tag: string) => tag.startsWith('#'));
        } else if (hashtagStrategy?.industry_tags) {
          hashtags = hashtagStrategy.industry_tags.filter((tag: string) =>
            tag.startsWith('#')
          );
        } else if (hashtagStrategy?.content_tags) {
          hashtags = hashtagStrategy.content_tags.filter((tag: string) =>
            tag.startsWith('#')
          );
        } else {
          hashtags = [];
        }
      } else if (
        activeTab === 'instagram' &&
        (parsedWebhookResponse.instagram_post ||
          parsedWebhookResponse.quick_publish)
      ) {
        // Instagram格式 - 处理嵌套数据结构
        console.log('Data Processing Debug - Instagram section entered');
        const instagramPost = parsedWebhookResponse.instagram_post;
        const quickPublish = parsedWebhookResponse.quick_publish;

        console.log('Data Processing Debug - instagramPost:', instagramPost);
        console.log('Data Processing Debug - quickPublish:', quickPublish);

        // 优先级：quick_publish.full_post_ready > quick_publish.caption_ready > instagram_post.ready_to_post > instagram_post.full_caption
        generatedContent =
          quickPublish?.full_post_ready ||
          quickPublish?.caption_ready ||
          instagramPost?.ready_to_post ||
          instagramPost?.full_caption ||
          '';

        console.log(
          'Data Processing Debug - generatedContent:',
          generatedContent
        );
        console.log(
          'Data Processing Debug - generatedContent length:',
          generatedContent?.length
        );

        // 处理标签策略 - Instagram有专门的hashtags对象
        const hashtagsObj = parsedWebhookResponse.hashtags;
        if (hashtagsObj?.all_hashtags_formatted) {
          hashtags = hashtagsObj.all_hashtags_formatted
            .split(' ')
            .filter((tag: string) => tag.startsWith('#'));
        } else if (hashtagsObj?.all_tags_string) {
          hashtags = hashtagsObj.all_tags_string
            .split(' ')
            .filter((tag: string) => tag.startsWith('#'));
        } else if (hashtagsObj?.large) {
          hashtags = hashtagsObj.large.filter((tag: string) =>
            tag.startsWith('#')
          );
        } else if (hashtagsObj?.medium) {
          hashtags = [
            ...(hashtagsObj.medium || []),
            ...(hashtagsObj.small || []),
          ].filter((tag: string) => tag.startsWith('#'));
        } else {
          hashtags = [];
        }
      } else if (
        activeTab === 'facebook' &&
        (parsedWebhookResponse.facebook_post ||
          parsedWebhookResponse.quick_publish)
      ) {
        // Facebook格式 - 处理嵌套数据结构
        console.log('Data Processing Debug - Facebook section entered');
        const facebookPost = parsedWebhookResponse.facebook_post;
        const quickPublish = parsedWebhookResponse.quick_publish;

        console.log('Data Processing Debug - facebookPost:', facebookPost);
        console.log('Data Processing Debug - quickPublish:', quickPublish);

        // 优先级：quick_publish.post_ready > facebook_post.ready_to_post > facebook_post.content
        generatedContent =
          quickPublish?.post_ready ||
          facebookPost?.ready_to_post ||
          facebookPost?.content ||
          '';

        console.log(
          'Data Processing Debug - generatedContent:',
          generatedContent
        );
        console.log(
          'Data Processing Debug - generatedContent length:',
          generatedContent?.length
        );

        // 处理标签策略 - 支持多种格式
        const hashtagStrategy = parsedWebhookResponse.hashtag_strategy;
        const allTagsString = hashtagStrategy?.all_tags_string || '';

        if (allTagsString) {
          hashtags = allTagsString
            .split(' ')
            .filter((tag: string) => tag.startsWith('#'));
        } else if (facebookPost?.hashtags) {
          hashtags = facebookPost.hashtags
            .split(' ')
            .filter((tag: string) => tag.startsWith('#'));
        } else if (hashtagStrategy?.industry_tags) {
          hashtags = hashtagStrategy.industry_tags.filter((tag: string) =>
            tag.startsWith('#')
          );
        } else if (hashtagStrategy?.content_tags) {
          hashtags = hashtagStrategy.content_tags.filter((tag: string) =>
            tag.startsWith('#')
          );
        } else if (hashtagStrategy?.tags) {
          hashtags = hashtagStrategy.tags.filter((tag: string) =>
            tag.startsWith('#')
          );
        } else {
          hashtags = [];
        }
      } else {
        // 通用格式或fallback
        generatedContent =
          parsedWebhookResponse.content ||
          parsedWebhookResponse.post ||
          cleanedResponseText;
        hashtags = parsedWebhookResponse.hashtags || [];
      }

      const apiResponse: SocialMediaContentResponse = {
        id: `response_${Date.now()}`,
        requestId: request.id,
        platform: activeTab,
        generatedContent: generatedContent,
        title:
          parsedWebhookResponse.title ||
          `Generated ${currentPlatform?.name || 'Content'} Post`,
        hashtags: hashtags,
        googleSheetUrl: `https://docs.google.com/spreadsheets/d/api_sheet_id_${Date.now()}`,
        status: 'completed',
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      };

      clearInterval(progressInterval);
      setProgress(100);
      setProgressText('生成完成！');
      setGeneratedResponse(apiResponse);
      onContentGenerated?.(apiResponse);
      message.success('文案生成成功！');
    } catch (err) {
      clearInterval(progressInterval);
      const errorMessage =
        err instanceof Error ? err.message : '生成文案时发生错误';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [
    inputContent,
    activeTab,
    contentType,
    tone,
    writingTechnique,
    successFactor,
    targetAudience,
    keywords,
    currentPlatform,
    simulateProgress,
    onContentGenerated,
  ]);

  /**
   * 复制内容到剪贴板
   */
  const handleCopyContent = useCallback(async () => {
    let contentToCopy = '';

    if (
      activeTab === 'twitter' &&
      selectedTweetType === 'single' &&
      webhookResponse?.quick_publish?.single_tweet_ready
    ) {
      // Twitter单条推文
      contentToCopy = webhookResponse.quick_publish.single_tweet_ready;
    } else if (
      activeTab === 'twitter' &&
      selectedTweetType === 'thread' &&
      webhookResponse?.quick_publish?.thread_ready
    ) {
      // Twitter线程 - 复制第一个推文
      const threadReady = webhookResponse.quick_publish?.thread_ready;
      contentToCopy = Array.isArray(threadReady)
        ? threadReady[0] || ''
        : (threadReady as string) || '';
    } else if (
      activeTab === 'linkedin' &&
      webhookResponse &&
      (webhookResponse.linkedin_post || webhookResponse.quick_publish)
    ) {
      // LinkedIn内容
      contentToCopy =
        webhookResponse.quick_publish?.post_ready ||
        webhookResponse.linkedin_post?.ready_to_post ||
        webhookResponse.linkedin_post?.content ||
        '';
    } else if (
      activeTab === 'instagram' &&
      webhookResponse &&
      (webhookResponse.instagram_post || webhookResponse.quick_publish)
    ) {
      // Instagram内容
      contentToCopy =
        (webhookResponse.quick_publish as any)?.full_post_ready ||
        (webhookResponse.quick_publish as any)?.caption_ready ||
        webhookResponse.instagram_post?.ready_to_post ||
        (webhookResponse.instagram_post as any)?.full_caption ||
        '';
    } else if (
      activeTab === 'facebook' &&
      webhookResponse &&
      (webhookResponse.facebook_post || webhookResponse.quick_publish)
    ) {
      // Facebook内容
      contentToCopy =
        webhookResponse.quick_publish?.post_ready ||
        webhookResponse.facebook_post?.ready_to_post ||
        webhookResponse.facebook_post?.content ||
        '';
    } else if (webhookResponse?.content) {
      contentToCopy = webhookResponse.content;
    } else if (webhookResponse?.post) {
      contentToCopy = webhookResponse.post;
    } else if (generatedResponse?.generatedContent) {
      contentToCopy = generatedResponse.generatedContent;
    }

    if (
      contentToCopy &&
      contentToCopy !== '暂无内容' &&
      contentToCopy !== 'No content available'
    ) {
      try {
        await navigator.clipboard.writeText(contentToCopy);
        message.success('内容已复制到剪贴板');
      } catch (err) {
        message.error('复制失败，请手动复制');
      }
    } else {
      message.warning('No content available to copy');
    }
  }, [generatedResponse, webhookResponse, activeTab, selectedTweetType]);

  /**
   * Regenerate content
   */
  const handleRegenerate = useCallback(() => {
    setGeneratedResponse(null);
    setWebhookResponse(null);
    setError(null);
    setProgress(0);
    setProgressText('');
    setSelectedTweetType('single');
  }, []);

  /**
   * Tab切换处理
   */
  const handleTabChange = (key: string) => {
    setActiveTab(key as 'twitter' | 'linkedin' | 'instagram' | 'facebook');
    // 重置状态 - 内容相关字段设为默认值
    setInputContent('');
    setTargetAudience('');
    setKeywords([]);
    setKeywordInput('');
    setGeneratedResponse(null);
    setWebhookResponse(null);
    setError(null);
    setProgress(0);
    setProgressText('');
    setSelectedTweetType('single');
    // 其他字段会在useEffect中自动设置为对应平台的默认值
  };

  return (
    <>
      <div className={className}>
        <Card
          title='International Social Media Content Generator 国际社交媒体文案生成器'
          size='small'
        >
          <Tabs defaultActiveKey='twitter' onChange={handleTabChange}>
            {Object.entries(platformConfigs).map(([key, config]) => (
              <Tabs.TabPane
                key={key}
                tab={
                  <span>
                    {config.icon}
                    {config.name}
                  </span>
                }
              >
                <Row gutter={[16, 16]} style={{ height: '100%' }}>
                  {/* 输入区域 */}
                  <Col xs={24} lg={12}>
                    <Card
                      title={
                        <Space>
                          {config.icon}
                          <span>{config.name} 内容输入</span>
                        </Space>
                      }
                      size='small'
                      style={{ display: 'flex', flexDirection: 'column' }}
                    >
                      <Space
                        direction='vertical'
                        style={{ width: '100%', flex: 1 }}
                        size='middle'
                      >
                        {/* 主要内容输入 */}
                        <div>
                          <Text strong>输入内容 *</Text>
                          <TextArea
                            value={inputContent}
                            onChange={e => setInputContent(e.target.value)}
                            placeholder={config.placeholder}
                            rows={12}
                            maxLength={config.maxLength}
                            style={{
                              marginTop: 8,
                              height: 'auto',
                              minHeight: '300px',
                              resize: 'vertical',
                            }}
                            className='social-media-textarea'
                          />
                        </div>

                        {/* 内容类型选择 */}
                        <div>
                          <Text strong>内容类型</Text>
                          <Select
                            value={contentType}
                            onChange={setContentType}
                            style={{ width: '100%', marginTop: 8 }}
                            placeholder='请选择内容类型'
                          >
                            {config.contentTypes.map(type => (
                              <Option key={type.value} value={type.value}>
                                {type.emoji} {type.label}
                              </Option>
                            ))}
                          </Select>
                        </div>

                        {/* 语调选择 */}
                        <div>
                          <Text strong>语调风格</Text>
                          <Select
                            value={tone}
                            onChange={setTone}
                            style={{ width: '100%', marginTop: 8 }}
                            placeholder='请选择语调风格'
                          >
                            {config.toneOptions.map(toneOption => (
                              <Option
                                key={toneOption.value}
                                value={toneOption.value}
                              >
                                {toneOption.emoji} {toneOption.label}
                              </Option>
                            ))}
                          </Select>
                        </div>

                        {/* 文案技巧 */}
                        <div>
                          <Text strong>文案技巧</Text>
                          <Select
                            value={writingTechnique}
                            onChange={setWritingTechnique}
                            placeholder='选择文案技巧'
                            style={{ width: '100%', marginTop: 8 }}
                          >
                            {config.techniqueOptions.map(technique => (
                              <Option
                                key={technique.value}
                                value={technique.value}
                              >
                                {technique.emoji} {technique.label}
                              </Option>
                            ))}
                          </Select>
                        </div>

                        {/* 成功要素 */}
                        <div>
                          <Text strong>成功要素</Text>
                          <Select
                            value={successFactor}
                            onChange={setSuccessFactor}
                            placeholder='选择成功要素'
                            style={{ width: '100%', marginTop: 8 }}
                          >
                            {config.successFactors.map(factor => (
                              <Option key={factor.value} value={factor.value}>
                                {factor.emoji} {factor.label}
                              </Option>
                            ))}
                          </Select>
                        </div>

                        {/* 目标受众 */}
                        <div>
                          <Text strong>目标受众 (可选)</Text>
                          <Input
                            value={targetAudience}
                            onChange={e => setTargetAudience(e.target.value)}
                            placeholder='例如：年轻专业人士、创业者、学生等'
                            style={{ marginTop: 8 }}
                          />
                        </div>

                        {/* 关键词标签 */}
                        <div>
                          <Text strong>关键词标签 (可选)</Text>
                          <div style={{ marginTop: 8 }}>
                            <Space.Compact style={{ width: '100%' }}>
                              <Input
                                value={keywordInput}
                                onChange={e => setKeywordInput(e.target.value)}
                                placeholder='添加关键词'
                                onPressEnter={handleAddKeyword}
                              />
                              <Button onClick={handleAddKeyword}>添加</Button>
                            </Space.Compact>
                            {keywords.length > 0 && (
                              <div style={{ marginTop: 8 }}>
                                {keywords.map(keyword => (
                                  <Tag
                                    key={keyword}
                                    closable
                                    onClose={() => handleRemoveKeyword(keyword)}
                                    style={{ marginBottom: 4 }}
                                  >
                                    {keyword}
                                  </Tag>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 生成按钮 */}
                        <Button
                          type='primary'
                          icon={<SendOutlined />}
                          onClick={handleGenerateContent}
                          loading={loading}
                          disabled={!inputContent.trim()}
                          size='large'
                          style={{ width: '100%' }}
                        >
                          {loading ? '生成中...' : `生成${config.name}文案`}
                        </Button>
                      </Space>
                    </Card>
                  </Col>

                  {/* 结果展示区域 */}
                  <Col xs={24} lg={12}>
                    <Card
                      title={
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <Space>
                            <LinkOutlined />
                            <span>Generation Results</span>
                          </Space>
                          {generatedResponse && (
                            <Button
                              type='link'
                              icon={<LinkOutlined />}
                              onClick={() =>
                                window.open(
                                  'https://docs.google.com/spreadsheets/d/1KdeZ31PaL2p8Uswj2ILo2ewPmkQ_xag56Db0yq3v6qE/edit?usp=sharing',
                                  '_blank'
                                )
                              }
                              style={{ padding: 0 }}
                            >
                              查看Google Sheet
                            </Button>
                          )}
                        </div>
                      }
                      size='small'
                      style={{
                        overflow: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                      extra={
                        generatedResponse && (
                          <Space>
                            <Button
                              type='text'
                              icon={<CopyOutlined />}
                              onClick={handleCopyContent}
                              size='small'
                            >
                              复制
                            </Button>
                            <Button
                              type='text'
                              icon={<ReloadOutlined />}
                              onClick={handleRegenerate}
                              size='small'
                            >
                              Regenerate
                            </Button>
                          </Space>
                        )
                      }
                    >
                      {loading && (
                        <div style={{ textAlign: 'center', padding: '20px' }}>
                          <Spin size='large' />
                          <div style={{ marginTop: 16 }}>
                            <Progress percent={progress} size='small' />
                            <Text
                              type='secondary'
                              style={{ display: 'block', marginTop: 8 }}
                            >
                              {progressText}
                            </Text>
                          </div>
                        </div>
                      )}

                      {error && (
                        <Alert
                          message='生成失败'
                          description={error}
                          type='error'
                          showIcon
                          style={{ marginBottom: 16 }}
                        />
                      )}

                      {webhookResponse && !loading && (
                        <Space
                          direction='vertical'
                          style={{ width: '100%', flex: 1 }}
                          size='middle'
                        >
                          {/* 主要内容 */}
                          <Card
                            size='small'
                            title={`📱 ${config.name} 发布内容`}
                            style={{ backgroundColor: '#fff7ed' }}
                          >
                            <div style={{ marginBottom: '16px' }}>
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  marginBottom: 8,
                                }}
                              >
                                <Text strong style={{ color: '#ea580c' }}>
                                  Publish Version:
                                </Text>
                                {activeTab === 'twitter' &&
                                  webhookResponse.quick_publish && (
                                    <div style={{ display: 'flex', gap: 8 }}>
                                      <Button
                                        size='small'
                                        type={
                                          selectedTweetType === 'single'
                                            ? 'primary'
                                            : 'default'
                                        }
                                        onClick={() =>
                                          setSelectedTweetType('single')
                                        }
                                      >
                                        单条推文
                                      </Button>
                                      <Button
                                        size='small'
                                        type={
                                          selectedTweetType === 'thread'
                                            ? 'primary'
                                            : 'default'
                                        }
                                        onClick={() =>
                                          setSelectedTweetType('thread')
                                        }
                                      >
                                        线程
                                      </Button>
                                    </div>
                                  )}
                              </div>
                              <Card
                                size='small'
                                style={{
                                  marginTop: 8,
                                  backgroundColor: '#fef3c7',
                                }}
                                styles={{ body: { padding: '12px' } }}
                              >
                                <Paragraph
                                  style={{
                                    whiteSpace: 'pre-wrap',
                                    margin: 0,
                                    fontSize: '14px',
                                    lineHeight: '1.6',
                                  }}
                                >
                                  {(() => {
                                    // Simple and direct content extraction logic
                                    console.log(
                                      '🔍 Content extraction - activeTab:',
                                      activeTab
                                    );
                                    console.log(
                                      '🔍 Content extraction - webhookResponse type:',
                                      typeof webhookResponse
                                    );
                                    console.log(
                                      '🔍 Content extraction - isArray:',
                                      Array.isArray(webhookResponse)
                                    );

                                    // Handle webhookResponse - it should already be parsed JSON
                                    let processedResponse = webhookResponse;

                                    // If it's still a raw JSON string, parse it
                                    if (typeof webhookResponse === 'string') {
                                      try {
                                        const parsed =
                                          JSON.parse(webhookResponse);
                                        processedResponse = parsed;
                                        console.log(
                                          '✅ Parsed webhookResponse from string'
                                        );
                                      } catch (e) {
                                        console.log(
                                          '❌ Failed to parse webhookResponse string'
                                        );
                                        return 'Error: Invalid response format';
                                      }
                                    }

                                    // Handle array format [{"json": {...}}]
                                    if (
                                      Array.isArray(processedResponse) &&
                                      processedResponse.length > 0
                                    ) {
                                      if (processedResponse[0]?.json) {
                                        processedResponse =
                                          processedResponse[0].json;
                                        console.log(
                                          '✅ Extracted json from array format'
                                        );
                                      } else {
                                        processedResponse =
                                          processedResponse[0];
                                        console.log(
                                          '✅ Using first array element'
                                        );
                                      }
                                    }

                                    console.log(
                                      '🔍 Final processedResponse keys:',
                                      Object.keys(processedResponse || {})
                                    );

                                    // Direct content extraction based on platform
                                    let content = '';

                                    if (activeTab === 'twitter') {
                                      if (selectedTweetType === 'single') {
                                        content =
                                          processedResponse?.quick_publish
                                            ?.single_tweet_ready ||
                                          processedResponse?.single_tweet
                                            ?.ready_to_post ||
                                          processedResponse?.single_tweet
                                            ?.content ||
                                          '';
                                      } else {
                                        const thread =
                                          processedResponse?.quick_publish
                                            ?.thread_ready ||
                                          processedResponse?.thread
                                            ?.ready_to_post ||
                                          processedResponse?.thread?.tweets;
                                        content = Array.isArray(thread)
                                          ? thread[0] || ''
                                          : thread || '';
                                      }
                                    } else if (activeTab === 'linkedin') {
                                      content =
                                        processedResponse?.quick_publish
                                          ?.post_ready ||
                                        processedResponse?.linkedin_post
                                          ?.ready_to_post ||
                                        processedResponse?.linkedin_post
                                          ?.content ||
                                        '';
                                    } else if (activeTab === 'instagram') {
                                      // Instagram content extraction with fallback logic
                                      const quickPublish =
                                        processedResponse?.quick_publish;
                                      const instagramPost =
                                        processedResponse?.instagram_post;

                                      // Priority order for Instagram content - use correct property names
                                      content =
                                        (quickPublish as any)
                                          ?.full_post_ready ||
                                        (quickPublish as any)?.caption_ready ||
                                        instagramPost?.ready_to_post ||
                                        (instagramPost as any)?.full_caption ||
                                        processedResponse?.content ||
                                        '';

                                      console.log(
                                        '🔍 Instagram extraction - quick_publish:',
                                        !!quickPublish
                                      );
                                      console.log(
                                        '🔍 Instagram extraction - instagram_post:',
                                        !!instagramPost
                                      );
                                      console.log(
                                        '🔍 Instagram extraction - final content length:',
                                        content?.length
                                      );
                                    } else if (activeTab === 'facebook') {
                                      console.log(
                                        '🔍 Facebook extraction - checking quick_publish:',
                                        !!(processedResponse as any)
                                          ?.quick_publish
                                      );
                                      console.log(
                                        '🔍 Facebook extraction - checking facebook_post:',
                                        !!(processedResponse as any)
                                          ?.facebook_post
                                      );
                                      console.log(
                                        '🔍 Facebook extraction - checking alternative_versions:',
                                        !!(processedResponse as any)
                                          ?.alternative_versions
                                      );

                                      content =
                                        (processedResponse as any)
                                          ?.quick_publish?.post_ready ||
                                        (processedResponse as any)
                                          ?.facebook_post?.ready_to_post ||
                                        (processedResponse as any)
                                          ?.facebook_post?.content ||
                                        '';

                                      console.log(
                                        '🔍 Facebook extraction - main content length:',
                                        content?.length
                                      );

                                      // Facebook fallback: check alternative_versions
                                      if (!content || content.length < 50) {
                                        console.log(
                                          '🔍 Facebook extraction - checking alternative_versions fallback'
                                        );
                                        const alternatives = (
                                          processedResponse as any
                                        )?.alternative_versions;
                                        if (
                                          Array.isArray(alternatives) &&
                                          alternatives.length > 0
                                        ) {
                                          const firstAlt = alternatives[0];
                                          const altContent =
                                            firstAlt?.content ||
                                            firstAlt?.post ||
                                            firstAlt?.text;
                                          if (altContent) {
                                            content = altContent;
                                            console.log(
                                              '✅ Facebook extraction - found content in alternative_versions[0]'
                                            );
                                          }
                                        }
                                      }
                                    }

                                    // Validate content (basic validation only)
                                    const isValidContent =
                                      content &&
                                      typeof content === 'string' &&
                                      content.length > 5 && // Very minimal length check
                                      !content.includes('Content generating') &&
                                      !content.includes('content generating');

                                    console.log(
                                      '✅ Final content extracted:',
                                      isValidContent
                                        ? content.substring(0, 100) + '...'
                                        : 'INVALID'
                                    );
                                    console.log(
                                      '✅ Content valid:',
                                      isValidContent
                                    );

                                    // If content exists and is a string, display it immediately
                                    if (
                                      content &&
                                      typeof content === 'string' &&
                                      content.length > 5
                                    ) {
                                      return content;
                                    }

                                    return 'Content generating... Please wait for the webhook response to complete.';
                                  })()}
                                </Paragraph>
                              </Card>
                            </div>

                            {/* Twitter 线程显示 */}
                            {activeTab === 'twitter' &&
                              webhookResponse.quick_publish?.thread_ready && (
                                <div style={{ marginTop: '16px' }}>
                                  <Text strong style={{ color: '#ea580c' }}>
                                    Twitter 线程：
                                  </Text>
                                  <div style={{ marginTop: 8 }}>
                                    {Array.isArray(
                                      webhookResponse.quick_publish.thread_ready
                                    ) &&
                                      webhookResponse.quick_publish.thread_ready.map(
                                        (tweet: string, index: number) => (
                                          <Card
                                            key={index}
                                            size='small'
                                            style={{
                                              marginBottom: 8,
                                              backgroundColor:
                                                index === 0
                                                  ? '#fef3c7'
                                                  : '#f9fafb',
                                              border:
                                                index === 0
                                                  ? '2px solid #f59e0b'
                                                  : '1px solid #e5e7eb',
                                            }}
                                            styles={{
                                              body: { padding: '8px 12px' },
                                            }}
                                          >
                                            <div
                                              style={{
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                              }}
                                            >
                                              <Text
                                                strong
                                                style={{
                                                  color: '#059669',
                                                  marginRight: 8,
                                                  minWidth: '20px',
                                                }}
                                              >
                                                {index + 1}.
                                              </Text>
                                              <Paragraph
                                                style={{
                                                  whiteSpace: 'pre-wrap',
                                                  margin: 0,
                                                  fontSize: '13px',
                                                  lineHeight: '1.5',
                                                  flex: 1,
                                                }}
                                                copyable={{ text: tweet }}
                                              >
                                                {tweet}
                                              </Paragraph>
                                            </div>
                                          </Card>
                                        )
                                      )}
                                  </div>
                                </div>
                              )}
                          </Card>

                          {/* 标签策略 */}
                          {webhookResponse.hashtag_strategy && (
                            <Card
                              size='small'
                              title='🏷️ Hashtag Strategy'
                              style={{ backgroundColor: '#f0f9ff' }}
                            >
                              <Row gutter={[8, 8]}>
                                {/* 标签策略 */}
                                {webhookResponse.hashtag_strategy && (
                                  <Col span={24}>
                                    <div
                                      style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: 8,
                                      }}
                                    >
                                      <Text strong>Recommended Tags:</Text>
                                      <Button
                                        size='small'
                                        type='text'
                                        icon={<CopyOutlined />}
                                        onClick={() => {
                                          const hashtagStrategy =
                                            webhookResponse.hashtag_strategy;
                                          const allTagsString =
                                            hashtagStrategy?.all_tags_string ||
                                            '';
                                          const industryTags =
                                            hashtagStrategy?.industry || [];
                                          const contentTags =
                                            hashtagStrategy?.content || [];
                                          const brandTag =
                                            hashtagStrategy?.brand ||
                                            hashtagStrategy?.brand_tag;

                                          const allTags = [];

                                          if (allTagsString) {
                                            allTags.push(
                                              ...allTagsString
                                                .split(' ')
                                                .filter((tag: string) =>
                                                  tag.trim()
                                                )
                                            );
                                          }
                                          if (Array.isArray(industryTags)) {
                                            allTags.push(...industryTags);
                                          }
                                          if (Array.isArray(contentTags)) {
                                            allTags.push(...contentTags);
                                          }
                                          if (brandTag) {
                                            allTags.push(brandTag);
                                          }

                                          const uniqueTags = [
                                            ...new Set(allTags),
                                          ].join(' ');
                                          navigator.clipboard.writeText(
                                            uniqueTags
                                          );
                                          message.success('标签已复制');
                                        }}
                                      >
                                        Copy Tags
                                      </Button>
                                    </div>
                                    <div style={{ marginTop: 4 }}>
                                      {(() => {
                                        const hashtagStrategy =
                                          webhookResponse.hashtag_strategy;
                                        const allTagsString =
                                          hashtagStrategy?.all_tags_string ||
                                          '';
                                        const industryTags =
                                          hashtagStrategy?.industry || [];
                                        const contentTags =
                                          hashtagStrategy?.content || [];
                                        const brandTag =
                                          hashtagStrategy?.brand ||
                                          hashtagStrategy?.brand_tag;

                                        const allTags = [];

                                        // 从 all_tags_string 中提取所有标签 - 处理多种格式
                                        if (allTagsString) {
                                          // 如果包含双井号但没有空格，尝试分割
                                          if (
                                            allTagsString.includes('##') &&
                                            !allTagsString.includes(' ##')
                                          ) {
                                            // 处理连续的##格式，如 "##n8n##AutomationTips##LearningToAutomate"
                                            const tags = allTagsString
                                              .split('##')
                                              .filter(tag => tag.trim())
                                              .map(tag => `#${tag}`);
                                            allTags.push(...tags);
                                          } else {
                                            // 正常空格分割
                                            allTags.push(
                                              ...allTagsString
                                                .split(' ')
                                                .filter((tag: string) =>
                                                  tag.trim()
                                                )
                                            );
                                          }
                                        }

                                        // 添加行业标签
                                        if (Array.isArray(industryTags)) {
                                          allTags.push(...industryTags);
                                        }

                                        // 添加内容标签
                                        if (Array.isArray(contentTags)) {
                                          allTags.push(...contentTags);
                                        }

                                        // 添加品牌标签
                                        if (brandTag) {
                                          allTags.push(brandTag);
                                        }

                                        // 去重并显示
                                        const uniqueTags = [
                                          ...new Set(allTags),
                                        ].filter(tag => tag && tag !== '#');
                                        return uniqueTags.map(
                                          (tag: string, index: number) => (
                                            <Tag
                                              key={index}
                                              color={
                                                tag.startsWith('#')
                                                  ? 'blue'
                                                  : 'purple'
                                              }
                                              style={{ marginBottom: 4 }}
                                            >
                                              {tag}
                                            </Tag>
                                          )
                                        );
                                      })()}
                                    </div>
                                  </Col>
                                )}
                              </Row>
                            </Card>
                          )}

                          {/* Performance Metrics - Twitter */}
                          {activeTab === 'twitter' &&
                            ((webhookResponse as any).performance ||
                              (webhookResponse as any).raw_output
                                ?.performance_prediction ||
                              (webhookResponse as any).quick_publish
                                ?.engagement_score) && (
                              <Card
                                size='small'
                                title='📊 Performance Metrics'
                                style={{ backgroundColor: '#f0fdf4' }}
                              >
                                <Row gutter={[8, 8]}>
                                  <Col span={12}>
                                    <Text strong>Engagement Potential:</Text>
                                    <div
                                      style={{
                                        padding: '6px 10px',
                                        backgroundColor: '#dcfce7',
                                        borderRadius: '6px',
                                        marginTop: '4px',
                                        fontSize: '12px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                      }}
                                    >
                                      <span>
                                        🎯{' '}
                                        {String(
                                          (webhookResponse as any).performance
                                            ?.engagement_potential ||
                                            (webhookResponse as any).raw_output
                                              ?.performance_prediction
                                              ?.engagement_potential ||
                                            (webhookResponse as any)
                                              .quick_publish
                                              ?.engagement_score ||
                                            'N/A'
                                        )}
                                        /10
                                      </span>
                                      <Tag
                                        color={
                                          Number(
                                            (webhookResponse as any).performance
                                              ?.engagement_potential ||
                                              (webhookResponse as any)
                                                .raw_output
                                                ?.performance_prediction
                                                ?.engagement_potential ||
                                              (webhookResponse as any)
                                                .quick_publish
                                                ?.engagement_score ||
                                              5
                                          ) >= 8
                                            ? 'green'
                                            : 'orange'
                                        }
                                      >
                                        {String(
                                          (webhookResponse as any).performance
                                            ?.engagement_label || 'Medium'
                                        )}
                                      </Tag>
                                    </div>
                                  </Col>
                                  <Col span={12}>
                                    <Text strong>Save Potential:</Text>
                                    <div
                                      style={{
                                        padding: '6px 10px',
                                        backgroundColor: '#dbeafe',
                                        borderRadius: '6px',
                                        marginTop: '4px',
                                        fontSize: '12px',
                                      }}
                                    >
                                      💾{' '}
                                      {String(
                                        (webhookResponse as any).performance
                                          ?.save_potential ||
                                          (webhookResponse as any).raw_output
                                            ?.performance_prediction
                                            ?.save_potential ||
                                          'N/A'
                                      )}
                                      /10
                                    </div>
                                  </Col>
                                  <Col span={24}>
                                    <Text strong>Viral Factors:</Text>
                                    <div
                                      style={{
                                        padding: '6px 10px',
                                        backgroundColor: '#fef3c7',
                                        borderRadius: '6px',
                                        marginTop: '4px',
                                        fontSize: '12px',
                                      }}
                                    >
                                      🚀{' '}
                                      {String(
                                        (webhookResponse as any).performance
                                          ?.viral_factors ||
                                          (webhookResponse as any).raw_output
                                            ?.performance_prediction
                                            ?.viral_factors ||
                                          'No data available'
                                      )}
                                    </div>
                                  </Col>
                                  <Col span={24}>
                                    <Text strong>Optimization Notes:</Text>
                                    <div
                                      style={{
                                        padding: '6px 10px',
                                        backgroundColor: '#f3e8ff',
                                        borderRadius: '6px',
                                        marginTop: '4px',
                                        fontSize: '12px',
                                      }}
                                    >
                                      💡{' '}
                                      {String(
                                        (webhookResponse as any).performance
                                          ?.optimization_notes ||
                                          (webhookResponse as any).raw_output
                                            ?.performance_prediction
                                            ?.optimization_notes ||
                                          'No optimization notes available'
                                      )}
                                    </div>
                                  </Col>
                                </Row>
                              </Card>
                            )}

                          {/* Content Analysis - Twitter */}
                          {activeTab === 'twitter' &&
                            ((webhookResponse as any).analysis ||
                              (webhookResponse as any).raw_output
                                ?.content_analysis) && (
                              <Card
                                size='small'
                                title='🔍 Content Analysis'
                                style={{ backgroundColor: '#fef7ff' }}
                              >
                                <Row gutter={[8, 8]}>
                                  <Col span={24}>
                                    <Text strong>Core Themes:</Text>
                                    <div style={{ marginTop: '4px' }}>
                                      {(
                                        (webhookResponse as any).analysis
                                          ?.core_themes ||
                                        (webhookResponse as any).raw_output
                                          ?.content_analysis?.core_themes ||
                                        []
                                      ).map((theme: string, index: number) => (
                                        <Tag
                                          key={index}
                                          color='purple'
                                          style={{ marginBottom: 4 }}
                                        >
                                          {theme}
                                        </Tag>
                                      ))}
                                    </div>
                                  </Col>
                                  <Col span={24}>
                                    <Text strong>Visual Potential:</Text>
                                    <div
                                      style={{
                                        padding: '6px 10px',
                                        backgroundColor: '#f0fdf4',
                                        borderRadius: '6px',
                                        marginTop: '4px',
                                        fontSize: '12px',
                                      }}
                                    >
                                      📈{' '}
                                      {String(
                                        (webhookResponse as any).analysis
                                          ?.visual_potential ||
                                          (webhookResponse as any).raw_output
                                            ?.content_analysis
                                            ?.visual_potential ||
                                          'No data available'
                                      )}
                                    </div>
                                  </Col>
                                  <Col span={24}>
                                    <Text strong>Emotional Appeal:</Text>
                                    <div
                                      style={{
                                        padding: '6px 10px',
                                        backgroundColor: '#fdf4ff',
                                        borderRadius: '6px',
                                        marginTop: '4px',
                                        fontSize: '12px',
                                      }}
                                    >
                                      ❤️{' '}
                                      {String(
                                        (webhookResponse as any).analysis
                                          ?.emotional_appeal ||
                                          (webhookResponse as any).raw_output
                                            ?.content_analysis
                                            ?.emotional_appeal ||
                                          'No data available'
                                      )}
                                    </div>
                                  </Col>
                                </Row>
                              </Card>
                            )}

                          {/* Quick Publish Info - Twitter */}
                          {activeTab === 'twitter' &&
                            (webhookResponse as any).quick_publish && (
                              <Card
                                size='small'
                                title='⚡ Quick Publish Info'
                                style={{ backgroundColor: '#fff7ed' }}
                              >
                                <Row gutter={[8, 8]}>
                                  <Col span={24}>
                                    <div
                                      style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: 8,
                                      }}
                                    >
                                      <Text strong>Ready-to-Post Content:</Text>
                                      <Button
                                        size='small'
                                        type='text'
                                        icon={<CopyOutlined />}
                                        onClick={() => {
                                          const quickPublish = (
                                            webhookResponse as any
                                          ).quick_publish;
                                          let fullContent = '';

                                          if (
                                            selectedTweetType === 'single' &&
                                            quickPublish.single_tweet_ready
                                          ) {
                                            fullContent = `${quickPublish.single_tweet_ready}\n\n${quickPublish.hashtags_ready || ''}`;
                                          } else if (
                                            selectedTweetType === 'thread' &&
                                            quickPublish.thread_ready
                                          ) {
                                            const threadContent = Array.isArray(
                                              quickPublish.thread_ready
                                            )
                                              ? quickPublish.thread_ready.join(
                                                  '\n\n'
                                                )
                                              : quickPublish.thread_ready;
                                            fullContent = `${threadContent}\n\n${quickPublish.hashtags_ready || ''}`;
                                          }

                                          navigator.clipboard.writeText(
                                            fullContent
                                          );
                                          message.success(
                                            'Ready-to-post content copied'
                                          );
                                        }}
                                      />
                                    </div>
                                    <Card
                                      size='small'
                                      style={{
                                        backgroundColor: '#fef3c7',
                                        marginBottom: 8,
                                      }}
                                      styles={{ body: { padding: '12px' } }}
                                    >
                                      <Paragraph
                                        style={{
                                          whiteSpace: 'pre-wrap',
                                          margin: 0,
                                          fontSize: '14px',
                                          lineHeight: '1.6',
                                        }}
                                      >
                                        {selectedTweetType === 'single'
                                          ? (webhookResponse as any)
                                              .quick_publish
                                              ?.single_tweet_ready ||
                                            'No single tweet content'
                                          : Array.isArray(
                                                (webhookResponse as any)
                                                  .quick_publish?.thread_ready
                                              )
                                            ? (webhookResponse as any)
                                                .quick_publish
                                                .thread_ready[0] ||
                                              'No thread content'
                                            : (webhookResponse as any)
                                                .quick_publish?.thread_ready ||
                                              'No thread content'}
                                      </Paragraph>
                                    </Card>
                                  </Col>
                                  <Col span={24}>
                                    <Text strong>Hashtags:</Text>
                                    <div style={{ marginTop: '4px' }}>
                                      {(
                                        webhookResponse as any
                                      ).quick_publish?.hashtags_ready
                                        ?.split(' ')
                                        .map((tag: string, index: number) => (
                                          <Tag
                                            key={index}
                                            color='blue'
                                            style={{ marginBottom: 4 }}
                                          >
                                            {tag}
                                          </Tag>
                                        ))}
                                    </div>
                                  </Col>
                                  <Col span={12}>
                                    <Text strong>Engagement Score:</Text>
                                    <div
                                      style={{
                                        padding: '6px 10px',
                                        backgroundColor: '#dcfce7',
                                        borderRadius: '6px',
                                        marginTop: '4px',
                                        fontSize: '12px',
                                      }}
                                    >
                                      ⭐{' '}
                                      {String(
                                        (webhookResponse as any).quick_publish
                                          ?.engagement_score || 'N/A'
                                      )}
                                      /10
                                    </div>
                                  </Col>
                                  <Col span={12}>
                                    <Text strong>Optimal Time:</Text>
                                    <div
                                      style={{
                                        padding: '6px 10px',
                                        backgroundColor: '#dbeafe',
                                        borderRadius: '6px',
                                        marginTop: '4px',
                                        fontSize: '12px',
                                      }}
                                    >
                                      ⏰{' '}
                                      {String(
                                        (webhookResponse as any).quick_publish
                                          ?.optimal_time || 'No timing data'
                                      )}
                                    </div>
                                  </Col>
                                </Row>
                              </Card>
                            )}

                          {/* 互动和发布时间 */}
                          {((webhookResponse as any).engagement ||
                            (webhookResponse as any)
                              .engagement_optimization) && (
                            <Card
                              size='small'
                              title='💬 Engagement Optimization'
                              style={{ backgroundColor: '#fff7ed' }}
                            >
                              {(() => {
                                const engagementData =
                                  (webhookResponse as any).engagement ||
                                  (webhookResponse as any)
                                    .engagement_optimization;
                                return (
                                  <>
                                    {/* 最佳发布时间 */}
                                    {(engagementData?.optimal_timing ||
                                      engagementData?.optimal_timing) && (
                                      <div style={{ marginBottom: '12px' }}>
                                        <div
                                          style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            marginBottom: 4,
                                          }}
                                        >
                                          <Text strong>Best Posting Time:</Text>
                                          <Button
                                            size='small'
                                            type='text'
                                            icon={<CopyOutlined />}
                                            onClick={() => {
                                              navigator.clipboard.writeText(
                                                engagementData?.optimal_timing ||
                                                  ''
                                              );
                                              message.success('发布时间已复制');
                                            }}
                                          />
                                        </div>
                                        <div
                                          style={{
                                            padding: '6px 10px',
                                            backgroundColor: '#fef3c7',
                                            borderRadius: '6px',
                                            marginTop: '4px',
                                            fontSize: '13px',
                                            display: 'inline-block',
                                          }}
                                        >
                                          ⏰ {engagementData.optimal_timing}
                                        </div>
                                      </div>
                                    )}

                                    {/* 讨论话题 */}
                                    {(engagementData?.discussion_starters ||
                                      engagementData?.cta_suggestions) && (
                                      <div style={{ marginBottom: '12px' }}>
                                        <div
                                          style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            marginBottom: 4,
                                          }}
                                        >
                                          <Text strong>Discussion Topics:</Text>
                                          <Button
                                            size='small'
                                            type='text'
                                            icon={<CopyOutlined />}
                                            onClick={() => {
                                              const topics = Array.isArray(
                                                engagementData?.discussion_starters ||
                                                  engagementData?.cta_suggestions
                                              )
                                                ? (
                                                    engagementData?.discussion_starters ||
                                                    engagementData?.cta_suggestions
                                                  )?.join('\n')
                                                : '';
                                              navigator.clipboard.writeText(
                                                topics || ''
                                              );
                                              message.success(
                                                'Discussion topics copied'
                                              );
                                            }}
                                          />
                                        </div>
                                        <div style={{ marginTop: '4px' }}>
                                          {Array.isArray(
                                            engagementData.discussion_starters ||
                                              engagementData.cta_suggestions
                                          ) &&
                                            (
                                              engagementData.discussion_starters ||
                                              engagementData.cta_suggestions
                                            ).map(
                                              (
                                                starter: string,
                                                index: number
                                              ) => (
                                                <div
                                                  key={index}
                                                  style={{
                                                    padding: '6px 10px',
                                                    backgroundColor: '#dbeafe',
                                                    borderRadius: '6px',
                                                    marginBottom: '6px',
                                                    fontSize: '12px',
                                                  }}
                                                >
                                                  ❓ {starter}
                                                </div>
                                              )
                                            )}
                                        </div>
                                      </div>
                                    )}

                                    {/* 回复模板 */}
                                    {engagementData.reply_templates && (
                                      <div style={{ marginBottom: '12px' }}>
                                        <div
                                          style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            marginBottom: 4,
                                          }}
                                        >
                                          <Text strong>Reply Templates:</Text>
                                          <Button
                                            size='small'
                                            type='text'
                                            icon={<CopyOutlined />}
                                            onClick={() => {
                                              const templates = Array.isArray(
                                                engagementData?.reply_templates
                                              )
                                                ? engagementData?.reply_templates.join(
                                                    '\n\n'
                                                  )
                                                : '';
                                              navigator.clipboard.writeText(
                                                templates || ''
                                              );
                                              message.success(
                                                'Reply templates copied'
                                              );
                                            }}
                                          />
                                        </div>
                                        <div style={{ marginTop: '4px' }}>
                                          {Array.isArray(
                                            engagementData.reply_templates
                                          ) &&
                                            engagementData.reply_templates.map(
                                              (
                                                template: string,
                                                index: number
                                              ) => (
                                                <div
                                                  key={index}
                                                  style={{
                                                    padding: '6px 10px',
                                                    backgroundColor: '#f3e8ff',
                                                    borderRadius: '6px',
                                                    marginBottom: '6px',
                                                    fontSize: '12px',
                                                  }}
                                                >
                                                  💬 {template}
                                                </div>
                                              )
                                            )}
                                        </div>
                                      </div>
                                    )}

                                    {/* 反应提示 */}
                                    {(engagementData?.reaction_prompts ||
                                      engagementData?.reaction_prompts) &&
                                      Array.isArray(
                                        engagementData.reaction_prompts ||
                                          engagementData.reaction_prompts
                                      ) && (
                                        <div style={{ marginBottom: '12px' }}>
                                          <div
                                            style={{
                                              display: 'flex',
                                              justifyContent: 'space-between',
                                              alignItems: 'center',
                                              marginBottom: 4,
                                            }}
                                          >
                                            <Text strong>
                                              Reaction Prompts:
                                            </Text>
                                            <Button
                                              size='small'
                                              type='text'
                                              icon={<CopyOutlined />}
                                              onClick={() => {
                                                const prompts =
                                                  (
                                                    engagementData?.reaction_prompts ||
                                                    engagementData?.reaction_prompts
                                                  )?.join('\n') || '';
                                                navigator.clipboard.writeText(
                                                  prompts
                                                );
                                                message.success(
                                                  'Reaction prompts copied'
                                                );
                                              }}
                                            />
                                          </div>
                                          <div style={{ marginTop: '4px' }}>
                                            {(
                                              engagementData.reaction_prompts ||
                                              engagementData.reaction_prompts
                                            ).map(
                                              (
                                                prompt: string,
                                                index: number
                                              ) => (
                                                <div
                                                  key={index}
                                                  style={{
                                                    padding: '6px 10px',
                                                    backgroundColor: '#fef3c7',
                                                    borderRadius: '6px',
                                                    marginBottom: '6px',
                                                    fontSize: '12px',
                                                  }}
                                                >
                                                  👍 {prompt}
                                                </div>
                                              )
                                            )}
                                          </div>
                                        </div>
                                      )}

                                    {/* 群组分享提示 */}
                                    {(engagementData?.group_sharing_tips ||
                                      engagementData?.group_sharing_tips) && (
                                      <div>
                                        <Text strong>Group Sharing Tips:</Text>
                                        <div
                                          style={{
                                            padding: '8px 12px',
                                            backgroundColor: '#dbeafe',
                                            borderRadius: '6px',
                                            marginTop: '4px',
                                            fontSize: '12px',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                          }}
                                        >
                                          <span>
                                            👥{' '}
                                            {engagementData.group_sharing_tips ||
                                              engagementData.group_sharing_tips}
                                          </span>
                                          <Button
                                            size='small'
                                            type='text'
                                            icon={<CopyOutlined />}
                                            onClick={() => {
                                              navigator.clipboard.writeText(
                                                engagementData?.group_sharing_tips ||
                                                  engagementData?.group_sharing_tips ||
                                                  ''
                                              );
                                              message.success(
                                                'Group sharing tips copied'
                                              );
                                            }}
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                            </Card>
                          )}

                          {/* Performance Metrics - LinkedIn */}
                          {activeTab === 'linkedin' &&
                            ((webhookResponse as any).performance ||
                              (webhookResponse as any).raw_output
                                ?.performance_prediction ||
                              (webhookResponse as any).quick_publish
                                ?.engagement_score) && (
                              <Card
                                size='small'
                                title='📊 Performance Metrics'
                                style={{ backgroundColor: '#f0fdf4' }}
                              >
                                <Row gutter={[8, 8]}>
                                  <Col span={12}>
                                    <Text strong>Engagement Potential:</Text>
                                    <div
                                      style={{
                                        padding: '6px 10px',
                                        backgroundColor: '#dcfce7',
                                        borderRadius: '6px',
                                        marginTop: '4px',
                                        fontSize: '12px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                      }}
                                    >
                                      <span>
                                        🎯{' '}
                                        {String(
                                          (webhookResponse as any).performance
                                            ?.engagement_potential ||
                                            (webhookResponse as any).raw_output
                                              ?.performance_prediction
                                              ?.engagement_potential ||
                                            (webhookResponse as any)
                                              .quick_publish
                                              ?.engagement_score ||
                                            'N/A'
                                        )}
                                        /10
                                      </span>
                                      <Tag
                                        color={
                                          Number(
                                            (webhookResponse as any).performance
                                              ?.engagement_potential ||
                                              (webhookResponse as any)
                                                .raw_output
                                                ?.performance_prediction
                                                ?.engagement_potential ||
                                              (webhookResponse as any)
                                                .quick_publish
                                                ?.engagement_score ||
                                              5
                                          ) >= 8
                                            ? 'green'
                                            : 'orange'
                                        }
                                      >
                                        {String(
                                          (webhookResponse as any).performance
                                            ?.engagement_label || 'Medium'
                                        )}
                                      </Tag>
                                    </div>
                                  </Col>
                                  <Col span={12}>
                                    <Text strong>Save Potential:</Text>
                                    <div
                                      style={{
                                        padding: '6px 10px',
                                        backgroundColor: '#dbeafe',
                                        borderRadius: '6px',
                                        marginTop: '4px',
                                        fontSize: '12px',
                                      }}
                                    >
                                      💾{' '}
                                      {String(
                                        (webhookResponse as any).performance
                                          ?.save_potential ||
                                          (webhookResponse as any).raw_output
                                            ?.performance_prediction
                                            ?.save_potential ||
                                          'N/A'
                                      )}
                                      /10
                                    </div>
                                  </Col>
                                  <Col span={24}>
                                    <Text strong>Viral Factors:</Text>
                                    <div
                                      style={{
                                        padding: '6px 10px',
                                        backgroundColor: '#fef3c7',
                                        borderRadius: '6px',
                                        marginTop: '4px',
                                        fontSize: '12px',
                                      }}
                                    >
                                      🚀{' '}
                                      {String(
                                        (webhookResponse as any).performance
                                          ?.viral_factors ||
                                          (webhookResponse as any).raw_output
                                            ?.performance_prediction
                                            ?.viral_factors ||
                                          'No data available'
                                      )}
                                    </div>
                                  </Col>
                                  <Col span={24}>
                                    <Text strong>Optimization Notes:</Text>
                                    <div
                                      style={{
                                        padding: '6px 10px',
                                        backgroundColor: '#f3e8ff',
                                        borderRadius: '6px',
                                        marginTop: '4px',
                                        fontSize: '12px',
                                      }}
                                    >
                                      💡{' '}
                                      {String(
                                        (webhookResponse as any).performance
                                          ?.optimization_notes ||
                                          (webhookResponse as any).raw_output
                                            ?.performance_prediction
                                            ?.optimization_notes ||
                                          'No optimization notes available'
                                      )}
                                    </div>
                                  </Col>
                                </Row>
                              </Card>
                            )}

                          {/* Content Analysis - LinkedIn */}
                          {activeTab === 'linkedin' &&
                            ((webhookResponse as any).analysis ||
                              (webhookResponse as any).raw_output
                                ?.content_analysis) && (
                              <Card
                                size='small'
                                title='🔍 Content Analysis'
                                style={{ backgroundColor: '#fef7ff' }}
                              >
                                <Row gutter={[8, 8]}>
                                  <Col span={24}>
                                    <Text strong>Core Themes:</Text>
                                    <div style={{ marginTop: '4px' }}>
                                      {(
                                        (webhookResponse as any).analysis
                                          ?.core_themes ||
                                        (webhookResponse as any).raw_output
                                          ?.content_analysis?.core_themes ||
                                        []
                                      ).map((theme: string, index: number) => (
                                        <Tag
                                          key={index}
                                          color='purple'
                                          style={{ marginBottom: 4 }}
                                        >
                                          {theme}
                                        </Tag>
                                      ))}
                                    </div>
                                  </Col>
                                  <Col span={24}>
                                    <Text strong>Visual Potential:</Text>
                                    <div
                                      style={{
                                        padding: '6px 10px',
                                        backgroundColor: '#f0fdf4',
                                        borderRadius: '6px',
                                        marginTop: '4px',
                                        fontSize: '12px',
                                      }}
                                    >
                                      📈{' '}
                                      {String(
                                        (webhookResponse as any).analysis
                                          ?.visual_potential ||
                                          (webhookResponse as any).raw_output
                                            ?.content_analysis
                                            ?.visual_potential ||
                                          'No data available'
                                      )}
                                    </div>
                                  </Col>
                                  <Col span={24}>
                                    <Text strong>Emotional Appeal:</Text>
                                    <div
                                      style={{
                                        padding: '6px 10px',
                                        backgroundColor: '#fdf4ff',
                                        borderRadius: '6px',
                                        marginTop: '4px',
                                        fontSize: '12px',
                                      }}
                                    >
                                      ❤️{' '}
                                      {String(
                                        (webhookResponse as any).analysis
                                          ?.emotional_appeal ||
                                          (webhookResponse as any).raw_output
                                            ?.content_analysis
                                            ?.emotional_appeal ||
                                          'No data available'
                                      )}
                                    </div>
                                  </Col>
                                </Row>
                              </Card>
                            )}

                          {/* Visual Strategy - LinkedIn */}
                          {activeTab === 'linkedin' &&
                            ((webhookResponse as any).visual ||
                              (webhookResponse as any).raw_output
                                ?.visual_strategy) && (
                              <Card
                                size='small'
                                title='🎨 Visual Strategy'
                                style={{ backgroundColor: '#fff7f7' }}
                              >
                                <Row gutter={[8, 8]}>
                                  {/* 格式推荐 */}
                                  {(webhookResponse as any).raw_output
                                    ?.visual_strategy
                                    ?.format_recommendation && (
                                    <Col span={24}>
                                      <Text strong>Format Recommendation:</Text>
                                      <div
                                        style={{
                                          padding: '8px 12px',
                                          backgroundColor: '#fef2f2',
                                          borderRadius: '6px',
                                          marginTop: '4px',
                                          fontSize: '12px',
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center',
                                        }}
                                      >
                                        <span>
                                          🎯{' '}
                                          {(webhookResponse as any).raw_output
                                            ?.visual_strategy
                                            ?.format_recommendation ||
                                            'Article'}
                                        </span>
                                        <Button
                                          size='small'
                                          type='text'
                                          icon={<CopyOutlined />}
                                          onClick={() => {
                                            navigator.clipboard.writeText(
                                              (webhookResponse as any)
                                                .raw_output?.visual_strategy
                                                ?.format_recommendation ||
                                                'Article'
                                            );
                                            message.success(
                                              'Visual format copied'
                                            );
                                          }}
                                        />
                                      </div>
                                    </Col>
                                  )}

                                  {/* 图像概念 */}
                                  {(webhookResponse as any).raw_output
                                    ?.visual_strategy?.image_concept &&
                                    Array.isArray(
                                      (webhookResponse as any).raw_output
                                        .visual_strategy.image_concept
                                    ) && (
                                      <Col span={24}>
                                        <Text strong>Image Concepts:</Text>
                                        <div style={{ marginTop: '4px' }}>
                                          {(
                                            webhookResponse as any
                                          ).raw_output.visual_strategy.image_concept.map(
                                            (
                                              concept: string,
                                              index: number
                                            ) => (
                                              <div
                                                key={index}
                                                style={{
                                                  padding: '6px 10px',
                                                  backgroundColor: '#fdf4ff',
                                                  borderRadius: '6px',
                                                  marginBottom: '6px',
                                                  fontSize: '12px',
                                                  display: 'flex',
                                                  justifyContent:
                                                    'space-between',
                                                  alignItems: 'center',
                                                }}
                                              >
                                                <span>🔄 {concept}</span>
                                                <Button
                                                  size='small'
                                                  type='text'
                                                  icon={<CopyOutlined />}
                                                  onClick={() => {
                                                    navigator.clipboard.writeText(
                                                      concept
                                                    );
                                                    message.success(
                                                      'Image concept copied'
                                                    );
                                                  }}
                                                />
                                              </div>
                                            )
                                          )}
                                        </div>
                                      </Col>
                                    )}

                                  {/* 颜色调色板 */}
                                  {(webhookResponse as any).raw_output
                                    ?.visual_strategy?.color_palette && (
                                    <Col span={24}>
                                      <Text strong>Color Palette:</Text>
                                      <div
                                        style={{
                                          padding: '8px 12px',
                                          backgroundColor: '#f0fdf4',
                                          borderRadius: '6px',
                                          marginTop: '4px',
                                          fontSize: '12px',
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center',
                                        }}
                                      >
                                        <span>
                                          🖼️{' '}
                                          {
                                            (webhookResponse as any).raw_output
                                              .visual_strategy.color_palette
                                          }
                                        </span>
                                        <Button
                                          size='small'
                                          type='text'
                                          icon={<CopyOutlined />}
                                          onClick={() => {
                                            navigator.clipboard.writeText(
                                              (webhookResponse as any)
                                                .raw_output.visual_strategy
                                                .color_palette
                                            );
                                            message.success(
                                              'Color palette copied'
                                            );
                                          }}
                                        />
                                      </div>
                                    </Col>
                                  )}
                                </Row>
                              </Card>
                            )}

                          {/* Industry Insights - LinkedIn */}
                          {activeTab === 'linkedin' &&
                            (webhookResponse.research_data ||
                              (webhookResponse as any).raw_output
                                ?.search_enhanced_data) && (
                              <Card
                                size='small'
                                title='🔬 Industry Insights'
                                style={{ backgroundColor: '#fef7ff' }}
                              >
                                {(() => {
                                  const researchData =
                                    webhookResponse.research_data ||
                                    (webhookResponse as any).raw_output
                                      ?.search_enhanced_data;
                                  return (
                                    <>
                                      <div
                                        style={{
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center',
                                          marginBottom: 12,
                                        }}
                                      >
                                        <Text strong>Research Data:</Text>
                                        <Button
                                          size='small'
                                          type='text'
                                          icon={<CopyOutlined />}
                                          onClick={() => {
                                            let researchText = '';

                                            if (
                                              researchData?.visual_trends &&
                                              Array.isArray(
                                                researchData.visual_trends
                                              )
                                            ) {
                                              researchText += `Visual Trends:\n${researchData.visual_trends.map((t: string) => `• ${t}`).join('\n')}\n\n`;
                                            }

                                            if (
                                              researchData?.user_preferences &&
                                              Array.isArray(
                                                researchData.user_preferences
                                              )
                                            ) {
                                              researchText += `User Preferences:\n${researchData.user_preferences.map((p: string) => `• ${p}`).join('\n')}\n\n`;
                                            }

                                            if (
                                              researchData?.successful_examples &&
                                              Array.isArray(
                                                researchData.successful_examples
                                              )
                                            ) {
                                              researchText += `Successful Examples:\n${researchData.successful_examples.map((e: string) => `• ${e}`).join('\n')}`;
                                            }

                                            navigator.clipboard.writeText(
                                              researchText
                                            );
                                            message.success(
                                              'Research data copied'
                                            );
                                          }}
                                        />
                                      </div>

                                      {/* 视觉趋势 */}
                                      {researchData?.visual_trends &&
                                        Array.isArray(
                                          researchData.visual_trends
                                        ) && (
                                          <div style={{ marginBottom: '12px' }}>
                                            <Text strong>Visual Trends:</Text>
                                            <div style={{ marginTop: '4px' }}>
                                              {researchData.visual_trends.map(
                                                (
                                                  trend: string,
                                                  index: number
                                                ) => (
                                                  <div
                                                    key={index}
                                                    style={{
                                                      padding: '6px 10px',
                                                      backgroundColor:
                                                        '#f3e8ff',
                                                      borderRadius: '6px',
                                                      marginBottom: '6px',
                                                      fontSize: '12px',
                                                    }}
                                                  >
                                                    📈 {trend}
                                                  </div>
                                                )
                                              )}
                                            </div>
                                          </div>
                                        )}

                                      {/* 用户偏好 */}
                                      {researchData?.user_preferences &&
                                        Array.isArray(
                                          researchData.user_preferences
                                        ) && (
                                          <div style={{ marginBottom: '12px' }}>
                                            <Text strong>
                                              User Preferences:
                                            </Text>
                                            <div style={{ marginTop: '4px' }}>
                                              {researchData.user_preferences.map(
                                                (
                                                  preference: string,
                                                  index: number
                                                ) => (
                                                  <div
                                                    key={index}
                                                    style={{
                                                      padding: '6px 10px',
                                                      backgroundColor:
                                                        '#ede9fe',
                                                      borderRadius: '6px',
                                                      marginBottom: '6px',
                                                      fontSize: '12px',
                                                    }}
                                                  >
                                                    👥 {preference}
                                                  </div>
                                                )
                                              )}
                                            </div>
                                          </div>
                                        )}

                                      {/* 成功案例 */}
                                      {researchData?.successful_examples &&
                                        Array.isArray(
                                          researchData.successful_examples
                                        ) && (
                                          <div>
                                            <Text strong>
                                              Successful Examples:
                                            </Text>
                                            <div style={{ marginTop: '4px' }}>
                                              {researchData.successful_examples.map(
                                                (
                                                  example: string,
                                                  index: number
                                                ) => (
                                                  <div
                                                    key={index}
                                                    style={{
                                                      padding: '6px 10px',
                                                      backgroundColor:
                                                        '#faf5ff',
                                                      borderRadius: '6px',
                                                      marginBottom: '6px',
                                                      fontSize: '12px',
                                                      display: 'flex',
                                                      justifyContent:
                                                        'space-between',
                                                      alignItems: 'center',
                                                    }}
                                                  >
                                                    <span>📚 {example}</span>
                                                    <Button
                                                      size='small'
                                                      type='text'
                                                      icon={<CopyOutlined />}
                                                      onClick={() => {
                                                        navigator.clipboard.writeText(
                                                          example
                                                        );
                                                        message.success(
                                                          'Example copied'
                                                        );
                                                      }}
                                                    />
                                                  </div>
                                                )
                                              )}
                                            </div>
                                          </div>
                                        )}
                                    </>
                                  );
                                })()}
                              </Card>
                            )}

                          {/* Quick Publish Info - LinkedIn */}
                          {activeTab === 'linkedin' &&
                            (webhookResponse as any).quick_publish && (
                              <Card
                                size='small'
                                title='⚡ Quick Publish Info'
                                style={{ backgroundColor: '#fff7ed' }}
                              >
                                <Row gutter={[8, 8]}>
                                  <Col span={24}>
                                    <div
                                      style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: 8,
                                      }}
                                    >
                                      <Text strong>Ready-to-Post Content:</Text>
                                      <Button
                                        size='small'
                                        type='text'
                                        icon={<CopyOutlined />}
                                        onClick={() => {
                                          const quickPublish = (
                                            webhookResponse as any
                                          ).quick_publish;
                                          const fullContent = `${quickPublish.post_ready}\n\n${quickPublish.hashtags_ready || ''}`;
                                          navigator.clipboard.writeText(
                                            fullContent
                                          );
                                          message.success(
                                            'Ready-to-post content copied'
                                          );
                                        }}
                                      />
                                    </div>
                                    <Card
                                      size='small'
                                      style={{
                                        backgroundColor: '#fef3c7',
                                        marginBottom: 8,
                                      }}
                                      styles={{ body: { padding: '12px' } }}
                                    >
                                      <Paragraph
                                        style={{
                                          whiteSpace: 'pre-wrap',
                                          margin: 0,
                                          fontSize: '14px',
                                          lineHeight: '1.6',
                                        }}
                                      >
                                        {
                                          (webhookResponse as any).quick_publish
                                            .post_ready
                                        }
                                      </Paragraph>
                                    </Card>
                                  </Col>
                                  <Col span={24}>
                                    <Text strong>Hashtags:</Text>
                                    <div style={{ marginTop: '4px' }}>
                                      {(
                                        webhookResponse as any
                                      ).quick_publish.hashtags_ready
                                        ?.split(' ')
                                        .map((tag: string, index: number) => (
                                          <Tag
                                            key={index}
                                            color='blue'
                                            style={{ marginBottom: 4 }}
                                          >
                                            {tag}
                                          </Tag>
                                        ))}
                                    </div>
                                  </Col>
                                  <Col span={12}>
                                    <Text strong>Engagement Score:</Text>
                                    <div
                                      style={{
                                        padding: '6px 10px',
                                        backgroundColor: '#dcfce7',
                                        borderRadius: '6px',
                                        marginTop: '4px',
                                        fontSize: '12px',
                                      }}
                                    >
                                      ⭐{' '}
                                      {String(
                                        (webhookResponse as any).quick_publish
                                          .engagement_score || 'N/A'
                                      )}
                                      /10
                                    </div>
                                  </Col>
                                  <Col span={12}>
                                    <Text strong>Optimal Time:</Text>
                                    <div
                                      style={{
                                        padding: '6px 10px',
                                        backgroundColor: '#dbeafe',
                                        borderRadius: '6px',
                                        marginTop: '4px',
                                        fontSize: '12px',
                                      }}
                                    >
                                      ⏰{' '}
                                      {String(
                                        (webhookResponse as any).quick_publish
                                          .optimal_time || 'No timing data'
                                      )}
                                    </div>
                                  </Col>
                                </Row>
                              </Card>
                            )}

                          {/* 替代版本 */}
                          {(webhookResponse as any).alternative_versions &&
                            Array.isArray(
                              (webhookResponse as any).alternative_versions
                            ) &&
                            (webhookResponse as any).alternative_versions
                              .length > 0 && (
                              <Card
                                size='small'
                                title='🔄 Alternative Versions'
                                style={{ backgroundColor: '#f8fafc' }}
                              >
                                <div style={{ marginBottom: '12px' }}>
                                  <Text strong>Alternative Versions:</Text>
                                </div>
                                {(
                                  webhookResponse as any
                                ).alternative_versions.map(
                                  (version: any, index: number) => (
                                    <div
                                      key={index}
                                      style={{ marginBottom: '16px' }}
                                    >
                                      <div
                                        style={{
                                          padding: '8px 12px',
                                          backgroundColor: '#e2e8f0',
                                          borderRadius: '6px',
                                          marginBottom: '8px',
                                          fontSize: '12px',
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center',
                                        }}
                                      >
                                        <span style={{ fontWeight: 'bold' }}>
                                          📝{' '}
                                          {version.version ||
                                            `版本 ${index + 1}`}
                                        </span>
                                        <Button
                                          size='small'
                                          type='text'
                                          icon={<CopyOutlined />}
                                          onClick={() => {
                                            const contentToCopy =
                                              version.content ||
                                              version.post ||
                                              version.text ||
                                              JSON.stringify(version);
                                            navigator.clipboard.writeText(
                                              contentToCopy
                                            );
                                            message.success(
                                              `${version.version || `Version ${index + 1}`} copied`
                                            );
                                          }}
                                        />
                                      </div>
                                      <Card
                                        size='small'
                                        style={{ backgroundColor: '#f9fafb' }}
                                        styles={{
                                          body: { padding: '8px 12px' },
                                        }}
                                      >
                                        <Paragraph
                                          style={{
                                            whiteSpace: 'pre-wrap',
                                            margin: 0,
                                            fontSize: '12px',
                                            lineHeight: '1.5',
                                          }}
                                        >
                                          {version.content ||
                                            version.post ||
                                            version.text ||
                                            'Content not available'}
                                        </Paragraph>
                                      </Card>
                                    </div>
                                  )
                                )}
                              </Card>
                            )}

                          {/* 位置标签和提及建议 */}
                          {((webhookResponse as any).location_tag ||
                            (webhookResponse as any).mention_suggestions) && (
                            <Card
                              size='small'
                              title='📍 Location & Mentions'
                              style={{ backgroundColor: '#f0f9ff' }}
                            >
                              <Row gutter={[8, 8]}>
                                {(webhookResponse as any).location_tag && (
                                  <Col span={12}>
                                    <Text strong>Location Tag:</Text>
                                    <div
                                      style={{
                                        padding: '6px 10px',
                                        backgroundColor: '#dbeafe',
                                        borderRadius: '6px',
                                        marginTop: '4px',
                                        fontSize: '12px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                      }}
                                    >
                                      <span>
                                        📍{' '}
                                        {(webhookResponse as any).location_tag}
                                      </span>
                                      <Button
                                        size='small'
                                        type='text'
                                        icon={<CopyOutlined />}
                                        onClick={() => {
                                          navigator.clipboard.writeText(
                                            (webhookResponse as any)
                                              .location_tag
                                          );
                                          message.success(
                                            'Location tag copied'
                                          );
                                        }}
                                      />
                                    </div>
                                  </Col>
                                )}
                                {(webhookResponse as any).mention_suggestions &&
                                  Array.isArray(
                                    (webhookResponse as any).mention_suggestions
                                  ) && (
                                    <Col span={12}>
                                      <div
                                        style={{
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center',
                                          marginBottom: 4,
                                        }}
                                      >
                                        <Text strong>Mention Suggestions:</Text>
                                        <Button
                                          size='small'
                                          type='text'
                                          icon={<CopyOutlined />}
                                          onClick={() => {
                                            const mentions = (
                                              webhookResponse as any
                                            ).mention_suggestions.join(' ');
                                            navigator.clipboard.writeText(
                                              mentions
                                            );
                                            message.success(
                                              'Mention suggestions copied'
                                            );
                                          }}
                                        />
                                      </div>
                                      <div style={{ marginTop: '4px' }}>
                                        {(
                                          webhookResponse as any
                                        ).mention_suggestions.map(
                                          (mention: string, index: number) => (
                                            <Tag
                                              key={index}
                                              color='geekblue'
                                              style={{ marginBottom: 4 }}
                                            >
                                              {mention}
                                            </Tag>
                                          )
                                        )}
                                      </div>
                                    </Col>
                                  )}
                              </Row>
                            </Card>
                          )}

                          {/* 搜索增强数据 */}
                          {((webhookResponse as any).search_enhanced_data ||
                            (webhookResponse as any).raw_output
                              ?.search_enhanced_data) && (
                            <Card
                              size='small'
                              title='🔍 Search Enhanced Data'
                              style={{ backgroundColor: '#fef7ff' }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  marginBottom: 12,
                                }}
                              >
                                <Text strong>Enhanced Search Data:</Text>
                                <Button
                                  size='small'
                                  type='text'
                                  icon={<CopyOutlined />}
                                  onClick={() => {
                                    const searchData =
                                      (webhookResponse as any)
                                        .search_enhanced_data ||
                                      (webhookResponse as any).raw_output
                                        ?.search_enhanced_data;
                                    let searchText = '';

                                    if (
                                      searchData?.visual_trends &&
                                      Array.isArray(searchData.visual_trends)
                                    ) {
                                      searchText += `Visual Trends:\n${searchData.visual_trends.map((t: string) => `• ${t}`).join('\n')}\n\n`;
                                    }

                                    if (
                                      searchData?.user_preferences &&
                                      Array.isArray(searchData.user_preferences)
                                    ) {
                                      searchText += `User Preferences:\n${searchData.user_preferences.map((p: string) => `• ${p}`).join('\n')}\n\n`;
                                    }

                                    if (
                                      searchData?.successful_examples &&
                                      Array.isArray(
                                        searchData.successful_examples
                                      )
                                    ) {
                                      searchText += `Successful Examples:\n${searchData.successful_examples.map((e: string) => `• ${e}`).join('\n')}`;
                                    }

                                    navigator.clipboard.writeText(searchText);
                                    message.success(
                                      'Enhanced search data copied'
                                    );
                                  }}
                                />
                              </div>

                              {/* 视觉趋势 */}
                              {(webhookResponse as any).search_enhanced_data
                                ?.visual_trends &&
                                Array.isArray(
                                  (webhookResponse as any).search_enhanced_data
                                    .visual_trends
                                ) && (
                                  <div style={{ marginBottom: '12px' }}>
                                    <Text strong>Visual Trends:</Text>
                                    <div style={{ marginTop: '4px' }}>
                                      {(
                                        webhookResponse as any
                                      ).search_enhanced_data.visual_trends.map(
                                        (trend: string, index: number) => (
                                          <div
                                            key={index}
                                            style={{
                                              padding: '6px 10px',
                                              backgroundColor: '#f3e8ff',
                                              borderRadius: '6px',
                                              marginBottom: '6px',
                                              fontSize: '12px',
                                            }}
                                          >
                                            🔥 {trend}
                                          </div>
                                        )
                                      )}
                                    </div>
                                  </div>
                                )}

                              {/* 用户偏好 */}
                              {(webhookResponse as any).search_enhanced_data
                                ?.user_preferences &&
                                Array.isArray(
                                  (webhookResponse as any).search_enhanced_data
                                    .user_preferences
                                ) && (
                                  <div style={{ marginBottom: '12px' }}>
                                    <Text strong>User Preferences:</Text>
                                    <div style={{ marginTop: '4px' }}>
                                      {(
                                        webhookResponse as any
                                      ).search_enhanced_data.user_preferences.map(
                                        (preference: string, index: number) => (
                                          <div
                                            key={index}
                                            style={{
                                              padding: '6px 10px',
                                              backgroundColor: '#ede9fe',
                                              borderRadius: '6px',
                                              marginBottom: '6px',
                                              fontSize: '12px',
                                            }}
                                          >
                                            👥 {preference}
                                          </div>
                                        )
                                      )}
                                    </div>
                                  </div>
                                )}

                              {/* 成功案例 */}
                              {(webhookResponse as any).search_enhanced_data
                                ?.successful_examples &&
                                Array.isArray(
                                  (webhookResponse as any).search_enhanced_data
                                    .successful_examples
                                ) && (
                                  <div>
                                    <Text strong>Successful Examples:</Text>
                                    <div style={{ marginTop: '4px' }}>
                                      {(
                                        webhookResponse as any
                                      ).search_enhanced_data.successful_examples.map(
                                        (example: string, index: number) => (
                                          <div
                                            key={index}
                                            style={{
                                              padding: '6px 10px',
                                              backgroundColor: '#faf5ff',
                                              borderRadius: '6px',
                                              marginBottom: '6px',
                                              fontSize: '12px',
                                              display: 'flex',
                                              justifyContent: 'space-between',
                                              alignItems: 'center',
                                            }}
                                          >
                                            <span>📚 {example}</span>
                                            <Button
                                              size='small'
                                              type='text'
                                              icon={<CopyOutlined />}
                                              onClick={() => {
                                                navigator.clipboard.writeText(
                                                  example
                                                );
                                                message.success(
                                                  'Example copied'
                                                );
                                              }}
                                            />
                                          </div>
                                        )
                                      )}
                                    </div>
                                  </div>
                                )}
                            </Card>
                          )}

                          {/* Performance Metrics - Facebook */}
                          {activeTab === 'facebook' &&
                            ((webhookResponse as any).performance ||
                              (webhookResponse as any).raw_output
                                ?.performance_prediction ||
                              (webhookResponse as any).quick_publish
                                ?.engagement_score) && (
                              <Card
                                size='small'
                                title='📊 Performance Metrics'
                                style={{ backgroundColor: '#f0fdf4' }}
                              >
                                <Row gutter={[8, 8]}>
                                  <Col span={12}>
                                    <Text strong>Engagement Potential:</Text>
                                    <div
                                      style={{
                                        padding: '6px 10px',
                                        backgroundColor: '#dcfce7',
                                        borderRadius: '6px',
                                        marginTop: '4px',
                                        fontSize: '12px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                      }}
                                    >
                                      <span>
                                        🎯{' '}
                                        {String(
                                          (webhookResponse as any).performance
                                            ?.engagement_potential ||
                                            (webhookResponse as any).raw_output
                                              ?.performance_prediction
                                              ?.engagement_potential ||
                                            (webhookResponse as any)
                                              .quick_publish
                                              ?.engagement_score ||
                                            'N/A'
                                        )}
                                        /10
                                      </span>
                                      <Tag
                                        color={
                                          Number(
                                            (webhookResponse as any).performance
                                              ?.engagement_potential ||
                                              (webhookResponse as any)
                                                .raw_output
                                                ?.performance_prediction
                                                ?.engagement_potential ||
                                              (webhookResponse as any)
                                                .quick_publish
                                                ?.engagement_score ||
                                              5
                                          ) >= 8
                                            ? 'green'
                                            : 'orange'
                                        }
                                      >
                                        {String(
                                          (webhookResponse as any).performance
                                            ?.engagement_label || 'Medium'
                                        )}
                                      </Tag>
                                    </div>
                                  </Col>
                                  <Col span={12}>
                                    <Text strong>Save Potential:</Text>
                                    <div
                                      style={{
                                        padding: '6px 10px',
                                        backgroundColor: '#dbeafe',
                                        borderRadius: '6px',
                                        marginTop: '4px',
                                        fontSize: '12px',
                                      }}
                                    >
                                      💾{' '}
                                      {String(
                                        (webhookResponse as any).performance
                                          ?.save_potential ||
                                          (webhookResponse as any).raw_output
                                            ?.performance_prediction
                                            ?.save_potential ||
                                          'N/A'
                                      )}
                                      /10
                                    </div>
                                  </Col>
                                  <Col span={24}>
                                    <Text strong>Viral Factors:</Text>
                                    <div
                                      style={{
                                        padding: '6px 10px',
                                        backgroundColor: '#fef3c7',
                                        borderRadius: '6px',
                                        marginTop: '4px',
                                        fontSize: '12px',
                                      }}
                                    >
                                      🚀{' '}
                                      {String(
                                        (webhookResponse as any).performance
                                          ?.viral_factors ||
                                          (webhookResponse as any).raw_output
                                            ?.performance_prediction
                                            ?.viral_factors ||
                                          'No data available'
                                      )}
                                    </div>
                                  </Col>
                                  <Col span={24}>
                                    <Text strong>Optimization Notes:</Text>
                                    <div
                                      style={{
                                        padding: '6px 10px',
                                        backgroundColor: '#f3e8ff',
                                        borderRadius: '6px',
                                        marginTop: '4px',
                                        fontSize: '12px',
                                      }}
                                    >
                                      💡{' '}
                                      {String(
                                        (webhookResponse as any).performance
                                          ?.optimization_notes ||
                                          (webhookResponse as any).raw_output
                                            ?.performance_prediction
                                            ?.optimization_notes ||
                                          'No optimization notes available'
                                      )}
                                    </div>
                                  </Col>
                                </Row>
                              </Card>
                            )}

                          {/* Content Analysis - Facebook */}
                          {activeTab === 'facebook' &&
                            ((webhookResponse as any).analysis ||
                              (webhookResponse as any).raw_output
                                ?.content_analysis) && (
                              <Card
                                size='small'
                                title='🔍 Content Analysis'
                                style={{ backgroundColor: '#fef7ff' }}
                              >
                                <Row gutter={[8, 8]}>
                                  <Col span={24}>
                                    <Text strong>Core Themes:</Text>
                                    <div style={{ marginTop: '4px' }}>
                                      {(
                                        (webhookResponse as any).analysis
                                          ?.core_themes ||
                                        (webhookResponse as any).raw_output
                                          ?.content_analysis?.core_themes ||
                                        []
                                      ).map((theme: string, index: number) => (
                                        <Tag
                                          key={index}
                                          color='purple'
                                          style={{ marginBottom: 4 }}
                                        >
                                          {theme}
                                        </Tag>
                                      ))}
                                    </div>
                                  </Col>
                                  <Col span={24}>
                                    <Text strong>Visual Potential:</Text>
                                    <div
                                      style={{
                                        padding: '6px 10px',
                                        backgroundColor: '#f0fdf4',
                                        borderRadius: '6px',
                                        marginTop: '4px',
                                        fontSize: '12px',
                                      }}
                                    >
                                      📈{' '}
                                      {String(
                                        (webhookResponse as any).analysis
                                          ?.visual_potential ||
                                          (webhookResponse as any).raw_output
                                            ?.content_analysis
                                            ?.visual_potential ||
                                          'No data available'
                                      )}
                                    </div>
                                  </Col>
                                  <Col span={24}>
                                    <Text strong>Emotional Appeal:</Text>
                                    <div
                                      style={{
                                        padding: '6px 10px',
                                        backgroundColor: '#fdf4ff',
                                        borderRadius: '6px',
                                        marginTop: '4px',
                                        fontSize: '12px',
                                      }}
                                    >
                                      ❤️{' '}
                                      {String(
                                        (webhookResponse as any).analysis
                                          ?.emotional_appeal ||
                                          (webhookResponse as any).raw_output
                                            ?.content_analysis
                                            ?.emotional_appeal ||
                                          'No data available'
                                      )}
                                    </div>
                                  </Col>
                                </Row>
                              </Card>
                            )}

                          {/* Visual Strategy - Facebook */}
                          {activeTab === 'facebook' &&
                            ((webhookResponse as any).visual ||
                              (webhookResponse as any).raw_output
                                ?.visual_strategy) && (
                              <Card
                                size='small'
                                title='🎨 Visual Strategy'
                                style={{ backgroundColor: '#fff7f7' }}
                              >
                                <Row gutter={[8, 8]}>
                                  {/* 格式推荐 */}
                                  {(webhookResponse as any).raw_output
                                    ?.visual_strategy
                                    ?.format_recommendation && (
                                    <Col span={24}>
                                      <Text strong>Format Recommendation:</Text>
                                      <div
                                        style={{
                                          padding: '8px 12px',
                                          backgroundColor: '#fef2f2',
                                          borderRadius: '6px',
                                          marginTop: '4px',
                                          fontSize: '12px',
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center',
                                        }}
                                      >
                                        <span>
                                          🎯{' '}
                                          {(webhookResponse as any).raw_output
                                            ?.visual_strategy
                                            ?.format_recommendation ||
                                            'Image Post'}
                                        </span>
                                        <Button
                                          size='small'
                                          type='text'
                                          icon={<CopyOutlined />}
                                          onClick={() => {
                                            navigator.clipboard.writeText(
                                              (webhookResponse as any)
                                                .raw_output?.visual_strategy
                                                ?.format_recommendation ||
                                                'Image Post'
                                            );
                                            message.success(
                                              'Visual format copied'
                                            );
                                          }}
                                        />
                                      </div>
                                    </Col>
                                  )}

                                  {/* 图像概念 */}
                                  {(webhookResponse as any).raw_output
                                    ?.visual_strategy?.image_concept &&
                                    Array.isArray(
                                      (webhookResponse as any).raw_output
                                        .visual_strategy.image_concept
                                    ) && (
                                      <Col span={24}>
                                        <Text strong>Image Concepts:</Text>
                                        <div style={{ marginTop: '4px' }}>
                                          {(
                                            webhookResponse as any
                                          ).raw_output.visual_strategy.image_concept.map(
                                            (
                                              concept: string,
                                              index: number
                                            ) => (
                                              <div
                                                key={index}
                                                style={{
                                                  padding: '6px 10px',
                                                  backgroundColor: '#fdf4ff',
                                                  borderRadius: '6px',
                                                  marginBottom: '6px',
                                                  fontSize: '12px',
                                                  display: 'flex',
                                                  justifyContent:
                                                    'space-between',
                                                  alignItems: 'center',
                                                }}
                                              >
                                                <span>🔄 {concept}</span>
                                                <Button
                                                  size='small'
                                                  type='text'
                                                  icon={<CopyOutlined />}
                                                  onClick={() => {
                                                    navigator.clipboard.writeText(
                                                      concept
                                                    );
                                                    message.success(
                                                      'Image concept copied'
                                                    );
                                                  }}
                                                />
                                              </div>
                                            )
                                          )}
                                        </div>
                                      </Col>
                                    )}

                                  {/* 颜色调色板 */}
                                  {(webhookResponse as any).raw_output
                                    ?.visual_strategy?.color_palette && (
                                    <Col span={24}>
                                      <Text strong>Color Palette:</Text>
                                      <div
                                        style={{
                                          padding: '8px 12px',
                                          backgroundColor: '#f0fdf4',
                                          borderRadius: '6px',
                                          marginTop: '4px',
                                          fontSize: '12px',
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center',
                                        }}
                                      >
                                        <span>
                                          🖼️{' '}
                                          {
                                            (webhookResponse as any).raw_output
                                              .visual_strategy.color_palette
                                          }
                                        </span>
                                        <Button
                                          size='small'
                                          type='text'
                                          icon={<CopyOutlined />}
                                          onClick={() => {
                                            navigator.clipboard.writeText(
                                              (webhookResponse as any)
                                                .raw_output.visual_strategy
                                                .color_palette
                                            );
                                            message.success(
                                              'Color palette copied'
                                            );
                                          }}
                                        />
                                      </div>
                                    </Col>
                                  )}

                                  {/* 构图提示 */}
                                  {(webhookResponse as any).raw_output
                                    ?.visual_strategy?.composition_tips && (
                                    <Col span={24}>
                                      <Text strong>Composition Tips:</Text>
                                      <div
                                        style={{
                                          padding: '8px 12px',
                                          backgroundColor: '#fef2f2',
                                          borderRadius: '6px',
                                          marginTop: '4px',
                                          fontSize: '12px',
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center',
                                        }}
                                      >
                                        <span>
                                          📐{' '}
                                          {
                                            (webhookResponse as any).raw_output
                                              .visual_strategy.composition_tips
                                          }
                                        </span>
                                        <Button
                                          size='small'
                                          type='text'
                                          icon={<CopyOutlined />}
                                          onClick={() => {
                                            navigator.clipboard.writeText(
                                              (webhookResponse as any)
                                                .raw_output.visual_strategy
                                                .composition_tips
                                            );
                                            message.success(
                                              'Composition tips copied'
                                            );
                                          }}
                                        />
                                      </div>
                                    </Col>
                                  )}

                                  {/* 滤镜样式 */}
                                  {(webhookResponse as any).raw_output
                                    ?.visual_strategy?.filter_style && (
                                    <Col span={24}>
                                      <Text strong>Filter Style:</Text>
                                      <div
                                        style={{
                                          padding: '8px 12px',
                                          backgroundColor: '#fdf4ff',
                                          borderRadius: '6px',
                                          marginTop: '4px',
                                          fontSize: '12px',
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center',
                                        }}
                                      >
                                        <span>
                                          🎨{' '}
                                          {
                                            (webhookResponse as any).raw_output
                                              .visual_strategy.filter_style
                                          }
                                        </span>
                                        <Button
                                          size='small'
                                          type='text'
                                          icon={<CopyOutlined />}
                                          onClick={() => {
                                            navigator.clipboard.writeText(
                                              (webhookResponse as any)
                                                .raw_output.visual_strategy
                                                .filter_style
                                            );
                                            message.success(
                                              'Filter style copied'
                                            );
                                          }}
                                        />
                                      </div>
                                    </Col>
                                  )}

                                  {/* 文字叠加 */}
                                  {(webhookResponse as any).raw_output
                                    ?.visual_strategy?.text_overlay && (
                                    <Col span={24}>
                                      <Text strong>Text Overlay:</Text>
                                      <div
                                        style={{
                                          padding: '8px 12px',
                                          backgroundColor: '#f0fdf4',
                                          borderRadius: '6px',
                                          marginTop: '4px',
                                          fontSize: '12px',
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center',
                                        }}
                                      >
                                        <span>
                                          ✏️{' '}
                                          {
                                            (webhookResponse as any).raw_output
                                              .visual_strategy.text_overlay
                                          }
                                        </span>
                                        <Button
                                          size='small'
                                          type='text'
                                          icon={<CopyOutlined />}
                                          onClick={() => {
                                            navigator.clipboard.writeText(
                                              (webhookResponse as any)
                                                .raw_output.visual_strategy
                                                .text_overlay
                                            );
                                            message.success(
                                              'Text overlay copied'
                                            );
                                          }}
                                        />
                                      </div>
                                    </Col>
                                  )}
                                </Row>
                              </Card>
                            )}

                          {/* Industry Insights - Facebook */}
                          {activeTab === 'facebook' &&
                            (webhookResponse.research_data ||
                              (webhookResponse as any).raw_output
                                ?.search_enhanced_data) && (
                              <Card
                                size='small'
                                title='🔬 Industry Insights'
                                style={{ backgroundColor: '#fef7ff' }}
                              >
                                {(() => {
                                  const researchData =
                                    webhookResponse.research_data ||
                                    (webhookResponse as any).raw_output
                                      ?.search_enhanced_data;
                                  return (
                                    <>
                                      <div
                                        style={{
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center',
                                          marginBottom: 12,
                                        }}
                                      >
                                        <Text strong>Research Data:</Text>
                                        <Button
                                          size='small'
                                          type='text'
                                          icon={<CopyOutlined />}
                                          onClick={() => {
                                            let researchText = '';

                                            if (
                                              researchData?.visual_trends &&
                                              Array.isArray(
                                                researchData.visual_trends
                                              )
                                            ) {
                                              researchText += `Visual Trends:\n${researchData.visual_trends.map((t: string) => `• ${t}`).join('\n')}\n\n`;
                                            }

                                            if (
                                              researchData?.user_preferences &&
                                              Array.isArray(
                                                researchData.user_preferences
                                              )
                                            ) {
                                              researchText += `User Preferences:\n${researchData.user_preferences.map((p: string) => `• ${p}`).join('\n')}\n\n`;
                                            }

                                            if (
                                              researchData?.successful_examples &&
                                              Array.isArray(
                                                researchData.successful_examples
                                              )
                                            ) {
                                              researchText += `Successful Examples:\n${researchData.successful_examples.map((e: string) => `• ${e}`).join('\n')}`;
                                            }

                                            navigator.clipboard.writeText(
                                              researchText
                                            );
                                            message.success(
                                              'Research data copied'
                                            );
                                          }}
                                        />
                                      </div>

                                      {/* 视觉趋势 */}
                                      {researchData?.visual_trends &&
                                        Array.isArray(
                                          researchData.visual_trends
                                        ) && (
                                          <div style={{ marginBottom: '12px' }}>
                                            <Text strong>Visual Trends:</Text>
                                            <div style={{ marginTop: '4px' }}>
                                              {researchData.visual_trends.map(
                                                (
                                                  trend: string,
                                                  index: number
                                                ) => (
                                                  <div
                                                    key={index}
                                                    style={{
                                                      padding: '6px 10px',
                                                      backgroundColor:
                                                        '#f3e8ff',
                                                      borderRadius: '6px',
                                                      marginBottom: '6px',
                                                      fontSize: '12px',
                                                    }}
                                                  >
                                                    📈 {trend}
                                                  </div>
                                                )
                                              )}
                                            </div>
                                          </div>
                                        )}

                                      {/* 用户偏好 */}
                                      {researchData?.user_preferences &&
                                        Array.isArray(
                                          researchData.user_preferences
                                        ) && (
                                          <div style={{ marginBottom: '12px' }}>
                                            <Text strong>
                                              User Preferences:
                                            </Text>
                                            <div style={{ marginTop: '4px' }}>
                                              {researchData.user_preferences.map(
                                                (
                                                  preference: string,
                                                  index: number
                                                ) => (
                                                  <div
                                                    key={index}
                                                    style={{
                                                      padding: '6px 10px',
                                                      backgroundColor:
                                                        '#ede9fe',
                                                      borderRadius: '6px',
                                                      marginBottom: '6px',
                                                      fontSize: '12px',
                                                    }}
                                                  >
                                                    👥 {preference}
                                                  </div>
                                                )
                                              )}
                                            </div>
                                          </div>
                                        )}

                                      {/* 成功案例 */}
                                      {researchData?.successful_examples &&
                                        Array.isArray(
                                          researchData.successful_examples
                                        ) && (
                                          <div>
                                            <Text strong>
                                              Successful Examples:
                                            </Text>
                                            <div style={{ marginTop: '4px' }}>
                                              {researchData.successful_examples.map(
                                                (
                                                  example: string,
                                                  index: number
                                                ) => (
                                                  <div
                                                    key={index}
                                                    style={{
                                                      padding: '6px 10px',
                                                      backgroundColor:
                                                        '#faf5ff',
                                                      borderRadius: '6px',
                                                      marginBottom: '6px',
                                                      fontSize: '12px',
                                                      display: 'flex',
                                                      justifyContent:
                                                        'space-between',
                                                      alignItems: 'center',
                                                    }}
                                                  >
                                                    <span>📚 {example}</span>
                                                    <Button
                                                      size='small'
                                                      type='text'
                                                      icon={<CopyOutlined />}
                                                      onClick={() => {
                                                        navigator.clipboard.writeText(
                                                          example
                                                        );
                                                        message.success(
                                                          'Example copied'
                                                        );
                                                      }}
                                                    />
                                                  </div>
                                                )
                                              )}
                                            </div>
                                          </div>
                                        )}
                                    </>
                                  );
                                })()}
                              </Card>
                            )}

                          {/* Quick Publish Info - Facebook */}
                          {activeTab === 'facebook' &&
                            (webhookResponse as any).quick_publish && (
                              <Card
                                size='small'
                                title='⚡ Quick Publish Info'
                                style={{ backgroundColor: '#fff7ed' }}
                              >
                                <Row gutter={[8, 8]}>
                                  <Col span={24}>
                                    <div
                                      style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: 8,
                                      }}
                                    >
                                      <Text strong>Ready-to-Post Content:</Text>
                                      <Button
                                        size='small'
                                        type='text'
                                        icon={<CopyOutlined />}
                                        onClick={() => {
                                          const quickPublish = (
                                            webhookResponse as any
                                          ).quick_publish;
                                          const fullContent = `${quickPublish.post_ready}\n\n${quickPublish.hashtags_ready || ''}`;
                                          navigator.clipboard.writeText(
                                            fullContent
                                          );
                                          message.success(
                                            'Ready-to-post content copied'
                                          );
                                        }}
                                      />
                                    </div>
                                    <Card
                                      size='small'
                                      style={{
                                        backgroundColor: '#fef3c7',
                                        marginBottom: 8,
                                      }}
                                      styles={{ body: { padding: '12px' } }}
                                    >
                                      <Paragraph
                                        style={{
                                          whiteSpace: 'pre-wrap',
                                          margin: 0,
                                          fontSize: '14px',
                                          lineHeight: '1.6',
                                        }}
                                      >
                                        {
                                          (webhookResponse as any).quick_publish
                                            .post_ready
                                        }
                                      </Paragraph>
                                    </Card>
                                  </Col>
                                  <Col span={24}>
                                    <Text strong>Hashtags:</Text>
                                    <div style={{ marginTop: '4px' }}>
                                      {(
                                        webhookResponse as any
                                      ).quick_publish.hashtags_ready
                                        ?.split(' ')
                                        .map((tag: string, index: number) => (
                                          <Tag
                                            key={index}
                                            color='blue'
                                            style={{ marginBottom: 4 }}
                                          >
                                            {tag}
                                          </Tag>
                                        ))}
                                    </div>
                                  </Col>
                                  <Col span={12}>
                                    <Text strong>Engagement Score:</Text>
                                    <div
                                      style={{
                                        padding: '6px 10px',
                                        backgroundColor: '#dcfce7',
                                        borderRadius: '6px',
                                        marginTop: '4px',
                                        fontSize: '12px',
                                      }}
                                    >
                                      ⭐{' '}
                                      {String(
                                        (webhookResponse as any).quick_publish
                                          .engagement_score || 'N/A'
                                      )}
                                      /10
                                    </div>
                                  </Col>
                                  <Col span={12}>
                                    <Text strong>Optimal Time:</Text>
                                    <div
                                      style={{
                                        padding: '6px 10px',
                                        backgroundColor: '#dbeafe',
                                        borderRadius: '6px',
                                        marginTop: '4px',
                                        fontSize: '12px',
                                      }}
                                    >
                                      ⏰{' '}
                                      {String(
                                        (webhookResponse as any).quick_publish
                                          .optimal_time || 'No timing data'
                                      )}
                                    </div>
                                  </Col>
                                </Row>
                              </Card>
                            )}

                          {/* 视觉建议 */}
                          {((webhookResponse as any).raw_output?.visual_strategy
                            ?.composition ||
                            (webhookResponse as any).raw_output?.visual_strategy
                              ?.filter_style ||
                            (webhookResponse as any).raw_output?.visual_strategy
                              ?.text_overlay) && (
                            <Card
                              size='small'
                              title='🎨 Visual Suggestions'
                              style={{ backgroundColor: '#fff7f7' }}
                            >
                              <Row gutter={[8, 8]}>
                                <Col span={24}>
                                  <Text strong>Composition:</Text>
                                  <div
                                    style={{
                                      padding: '6px 10px',
                                      backgroundColor: '#fef2f2',
                                      borderRadius: '6px',
                                      marginTop: '4px',
                                      fontSize: '12px',
                                    }}
                                  >
                                    📐{' '}
                                    {(webhookResponse as any).raw_output
                                      ?.visual_strategy?.composition ||
                                      'Use a clean layout, focus on each tool in separate slides for clarity.'}
                                  </div>
                                </Col>
                                <Col span={24}>
                                  <Text strong>Filter Style:</Text>
                                  <div
                                    style={{
                                      padding: '6px 10px',
                                      backgroundColor: '#fdf4ff',
                                      borderRadius: '6px',
                                      marginTop: '4px',
                                      fontSize: '12px',
                                    }}
                                  >
                                    🎨{' '}
                                    {(webhookResponse as any).raw_output
                                      ?.visual_strategy?.filter_style ||
                                      'Use a modern, slightly desaturated filter to maintain a professional feel.'}
                                  </div>
                                </Col>
                                <Col span={24}>
                                  <Text strong>Text Overlay:</Text>
                                  <div
                                    style={{
                                      padding: '6px 10px',
                                      backgroundColor: '#f0fdf4',
                                      borderRadius: '6px',
                                      marginTop: '4px',
                                      fontSize: '12px',
                                    }}
                                  >
                                    ✏️{' '}
                                    {(webhookResponse as any).raw_output
                                      ?.visual_strategy?.text_overlay ||
                                      'Minimal text overlay, focus on bold headlines for each tool.'}
                                  </div>
                                </Col>
                              </Row>
                            </Card>
                          )}

                          {/* Quick Publish Info - Instagram Specific */}
                          {activeTab === 'instagram' &&
                            (webhookResponse as any).quick_publish && (
                              <Card
                                size='small'
                                title='⚡ Quick Publish Info'
                                style={{ backgroundColor: '#fff7ed' }}
                              >
                                <Row gutter={[8, 8]}>
                                  <Col span={24}>
                                    <div
                                      style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: 8,
                                      }}
                                    >
                                      <Text strong>Ready-to-Post Content:</Text>
                                      <Button
                                        size='small'
                                        type='text'
                                        icon={<CopyOutlined />}
                                        onClick={() => {
                                          const quickPublish = (
                                            webhookResponse as any
                                          ).quick_publish;
                                          const fullContent = `${quickPublish.full_post_ready}\n\n${quickPublish.hashtags_ready}`;
                                          navigator.clipboard.writeText(
                                            fullContent
                                          );
                                          message.success(
                                            'Ready-to-post content copied'
                                          );
                                        }}
                                      />
                                    </div>
                                    <Card
                                      size='small'
                                      style={{
                                        backgroundColor: '#fef3c7',
                                        marginBottom: 8,
                                      }}
                                      styles={{ body: { padding: '12px' } }}
                                    >
                                      <Paragraph
                                        style={{
                                          whiteSpace: 'pre-wrap',
                                          margin: 0,
                                          fontSize: '14px',
                                          lineHeight: '1.6',
                                        }}
                                      >
                                        {
                                          (webhookResponse as any).quick_publish
                                            .full_post_ready
                                        }
                                      </Paragraph>
                                    </Card>
                                  </Col>
                                  <Col span={24}>
                                    <Text strong>Hashtags:</Text>
                                    <div style={{ marginTop: '4px' }}>
                                      {(
                                        webhookResponse as any
                                      ).quick_publish.hashtags_ready
                                        ?.split(' ')
                                        .map((tag: string, index: number) => (
                                          <Tag
                                            key={index}
                                            color='blue'
                                            style={{ marginBottom: 4 }}
                                          >
                                            {tag}
                                          </Tag>
                                        ))}
                                    </div>
                                  </Col>
                                  <Col span={12}>
                                    <Text strong>Engagement Score:</Text>
                                    <div
                                      style={{
                                        padding: '6px 10px',
                                        backgroundColor: '#dcfce7',
                                        borderRadius: '6px',
                                        marginTop: '4px',
                                        fontSize: '12px',
                                      }}
                                    >
                                      ⭐{' '}
                                      {
                                        (webhookResponse as any).quick_publish
                                          .engagement_score
                                      }
                                      /10
                                    </div>
                                  </Col>
                                  <Col span={12}>
                                    <Text strong>Optimal Time:</Text>
                                    <div
                                      style={{
                                        padding: '6px 10px',
                                        backgroundColor: '#dbeafe',
                                        borderRadius: '6px',
                                        marginTop: '4px',
                                        fontSize: '12px',
                                      }}
                                    >
                                      ⏰{' '}
                                      {
                                        (webhookResponse as any).quick_publish
                                          .optimal_time
                                      }
                                    </div>
                                  </Col>
                                </Row>
                              </Card>
                            )}

                          {/* Generation Time */}
                          <div>
                            <Text type='secondary' style={{ fontSize: '12px' }}>
                              Generation Time:{' '}
                              {webhookResponse.generated_at
                                ? new Date(
                                    webhookResponse.generated_at
                                  ).toLocaleString()
                                : new Date().toLocaleString()}
                            </Text>
                          </div>
                        </Space>
                      )}

                      {generatedResponse && !loading && !webhookResponse && (
                        <Space
                          direction='vertical'
                          style={{ width: '100%' }}
                          size='middle'
                        >
                          {/* 生成的标题 */}
                          <div>
                            <Text strong>标题：</Text>
                            <Title level={4} style={{ margin: '8px 0' }}>
                              {generatedResponse.title}
                            </Title>
                          </div>

                          <Divider style={{ margin: '12px 0' }} />

                          {/* 生成的内容 */}
                          <div>
                            <Text strong>生成的文案：</Text>
                            <Card
                              size='small'
                              style={{
                                marginTop: 8,
                                backgroundColor: '#fafafa',
                              }}
                            >
                              <Paragraph
                                style={{ whiteSpace: 'pre-wrap', margin: 0 }}
                                copyable={{
                                  text: generatedResponse.generatedContent,
                                }}
                              >
                                {generatedResponse.generatedContent}
                              </Paragraph>
                            </Card>
                          </div>

                          {/* 标签 */}
                          {generatedResponse.hashtags.length > 0 && (
                            <div>
                              <Text strong>推荐标签：</Text>
                              <div style={{ marginTop: 8 }}>
                                {generatedResponse.hashtags.map(tag => (
                                  <Tag
                                    key={tag}
                                    color='blue'
                                    style={{ marginBottom: 4 }}
                                  >
                                    #{tag}
                                  </Tag>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Google Sheet 链接 */}
                          {generatedResponse.googleSheetUrl && (
                            <div>
                              <Text strong>存储链接：</Text>
                              <div style={{ marginTop: 8 }}>
                                <Button
                                  type='link'
                                  icon={<LinkOutlined />}
                                  href={generatedResponse.googleSheetUrl}
                                  target='_blank'
                                  rel='noopener noreferrer'
                                >
                                  查看Google Sheet存储结果
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Generation Time */}
                          <div>
                            <Text type='secondary' style={{ fontSize: '12px' }}>
                              Generation Time:
                              {new Date(
                                generatedResponse.createdAt
                              ).toLocaleString()}
                            </Text>
                          </div>
                        </Space>
                      )}

                      {!loading &&
                        !generatedResponse &&
                        !webhookResponse &&
                        !error && (
                          <div
                            style={{
                              textAlign: 'center',
                              padding: '40px',
                              color: '#999',
                            }}
                          >
                            <EditOutlined
                              style={{ fontSize: '48px', marginBottom: '16px' }}
                            />
                            <div>
                              Please enter content on the left and click the
                              generate button
                            </div>
                          </div>
                        )}
                    </Card>
                  </Col>
                </Row>
              </Tabs.TabPane>
            ))}
          </Tabs>
        </Card>
      </div>
    </>
  );
};

export default InternationalSocialMediaGenerator;
