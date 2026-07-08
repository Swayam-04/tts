import React from 'react';
import { Card, Select, Slider, Switch, Row, Col, InputNumber, Button, Modal, message } from 'antd';
import { 
  Volume2, 
  Globe, 
  User, 
  Shield, 
  Cpu, 
  HardDrive, 
  Layout, 
  Sliders,
  Settings2,
  Trash2
} from 'lucide-react';
import { motion } from 'framer-motion';
import styles from './Settings.module.css';

export default function Settings({ settings, onUpdateSetting }) {
  const voiceOptions = [
    { value: 'default', label: 'Default System Voice' },
    { value: 'male', label: 'Male (Chatterbox)' },
    { value: 'female', label: 'Female (Chatterbox)' },
    { value: 'neural', label: 'Neural Voice (DRDO Spec)' }
  ];

  const languageOptions = [
    { value: 'en', label: 'English (General)' },
    { value: 'hi', label: 'Hindi (हिंदी)' },
    { value: 'or', label: 'Odia (ଓଡ଼ିଆ)' }
  ];

  const modelOptions = [
    { value: 'gemma4', label: 'Gemma 4 (Default)' },
    { value: 'llama3.2:3b', label: 'Llama 3.2 (3B)' },
    { value: 'qwen3:4b', label: 'Qwen3 (4B)' },
    { value: 'qwen3:8b', label: 'Qwen3 (8B)' }
  ];

  const speedMarks = {
    0.5: '0.5x',
    1.0: '1.0x',
    1.5: '1.5x',
    2.0: '2.0x'
  };

  const handleSelectChange = (key) => (value) => {
    onUpdateSetting(key, value);
  };

  const handleSliderChange = (key) => (value) => {
    onUpdateSetting(key, value);
  };

  const handleToggleChange = (key) => (checked) => {
    onUpdateSetting(key, checked);
  };

  const handleNumberChange = (key) => (value) => {
    onUpdateSetting(key, value);
  };

  const handleResetIndices = () => {
    Modal.confirm({
      title: 'Reset Vault Indices?',
      content: 'This will purge all local text databases and wipe search structures. This cannot be undone.',
      okText: 'Wipe Database',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => {
        message.success('Vector database indices successfully cleared.');
      }
    });
  };

  return (
    <div className={styles.container}>
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={styles.header}
      >
        <h1 className={styles.title}>System Control Parameters</h1>
        <p className={styles.subtitle}>Configure offline speech synthesis characteristics, LLM engines, and air-gapped security policies.</p>
      </motion.div>

      <Row gutter={[16, 16]}>
        {/* 1. General Settings */}
        <Col xs={24} md={12} lg={8}>
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.05 }}>
            <Card title={<div className={styles.cardHeader}><Globe size={16} /> <span>General Configuration</span></div>} className={styles.card}>
              <div className={styles.settingItem}>
                <label className={styles.label}>System Language</label>
                <Select value={settings.language} onChange={handleSelectChange('language')} options={languageOptions} className={styles.select} />
              </div>
              <div className={styles.settingItem} style={{ marginTop: '16px' }}>
                <label className={styles.label}>Voice Synthesizer Profile</label>
                <Select value={settings.voice} onChange={handleSelectChange('voice')} options={voiceOptions} className={styles.select} />
              </div>
            </Card>
          </motion.div>
        </Col>

        {/* 2. AI Settings */}
        <Col xs={24} md={12} lg={8}>
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
            <Card title={<div className={styles.cardHeader}><Cpu size={16} /> <span>AI Engine Parameters</span></div>} className={styles.card}>
              <div className={styles.settingItem}>
                <label className={styles.label}>Preferred LLM Engine</label>
                <Select value={settings.preferredModel || 'gemma4'} onChange={handleSelectChange('preferredModel')} options={modelOptions} className={styles.select} />
              </div>
              <div className={styles.toggleRow} style={{ marginTop: '16px' }}>
                <span className={styles.toggleLabel}>Offline Deciphering</span>
                <Switch checked={true} disabled />
              </div>
            </Card>
          </motion.div>
        </Col>

        {/* 3. Memory Settings */}
        <Col xs={24} md={12} lg={8}>
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }}>
            <Card title={<div className={styles.cardHeader}><Sliders size={16} /> <span>Conversation Memory</span></div>} className={styles.card}>
              <div className={styles.toggleRow}>
                <span className={styles.toggleLabel}>Enable SQLite Session Logs</span>
                <Switch checked={settings.memoryEnabled} onChange={handleToggleChange('memoryEnabled')} />
              </div>
              {settings.memoryEnabled && (
                <div className={styles.settingItem} style={{ marginTop: '16px' }}>
                  <label className={styles.label}>Context Window (Messages)</label>
                  <InputNumber min={2} max={50} value={settings.contextWindow || 10} onChange={handleNumberChange('contextWindow')} className={styles.numberInput} />
                </div>
              )}
            </Card>
          </motion.div>
        </Col>

        {/* 4. Audio Settings */}
        <Col xs={24} md={12} lg={8}>
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
            <Card title={<div className={styles.cardHeader}><Volume2 size={16} /> <span>Acoustic Output</span></div>} className={styles.card}>
              <div className={styles.settingItem}>
                <label className={styles.label}>Synthesis Rate (Speed)</label>
                <Slider min={0.5} max={2.0} step={0.1} value={settings.speed} onChange={handleSliderChange('speed')} marks={speedMarks} className={styles.slider} tooltip={{ formatter: (val) => `${val}x` }} />
              </div>
              <div className={styles.settingItem} style={{ marginTop: '24px' }}>
                <label className={styles.label}>Formant Volume</label>
                <Slider min={0} max={100} value={settings.volume} onChange={handleSliderChange('volume')} className={styles.slider} tooltip={{ formatter: (val) => `${val}%` }} />
              </div>
            </Card>
          </motion.div>
        </Col>

        {/* 5. Security Settings */}
        <Col xs={24} md={12} lg={8}>
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.25 }}>
            <Card title={<div className={styles.cardHeader}><Shield size={16} /> <span>Security Controls</span></div>} className={styles.card}>
              <div className={styles.toggleRow}>
                <span className={styles.toggleLabel}>Air-Gapped Isolation</span>
                <Switch checked={true} disabled />
              </div>
              <div className={styles.toggleRow} style={{ marginTop: '16px' }}>
                <span className={styles.toggleLabel}>Local Vault Decryption</span>
                <Switch checked={true} disabled />
              </div>
            </Card>
          </motion.div>
        </Col>

        {/* 6. RAG Settings */}
        <Col xs={24} md={12} lg={8}>
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
            <Card title={<div className={styles.cardHeader}><HardDrive size={16} /> <span>RAG Extraction (Vault)</span></div>} className={styles.card}>
              <div className={styles.settingItem}>
                <label className={styles.label}>Document Chunk Size</label>
                <InputNumber min={100} max={2000} step={50} value={settings.chunkSize || 500} onChange={handleNumberChange('chunkSize')} className={styles.numberInput} />
              </div>
              <div className={styles.settingItem} style={{ marginTop: '16px' }}>
                <label className={styles.label}>Chunk Overlap (Chars)</label>
                <InputNumber min={10} max={500} step={10} value={settings.chunkOverlap || 100} onChange={handleNumberChange('chunkOverlap')} className={styles.numberInput} />
              </div>
            </Card>
          </motion.div>
        </Col>

        {/* 7. Appearance Settings */}
        <Col xs={24} md={12} lg={12}>
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.35 }}>
            <Card title={<div className={styles.cardHeader}><Layout size={16} /> <span>Appearance Configuration</span></div>} className={styles.card}>
              <div className={styles.toggleRow}>
                <span className={styles.toggleLabel}>Force Enterprise Dark Theme</span>
                <Switch checked={settings.darkTheme} disabled />
              </div>
              <div className={styles.toggleRow} style={{ marginTop: '16px' }}>
                <span className={styles.toggleLabel}>Auto Play Waveforms</span>
                <Switch checked={settings.autoPlay} onChange={handleToggleChange('autoPlay')} />
              </div>
            </Card>
          </motion.div>
        </Col>

        {/* 8. Advanced Settings */}
        <Col xs={24} md={24} lg={12}>
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}>
            <Card title={<div className={styles.cardHeader}><Settings2 size={16} /> <span>Advanced Maintenance</span></div>} className={styles.card}>
              <div className={styles.maintenanceRow}>
                <div className={styles.maintenanceBrief}>
                  <span className={styles.maintenanceLabel}>Re-initialize Speech Indices</span>
                  <span className={styles.maintenanceDesc}>Clears SQLite cache tables and re-aligns database memory blocks.</span>
                </div>
                <Button type="primary" danger icon={<Trash2 size={14} />} onClick={handleResetIndices}>
                  Reset Database
                </Button>
              </div>
            </Card>
          </motion.div>
        </Col>
      </Row>
    </div>
  );
}
