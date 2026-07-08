import React from 'react';
import { Card, Button, Tag, Tooltip } from 'antd';
import { FileText, Trash2, Activity, Volume2, HelpCircle } from 'lucide-react';
import styles from './DocumentCard.module.css';

export default function DocumentCard({ doc, onSummarize, onAsk, onRead, onDelete, isActive }) {
  const getFileIcon = (type) => {
    return <FileText className={styles.docIcon} size={18} />;
  };

  const getFormatTagColor = (type) => {
    switch (type.toLowerCase()) {
      case 'pdf':
        return '#f5222d';
      case 'docx':
        return '#2E8BFF';
      default:
        return '#FFB547';
    }
  };

  return (
    <Card
      className={`${styles.card} ${isActive ? styles.activeCard : ''}`}
      hoverable
    >
      <div className={styles.content}>
        <div className={styles.header}>
          {getFileIcon(doc.type)}
          <div className={styles.titleContainer}>
            <span className={styles.filename} title={doc.filename}>{doc.filename}</span>
            <span className={styles.timestamp}>
              Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}
            </span>
          </div>
        </div>
        
        <div className={styles.metaRow}>
          <Tag color={getFormatTagColor(doc.type)} className={styles.badge}>
            {doc.type.toUpperCase()}
          </Tag>
          {doc.size && <span className={styles.fileSize}>{doc.size}</span>}
        </div>

        <div className={styles.actionsRow}>
          <Tooltip title="Extract key insights and summaries" placement="top">
            <Button 
              type="default" 
              icon={<Activity size={13} />} 
              onClick={(e) => { e.stopPropagation(); onSummarize(doc); }}
              className={styles.actionBtn}
            >
              Summarize
            </Button>
          </Tooltip>
          
          <Tooltip title="Ask questions about this document" placement="top">
            <Button 
              type="default" 
              icon={<HelpCircle size={13} />} 
              onClick={(e) => { e.stopPropagation(); onAsk(doc); }}
              className={styles.actionBtn}
            >
              Ask Qs
            </Button>
          </Tooltip>
          
          <Tooltip title="Read the document text aloud" placement="top">
            <Button 
              type="default" 
              icon={<Volume2 size={13} />} 
              onClick={(e) => { e.stopPropagation(); onRead(doc); }}
              className={styles.actionBtn}
            >
              Read
            </Button>
          </Tooltip>
          
          <Tooltip title="Permanently delete from index" placement="top">
            <Button 
              type="primary"
              danger 
              icon={<Trash2 size={13} />} 
              onClick={(e) => { e.stopPropagation(); onDelete(doc); }}
              className={`${styles.actionBtn} ${styles.deleteBtn}`}
            >
              Delete
            </Button>
          </Tooltip>
        </div>
      </div>
    </Card>
  );
}
