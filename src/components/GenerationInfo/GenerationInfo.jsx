import React from 'react';
import { Card } from 'antd';
import styles from './GenerationInfo.module.css';

export default function GenerationInfo({ metrics }) {
  const displayValue = (val, suffix = '') => {
    if (val === null || val === undefined || val === '') return '--';
    return `${val}${suffix}`;
  };

  return (
    <Card
      className={styles.card}
      title={
        <div>
          <div className="card-title">Generation Information</div>
        </div>
      }
    >
      <div className={styles.grid}>
        <div className={styles.item}>
          <div className={styles.label}>⚡ Response Time</div>
          <div className={styles.value}>{displayValue(metrics?.responseTime || metrics?.processingTime, ' s')}</div>
        </div>
        <div className={styles.item}>
          <div className={styles.label}>🧠 Gemma 4</div>
          <div className={styles.value}>{displayValue(metrics?.llmTime, ' s')}</div>
        </div>
        <div className={styles.item}>
          <div className={styles.label}>🔊 Chatterbox</div>
          <div className={styles.value}>{displayValue(metrics?.ttsTime, ' s')}</div>
        </div>
        <div className={styles.item}>
          <div className={styles.label}>💿 Encoding</div>
          <div className={styles.value}>{displayValue(metrics?.encodingTime, ' s')}</div>
        </div>
        <div className={styles.item}>
          <div className={styles.label}>🎵 Audio Duration</div>
          <div className={styles.value}>{displayValue(metrics?.audioDuration, ' s')}</div>
        </div>
        <div className={styles.item}>
          <div className={styles.label}>Voice Selected</div>
          <div className={styles.value}>{displayValue(metrics?.voiceSelected)}</div>
        </div>
      </div>
    </Card>
  );
}
