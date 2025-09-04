/**
 * RedNote Content Generator Component
 * 小红书文案生成器组件
 */

import React, { useState, useCallback } from 'react';
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
  message,
  Progress,
} from 'antd';
import {
  EditOutlined,
  SendOutlined,
  CopyOutlined,
  LinkOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { RedNoteContentRequest, RedNoteContentResponse } from '../types';

const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

/**
 * 小红书文案生成器组件属性接口
 */
interface RedNoteContentGeneratorProps {
  onContentGenerated?: (response: RedNoteContentResponse) => void;
  className?: string;
}

/**
 * 小红书文案生成器组件
 */
const RedNoteContentGenerator: React.FC<RedNoteContentGeneratorProps> = ({
  onContentGenerated,
  className,
}) => {
  const { t } = useTranslation();

  // 状态管理
  const [inputContent, setInputContent] = useState<string>('');
  const [contentType, setContentType] = useState<string>(
    '教程攻略类：美妆教程（化妆步骤、护肤流程、产品测评）'
  );
  const [tone, setTone] = useState<string>(
    '亲密闺蜜风：特点（像朋友聊天一样自然亲切）'
  );
  const [writingTechnique, setWritingTechnique] = useState<string>(
    '标题技巧：数字型（5个技巧、3步搞定、10款推荐）'
  );
  const [successFactor, setSuccessFactor] = useState<string>(
    '真实性（真实体验和感受最容易引起共鸣）'
  );
  const [targetAudience, setTargetAudience] = useState<string>('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [progressText, setProgressText] = useState<string>('');
  const [generatedResponse, setGeneratedResponse] =
    useState<RedNoteContentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * 添加关键词
   */
  const handleAddKeyword = useCallback(() => {
    if (keywordInput.trim() && !keywords.includes(keywordInput.trim())) {
      setKeywords(prev => [...prev, keywordInput.trim()]);
      setKeywordInput('');
    }
  }, [keywordInput, keywords]);

  /**
   * 移除关键词
   */
  const handleRemoveKeyword = useCallback((keyword: string) => {
    setKeywords(prev => prev.filter(k => k !== keyword));
  }, []);

  /**
   * 模拟进度更新
   */
  const simulateProgress = useCallback(() => {
    const steps = [
      { progress: 20, text: '正在分析输入内容...' },
      { progress: 40, text: '生成创意文案中...' },
      { progress: 60, text: '优化文案结构...' },
      { progress: 80, text: '添加标签和关键词...' },
      { progress: 95, text: '保存到Google Sheet...' },
      { progress: 100, text: '生成完成！' },
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setProgress(steps[currentStep].progress);
        setProgressText(steps[currentStep].text);
        currentStep++;
      } else {
        clearInterval(interval);
      }
    }, 800);

    return interval;
  }, []);

  /**
   * 生成文案
   */
  const handleGenerateContent = useCallback(async () => {
    if (!inputContent.trim()) {
      message.warning('请输入要生成文案的内容');
      return;
    }

    setLoading(true);
    setError(null);
    setProgress(0);
    setProgressText('开始生成文案...');

    const progressInterval = simulateProgress();

    try {
      // 创建请求对象
      const request: RedNoteContentRequest = {
        id: `rednote_${Date.now()}`,
        inputContent: inputContent.trim(),
        contentType,
        tone,
        writingTechnique,
        successFactor,
        targetAudience: targetAudience.trim() || undefined,
        keywords: keywords.length > 0 ? keywords : undefined,
        createdAt: new Date().toISOString(),
      };

      // 调用实际的webhook API
      const webhookUrl = 'https://n8n.wendealai.com/webhook/rednote';
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputContent: request.inputContent,
          contentType: request.contentType,
          tone: request.tone,
          writingTechnique: request.writingTechnique,
          successFactor: request.successFactor,
          targetAudience: request.targetAudience,
          keywords: request.keywords,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseText = await response.text();

      // 创建响应对象
      const apiResponse: RedNoteContentResponse = {
        id: `response_${Date.now()}`,
        requestId: request.id,
        generatedContent: responseText,
        title: generateMockTitle(inputContent, contentType),
        hashtags: generateMockHashtags(keywords, contentType),
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
    contentType,
    tone,
    writingTechnique,
    successFactor,
    targetAudience,
    keywords,
    simulateProgress,
    onContentGenerated,
  ]);

  /**
   * 生成模拟内容
   */
  const generateMockContent = (
    input: string,
    type: string,
    toneType: string,
    technique: string,
    factor: string
  ): string => {
    // 解析内容类型和语调风格
    const contentTypeDisplay = type.includes('：')
      ? type.split('：')[1].split('（')[0]
      : type;
    const toneDisplay = toneType.includes('：')
      ? toneType.split('：')[0]
      : toneType;
    const techniqueDisplay = technique.includes('：')
      ? technique.split('：')[0]
      : technique;
    const factorDisplay = factor.includes('（')
      ? factor.split('（')[0]
      : factor;

    return `这是一个关于"${input}"的${contentTypeDisplay}分享。\n\n采用${toneDisplay}的风格，运用${techniqueDisplay}技巧，注重${factorDisplay}，为你量身定制的小红书文案。内容经过AI优化，确保吸引力和传播性。\n\n选择的内容类型：${type}\n选择的语调风格：${toneType}\n选择的文案技巧：${technique}\n选择的成功要素：${factor}`;
  };

  /**
   * 生成模拟标题
   */
  const generateMockTitle = (input: string, type: string): string => {
    // 根据新的内容类型格式生成标题前缀
    let prefix = '📝 内容分享';

    if (type.includes('教程攻略类')) {
      if (type.includes('美妆教程')) prefix = '💄 美妆教程';
      else if (type.includes('穿搭攻略')) prefix = '👗 穿搭攻略';
      else if (type.includes('生活技能')) prefix = '🏠 生活技能';
      else if (type.includes('旅行攻略')) prefix = '✈️ 旅行攻略';
    } else if (type.includes('分享种草类')) {
      if (type.includes('好物推荐')) prefix = '🛍️ 好物推荐';
      else if (type.includes('体验分享')) prefix = '⭐ 体验分享';
      else if (type.includes('避雷指南')) prefix = '⚠️ 避雷指南';
    } else if (type.includes('情感共鸣类')) {
      if (type.includes('生活感悟')) prefix = '💭 生活感悟';
      else if (type.includes('情感故事')) prefix = '💕 情感故事';
      else if (type.includes('励志鸡汤')) prefix = '✨ 励志鸡汤';
    } else if (type.includes('热点话题类')) {
      if (type.includes('流行趋势')) prefix = '🔥 流行趋势';
      else if (type.includes('节日相关')) prefix = '🎉 节日相关';
      else if (type.includes('季节性内容')) prefix = '🌸 季节性内容';
    }

    return `${prefix} | ${input.slice(0, 20)}${input.length > 20 ? '...' : ''}`;
  };

  /**
   * 生成模拟标签
   */
  const generateMockHashtags = (
    userKeywords: string[],
    type: string
  ): string[] => {
    // 根据新的内容类型格式生成默认标签
    let defaultTags: string[] = ['小红书', '分享'];

    if (type.includes('教程攻略类')) {
      if (type.includes('美妆教程'))
        defaultTags = ['美妆教程', '化妆技巧', '护肤心得'];
      else if (type.includes('穿搭攻略'))
        defaultTags = ['穿搭分享', '搭配技巧', '时尚'];
      else if (type.includes('生活技能'))
        defaultTags = ['生活技巧', '实用技能', '干货分享'];
      else if (type.includes('旅行攻略'))
        defaultTags = ['旅行攻略', '出行指南', '旅游分享'];
    } else if (type.includes('分享种草类')) {
      if (type.includes('好物推荐'))
        defaultTags = ['好物推荐', '种草清单', '购物分享'];
      else if (type.includes('体验分享'))
        defaultTags = ['使用体验', '真实测评', '效果分享'];
      else if (type.includes('避雷指南'))
        defaultTags = ['避雷指南', '踩雷分享', '选择建议'];
    } else if (type.includes('情感共鸣类')) {
      if (type.includes('生活感悟'))
        defaultTags = ['生活感悟', '人生思考', '成长心得'];
      else if (type.includes('情感故事'))
        defaultTags = ['情感故事', '真实经历', '心情分享'];
      else if (type.includes('励志鸡汤'))
        defaultTags = ['正能量', '励志', '心灵鸡汤'];
    } else if (type.includes('热点话题类')) {
      if (type.includes('流行趋势'))
        defaultTags = ['流行趋势', '时尚潮流', '热门话题'];
      else if (type.includes('节日相关'))
        defaultTags = ['节日分享', '节日攻略', '节庆'];
      else if (type.includes('季节性内容'))
        defaultTags = ['季节分享', '应季推荐', '时令'];
    }

    return [...(userKeywords || []), ...defaultTags].slice(0, 8);
  };

  /**
   * 复制内容到剪贴板
   */
  const handleCopyContent = useCallback(async () => {
    if (generatedResponse?.generatedContent) {
      try {
        await navigator.clipboard.writeText(generatedResponse.generatedContent);
        message.success('内容已复制到剪贴板');
      } catch (err) {
        message.error('复制失败，请手动复制');
      }
    }
  }, [generatedResponse]);

  /**
   * 重新生成
   */
  const handleRegenerate = useCallback(() => {
    setGeneratedResponse(null);
    setError(null);
    setProgress(0);
    setProgressText('');
  }, []);

  return (
    <div className={`rednote-content-generator ${className || ''}`}>
      <Row gutter={[16, 16]}>
        {/* 输入区域 */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <EditOutlined />
                <span>内容输入</span>
              </Space>
            }
            size='small'
          >
            <Space direction='vertical' style={{ width: '100%' }} size='middle'>
              {/* 主要内容输入 */}
              <div>
                <Text strong>输入内容 *</Text>
                <TextArea
                  value={inputContent}
                  onChange={e => setInputContent(e.target.value)}
                  placeholder='请输入您想要生成小红书文案的内容，可以是一篇文章、一些想法、产品描述等...'
                  rows={10}
                  maxLength={10000}
                  showCount
                  style={{ marginTop: 8 }}
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
                  <Option value='教程攻略类：美妆教程（化妆步骤、护肤流程、产品测评）'>
                    💄 教程攻略类：美妆教程（化妆步骤、护肤流程、产品测评）
                  </Option>
                  <Option value='教程攻略类：穿搭攻略（搭配技巧、身材优化、场合穿搭）'>
                    👗 教程攻略类：穿搭攻略（搭配技巧、身材优化、场合穿搭）
                  </Option>
                  <Option value='教程攻略类：生活技能（收纳整理、料理制作、学习方法）'>
                    🏠 教程攻略类：生活技能（收纳整理、料理制作、学习方法）
                  </Option>
                  <Option value='教程攻略类：旅行攻略（景点推荐、路线规划、省钱技巧）'>
                    ✈️ 教程攻略类：旅行攻略（景点推荐、路线规划、省钱技巧）
                  </Option>
                  <Option value='分享种草类：好物推荐（实用好物、性价比产品、新品试用）'>
                    🛍️ 分享种草类：好物推荐（实用好物、性价比产品、新品试用）
                  </Option>
                  <Option value='分享种草类：体验分享（购物体验、使用感受、效果对比）'>
                    ⭐ 分享种草类：体验分享（购物体验、使用感受、效果对比）
                  </Option>
                  <Option value='分享种草类：避雷指南（产品踩雷、消费陷阱、选择建议）'>
                    ⚠️ 分享种草类：避雷指南（产品踩雷、消费陷阱、选择建议）
                  </Option>
                  <Option value='情感共鸣类：生活感悟（职场心得、人生思考、成长感悟）'>
                    💭 情感共鸣类：生活感悟（职场心得、人生思考、成长感悟）
                  </Option>
                  <Option value='情感共鸣类：情感故事（恋爱经历、友情故事、家庭关系）'>
                    💕 情感共鸣类：情感故事（恋爱经历、友情故事、家庭关系）
                  </Option>
                  <Option value='情感共鸣类：励志鸡汤（正能量分享、motivational内容）'>
                    ✨ 情感共鸣类：励志鸡汤（正能量分享、motivational内容）
                  </Option>
                  <Option value='热点话题类：流行趋势（时尚潮流、网红产品、热门话题）'>
                    🔥 热点话题类：流行趋势（时尚潮流、网红产品、热门话题）
                  </Option>
                  <Option value='热点话题类：节日相关（节日穿搭、礼物推荐、节日攻略）'>
                    🎉 热点话题类：节日相关（节日穿搭、礼物推荐、节日攻略）
                  </Option>
                  <Option value='热点话题类：季节性内容（换季护肤、季节穿搭、应季美食）'>
                    🌸 热点话题类：季节性内容（换季护肤、季节穿搭、应季美食）
                  </Option>
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
                  <Option value='亲密闺蜜风：特点（像朋友聊天一样自然亲切）'>
                    👭 亲密闺蜜风：特点（像朋友聊天一样自然亲切）
                  </Option>
                  <Option value='专业科普风：特点（知识性强，权威可信）'>
                    🎓 专业科普风：特点（知识性强，权威可信）
                  </Option>
                  <Option value='可爱萌系风：特点（语言活泼，多用表情符号）'>
                    🥰 可爱萌系风：特点（语言活泼，多用表情符号）
                  </Option>
                  <Option value='直率真实风：特点（说话直接，不加修饰）'>
                    💯 直率真实风：特点（说话直接，不加修饰）
                  </Option>
                  <Option value='精致优雅风：特点（文字优美，格调较高）'>
                    🌹 精致优雅风：特点（文字优美，格调较高）
                  </Option>
                </Select>
              </div>

              {/* 爆款文案常用技巧 */}
              <div>
                <Text strong>爆款文案常用技巧</Text>
                <Select
                  value={writingTechnique}
                  onChange={setWritingTechnique}
                  placeholder='选择文案技巧'
                  style={{ width: '100%', marginTop: 8 }}
                >
                  {/* 标题技巧 */}
                  <Option value='标题技巧：数字型（5个技巧、3步搞定、10款推荐）'>
                    📊 标题技巧：数字型（5个技巧、3步搞定、10款推荐）
                  </Option>
                  <Option value='标题技巧：疑问型（你还在用XX吗？为什么XX这么火？）'>
                    ❓ 标题技巧：疑问型（你还在用XX吗？为什么XX这么火？）
                  </Option>
                  <Option value='标题技巧：惊叹型（太绝了！竟然有这种操作！）'>
                    😱 标题技巧：惊叹型（太绝了！竟然有这种操作！）
                  </Option>
                  <Option value='标题技巧：对比型（XX vs XX，哪个更值得买？）'>
                    ⚖️ 标题技巧：对比型（XX vs XX，哪个更值得买？）
                  </Option>
                  {/* 开头技巧 */}
                  <Option value='开头技巧：抛出问题（你们有没有遇到过...）'>
                    🤔 开头技巧：抛出问题（你们有没有遇到过...）
                  </Option>
                  <Option value='开头技巧：分享心情（最近超级迷恋...）'>
                    💕 开头技巧：分享心情（最近超级迷恋...）
                  </Option>
                  <Option value='开头技巧：制造悬念（发现了一个秘密...）'>
                    🔍 开头技巧：制造悬念（发现了一个秘密...）
                  </Option>
                  <Option value='开头技巧：直入主题（今天分享一个超实用的...）'>
                    🎯 开头技巧：直入主题（今天分享一个超实用的...）
                  </Option>
                  {/* 结尾技巧 */}
                  <Option value='结尾技巧：互动引导（你们觉得呢？评论区聊聊）'>
                    💬 结尾技巧：互动引导（你们觉得呢？评论区聊聊）
                  </Option>
                  <Option value='结尾技巧：收藏提醒（记得收藏，别刷丢了）'>
                    ⭐ 结尾技巧：收藏提醒（记得收藏，别刷丢了）
                  </Option>
                  <Option value='结尾技巧：关注引导（关注我，更多好物分享）'>
                    👥 结尾技巧：关注引导（关注我，更多好物分享）
                  </Option>
                  <Option value='结尾技巧：行动号召（赶紧去试试，真的很香）'>
                    🚀 结尾技巧：行动号召（赶紧去试试，真的很香）
                  </Option>
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
                  <Option value='真实性（真实体验和感受最容易引起共鸣）'>
                    ✨ 真实性（真实体验和感受最容易引起共鸣）
                  </Option>
                  <Option value='实用性（提供实际价值，解决用户痛点）'>
                    🔧 实用性（提供实际价值，解决用户痛点）
                  </Option>
                  <Option value='视觉化（配图精美，排版清晰）'>
                    🎨 视觉化（配图精美，排版清晰）
                  </Option>
                  <Option value='互动性（鼓励用户参与讨论和分享）'>
                    🤝 互动性（鼓励用户参与讨论和分享）
                  </Option>
                  <Option value='时效性（抓住热点和流行趋势）'>
                    ⏰ 时效性（抓住热点和流行趋势）
                  </Option>
                </Select>
              </div>

              {/* 目标受众 */}
              <div>
                <Text strong>目标受众 (可选)</Text>
                <Input
                  value={targetAudience}
                  onChange={e => setTargetAudience(e.target.value)}
                  placeholder='例如：年轻女性、职场新人、美妆爱好者等'
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
                {loading ? '生成中...' : '生成小红书文案'}
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
                  <span>生成结果</span>
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
            style={{ height: 'calc(100vh - 400px)', overflow: 'auto' }}
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
                    重新生成
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

            {generatedResponse && !loading && (
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
                    style={{ marginTop: 8, backgroundColor: '#fafafa' }}
                  >
                    <Paragraph
                      style={{ whiteSpace: 'pre-wrap', margin: 0 }}
                      copyable={{ text: generatedResponse.generatedContent }}
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
                        <Tag key={tag} color='blue' style={{ marginBottom: 4 }}>
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

                {/* 生成时间 */}
                <div>
                  <Text type='secondary' style={{ fontSize: '12px' }}>
                    生成时间：
                    {new Date(generatedResponse.createdAt).toLocaleString()}
                  </Text>
                </div>
              </Space>
            )}

            {!loading && !generatedResponse && !error && (
              <div
                style={{ textAlign: 'center', padding: '40px', color: '#999' }}
              >
                <EditOutlined
                  style={{ fontSize: '48px', marginBottom: '16px' }}
                />
                <div>请在左侧输入内容并点击生成按钮</div>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default RedNoteContentGenerator;
