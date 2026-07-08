import React, { useState, useEffect } from 'react';
import { Card, Progress, Divider } from 'antd';
import { CheckCircle, Cpu, Loader2, Activity, Server, Lock, FileText } from 'lucide-react';
import { getSystemStatus } from '../../services/systemService';
import styles from './StatusPanel.module.css';

export default function StatusPanel({ isGenerating, progress, audioStatus, llmStatus: dynamicLlm, ttsStatus: dynamicTts }) {
  const [status, setStatus] = useState(null);
  const [docCount, setDocCount] = useState(0);

  useEffect(() => {
    getSystemStatus().then((res) => {
      setStatus(res);
    });

    // Dynamically fetch document count from local server
    fetch("http://127.0.0.1:5000/documents")
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.documents)) {
          setDocCount(data.documents.length);
        }
      })
      .catch(err => console.log("Failed to load documents count", err));
  }, []);

  if (!status) return null;

  const currentLlm = dynamicLlm || status.llm;
  const currentTts = dynamicTts || status.tts;

  const getStatusIcon = (value) => {
    switch (value) {
      case 'Ready':
      case 'Optimal':
        return <span className={styles.readyBadge}><CheckCircle className={styles.icon} size={13} /> {value}</span>;
      case 'Processing':
      case 'Generating':
        return <span className={styles.processingBadge}><Loader2 className={`${styles.icon} ${styles.spin}`} size={13} /> {value}</span>;
      default:
        return <span className={styles.waitingBadge}><Activity className={styles.icon} size={13} /> {value}</span>;
    }
  };

  const getProcessingStatus = () => {
    if (isGenerating) {
      if (currentLlm === 'Processing') return 'Analyzing';
      if (currentTts === 'Generating') return 'Synthesizing';
      return 'Processing';
    }
    if (audioStatus === 'Ready') return 'Completed';
    return 'Idle';
  };

  return (
    <div className={styles.panel}>
      <Card
        className={styles.card}
        title={<span className="card-title">System Status</span>}
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
              strokeColor="#2E8BFF"
              trailColor="rgba(255, 255, 255, 0.05)"
              className={styles.progressBar}
            />
          </div>
        )}
      </Card>

      <Card
        className={`${styles.card} ${styles.diagnosticsCard}`}
        title={<span className="card-title">Diagnostics</span>}
      >
        <div className={styles.diagGrid}>
          {/* CPU Progress */}
          <div className={styles.diagItemFull}>
            <div className={styles.diagHeader}>
              <span className={styles.diagLabel}><Cpu className={styles.diagIcon} size={13} /> CPU Load (Local)</span>
              <span className={styles.diagValue}>{status.specs.cpuUsage}</span>
            </div>
            <Progress 
              percent={parseInt(status.specs.cpuUsage) || 12} 
              size="small" 
              showInfo={false} 
              strokeColor="#2E8BFF" 
              trailColor="rgba(255, 255, 255, 0.05)"
              className={styles.miniProgress}
            />
          </div>
          
          {/* RAM Progress */}
          <div className={styles.diagItemFull}>
            <div className={styles.diagHeader}>
              <span className={styles.diagLabel}><Server className={styles.diagIcon} size={13} /> RAM Allocation</span>
              <span className={styles.diagValue}>{status.specs.ramUsage}</span>
            </div>
            <Progress 
              percent={15}
              size="small" 
              showInfo={false} 
              strokeColor="#31D17B" 
              trailColor="rgba(255, 255, 255, 0.05)"
              className={styles.miniProgress}
            />
          </div>

          <div className={styles.diagTwoCol}>
            {/* Air gap status */}
            <div className={styles.diagItemSmall}>
              <Lock className={styles.diagIconSmall} size={14} />
              <div className={styles.diagInfo}>
                <div className={styles.diagLabelSmall}>Air-Gap Check</div>
                <div className={styles.diagValueSmall} style={{ color: '#31D17B' }}>
                  {status.specs.airgap}
                </div>
              </div>
            </div>

            {/* Document Count */}
            <div className={styles.diagItemSmall}>
              <FileText className={styles.diagIconSmall} size={14} />
              <div className={styles.diagInfo}>
                <div className={styles.diagLabelSmall}>Indexed Vault</div>
                <div className={styles.diagValueSmall}>
                  {docCount} File{docCount !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          </div>
        </div>

        <Divider className={styles.divider} />
        
        <div className={styles.versionList}>
          <div className={styles.versionRow}>
            <span>Ollama LLM Core</span>
            <code>{status.specs.ollamaVersion} (Gemma 4)</code>
          </div>
          <div className={styles.versionRow}>
            <span>Chatterbox TTS</span>
            <code>{status.specs.chatterboxVersion} (Formant)</code>
          </div>
          <div className={styles.versionRow}>
            <span>Session Memory</span>
            <code>Active (vaani.db)</code>
          </div>
        </div>
      </Card>
    </div>
  );
}
