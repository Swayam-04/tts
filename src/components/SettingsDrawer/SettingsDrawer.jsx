import React from 'react';
import { Drawer, Select, Slider, Switch, Space, Divider } from 'antd';
import { FiVolume2, FiGlobe, FiUser, FiActivity } from 'react-icons/fi';
import styles from './SettingsDrawer.module.css';

export default function SettingsDrawer({ visible, onClose, settings, onUpdateSetting }) {
  const voiceOptions = [
    { value: 'default', label: 'Default System' },
    { value: 'male', label: 'Male (OmniVoice)' },
    { value: 'female', label: 'Female (OmniVoice)' },
    { value: 'neural', label: 'Neural Voice (DRDO Spec)' }
  ];

  const languageOptions = [
    { value: 'en', label: 'English (General)' },
    { value: 'hi', label: 'Hindi (हिंदी)' },
    { value: 'or', label: 'Odia (ଓଡ଼ିଆ)' }
  ];

  const handleSelectChange = (key) => (value) => {
    onUpdateSetting(key, value);
  };

  const handleSliderChange = (key) => (value) => {
    onUpdateSetting(key, value);
  };

  const handleToggleChange = (key) => (checked) => {
    onUpdateSetting(key, checked);
  };

  // Speed marks for the slider
  const speedMarks = {
    0.5: '0.5x',
    1.0: '1x',
    1.5: '1.5x',
    2.0: '2x'
  };

  return (
    <Drawer
      title="System Settings"
      placement="right"
      onClose={onClose}
      open={visible}
      width={360}
      className={styles.drawer}
      styles={{
        header: {
          backgroundColor: 'var(--color-navy-dark)',
          borderBottom: '1px solid var(--color-border)',
        },
        body: {
          backgroundColor: 'var(--color-bg-card)',
          color: 'var(--color-text-main)',
        }
      }}
    >
      <div className={styles.container}>
        {/* Voice Selection */}
        <div className={styles.settingBlock}>
          <div className={styles.labelRow}>
            <FiUser className={styles.icon} />
            <span>Voice Selection</span>
          </div>
          <Select
            value={settings.voice}
            onChange={handleSelectChange('voice')}
            options={voiceOptions}
            className={styles.select}
            popupClassName={styles.selectPopup}
          />
        </div>

        {/* Language Selection */}
        <div className={styles.settingBlock}>
          <div className={styles.labelRow}>
            <FiGlobe className={styles.icon} />
            <span>Language</span>
          </div>
          <Select
            value={settings.language}
            onChange={handleSelectChange('language')}
            options={languageOptions}
            className={styles.select}
            popupClassName={styles.selectPopup}
          />
        </div>

        <Divider className={styles.divider} />

        {/* Speech Speed */}
        <div className={styles.settingBlock}>
          <div className={styles.labelRow}>
            <FiActivity className={styles.icon} />
            <span>Speech Speed</span>
          </div>
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

        {/* Volume */}
        <div className={styles.settingBlock} style={{ marginTop: '24px' }}>
          <div className={styles.labelRow}>
            <FiVolume2 className={styles.icon} />
            <span>Output Volume</span>
          </div>
          <Slider
            min={0}
            max={100}
            value={settings.volume}
            onChange={handleSliderChange('volume')}
            className={styles.slider}
            tooltip={{ formatter: (val) => `${val}%` }}
          />
        </div>

        <Divider className={styles.divider} />

        {/* Auto Play */}
        <div className={styles.toggleRow}>
          <span className={styles.toggleLabel}>Auto Play Audio</span>
          <Switch
            checked={settings.autoPlay}
            onChange={handleToggleChange('autoPlay')}
            className={styles.switch}
          />
        </div>

        {/* Dark Theme (Default: Locked/Enabled) */}
        <div className={styles.toggleRow}>
          <div>
            <span className={styles.toggleLabel}>Force Dark Theme</span>
            <div className={styles.toggleHelp}>Locked for security & defense standards</div>
          </div>
          <Switch
            checked={settings.darkTheme}
            disabled={true}
            className={styles.switch}
          />
        </div>
      </div>
    </Drawer>
  );
}
