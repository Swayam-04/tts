import React from 'react';
import { Card, Progress } from 'antd';
import { FiCheckCircle, FiLoader, FiActivity } from 'react-icons/fi';
import styles from './StatusCard.module.css';

export default function StatusCard({ llmStatus, ttsStatus, audioStatus, progress, isGenerating }) {
  const getStatusIcon = (status) => {
    switch (status) {
      case 'Ready':
        return <span className={styles.readyBadge}><FiCheckCircle className={styles.icon} /> Ready</span>;
      case 'Processing':
        return <span className={styles.processingBadge}><FiLoader className={`${styles.icon} ${styles.spin}`} /> Processing</span>;
      case 'Generating':
        return <span className={styles.processingBadge}><FiLoader className={`${styles.icon} ${styles.spin}`} /> Generating</span>;
      case 'Waiting':
        return <span className={styles.waitingBadge}><FiActivity className={styles.icon} /> Waiting</span>;
      default:
        return <span className={styles.waitingBadge}>{status}</span>;
    }
  };

  const getAudioStatusText = () => {
    if (isGenerating) return 'Generating';
    if (audioStatus === 'Ready') return 'Ready';
    return 'Waiting';
  };

  return (
    <Card 
      className={styles.card}
      title={
        <div>
          <div className="card-title">System Status</div>
        </div>
      }
    >
      <div className={styles.statusGrid}>
        <div className={styles.statusRow}>
          <span className={styles.label}>LLM Status</span>
          {getStatusIcon(llmStatus)}
        </div>
        <div className={styles.statusRow}>
          <span className={styles.label}>TTS Status</span>
          {getStatusIcon(ttsStatus)}
        </div>
        <div className={styles.statusRow}>
          <span className={styles.label}>Audio Status</span>
          {getStatusIcon(getAudioStatusText())}
        </div>
      </div>
      
      <div className={styles.progressContainer}>
        <div className={styles.progressLabel}>
          <span>Progress</span>
          <span className={styles.progressText}>
            {isGenerating ? `${progress}%` : progress === 100 ? 'Completed' : 'Idle'}
          </span>
        </div>
        <Progress 
          percent={progress} 
          showInfo={false}
          status={isGenerating ? 'active' : progress === 100 ? 'normal' : 'normal'}
          strokeColor={{
            '0%': '#1E88E5',
            '100%': '#2ea44f',
          }}
          trailColor="rgba(255, 255, 255, 0.05)"
          className={styles.progressBar}
        />
      </div>
    </Card>
  );
}
