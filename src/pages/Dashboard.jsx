import React, { useState, useEffect } from 'react';
import { Card, Col, Row, Statistic } from 'antd';
import { 
  Shield, 
  Lock, 
  Cpu, 
  Volume2, 
  Database, 
  FileText, 
  MessageSquare,
  Network
} from 'lucide-react';
import { motion } from 'framer-motion';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const [docCount, setDocCount] = useState(0);
  const [chatCount, setChatCount] = useState(0);

  useEffect(() => {
    // Dynamic fetch documents count
    fetch("http://127.0.0.1:5000/documents")
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.documents)) {
          setDocCount(data.documents.length);
        }
      })
      .catch(() => {});

    // Dynamic fetch chats count
    fetch("http://127.0.0.1:5000/history?user_id=default")
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.conversations)) {
          setChatCount(data.conversations.length);
        }
      })
      .catch(() => {});
  }, []);

  const stats = [
    {
      title: 'Local LLM Model',
      value: 'Gemma 4',
      icon: <Cpu className={styles.iconBlue} size={22} />,
      footer: 'Active Core (Local)',
      color: '#2E8BFF'
    },
    {
      title: 'Acoustic Synthesizer',
      value: 'Chatterbox',
      icon: <Volume2 className={styles.iconGreen} size={22} />,
      footer: 'Formant Engine (CPU)',
      color: '#31D17B'
    },
    {
      title: 'Vault Documents',
      value: `${docCount} Files`,
      icon: <FileText className={styles.iconCyan} size={22} />,
      footer: 'Secure Indexed RAG',
      color: '#42C8FF'
    },
    {
      title: 'Active Threads',
      value: `${chatCount} Chats`,
      icon: <MessageSquare className={styles.iconYellow} size={22} />,
      footer: 'Stored in Local SQLite',
      color: '#FFB547'
    },
    {
      title: 'Security sandbox',
      value: 'Air-Gapped',
      icon: <Lock className={styles.iconPurple} size={22} />,
      footer: 'DRDO Isolated Profile',
      color: '#A370F7'
    }
  ];

  return (
    <div className={styles.container}>
      {/* Welcome Banner */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={styles.welcomeBanner}
      >
        <div className={styles.bannerContent}>
          <h2 className={styles.bannerTitle}>Welcome to VAANI Intelligence Platform</h2>
          <p className={styles.bannerSubtitle}>
            Secure Offline Speech Generation & RAG Document Intelligence System. Operating in an air-gapped, high-security sandbox.
          </p>
          <div className={styles.securityBadges}>
            <span className={styles.securityBadge}>
              <Lock className={styles.badgeIcon} size={13} /> Air-Gapped Secure
            </span>
            <span className={styles.securityBadge}>
              <Shield className={styles.badgeIcon} size={13} /> DRDO Standards
            </span>
          </div>
        </div>
        <div className={styles.bannerLogo}>VAANI</div>
      </motion.div>

      {/* Top Quick Statistics */}
      <div className={styles.statsGrid}>
        {stats.map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
            style={{ display: 'flex', flexDirection: 'column' }}
          >
            <Card className={styles.statsCard} style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <Statistic
                  title={<span className={styles.statsCardTitle}>{item.title}</span>}
                  value={item.value}
                  prefix={item.icon}
                  valueStyle={{ color: item.color, fontWeight: '700', fontSize: '1.35rem' }}
                />
              </div>
              <div className={styles.statsFooter} style={{ marginTop: '12px' }}>{item.footer}</div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Split layout: Left (Capabilities) & Right (System status) */}
      <Row gutter={[20, 20]} style={{ marginTop: '8px' }}>
        <Col xs={24} lg={12}>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            style={{ height: '100%' }}
          >
            <Card title="Security Compliance Summary" className={styles.featureCard}>
              <ul className={styles.bulletList}>
                <li>
                  <div className={styles.bulletHeader}>
                    <Network size={14} className={styles.bulletIcon} /> Isolated System Space
                  </div>
                  <p className={styles.bulletText}>
                    All speech waveforms are generated entirely within host memory. No cloud dependencies, network connections, or telemetry log servers are enabled.
                  </p>
                </li>
                <li>
                  <div className={styles.bulletHeader}>
                    <Database size={14} className={styles.bulletIcon} /> Local Vault Storage
                  </div>
                  <p className={styles.bulletText}>
                    Document vectors and conversation chat threads persist locally in `vaani.db` (SQLite). Deleting files permanently removes metadata index caches from disk storage.
                  </p>
                </li>
                <li>
                  <div className={styles.bulletHeader}>
                    <Shield size={14} className={styles.bulletIcon} /> Air-Gap Protection
                  </div>
                  <p className={styles.bulletText}>
                    Fully compatible with classified work environments. Standardized audio outputs export directly to secure local files.
                  </p>
                </li>
              </ul>
            </Card>
          </motion.div>
        </Col>

        <Col xs={24} lg={12}>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            style={{ height: '100%' }}
          >
            <Card title="Quick-Start Guides" className={styles.featureCard}>
              <ul className={styles.bulletList}>
                <li>
                  <div className={styles.bulletHeader}>
                    <span className={styles.stepNum}>1</span> Write or Paste Text
                  </div>
                  <p className={styles.bulletText}>
                    Navigate to **Speech Generator** in the sidebar, compose or paste your document, and press **Generate Audio** to initiate offline speech synthesis.
                  </p>
                </li>
                <li>
                  <div className={styles.bulletHeader}>
                    <span className={styles.stepNum}>2</span> Index Vault Files
                  </div>
                  <p className={styles.bulletText}>
                    Upload classified PDFs or DOCX reports in the **Document Vault**. Once chunked and indexed, ask direct questions to summarize them locally.
                  </p>
                </li>
                <li>
                  <div className={styles.bulletHeader}>
                    <span className={styles.stepNum}>3</span> Manage Session Log Outputs
                  </div>
                  <p className={styles.bulletText}>
                    View, replay, adjust playback speeds, and download MP3 recordings inside the **Audio Outputs** index list.
                  </p>
                </li>
              </ul>
            </Card>
          </motion.div>
        </Col>
      </Row>
    </div>
  );
}
