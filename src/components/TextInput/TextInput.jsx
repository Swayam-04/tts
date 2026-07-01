import React from 'react';
import { Card, Input, Button, Space } from 'antd';
import { FiVolume2, FiTrash2, FiCopy } from 'react-icons/fi';
import styles from './TextInput.module.css';

const { TextArea } = Input;
const MAX_CHARS = 5000;

export default function TextInput({ text, onChangeText, onGenerate, onClear, onCopy, isLoading, disabled }) {
  const handleTextChange = (e) => {
    const val = e.target.value;
    if (val.length <= MAX_CHARS) {
      onChangeText(val);
    }
  };

  const isGenerateDisabled = !text.trim() || isLoading || disabled;

  return (
    <Card 
      className={styles.card}
      title={
        <div>
          <div className="card-title">Input Text</div>
          <div className="card-subtitle">Enter coded text for processing.</div>
        </div>
      }
    >
      <div className={styles.textareaWrapper}>
        <TextArea
          value={text}
          onChange={handleTextChange}
          placeholder="Enter coded text here..."
          autoSize={{ minRows: 8, maxRows: 16 }}
          disabled={isLoading}
          className={styles.textarea}
        />
        <div className={`${styles.charCounter} ${text.length >= MAX_CHARS ? styles.limitReached : ''}`}>
          {text.length} / {MAX_CHARS}
        </div>
      </div>
      
      <div className={styles.actions}>
        <Space size="middle" wrap className={styles.spaceWrapper}>
          <Button
            type="primary"
            size="large"
            icon={<FiVolume2 />}
            loading={isLoading}
            disabled={isGenerateDisabled}
            onClick={onGenerate}
            className="btn-ripple"
          >
            Generate Audio
          </Button>
          <Button
            type="default"
            size="large"
            icon={<FiCopy />}
            disabled={!text.trim()}
            onClick={onCopy}
            className={styles.copyBtn}
          >
            Copy Text
          </Button>
          <Button
            type="default"
            size="large"
            icon={<FiTrash2 />}
            disabled={!text || isLoading}
            onClick={onClear}
            className={styles.clearBtn}
          >
            Clear
          </Button>
        </Space>
      </div>
    </Card>
  );
}
