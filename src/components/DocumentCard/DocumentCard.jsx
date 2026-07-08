import React from 'react';
import { Card, Button, Space, Tag } from 'antd';
import { FiFileText, FiTrash2, FiActivity, FiVolume2, FiHelpCircle } from 'react-icons/fi';
import styles from './DocumentCard.module.css';

export default function DocumentCard({ doc, onSummarize, onAsk, onRead, onDelete }) {
  const getFileIcon = (type) => {
    return <FiFileText className={styles.docIcon} />;
  };

  const getFormatTagColor = (type) => {
    switch (type.toLowerCase()) {
      case 'pdf':
        return '#f5222d';
      case 'docx':
        return '#1890ff';
      default:
        return '#722ed1';
    }
  };

  return (
    <Card
      className={styles.card}
      actions={[
        <Button type="text" icon={<FiActivity />} onClick={() => onSummarize(doc)}>
          Summarize
        </Button>,
        <Button type="text" icon={<FiHelpCircle />} onClick={() => onAsk(doc)}>
          Ask Qs
        </Button>,
        <Button type="text" icon={<FiVolume2 />} onClick={() => onRead(doc)}>
          Read Aloud
        </Button>,
        <Button type="text" danger icon={<FiTrash2 />} onClick={() => onDelete(doc)}>
          Delete
        </Button>
      ]}
    >
      <div className={styles.content}>
        <div className={styles.header}>
          {getFileIcon(doc.type)}
          <div className={styles.titleContainer}>
            <span className={styles.filename} title={doc.filename}>{doc.filename}</span>
            <span className={styles.timestamp}>
              Uploaded: {new Date(doc.uploaded_at).toLocaleString()}
            </span>
          </div>
        </div>
        <div className={styles.tags}>
          <Tag color={getFormatTagColor(doc.type)} style={{ textTransform: 'uppercase', borderRadius: '4px' }}>
            {doc.type}
          </Tag>
        </div>
      </div>
    </Card>
  );
}
