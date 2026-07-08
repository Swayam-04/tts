import React, { useState } from 'react';
import { Button, Input, Tooltip } from 'antd';
import { MessageSquare, Edit2, Check, X, Trash2, Clock } from 'lucide-react';
import styles from './ConversationCard.module.css';

export default function ConversationCard({ conversation, isActive, onSelect, onRename, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [newTitle, setNewTitle] = useState(conversation.title);

  const handleSaveRename = (e) => {
    e.stopPropagation();
    if (newTitle.trim() && newTitle !== conversation.title) {
      onRename(conversation.id, newTitle.trim());
    }
    setIsEditing(false);
  };

  const handleCancelRename = (e) => {
    e.stopPropagation();
    setNewTitle(conversation.title);
    setIsEditing(false);
  };

  const handleCardClick = () => {
    if (!isEditing) {
      onSelect(conversation);
    }
  };

  const formatTimestamp = (tsStr) => {
    try {
      const d = new Date(tsStr.replace(/-/g, '/'));
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch (e) {
      return tsStr;
    }
  };

  return (
    <div 
      className={`${styles.cardWrapper} ${isActive ? styles.activeCard : ''}`}
      onClick={handleCardClick}
    >
      <div className={styles.iconContainer}>
        <MessageSquare className={styles.chatIcon} size={16} />
      </div>
      
      <div className={styles.body}>
        {isEditing ? (
          <div className={styles.editRow} onClick={(e) => e.stopPropagation()}>
            <Input 
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onPressEnter={handleSaveRename}
              className={styles.renameInput}
              autoFocus
            />
            <Button size="small" type="primary" icon={<Check size={12} />} onClick={handleSaveRename} />
            <Button size="small" icon={<X size={12} />} onClick={handleCancelRename} />
          </div>
        ) : (
          <div className={styles.titleRow}>
            <span className={styles.title} title={conversation.title}>
              {conversation.title}
            </span>
            <span className={styles.timestamp}>
              <Clock size={11} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              {formatTimestamp(conversation.updated_at || conversation.created_at)}
            </span>
          </div>
        )}
      </div>

      {!isEditing && (
        <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
          <Tooltip title="Rename chat">
            <Button 
              type="text" 
              size="small" 
              icon={<Edit2 size={13} />} 
              onClick={() => setIsEditing(true)}
              className={styles.actionBtn}
            />
          </Tooltip>
          <Tooltip title="Delete chat">
            <Button 
              type="text" 
              size="small" 
              danger
              icon={<Trash2 size={13} />} 
              onClick={() => onDelete(conversation.id)}
              className={styles.actionBtn}
            />
          </Tooltip>
        </div>
      )}
    </div>
  );
}
