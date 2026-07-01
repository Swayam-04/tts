import React from 'react';
import { Card, Select, Slider, Switch, Divider, Row, Col } from 'antd';
import { FiVolume2, FiGlobe, FiUser, FiActivity, FiShield } from 'react-icons/fi';
import styles from './Settings.module.css';

export default function Settings({ settings, onUpdateSetting }) {
  const voiceOptions = [
    { value: 'default', label: 'Default System Voice' },
    { value: 'male', label: 'Male (OmniVoice)' },
    { value: 'female', label: 'Female (OmniVoice)' },
    { value: 'neural', label: 'Neural Voice (DRDO Spec)' }
  ];

  const languageOptions = [
    { value: 'en', label: 'English (General)' },
    { value: 'hi', label: 'Hindi (हिंदी)' },
    { value: 'or', label: 'Odia (ଓଡ଼ିଆ)' }
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

  return (
    <Card 
      className={styles.card}
      title={
        <div>
          <div className="card-title">System Settings</div>
          <div className="card-subtitle">Configure offline TTS speech parameters and preferences.</div>
        </div>
      }
    >
      <Row gutter={[24, 24]}>
        {/* Core TTS Parameters */}
        <Col xs={24} md={12}>
          <div className={styles.sectionHeader}>
            <FiActivity className={styles.sectionIcon} />
            <span>Voice & Language Engine</span>
          </div>
          
          <div className={styles.settingItem}>
            <label className={styles.label}>
              <FiUser className={styles.itemIcon} /> Voice Synthesizer Model
            </label>
            <Select
              value={settings.voice}
              onChange={handleSelectChange('voice')}
              options={voiceOptions}
              className={styles.select}
            />
          </div>

          <div className={styles.settingItem}>
            <label className={styles.label}>
              <FiGlobe className={styles.itemIcon} /> Output Language Language
            </label>
            <Select
              value={settings.language}
              onChange={handleSelectChange('language')}
              options={languageOptions}
              className={styles.select}
            />
          </div>
        </Col>

        {/* Audio Characteristics */}
        <Col xs={24} md={12}>
          <div className={styles.sectionHeader}>
            <FiVolume2 className={styles.sectionIcon} />
            <span>Speech Characteristics</span>
          </div>

          <div className={styles.settingItem}>
            <label className={styles.label}>Speech Speed</label>
            <Slider
              min={0.5}
              max={2.0}
              step={0.1}
              value={settings.speed}
              onChange={handleSliderChange('speed')}
              marks={speedMarks}
              className={styles.slider}
              tooltip={{ formatter: (val) => `${val}x` }}
            />
          </div>

          <div className={styles.settingItem} style={{ marginTop: '28px' }}>
            <label className={styles.label}>Output Volume</label>
            <Slider
              min={0}
              max={100}
              value={settings.volume}
              onChange={handleSliderChange('volume')}
              className={styles.slider}
              tooltip={{ formatter: (val) => `${val}%` }}
            />
          </div>
        </Col>
      </Row>

      <Divider className={styles.divider} />

      {/* System Policies */}
      <div className={styles.sectionHeader} style={{ marginTop: '8px' }}>
        <FiShield className={styles.sectionIcon} />
        <span>System & Security Policies</span>
      </div>

      <Row gutter={[24, 16]}>
        <Col xs={24} sm={12}>
          <div className={styles.toggleRow}>
            <div>
              <span className={styles.toggleLabel}>Auto Play Synthesized Audio</span>
              <div className={styles.toggleDesc}>Play wav immediately after generation finishes.</div>
            </div>
            <Switch
              checked={settings.autoPlay}
              onChange={handleToggleChange('autoPlay')}
            />
          </div>
        </Col>

        <Col xs={24} sm={12}>
          <div className={styles.toggleRow}>
            <div>
              <span className={styles.toggleLabel}>Force Platform Dark Theme</span>
              <div className={styles.toggleDesc}>Restricted to Dark Mode for eye strain reduction in secure vaults.</div>
            </div>
            <Switch
              checked={settings.darkTheme}
              disabled={true}
            />
          </div>
        </Col>
      </Row>
    </Card>
  );
}
