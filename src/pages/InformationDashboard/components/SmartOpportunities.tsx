/**
 * SmartOpportunities Component
 * 智能商业机会发现主组件
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

// 导入子组件
import InputForm from './InputForm';

// 导入类型
import type {
  SmartOpportunitiesProps,
  WorkflowParameters,
} from '@/types/smartOpportunities';

/**
 * SmartOpportunities主组件
 * 整合输入表单和数据展示，实现完整的商业机会发现功能
 */
const SmartOpportunities: React.FC<SmartOpportunitiesProps> = ({
  onParametersChange,
  onDataLoaded: _onDataLoaded,
  onError: _onError,
}) => {
  const { t: _t } = useTranslation();

  // 状态管理
  const [parameters, setParameters] = useState<WorkflowParameters>({
    industry: '',
    city: '',
    country: '',
  });

  /**
   * 处理参数变化
   */
  const handleParametersChange = (newParameters: WorkflowParameters) => {
    setParameters(newParameters);
    onParametersChange?.(newParameters);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 输入区域 - 占据全部空间 */}
      <InputForm
        value={parameters}
        onChange={handleParametersChange}
        onSubmit={() => {}}
        loading={false}
        showIframe={true}
        iframeSrc='https://nocodb.wendealai.com/dashboard/#/nc/view/24b9c8b5-ab0a-4e84-9789-24996ce17822'
        iframeTitle='Business Opportunity Dashboard'
      />
    </div>
  );
};

export default SmartOpportunities;
