import React, { useState, useEffect, useRef } from 'react';
import { Card, Input, Button, List, Spin, Empty, Modal, Timeline, Progress, notification, message } from 'antd';
import { FiMessageSquare, FiSend, FiPlus, FiSearch, FiCopy, FiVolume2, FiUser, FiCpu } from 'react-icons/fi';
import ConversationCard from '../components/ConversationCard/ConversationCard';
import AudioPlayer from '../components/AudioPlayer/AudioPlayer';
import { BASE_URL } from '../config/config';
import styles from './History.module.css';

export default function History({ settings, backendOnline, onAudioGenerated }) {
  const [conversations, setConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingList, setLoadingList] = useState(false);

  // Active chat details
  const [activeConv, setActiveConv] = useState(null);
  const [messagesList, setMessagesList] = useState([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [inputPrompt, setInputPrompt] = useState('');

  // Generation telemetry pipelines inside active chat
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeAudioUrl, setActiveAudioUrl] = useState(null);
  const [progress, setProgress] = useState(0);

  const messageEndRef = useRef(null);

  // Load chats on mount
  useEffect(() => {
    if (backendOnline) {
      fetchConversations();
    }
  }, [backendOnline]);

  // Sync scroll to bottom on new messages
  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messagesList, isGenerating]);

  const fetchConversations = async (selectId = null) => {
    setLoadingList(true);
    try {
      const url = searchQuery.trim() 
        ? `http://127.0.0.1:5000/conversations?user_id=default&search=${encodeURIComponent(searchQuery)}`
        : `http://127.0.0.1:5000/conversations?user_id=default`;
        
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setConversations(data.conversations);
          
          // Auto-select conversation if specified
          if (selectId) {
            const found = data.conversations.find(c => c.id === selectId);
            if (found) handleSelectConv(found);
          }
        }
      }
    } catch (err) {
      console.error(err);
      message.error("Failed to load conversations.");
    } finally {
      setLoadingList(false);
    }
  };

  const handleSearch = (val) => {
    setSearchQuery(val);
    // Trigger list fetch
    setTimeout(() => fetchConversations(), 10);
  };

  const handleCreateChat = async () => {
    try {
      const res = await fetch("http://127.0.0.1:5000/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: `Chat ${new Date().toLocaleDateString()}`, user_id: "default" })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          message.success("New chat created");
          // Re-fetch and select the newly created chat
          fetchConversations(data.id);
        }
      }
    } catch (err) {
      message.error("Failed to create conversation.");
    }
  };

  const handleSelectConv = async (conv) => {
    setActiveConv(conv);
    setLoadingChat(true);
    setMessagesList([]);
    setActiveAudioUrl(null);
    try {
      const res = await fetch(`http://127.0.0.1:5000/conversations/${conv.id}/messages`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setMessagesList(data.messages || []);
        }
      }
    } catch (err) {
      message.error("Failed to load chat messages.");
    } finally {
      setLoadingChat(false);
    }
  };

  const handleRenameConv = async (id, newTitle) => {
    try {
      const res = await fetch(`http://127.0.0.1:5000/conversations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          message.success("Chat renamed");
          fetchConversations();
          if (activeConv && activeConv.id === id) {
            setActiveConv(prev => ({ ...prev, title: newTitle }));
          }
        }
      }
    } catch (err) {
      message.error("Failed to rename chat.");
    }
  };

  const handleDeleteConv = (id) => {
    Modal.confirm({
      title: 'Confirm deletion',
      content: 'Are you sure you want to permanently delete this chat thread? All message histories will be deleted.',
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          const res = await fetch(`http://127.0.0.1:5000/conversations/${id}`, {
            method: "DELETE"
          });
          if (res.ok) {
            const data = await res.json();
            if (data.success) {
              message.success("Chat deleted");
              fetchConversations();
              if (activeConv && activeConv.id === id) {
                setActiveConv(null);
                setMessagesList([]);
              }
            }
          }
        } catch (err) {
          message.error("Failed to delete chat.");
        }
      }
    });
  };

  const handleSendMessage = async () => {
    if (!inputPrompt.trim() || !activeConv || isGenerating) return;
    
    const userText = inputPrompt.trim();
    setInputPrompt('');
    setIsGenerating(true);
    setProgress(30);

    // Optimistically insert user message in local view
    const localUserMsg = {
      id: `temp_u_${Date.now()}`,
      role: 'user',
      content: userText,
      timestamp: new Date().toISOString()
    };
    setMessagesList(prev => [...prev, localUserMsg]);

    try {
      setProgress(60);
      const res = await fetch("http://127.0.0.1:5000/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: userText,
          conversation_id: activeConv.id,
          user_id: "default"
        })
      });

      setProgress(90);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setProgress(100);
          
          // Re-fetch message history to get real DB record with assistant response
          const historyRes = await fetch(`http://127.0.0.1:5000/conversations/${activeConv.id}/messages`);
          if (historyRes.ok) {
            const historyData = await historyRes.json();
            if (historyData.success) {
              setMessagesList(historyData.messages || []);
            }
          }

          // Format audio URL if present
          if (data.audio_file) {
            const generatedAudioUrl = data.audio_file.startsWith('http') 
              ? data.audio_file 
              : `${BASE_URL}${data.audio_file}`;
            setActiveAudioUrl(generatedAudioUrl);
            
            // Format clip details for main playback cache
            const textSnippet = (data.generated_text && data.generated_text.length > 80)
              ? data.generated_text.substring(0, 80) + '...'
              : data.generated_text;
            
            if (onAudioGenerated) {
              onAudioGenerated({
                id: `clip_${Date.now()}`,
                text: textSnippet,
                fullText: data.generated_text,
                audioUrl: generatedAudioUrl,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                metrics: {
                  voiceSelected: settings.voice || 'Default',
                  processingTime: data.latencies ? data.latencies.total : 1.0
                }
              });
            }
          }
          
          // Refresh list timestamps
          fetchConversations();
        } else {
          notification.error({
            message: 'Ollama Offline',
            description: data.reason || 'Failed to complete query prompt.',
          });
        }
      }
    } catch (err) {
      console.error(err);
      notification.error({
        message: 'Network Error',
        description: 'Failed to communicate with Flask backend.',
      });
    } finally {
      setIsGenerating(false);
      setTimeout(() => setProgress(0), 500);
    }
  };

  const handleCopyMessage = (content) => {
    navigator.clipboard.writeText(content)
      .then(() => message.success("Message copied to clipboard"))
      .catch(() => message.error("Clipboard copy failed"));
  };

  const formatMessageTime = (tsStr) => {
    try {
      const d = new Date(tsStr.replace(/-/g, '/'));
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  return (
    <div className={styles.container}>
      <Row gutter={[24, 0]}>
        {/* Left Side: Conversations list */}
        <Col xs={24} lg={8}>
          <Card
            className={styles.sidebarCard}
            title={
              <div className={styles.sidebarHeader}>
                <span className="card-title">Chats history</span>
                <Button type="primary" icon={<FiPlus />} onClick={handleCreateChat}>
                  New Chat
                </Button>
              </div>
            }
          >
            <div style={{ marginBottom: '16px' }}>
              <Input
                placeholder="Search conversations..."
                prefix={<FiSearch style={{ color: '#8b949e' }} />}
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                style={{ background: '#0e1626', color: '#f0f6fc', border: '1px solid #162238' }}
              />
            </div>

            {loadingList ? (
              <div style={{ textAlign: 'center', padding: '30px 0' }}><Spin size="medium" /></div>
            ) : conversations.length === 0 ? (
              <Empty description={<span style={{ color: '#8b949e' }}>No chat history found.</span>} />
            ) : (
              <div className={styles.chatList}>
                {conversations.map((conv) => (
                  <ConversationCard
                    key={conv.id}
                    conversation={conv}
                    isActive={activeConv && activeConv.id === conv.id}
                    onSelect={handleSelectConv}
                    onRename={handleRenameConv}
                    onDelete={handleDeleteConv}
                  />
                ))}
              </div>
            )}
          </Card>
        </Col>

        {/* Right Side: Message Thread */}
        <Col xs={24} lg={16}>
          <Card
            className={styles.chatCard}
            title={
              activeConv ? (
                <div>
                  <div className="card-title">{activeConv.title}</div>
                  <div className="card-subtitle">AI Memory Module: Connected</div>
                </div>
              ) : (
                <span className="card-title">Chat Session</span>
              )
            }
          >
            {activeConv ? (
              <div className={styles.chatWorkspace}>
                {/* Messages view */}
                <div className={styles.messageThread}>
                  {loadingChat ? (
                    <div style={{ textAlign: 'center', padding: '50px 0' }}><Spin size="large" /></div>
                  ) : messagesList.length === 0 ? (
                    <div className={styles.emptyChat}>
                      <FiMessageSquare style={{ fontSize: '40px', color: '#162238', marginBottom: '12px' }} />
                      <p>Conversation started. Send telemetry payloads or ask questions offline.</p>
                    </div>
                  ) : (
                    messagesList.map((msg) => (
                      <div 
                        key={msg.id} 
                        className={`${styles.messageWrapper} ${msg.role === 'user' ? styles.userWrapper : styles.assistantWrapper}`}
                      >
                        <div className={styles.avatar}>
                          {msg.role === 'user' ? <FiUser /> : <FiCpu />}
                        </div>
                        <div className={styles.bubble}>
                          <div className={styles.bubbleHeader}>
                            <span className={styles.sender}>{msg.role === 'user' ? 'Telemetry Input' : 'VAANI AI'}</span>
                            <span className={styles.time}>{formatMessageTime(msg.timestamp)}</span>
                          </div>
                          <div className={styles.bubbleContent}>{msg.content}</div>
                          <div className={styles.bubbleActions}>
                            <Button 
                              type="text" 
                              size="small" 
                              icon={<FiCopy />} 
                              onClick={() => handleCopyMessage(msg.content)}
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}

                  {isGenerating && (
                    <div className={`${styles.messageWrapper} ${styles.assistantWrapper}`}>
                      <div className={styles.avatar}><FiCpu /></div>
                      <div className={styles.bubble}>
                        <div className={styles.bubbleHeader}>
                          <span className={styles.sender}>VAANI AI</span>
                        </div>
                        <div className={styles.bubbleContent} style={{ padding: '8px 0' }}>
                          <Spin size="small" style={{ marginRight: '8px' }} />
                          <span style={{ color: '#8b949e', fontSize: '13px' }}>Generating report...</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messageEndRef} />
                </div>

                {/* Progress bar for LLM */}
                {isGenerating && progress > 0 && (
                  <div style={{ padding: '4px 16px' }}>
                    <Progress percent={progress} showInfo={false} size="small" strokeColor="#1e88e5" trailColor="rgba(255,255,255,0.05)" />
                  </div>
                )}

                {/* Audio player if audio is generated recently */}
                {!isGenerating && activeAudioUrl && (
                  <div className={styles.playerWrapper}>
                    <AudioPlayer audioUrl={activeAudioUrl} autoPlay={settings.autoPlay} />
                  </div>
                )}

                {/* Input box */}
                <div className={styles.inputArea}>
                  <Input.TextArea
                    placeholder="Type telemetry lines or message prompts (e.g. Missile: Prithvi-II)..."
                    value={inputPrompt}
                    onChange={(e) => setInputPrompt(e.target.value)}
                    onPressEnter={(e) => {
                      if (!e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    autoSize={{ minRows: 2, maxRows: 4 }}
                    className={styles.textarea}
                    disabled={isGenerating}
                  />
                  <Button 
                    type="primary" 
                    icon={<FiSend />} 
                    onClick={handleSendMessage} 
                    className={styles.sendBtn}
                    loading={isGenerating}
                    disabled={!inputPrompt.trim()}
                  />
                </div>
              </div>
            ) : (
              <Empty 
                description={
                  <span style={{ color: '#8b949e' }}>
                    Select a conversation from history or start a new chat thread to enable AI memory.
                  </span>
                } 
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
