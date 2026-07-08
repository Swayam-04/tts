import React from 'react';
import { Card, Descriptions, Tag, Divider, Collapse } from 'antd';
import { Shield, Cpu, Volume2, Lock, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import styles from './About.module.css';

export default function About() {
  const securityChecklist = [
    { label: 'Cloud Transmissions', value: 'DISABLED (Isolated Offline)' },
    { label: 'External APIs / Linkouts', value: 'NONE (Zero external telemetry)' },
    { label: 'Memory Retention', value: 'PERSISTENT (Local SQLite indices)' },
    { label: 'Data Encryption', value: 'Air-Gapped Compliant Loopback' }
  ];

  const credits = [
    "Swayam Barik", "Suditi Jena", "Supriya Priyadarsani Pradhan", 
    "Sriya Priyadarshani", "Kashvi Nayak", "Kuldeep Kiran", 
    "Palin Panigrahi", "Barsha Ranee"
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card 
        className={styles.card}
        title={
          <div>
            <div className="card-title">About VAANI Platform</div>
            <div className="card-subtitle">Secure Offline Speech Intelligence & Document RAG Platform.</div>
          </div>
        }
      >
        <div className={styles.intro}>
          <p>
            <strong>VAANI</strong> is an air-gapped Speech Intelligence Platform designed for defense applications, security vaults, and enterprise sandboxes. 
            It couples Large Language Models (LLM) for processing coded command transcripts, and neural Acoustic Synthesizers (TTS) to generate high-fidelity vocal feeds without data leakage.
          </p>
        </div>

        <Divider className={styles.divider} />

        {/* Developed By Section */}
        <div className={styles.sectionTitle}>
          <Users className={styles.icon} size={16} /> <span>Developed By</span>
        </div>
        <div className={styles.creditsGrid}>
          {credits.map((person, index) => (
            <div key={index} className={styles.creditBadge}>
              {person}
            </div>
          ))}
        </div>

        <Divider className={styles.divider} />

        {/* Security Specifications */}
        <div className={styles.sectionTitle}>
          <Lock className={styles.icon} size={16} /> <span>Security Profile & Compliance</span>
        </div>

        <Descriptions bordered column={{ xs: 1, sm: 2 }} className={styles.descriptions}>
          {securityChecklist.map((item, index) => (
            <Descriptions.Item key={index} label={<strong>{item.label}</strong>}>
              <Tag color={index < 2 ? 'red' : 'blue'} className={styles.tagBadge}>{item.value}</Tag>
            </Descriptions.Item>
          ))}
        </Descriptions>

        <Divider className={styles.divider} />

        {/* Local Integrations Guide */}
        <div className={styles.sectionTitle}>
          <Cpu className={styles.icon} size={16} /> <span>Local System Integration Schematics</span>
        </div>
        <p className={styles.helpText}>
          VAANI serves as a secure frontend client. It coordinates offline background services via loopback socket layers:
        </p>

        <Collapse defaultActiveKey={['1']} className={styles.collapse}>
          <Collapse.Panel 
            header={
              <span className={styles.panelHeader}>
                <Cpu className={styles.panelIcon} size={14} /> LLM Core: Ollama Integration
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
          </Collapse.Panel>
          
          <Collapse.Panel 
            header={
              <span className={styles.panelHeader}>
                <Volume2 className={styles.panelIcon} size={14} /> Speech Core: Chatterbox TTS Integration
              </span>
            } 
            key="2"
          >
            <div className={styles.panelContent}>
              <p>To connect synthesized output to Chatterbox TTS:</p>
              <ol>
                <li>Run the local Chatterbox synthesis daemon on port <code>5000</code>.</li>
                <li>Send synthesized tokens to: <code>POST http://127.0.0.1:5000/read-document</code></li>
                <li>Configure voice models (Default, Male, Female, Neural) mapping parameters:
                  <pre className={styles.code}>
{`{
  "text": "[decoded_llm_text]",
  "voice_model": "neural_female_drdo_v2",
  "speed": 1.0,
  "format": "mp3"
}`}
                  </pre>
                </li>
              </ol>
            </div>
          </Collapse.Panel>
        </Collapse>
      </Card>
    </motion.div>
  );
}
