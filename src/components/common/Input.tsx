import React, { useState, useEffect } from 'react';
import { Input as AntInput } from 'antd';
import type { InputProps as AntInputProps } from 'antd';
import { EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';

export interface InputProps extends Omit<AntInputProps, 'onChange'> {
  /** Input label */
  label?: string;
  /** Error message */
  error?: string;
  /** Success message */
  success?: string;
  /** Custom validation function */
  validator?: (value: string) => string | null;
  /** Format input value */
  formatter?: (value: string) => string;
  /** Parse formatted value back to original */
  parser?: (value: string) => string;
  /** Debounce delay for onChange */
  debounceDelay?: number;
  /** Custom onChange handler */
  onChange?: (
    value: string,
    event: React.ChangeEvent<HTMLInputElement>
  ) => void;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  success,
  validator,
  formatter,
  parser,
  debounceDelay = 0,
  onChange,
  value,
  defaultValue,
  ...props
}) => {
  const [internalValue, setInternalValue] = useState(
    value || defaultValue || ''
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(
    null
  );

  useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;

    // Apply parser if provided
    if (parser) {
      newValue = parser(newValue);
    }

    setInternalValue(newValue);

    // Validation
    if (validator) {
      const errorMessage = validator(newValue);
      setValidationError(errorMessage);
    }

    // Debounced onChange
    if (onChange) {
      if (debounceDelay > 0) {
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
        const timer = setTimeout(() => {
          onChange(newValue, e);
        }, debounceDelay);
        setDebounceTimer(timer);
      } else {
        onChange(newValue, e);
      }
    }
  };

  // Format display value
  const displayValue = formatter
    ? formatter(String(internalValue))
    : internalValue;

  // Determine status
  const finalError = error || validationError;
  const status = finalError
    ? ('error' as const)
    : success
      ? ('warning' as const)
      : ('' as const);

  const inputProps = {
    ...props,
    value: displayValue,
    onChange: handleChange,
    ...(status !== '' && { status }),
  };

  return (
    <div style={{ width: '100%' }}>
      {label && (
        <div style={{ marginBottom: '4px', fontWeight: 500 }}>
          {label}
          {props.required && <span style={{ color: '#ff4d4f' }}> *</span>}
        </div>
      )}
      <AntInput {...inputProps} />
      {(finalError || success) && (
        <div
          style={{
            marginTop: '4px',
            fontSize: '12px',
            color: finalError ? '#ff4d4f' : '#52c41a',
          }}
        >
          {finalError || success}
        </div>
      )}
    </div>
  );
};

// Password Input Component
const Password: React.FC<InputProps> = ({
  label,
  error,
  success,
  onChange,
  ...props
}) => {
  const finalError = error;
  const status = finalError
    ? ('error' as const)
    : success
      ? ('warning' as const)
      : ('' as const);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      onChange(e.target.value, e);
    }
  };

  const { validator, formatter, parser, debounceDelay, ...antdProps } = props;

  return (
    <div style={{ width: '100%' }}>
      {label && (
        <div style={{ marginBottom: '4px', fontWeight: 500 }}>
          {label}
          {props.required && <span style={{ color: '#ff4d4f' }}> *</span>}
        </div>
      )}
      <AntInput.Password
        {...antdProps}
        onChange={handleChange}
        {...(status !== '' && { status })}
        iconRender={(visible: boolean) =>
          visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
        }
      />
      {(finalError || success) && (
        <div
          style={{
            marginTop: '4px',
            fontSize: '12px',
            color: finalError ? '#ff4d4f' : '#52c41a',
          }}
        >
          {finalError || success}
        </div>
      )}
    </div>
  );
};

// TextArea Component
export interface TextAreaProps extends InputProps {
  rows?: number;
  autoSize?: boolean | { minRows?: number; maxRows?: number };
}

const TextArea: React.FC<TextAreaProps> = ({
  rows = 4,
  autoSize = false,
  ...props
}) => {
  return (
    <Input
      {...props}
      // @ts-ignore - AntInput.TextArea props
      rows={rows}
      autoSize={autoSize}
      component={AntInput.TextArea}
    />
  );
};

// Define Input with static methods
interface InputComponent extends React.FC<InputProps> {
  Password: React.FC<InputProps>;
  TextArea: React.FC<TextAreaProps>;
}

// Attach sub-components
(Input as InputComponent).Password = Password;
(Input as InputComponent).TextArea = TextArea;

export default Input as InputComponent;
