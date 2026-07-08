import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Typography, Tag, Empty } from 'antd';
import { Play, Download, Clock, Trash2, User, Database } from 'lucide-react';
import { motion } from 'framer-motion';
import AudioPlayer from '../components/AudioPlayer/AudioPlayer';
import { getGenerationHistory, clearGenerationHistory, downloadAudio } from '../services/ttsService';
import styles from './AudioOutput.module.css';

const { Text } = Typography;

const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds) || seconds <= 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export default function AudioOutput({ settings }) {
  const [history, setHistory] = useState([]);
  const [selectedClip, setSelectedClip] = useState(null);

  // Load generation history on mount
  const fetchAudioLogs = async () => {
    try {
      const res = await fetch("http://127.0.0.1:5000/audio-logs");
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.logs) && data.logs.length > 0) {
          const mappedLogs = data.logs.map(log => ({
            id: log.id,
            text: log.text.substring(0, 80) + (log.text.length > 80 ? '...' : ''),
            fullText: log.text,
            timestamp: log.timestamp,
            audioUrl: log.audio_path.startsWith('http') ? log.audio_path : `http://127.0.0.1:5000${log.audio_path}`,
            metrics: {
              generatedTokens: Math.max(1, Math.ceil(log.text.length / 4)),
              audioDuration: log.duration_seconds || 0.0,
              voiceSelected: log.voice || 'Default',
              processingTime: log.response_time || 0.0,
              responseTime: log.response_time || 0.0
            },
            settings: {
              voice: log.voice || 'Default',
              speed: log.speed || 1.0
            }
          }));
          setHistory(mappedLogs);
          if (mappedLogs.length > 0) {
            setSelectedClip(mappedLogs[0]);
          }
          return;
        }
      }
    } catch (err) {
      console.error("Failed to load audio logs from backend, falling back to local:", err);
    }
    
    // Fallback to local storage
    const localData = getGenerationHistory();
    setHistory(localData);
    if (localData && localData.length > 0) {
      setSelectedClip(localData[0]);
    }
  };

  useEffect(() => {
    fetchAudioLogs();
  }, []);

  const handleSelectClip = (clip) => {
    setSelectedClip(clip);
  };

  const handleClearHistory = async () => {
    clearGenerationHistory();
    setHistory([]);
    setSelectedClip(null);
    try {
      await fetch("http://127.0.0.1:5000/audio-logs", { method: "DELETE" });
    } catch (err) {
      console.error("Failed to clear backend audio logs:", err);
    }
  };

  const handleDownload = (clip, e) => {
    e.stopPropagation();
    downloadAudio(clip.audioUrl, `vaani_${clip.id}.mp3`);
  };

  const columns = [
    {
      title: 'Timestamp',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: '120px',
      render: (text) => (
        <span className={styles.timeCol}>
          <Clock size={12} className={styles.timeIcon} /> {text}
        </span>
      )
    },
    {
      title: 'Voice / Config',
      key: 'voice',
      width: '180px',
      render: (_, record) => (
        <Space size="small">
          <Tag color="blue" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <User size={10} /> {record.metrics.voiceSelected}
          </Tag>
          <Tag color="cyan">
            {record.settings.speed}x
          </Tag>
        </Space>
      )
    },
    {
      title: 'Text Content',
      dataIndex: 'text',
      key: 'text',
      ellipsis: true,
      render: (text) => <Text className={styles.textCol}>{text}</Text>
    },
    {
      title: 'Duration',
      dataIndex: ['metrics', 'audioDuration'],
      key: 'duration',
      width: '100px',
      render: (val) => formatDuration(val)
    },
    {
      title: 'Response Time',
      dataIndex: ['metrics', 'responseTime'],
      key: 'responseTime',
      width: '120px',
      render: (val) => {
        if (!val || val <= 0) return <span style={{ color: 'var(--color-text-disabled)' }}>—</span>;
        return <span style={{ fontFamily: 'monospace', color: 'var(--color-primary)' }}>{val.toFixed(2)}s</span>;
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '130px',
      render: (_, record) => (
        <Space size="middle">
          <Button 
            type="text" 
            icon={<Play size={13} />} 
            onClick={() => handleSelectClip(record)}
            disabled={!record.audioUrl}
            title="Load in Player"
            className={styles.actionIconBtn}
          />
          <Button 
            type="text" 
            icon={<Download size={13} />} 
            disabled={!record.audioUrl}
            onClick={(e) => handleDownload(record, e)}
            title="Download MP3"
            className={styles.actionIconBtn}
          />
        </Space>
      )
    }
  ];

  return (
    <div className={styles.container}>
      {/* Active Audio Player Deck */}
      <motion.div 
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={styles.playerSection}
      >
        {selectedClip?.audioUrl && (
          <AudioPlayer 
            audioUrl={selectedClip.audioUrl}
            autoPlay={settings.autoPlay}
            text={selectedClip.fullText}
          />
        )}
        
        {selectedClip && (
          <Card className={styles.detailCard} size="small">
            <div className={styles.detailGrid}>
              <div>
                <span className={styles.detailLabel}>Active Clip Text:</span>
                <p className={styles.detailText}>{selectedClip.fullText}</p>
              </div>
              <div className={styles.metaInfo}>
                <div><strong>Model:</strong> Gemma 4</div>
                <div><strong>Voice:</strong> {selectedClip.metrics.voiceSelected}</div>
                <div><strong>Response Time:</strong> {(selectedClip.metrics.responseTime || selectedClip.metrics.processingTime || 0).toFixed(2)}s</div>
                <div><strong>Audio Length:</strong> {formatDuration(selectedClip.metrics.audioDuration)}</div>
                <div><strong>Generated At:</strong> {selectedClip.timestamp}</div>
              </div>
            </div>
          </Card>
        )}
      </motion.div>

      {/* Session History Table */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card
          title={
            <div className={styles.tableCardHeader}>
              <div className={styles.titleRow}>
                <Database size={16} className={styles.headerIcon} />
                <span>Session Audio Logs</span>
              </div>
              {history && history.length > 0 && (
                <Button 
                  type="default" 
                  danger 
                  icon={<Trash2 size={13} />} 
                  onClick={handleClearHistory}
                  className={styles.clearBtn}
                >
                  Clear Logs
                </Button>
              )}
            </div>
          }
          className={styles.historyCard}
        >
          {history && history.length > 0 ? (
            <Table 
              dataSource={history} 
              columns={columns} 
              rowKey="id"
              pagination={{ pageSize: 5 }}
              onRow={(record) => ({
                onClick: () => handleSelectClip(record),
                className: selectedClip && selectedClip.id === record.id ? styles.selectedRow : styles.row
              })}
            />
          ) : (
            <Empty 
              description="No speech logs generated in the current session"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              className={styles.empty}
            />
          )}
        </Card>
      </motion.div>
    </div>
  );
}
