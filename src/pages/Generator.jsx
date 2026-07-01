import React, { useEffect, useRef } from 'react';
import { Card, Input, Button, Timeline, Progress, notification, Alert } from 'antd';
import { FiCopy, FiInfo, FiCheckCircle, FiLoader, FiClock } from 'react-icons/fi';
import TextInput from '../components/TextInput/TextInput';
import AudioPlayer from '../components/AudioPlayer/AudioPlayer';
import styles from './Generator.module.css';

const { TextArea } = Input;

export default function Generator({
  text,
  setText,
  pipeline,
  settings,
  onAudioGenerated,
  backendOnline
}) {
  const {
    isGenerating,
    progress,
    elapsedTime,
    stepStates,
    decodedText,
    audioUrl,
    metrics,
    generate,
    clear
  } = pipeline;

  const textRef = useRef(text);
  const isGeneratingRef = useRef(isGenerating);
  const settingsRef = useRef(settings);

  // Sync refs to capture fresh states in keyboard shortcut event listeners
  useEffect(() => {
    textRef.current = text;
    isGeneratingRef.current = isGenerating;
    settingsRef.current = settings;
  }, [text, isGenerating, settings]);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl + Enter to Generate Audio
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (textRef.current.trim() && !isGeneratingRef.current) {
          handleGenerate();
        }
      }
      
      // Esc to Clear Workspace
      if (e.key === 'Escape' && !isGeneratingRef.current) {
        handleClear();
        notification.info({
          message: 'Workspace Cleared',
          description: 'Text inputs and active playback caches have been cleared.',
          placement: 'bottomRight',
          duration: 3
        });
      }

      // Ctrl + Shift + C to Copy Input Text
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        if (textRef.current.trim()) {
          handleCopyText(textRef.current, 'Input text');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleCopyText = (content, label = 'Text') => {
    if (!content.trim()) return;
    navigator.clipboard.writeText(content)
      .then(() => {
        notification.success({
          message: 'Secure Clipboard Copy',
          description: `${label} copied to local sandboxed clipboard.`,
          placement: 'bottomRight',
          duration: 3
        });
      })
      .catch(err => {
        console.error("Clipboard copy failed:", err);
        notification.error({
          message: 'Clipboard Access Denied',
          description: 'Unable to write to clipboard from isolated window.',
          placement: 'bottomRight'
        });
      });
  };

  const handleClear = () => {
    setText('');
    clear();
  };

  const handleGenerate = async () => {
    const currentText = textRef.current;
    if (!currentText.trim() || isGeneratingRef.current) return;

    try {
      const result = await generate(currentText, settingsRef.current, onAudioGenerated);
      
      if (result && result.audioUrl) {
        notification.success({
          message: 'Speech generated successfully.',
          description: 'The OmniVoice audio is ready to play.',
          placement: 'bottomRight',
          duration: 5
        });
      }
    } catch (error) {
      console.error("Pipeline execution failed:", error);
      notification.error({
        message: error.type || 'Pipeline Error',
        description: error.message || 'An unexpected pipeline error occurred.',
        placement: 'bottomRight',
        duration: 6
      });
    }
  };

  const getTimelineIcon = (state) => {
    switch (state) {
      case 'completed':
        return <FiCheckCircle className={styles.iconCompleted} />;
      case 'active':
        return <FiLoader className={`${styles.iconActive} ${styles.spin}`} />;
      default:
        return <FiClock className={styles.iconPending} />;
    }
  };

  const timelineItems = [
    {
      label: <span className={styles.timelineLabel}>Step 1</span>,
      children: (
        <div className={`${styles.timelineText} ${stepStates[0] === 'active' ? styles.pulseText : ''}`}>
          Connecting to Local Backend...
        </div>
      ),
      dot: getTimelineIcon(stepStates[0])
    },
    {
      label: <span className={styles.timelineLabel}>Step 2</span>,
      children: (
        <div className={`${styles.timelineText} ${stepStates[1] === 'active' ? styles.pulseText : ''}`}>
          Generating English Report...
        </div>
      ),
      dot: getTimelineIcon(stepStates[1])
    },
    {
      label: <span className={styles.timelineLabel}>Step 3</span>,
      children: (
        <div className={`${styles.timelineText} ${stepStates[2] === 'active' ? styles.pulseText : ''}`}>
          Waiting for Response...
        </div>
      ),
      dot: getTimelineIcon(stepStates[2])
    }
  ];

  return (
    <div className={styles.workspace}>
      {!backendOnline && (
        <Alert
          message="Backend Connection Error"
          description="Cannot connect to Flask backend. Please make sure the backend is active on http://127.0.0.1:5000."
          type="error"
          showIcon
          style={{ 
            boxShadow: 'var(--shadow-main)', 
            borderRadius: '6px', 
            backgroundColor: 'rgba(245, 34, 45, 0.08)',
            border: '1px solid rgba(245, 34, 45, 0.25)',
            color: 'var(--color-text-main)'
          }}
        />
      )}

      <TextInput
        text={text}
        onChangeText={setText}
        onGenerate={handleGenerate}
        onClear={handleClear}
        onCopy={() => handleCopyText(text, 'Input text')}
        isLoading={isGenerating}
        disabled={!backendOnline}
      />

      {/* Keyboard Hotkey Helper Panel */}
      {!isGenerating && (
        <div className={styles.shortcutsHelper}>
          <FiInfo className={styles.keyboardIcon} />
          <span>
            Hotkeys: <code>Ctrl + Enter</code> to Generate | <code>Esc</code> to Clear | <code>Ctrl + Shift + C</code> to Copy Input
          </span>
        </div>
      )}

      {/* Dynamic Processing Pipeline Dashboard */}
      {isGenerating && (
        <Card 
          className={styles.pipelineCard}
          title={
            <div className={styles.pipelineHeader}>
              <span className="card-title">Offline AI Processing Pipeline</span>
              <span className={styles.stopwatch}>Elapsed: {elapsedTime.toFixed(2)} s</span>
            </div>
          }
        >
          <div className={styles.pipelineGrid}>
            <div className={styles.timelineCol}>
              <Timeline 
                mode="left" 
                items={timelineItems}
                className={styles.timeline}
              />
            </div>
            
            <div className={styles.progressCol}>
              <Progress
                type="circle"
                percent={progress}
                showInfo={false}
                strokeColor={{
                  '0%': '#1E88E5',
                  '100%': '#2ea44f',
                }}
                trailColor="rgba(255, 255, 255, 0.05)"
                width={120}
                className={styles.progressRing}
              />
              <div className={styles.progressInfo}>
                <span className={styles.progressPercent}>{progress}%</span>
                <span className={styles.progressLabel}>Processing</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Decoded Plain Text Output (appears post Stage 1 LLM decryption) */}
      {decodedText && !isGenerating && (
        <Card
          className={styles.decodedCard}
          title={
            <div>
              <div className="card-title">Decoded Plain Text</div>
              <div className="card-subtitle">Local Ollama Llama 3.2 Decrypted Output</div>
            </div>
          }
          extra={
            <Button
              type="text"
              icon={<FiCopy />}
              onClick={() => handleCopyText(decodedText, 'Decoded text')}
              className={styles.copyBtn}
            >
              Copy
            </Button>
          }
        >
          <TextArea
            value={decodedText}
            readOnly
            autoSize={{ minRows: 3, maxRows: 6 }}
            className={styles.decodedTextarea}
          />
        </Card>
      )}
      
      {!isGenerating && audioUrl && (
        <div className={styles.playerContainer}>
          <AudioPlayer 
            audioUrl={audioUrl}
            autoPlay={settings.autoPlay}
          />
        </div>
      )}
    </div>
  );
}
