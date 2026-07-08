import React from 'react';
import { Card, Descriptions, Tag, Divider, Collapse } from 'antd';
import { FiShield, FiCpu, FiVolume2, FiLock, FiInfo } from 'react-icons/fi';
import styles from './About.module.css';

const { Panel } = Collapse;

export default function About() {
  const securityChecklist = [
    { label: 'Cloud Networking', value: 'DISABLED (Blocked at source code level)' },
    { label: 'External APIs', value: 'NONE (Zero external dependencies)' },
    { label: 'Session Cache', value: 'TEMPORARY (Wiped from RAM on tab close)' },
    { label: 'Data Encryption', value: 'AES-256 (Local storage loopback)' }
  ];

  return (
    <Card 
      className={styles.card}
      title={
        <div>
          <div className="card-title">About VAANI AI Platform</div>
          <div className="card-subtitle">Secure Offline Speech Intelligence & Translation System.</div>
        </div>
      }
    >
      <div className={styles.intro}>
        <p>
          <strong>VAANI AI</strong> is a defense-grade Speech Intelligence Platform designed to run in isolated, 
          strictly air-gapped network environments. It bridges local Large Language Models (LLM) for processing coded text, 
          and custom Acoustic Synthesizers (TTS) to generate synthesized verbal feeds without cloud leakage.
        </p>
      </div>

      <Divider className={styles.divider} />

      {/* Security Specifications */}
      <div className={styles.sectionTitle}>
        <FiLock className={styles.icon} /> <span>Security Profile & Compliance</span>
      </div>

      <Descriptions bordered column={{ xs: 1, sm: 2 }} className={styles.descriptions}>
        {securityChecklist.map((item, index) => (
          <Descriptions.Item key={index} label={<strong>{item.label}</strong>}>
            <Tag color={index < 2 ? 'red' : index === 2 ? 'blue' : 'green'}>{item.value}</Tag>
          </Descriptions.Item>
        ))}
      </Descriptions>

      <Divider className={styles.divider} />

      {/* Local Integrations Guide */}
      <div className={styles.sectionTitle}>
        <FiCpu className={styles.icon} /> <span>Local System Integration Schematics</span>
      </div>
      <p className={styles.helpText}>
        VAANI AI serves as the secure frontend interface. It is architected to couple with local background services via loopback ports:
      </p>

      <Collapse defaultActiveKey={['1']} className={styles.collapse}>
        <Panel 
          header={
            <span className={styles.panelHeader}>
              <FiCpu className={styles.panelIcon} /> LLM Core: Ollama Integration
            </span>
          } 
          key="1"
        >
          <div className={styles.panelContent}>
            <p>To connect the Text Generator view to your local LLM:</p>
            <ol>
              <li>Ensure Ollama is running locally on port <code>11434</code>.</li>
              <li>Point the generator service call to: <code>POST http://127.0.0.1:11434/api/generate</code></li>
              <li>Payload signature:
                <pre className={styles.code}>
{`{
  "model": "gemma4",
  "prompt": "Process and decipher the following coded string: [user_text]",
  "stream": false
}`}
                </pre>
              </li>
            </ol>
          </div>
        </Panel>
        
        <Panel 
          header={
            <span className={styles.panelHeader}>
              <FiVolume2 className={styles.panelIcon} /> Speech Core: Chatterbox TTS Integration
            </span>
          } 
          key="2"
        >
          <div className={styles.panelContent}>
            <p>To connect synthesized output to Chatterbox TTS:</p>
            <ol>
              <li>Run the local Chatterbox synthesis daemon on port <code>5000</code> or execute via CLI.</li>
              <li>Send synthesized tokens to: <code>POST http://127.0.0.1:5002/api/tts</code></li>
              <li>Configure voice models (Default, Male, Female, Neural) mapping parameters:
                <pre className={styles.code}>
{`{
  "text": "[decoded_llm_text]",
  "voice_model": "neural_female_drdo_v2",
  "speed": 1.0,
  "format": "wav"
}`}
                </pre>
              </li>
            </ol>
          </div>
        </Panel>
      </Collapse>
    </Card>
  );
}
