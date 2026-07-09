import React, { useState, useEffect, useRef } from 'react';
import { Card, Input, Button, Progress, notification, Alert, Tooltip } from 'antd';
import { 
  Copy, 
  Trash2, 
  Globe, 
  FileAudio, 
  Sparkles, 
  Send,
  Loader2,
  CheckCircle,
  HelpCircle,
  Eye,
  Circle,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TextInput from '../components/TextInput/TextInput';
import AudioPlayer from '../components/AudioPlayer/AudioPlayer';
import { synthesizeSpeech } from '../services/api';
import styles from './Generator.module.css';

export default function Generator({
  text,
  setText,
  pipeline,
  settings,
  onAudioGenerated,
  backendOnline,
  onUpdateSetting
}) {
  const {
    isGenerating,
    progress,
    elapsedTime,
    stepStates,
    decodedText,
    audioUrl,
    metrics,
    stageTimers,
    currentTask,
    generate,
    clear
  } = pipeline;

  const textRef = useRef(text);
  const isGeneratingRef = useRef(isGenerating);
  const settingsRef = useRef(settings);

  // Sync refs to capture fresh states in keyboard shortcuts
  useEffect(() => {
    textRef.current = text;
    isGeneratingRef.current = isGenerating;
    settingsRef.current = settings;
  }, [text, isGenerating, settings]);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (textRef.current.trim() && !isGeneratingRef.current) {
          handleGenerate();
        }
      }
      if (e.key === 'Escape' && !isGeneratingRef.current) {
        handleClear();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCopyText = (content, label = 'Text') => {
    if (!content.trim()) return;
    navigator.clipboard.writeText(content)
      .then(() => {
        notification.success({
          message: 'Secure Copy Successful',
          description: `${label} copied to local clipboard cache.`,
          placement: 'bottomRight',
          duration: 3
        });
      })
      .catch(() => {
        notification.error({
          message: 'Copy Failed',
          description: 'Local sandbox blocked clipboard write.',
          placement: 'bottomRight'
        });
      });
  };

  const [activeAudioUrl, setActiveAudioUrl] = useState(null);
  const [activeAudioText, setActiveAudioText] = useState('');
  const [synthesisLoading, setSynthesisLoading] = useState(false);
  const [synthesisLang, setSynthesisLang] = useState(null); // 'en' or 'hi'
  const [generatedAudios, setGeneratedAudios] = useState({ en: null, hi: null });

  // Sync pipeline generation output to local player states
  useEffect(() => {
    if (audioUrl) {
      setGeneratedAudios({
        en: audioUrl,
        hi: null
      });
      setActiveAudioUrl(audioUrl);
      setActiveAudioText(decodedText);
    } else {
      setGeneratedAudios({ en: null, hi: null });
      setActiveAudioUrl(null);
      setActiveAudioText('');
    }
  }, [audioUrl, decodedText]);

  // Invalidate cached audios when settings.voice changes
  useEffect(() => {
    setGeneratedAudios({ en: null, hi: null });
  }, [settings?.voice]);

  const handleListenEn = async () => {
    if (generatedAudios.en) {
      setActiveAudioUrl(generatedAudios.en);
      setActiveAudioText(decodedText);
      return;
    }
    try {
      setSynthesisLoading(true);
      setSynthesisLang('en');
      const res = await synthesizeSpeech(decodedText, 'en', false, settings.voice);
      if (res && res.success) {
        const fullUrl = res.audio_file.startsWith('http') ? res.audio_file : `http://127.0.0.1:5000${res.audio_file}`;
        setGeneratedAudios(prev => ({ ...prev, en: fullUrl }));
        setActiveAudioUrl(fullUrl);
        setActiveAudioText(decodedText);
      }
    } catch (err) {
      notification.error({
        message: 'English Synthesis Failed',
        description: err.message || 'Failed to synthesize English speech.',
        placement: 'bottomRight'
      });
    } finally {
      setSynthesisLoading(false);
      setSynthesisLang(null);
    }
  };

  const handleListenHi = async () => {
    if (generatedAudios.hi) {
      setActiveAudioUrl(generatedAudios.hi.audioUrl);
      setActiveAudioText(generatedAudios.hi.translatedText);
      return;
    }
    const requestBody = { text: decodedText, language: 'hi', translate: true, voice: settings.voice };
    console.log("Hindi synthesis request:", requestBody);
    try {
      setSynthesisLoading(true);
      setSynthesisLang('hi');
      const res = await synthesizeSpeech(decodedText, 'hi', true, settings.voice);
      if (res && res.success) {
        const fullUrl = res.audio_file.startsWith('http') ? res.audio_file : `http://127.0.0.1:5000${res.audio_file}`;
        setGeneratedAudios(prev => ({
          ...prev,
          hi: { audioUrl: fullUrl, translatedText: res.translated_text || decodedText }
        }));
        setActiveAudioUrl(fullUrl);
        setActiveAudioText(res.translated_text || decodedText);
      }
    } catch (err) {
      notification.error({
        message: 'Hindi Synthesis Failed',
        description: err.message || 'Failed to translate and synthesize Hindi speech.',
        placement: 'bottomRight'
      });
    } finally {
      setSynthesisLoading(false);
      setSynthesisLang(null);
    }
  };

  const handleClear = () => {
    setText('');
    clear();
    setActiveAudioUrl(null);
    setActiveAudioText('');
    setSynthesisLoading(false);
    setSynthesisLang(null);
    setGeneratedAudios({ en: null, hi: null });
  };

  const handleGenerate = async () => {
    const currentText = textRef.current;
    if (!currentText.trim() || isGeneratingRef.current) return;
    try {
      const result = await generate(currentText, settingsRef.current, onAudioGenerated);
      if (result && result.audioUrl) {
        notification.success({
          message: 'Speech synthesis completed',
          description: 'The Chatterbox MP3 is ready to download or play.',
          placement: 'bottomRight',
          duration: 4
        });
      }
    } catch (error) {
      notification.error({
        message: error.type || 'Pipeline Error',
        description: error.message || 'An unexpected pipeline error occurred.',
        placement: 'bottomRight',
        duration: 6
      });
    }
  };

  // Pipeline animated elements
  const getPipelineIcon = (state) => {
    switch (state) {
      case 'completed':
        return <CheckCircle className={styles.iconCompleted} size={18} />;
      case 'active':
        return <Loader2 className={`${styles.iconActive} ${styles.spin}`} size={18} />;
      default:
        return <Circle className={styles.iconPending} size={18} />;
    }
  };

  const formatElapsed = (sec) => {
    if (isNaN(sec) || sec <= 0) return "00:00";
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;

  return (
    <div className={styles.workspace}>
      {!backendOnline && (
        <Alert
          message="Backend Connection Offline"
          description="Unable to connect to Flask server. Ensure Python Flask environment is active on http://127.0.0.1:5000."
          type="error"
          showIcon
          className={styles.alert}
        />
      )}

      {/* Modern Redesigned Editor Wrapper */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={styles.editorCard}
      >
        <div className={styles.editorHeader}>
          <div className={styles.editorTitleRow}>
            <Sparkles size={16} className={styles.editorIcon} />
            <span>Isolated Speech Generator</span>
          </div>
          
          <div className={styles.editorMetaTags}>
            <span className={styles.metaBadge} style={{ padding: '2px 8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Globe size={12} />
              <span style={{ fontSize: '12px' }}>Lang:</span>
              <select
                value={settings.language}
                onChange={(e) => onUpdateSetting('language', e.target.value)}
                disabled={isGenerating}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--accent-color, #1890ff)',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                <option value="en" style={{ background: '#1f1f1f', color: '#fff' }}>English</option>
                <option value="hi" style={{ background: '#1f1f1f', color: '#fff' }}>Hindi</option>
              </select>
            </span>
            <span className={styles.metaBadge}>
              Voice: {settings.voice || 'Default'}
            </span>
          </div>
        </div>

        <div className={styles.textAreaWrapper}>
          <Input.TextArea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type or paste classified transcript details here (e.g. military report transcripts, command summaries)..."
            disabled={isGenerating || !backendOnline}
            className={styles.textarea}
            autoSize={{ minRows: 6, maxRows: 12 }}
          />
        </div>

        {/* Text editor footer toolbars */}
        <div className={styles.editorFooter}>
          <div className={styles.statsBrief}>
            <span>{wordCount} Words</span>
            <span className={styles.bulletDivider}>•</span>
            <span>{charCount} Characters</span>
          </div>

          <div className={styles.actionsGroup}>
            <Tooltip title="Clear Workspace (Esc)">
              <Button
                type="default"
                icon={<Trash2 size={15} />}
                onClick={handleClear}
                disabled={isGenerating || !text.trim()}
                className={styles.utilBtn}
              />
            </Tooltip>

            <Tooltip title="Copy Input Text">
              <Button
                type="default"
                icon={<Copy size={15} />}
                onClick={() => handleCopyText(text, 'Input text')}
                disabled={!text.trim()}
                className={styles.utilBtn}
              />
            </Tooltip>

            <Button
              type="primary"
              icon={isGenerating ? <Loader2 className={styles.spin} size={15} /> : <Send size={15} />}
              onClick={handleGenerate}
              disabled={isGenerating || !text.trim() || !backendOnline}
              className={styles.generateBtn}
            >
              {isGenerating ? 'Synthesizing...' : 'Generate Speech'}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Animated Process Pipeline */}
      <AnimatePresence>
        {(isGenerating || metrics) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className={styles.pipelineCard}
          >
            <Card 
              title={
                <div className={styles.pipelineHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>Live Synthesis Pipeline</span>
                    <span style={{ fontSize: '11px', background: 'rgba(24, 144, 255, 0.15)', color: '#1890ff', padding: '1px 6px', borderRadius: '4px', fontWeight: 555 }}>
                      {settings.language === 'hi' ? 'Hindi Pack' : 'English Pack'}
                    </span>
                  </div>
                  <div className={styles.globalTimer}>
                    <Clock size={13} className={styles.timerIcon} />
                    <span>Processing Time: <span className={styles.timerVal}>{formatElapsed(elapsedTime)}</span></span>
                  </div>
                </div>
              } 
              className={styles.cardInner}
            >
              <div className={styles.pipelineSteps}>
                {/* Stage 1: Backend Query */}
                <div className={`${styles.step} ${stepStates[0] === 'active' ? styles.stepActive : stepStates[0] === 'completed' ? styles.stepCompleted : ''}`}>
                  <div className={styles.stepIndicator}>
                    {getPipelineIcon(stepStates[0])}
                  </div>
                  <div className={styles.stepContent}>
                    <span className={styles.stepLabel}>Backend Query</span>
                    <span className={styles.stepTime}>
                      {stageTimers.query > 0 ? `${stageTimers.query.toFixed(2)}s` : 'idle'}
                    </span>
                  </div>
                </div>
                
                <div className={`${styles.connector} ${stepStates[0] === 'completed' ? styles.connectorCompleted : ''}`} />
                
                {/* Stage 2: Gemma 4 Deciphering */}
                <div className={`${styles.step} ${stepStates[1] === 'active' ? styles.stepActive : stepStates[1] === 'completed' ? styles.stepCompleted : ''}`}>
                  <div className={styles.stepIndicator}>
                    {getPipelineIcon(stepStates[1])}
                  </div>
                  <div className={styles.stepContent}>
                    <span className={styles.stepLabel}>Gemma 4 Deciphering</span>
                    <span className={styles.stepTime}>
                      {stageTimers.llm > 0 ? `${stageTimers.llm.toFixed(2)}s` : 'idle'}
                    </span>
                  </div>
                </div>
                
                <div className={`${styles.connector} ${stepStates[1] === 'completed' ? styles.connectorCompleted : ''}`} />
                
                {/* Stage 3: Chatterbox TTS */}
                <div className={`${styles.step} ${stepStates[2] === 'active' ? styles.stepActive : stepStates[2] === 'completed' ? styles.stepCompleted : ''}`}>
                  <div className={styles.stepIndicator}>
                    {getPipelineIcon(stepStates[2])}
                  </div>
                  <div className={styles.stepContent}>
                    <span className={styles.stepLabel}>Chatterbox TTS</span>
                    <span className={styles.stepTime}>
                      {stageTimers.tts > 0 ? `${stageTimers.tts.toFixed(2)}s` : 'idle'}
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.pipelineProgressSection}>
                <div className={styles.progressText}>
                  <span className={styles.currentTaskLabel}>{currentTask}</span>
                  <span>{progress}%</span>
                </div>
                <Progress 
                  percent={progress} 
                  showInfo={false}
                  strokeColor="#2E8BFF"
                  trailColor="rgba(255,255,255,0.05)"
                  className={styles.progressLine}
                />
              </div>

              {/* Completion Summary Block */}
              {metrics && !isGenerating && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={styles.summaryBlock}
                >
                  <div className={styles.summaryTitle}>
                    <CheckCircle className={styles.summarySuccessIcon} size={15} />
                    <span>Generation Completed</span>
                  </div>
                  <div className={styles.summaryMetrics}>
                    <div className={styles.metricItem}>
                      <span className={styles.metricLabel}>⚡ Response Time</span>
                      <span className={styles.metricValue}>{(metrics.responseTime || metrics.processingTime || 0).toFixed(2)} sec</span>
                    </div>
                    <div className={styles.metricDivider} />
                    <div className={styles.metricItem}>
                      <span className={styles.metricLabel}>🧠 Gemma 4</span>
                      <span className={styles.metricValue}>{(metrics.llmTime || 0).toFixed(2)} sec</span>
                    </div>
                    <div className={styles.metricDivider} />
                    <div className={styles.metricItem}>
                      <span className={styles.metricLabel}>🔊 Chatterbox</span>
                      <span className={styles.metricValue}>{(metrics.ttsTime || 0).toFixed(2)} sec</span>
                    </div>
                    <div className={styles.metricDivider} />
                    <div className={styles.metricItem}>
                      <span className={styles.metricLabel}>💿 MP3 Encoding</span>
                      <span className={styles.metricValue}>{(metrics.encodingTime || 0).toFixed(2)} sec</span>
                    </div>
                    <div className={styles.metricDivider} />
                    <div className={styles.metricItem}>
                      <span className={styles.metricLabel}>🎵 Audio Length</span>
                      <span className={styles.metricValue}>{(metrics.audioDuration || 0).toFixed(2)} sec</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Two playbacks select on demand */}
      {decodedText && !isGenerating && (
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', margin: '24px 0 16px 0' }}>
          <Button
            type={activeAudioUrl === generatedAudios.en && activeAudioUrl ? 'primary' : 'default'}
            icon={synthesisLoading && synthesisLang === 'en' ? <Loader2 className={styles.spin} size={15} /> : <Globe size={15} />}
            onClick={handleListenEn}
            disabled={synthesisLoading}
            style={{ minWidth: '170px', height: '42px', borderRadius: '8px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {synthesisLoading && synthesisLang === 'en' ? 'Processing...' : '🔊 Listen in English'}
          </Button>
          <Button
            type={generatedAudios.hi && activeAudioUrl === generatedAudios.hi.audioUrl ? 'primary' : 'default'}
            icon={synthesisLoading && synthesisLang === 'hi' ? <Loader2 className={styles.spin} size={15} /> : <Sparkles size={15} />}
            onClick={handleListenHi}
            disabled={synthesisLoading}
            style={{ minWidth: '170px', height: '42px', borderRadius: '8px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {synthesisLoading && synthesisLang === 'hi' ? 'Translating...' : '🇮🇳 Listen in Hindi'}
          </Button>
        </div>
      )}

      {/* Output Audio player deck */}
      <AnimatePresence>
        {activeAudioUrl && !isGenerating && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <AudioPlayer 
              audioUrl={activeAudioUrl}
              autoPlay={settings.autoPlay}
              text={activeAudioText}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
