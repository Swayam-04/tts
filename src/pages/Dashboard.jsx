import React from 'react';
import { Card, Col, Row, Statistic } from 'antd';
import { FiShield, FiLock, FiCpu, FiFileText, FiVolume2, FiDatabase } from 'react-icons/fi';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  return (
    <div className={styles.container}>
      {/* Welcome Banner */}
      <div className={styles.welcomeBanner}>
        <div className={styles.bannerContent}>
          <h2 className={styles.bannerTitle}>Welcome to VAANI AI Workspace</h2>
          <p className={styles.bannerSubtitle}>
            Offline Secure Speech Intelligence Platform. Operating in an isolated, air-gapped environment.
          </p>
          <div className={styles.securityBadges}>
            <span className={styles.securityBadge}>
              <FiLock className={styles.badgeIcon} /> Air-Gapped Secure
            </span>
            <span className={styles.securityBadge}>
              <FiShield className={styles.badgeIcon} /> DRDO Standards
            </span>
          </div>
        </div>
        <div className={styles.bannerLogo}>VAANI</div>
      </div>

      {/* Stats Cards */}
      <Row gutter={[16, 16]} className={styles.statsRow}>
        <Col xs={24} sm={12} md={8}>
          <Card className={styles.statsCard}>
            <Statistic
              title={<span className={styles.statsCardTitle}>Local Processing Core</span>}
              value="Ollama (Local)"
              prefix={<FiCpu className={styles.statsIcon} />}
              valueStyle={{ color: 'var(--color-primary)', fontWeight: 'bold', fontSize: '1.4rem' }}
            />
            <div className={styles.statsFooter}>LLM: Llama-3.2-3B (Active)</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card className={styles.statsCard}>
            <Statistic
              title={<span className={styles.statsCardTitle}>Acoustic Engine</span>}
              value="OmniVoice Studio"
              prefix={<FiVolume2 className={styles.statsIcon} />}
              valueStyle={{ color: '#2ea44f', fontWeight: 'bold', fontSize: '1.4rem' }}
            />
            <div className={styles.statsFooter}>TTS: Formant Synth (Offline ready)</div>
          </Card>
        </Col>
        <Col xs={24} sm={24} md={8}>
          <Card className={styles.statsCard}>
            <Statistic
              title={<span className={styles.statsCardTitle}>Local Security Sandbox</span>}
              value="Active Loopback"
              prefix={<FiDatabase className={styles.statsIcon} />}
              valueStyle={{ color: '#e0a82e', fontWeight: 'bold', fontSize: '1.4rem' }}
            />
            <div className={styles.statsFooter}>Encryption: Local AES-256 Enabled</div>
          </Card>
        </Col>
      </Row>

      {/* Platform Features Grid */}
      <h3 className={styles.sectionTitle}>Secure Capabilities</h3>
      <Row gutter={[16, 16]} className={styles.featuresRow}>
        <Col xs={24} md={12}>
          <Card title="Security Compliance Summary" className={styles.featureCard}>
            <ul className={styles.bulletList}>
              <li>
                <strong>No Cloud Integration:</strong> No telemetry, external API queries, or telemetry logging is active. Zero bytes leave this local machine.
              </li>
              <li>
                <strong>Encrypted Session Storage:</strong> All memory allocations for audio waveforms are cleared immediately upon closing the session.
              </li>
              <li>
                <strong>DRDO Air-Gap Certification:</strong> The speech generation logic executes purely in user space and utilizes offline browser APIs for WAV assembly.
              </li>
            </ul>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Quick-Start Guides" className={styles.featureCard}>
            <ul className={styles.bulletList}>
              <li>
                Navigate to <strong>Text Generator</strong> in the sidebar, paste your coded text, and hit <strong>Generate Audio</strong> to trigger synthesis.
              </li>
              <li>
                Adjust speech pitch, speed, language, and auto-play behaviors inside the <strong>Settings</strong> page or settings sidebar.
              </li>
              <li>
                Review and manage all audio files generated during your active session inside the <strong>Audio Output</strong> database.
              </li>
            </ul>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
