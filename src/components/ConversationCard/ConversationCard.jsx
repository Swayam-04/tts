import React, { useState } from 'react';
import { Card, Button, Input, Space, Tooltip } from 'antd';
import { FiMessageSquare, FiEdit2, FiCheck, FiX, FiTrash2, FiClock } from 'react-icons/fi';
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
    // SQLite timestamps look like "2026-07-08 13:00:00"
    try {
      const d = new Date(tsStr.replace(/-/g, '/')); // browser compatibility
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
        <FiMessageSquare className={styles.chatIcon} />
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
            <Button size="small" type="primary" icon={<FiCheck />} onClick={handleSaveRename} />
            <Button size="small" icon={<FiX />} onClick={handleCancelRename} />
          </div>
        ) : (
          <div className={styles.titleRow}>
            <span className={styles.title} title={conversation.title}>
              {conversation.title}
            </span>
            <span className={styles.timestamp}>
              <FiClock style={{ marginRight: '4px', verticalAlign: 'middle' }} />
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
              icon={<FiEdit2 className={styles.actionIcon} />} 
              onClick={() => setIsEditing(true)}
            />
          </Tooltip>
          <Tooltip title="Delete chat">
            <Button 
              type="text" 
              size="small" 
              danger
              icon={<FiTrash2 className={styles.actionIcon} />} 
              onClick={() => onDelete(conversation.id)}
            />
          </Tooltip>
        </div>
      )}
    </div>
  );
}
