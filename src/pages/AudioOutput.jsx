import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Typography, Tag, Empty } from 'antd';
import { FiPlay, FiDownload, FiClock, FiTrash2, FiUser } from 'react-icons/fi';
import AudioPlayer from '../components/AudioPlayer/AudioPlayer';
import { getGenerationHistory, clearGenerationHistory, downloadAudio } from '../services/ttsService';
import styles from './AudioOutput.module.css';

const { Text } = Typography;

export default function AudioOutput({ settings }) {
  const [history, setHistory] = useState([]);
  const [selectedClip, setSelectedClip] = useState(null);

  // Load generation history on mount
  useEffect(() => {
    const data = getGenerationHistory();
    setHistory(data);
    if (data.length > 0) {
      setSelectedClip(data[0]); // default select the latest clip
    }
  }, []);

  const handleSelectClip = (clip) => {
    setSelectedClip(clip);
  };

  const handleClearHistory = () => {
    clearGenerationHistory();
    setHistory([]);
    setSelectedClip(null);
  };

  const handleDownload = (clip, e) => {
    e.stopPropagation();
    downloadAudio(clip.audioUrl, `vaani_${clip.id}.wav`);
  };

  const columns = [
    {
      title: 'Timestamp',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: '120px',
      render: (text) => (
        <span className={styles.timeCol}>
          <FiClock className={styles.timeIcon} /> {text}
        </span>
      )
    },
    {
      title: 'Voice / Config',
      key: 'voice',
      width: '180px',
      render: (_, record) => (
        <Space size="small">
          <Tag color="blue" icon={<FiUser />}>
            {record.metrics.voiceSelected}
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
      render: (val) => `${val} s`
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '130px',
      render: (_, record) => (
        <Space size="middle">
          <Button 
            type="text" 
            icon={<FiPlay className={styles.playIcon} />} 
            onClick={() => handleSelectClip(record)}
            disabled={!record.audioUrl}
            title="Load in Player"
          />
          <Button 
            type="text" 
            icon={<FiDownload />} 
            disabled={!record.audioUrl}
            onClick={(e) => handleDownload(record, e)}
            title="Download WAV"
          />
        </Space>
      )
    }
  ];

  return (
    <div className={styles.container}>
      {/* Active Audio Player Deck */}
      <div className={styles.playerSection}>
        {selectedClip?.audioUrl && (
          <AudioPlayer 
            audioUrl={selectedClip.audioUrl}
            autoPlay={settings.autoPlay}
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
                <div><strong>Tokens:</strong> {selectedClip.metrics.generatedTokens}</div>
                <div><strong>Processing Time:</strong> {selectedClip.metrics.processingTime}s</div>
                <div><strong>Audio Duration:</strong> {selectedClip.metrics.audioDuration}s</div>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Session History Table */}
      <Card
        title={
          <div className={styles.tableCardHeader}>
            <span className="card-title">Session Audio Logs</span>
            {history.length > 0 && (
              <Button 
                type="default" 
                danger 
                icon={<FiTrash2 />} 
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
        {history.length > 0 ? (
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
    </div>
  );
}
