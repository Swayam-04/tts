import React, { useState, useEffect } from 'react';
import { Card, Progress, Divider } from 'antd';
import { FiCheckCircle, FiLoader, FiActivity, FiServer, FiLock, FiCpu } from 'react-icons/fi';
import { getSystemStatus } from '../../services/systemService';
import styles from './StatusPanel.module.css';

export default function StatusPanel({ isGenerating, progress, audioStatus, llmStatus: dynamicLlm, ttsStatus: dynamicTts }) {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    getSystemStatus().then((res) => {
      setStatus(res);
    });
  }, []);

  if (!status) return null;

  // Use dynamic props if provided, otherwise fall back to local loaded status
  const currentLlm = dynamicLlm || status.llm;
  const currentTts = dynamicTts || status.tts;

  const getStatusIcon = (value) => {
    switch (value) {
      case 'Ready':
      case 'Optimal':
        return <span className={styles.readyBadge}><FiCheckCircle className={styles.icon} /> {value}</span>;
      case 'Processing':
      case 'Generating':
        return <span className={styles.processingBadge}><FiLoader className={`${styles.icon} ${styles.spin}`} /> {value}</span>;
      default:
        return <span className={styles.waitingBadge}><FiActivity className={styles.icon} /> {value}</span>;
    }
  };

  const getProcessingStatus = () => {
    if (isGenerating) {
      if (currentLlm === 'Processing') return 'Analyzing Prompt';
      if (currentTts === 'Generating') return 'Synthesizing Speech';
      return 'Processing';
    }
    if (audioStatus === 'Ready') return 'Completed';
    return 'Idle';
  };

  return (
    <div className={styles.panel}>
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
            {getStatusIcon(currentLlm)}
          </div>
          <div className={styles.statusRow}>
            <span className={styles.label}>TTS Status</span>
            {getStatusIcon(currentTts)}
          </div>
          <div className={styles.statusRow}>
            <span className={styles.label}>Processing</span>
            {getStatusIcon(getProcessingStatus())}
          </div>
          <div className={styles.statusRow}>
            <span className={styles.label}>System Health</span>
            {getStatusIcon(status.health)}
          </div>
        </div>

        {isGenerating && (
          <div className={styles.progressSection}>
            <div className={styles.progressLabel}>
              <span>
                {currentLlm === 'Processing' ? 'LLM Deciphering...' : 'TTS Synthesis...'}
              </span>
              <span className={styles.progressPercent}>{progress}%</span>
            </div>
            <Progress 
              percent={progress} 
              showInfo={false}
              status="active"
              strokeColor={{
                '0%': '#1E88E5',
                '100%': '#2ea44f',
              }}
              trailColor="rgba(255, 255, 255, 0.05)"
              className={styles.progressBar}
            />
          </div>
        )}
      </Card>

      <Card
        className={`${styles.card} ${styles.diagnosticsCard}`}
        title={
          <div>
            <div className="card-title">Diagnostics</div>
          </div>
        }
      >
        <div className={styles.diagGrid}>
          <div className={styles.diagItem}>
            <FiCpu className={styles.diagIcon} />
            <div className={styles.diagInfo}>
              <div className={styles.diagLabel}>CPU Load (Local)</div>
              <div className={styles.diagValue}>{status.specs.cpuUsage}</div>
            </div>
          </div>
          
          <div className={styles.diagItem}>
            <FiServer className={styles.diagIcon} />
            <div className={styles.diagInfo}>
              <div className={styles.diagLabel}>RAM Allocation</div>
              <div className={styles.diagValue}>{status.specs.ramUsage}</div>
            </div>
          </div>

          <div className={styles.diagItem}>
            <FiLock className={styles.diagIcon} />
            <div className={styles.diagInfo}>
              <div className={styles.diagLabel}>Air-Gap Check</div>
              <div className={styles.diagValue} style={{ color: 'var(--color-status-green)' }}>
                {status.specs.airgap}
              </div>
            </div>
          </div>
        </div>

        <Divider className={styles.divider} />
        
        <div className={styles.versionList}>
          <div className={styles.versionRow}>
            <span>Ollama Engine</span>
            <code>{status.specs.ollamaVersion}</code>
          </div>
          <div className={styles.versionRow}>
            <span>OmniVoice Studio</span>
            <code>{status.specs.omniVoiceVersion}</code>
          </div>
        </div>
      </Card>
    </div>
  );
}
