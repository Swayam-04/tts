import React, { useState, useEffect, useRef } from 'react';
import { Card, Input, Button, Spin, Empty, Modal, Progress, notification, message, Row, Col, Tooltip } from 'antd';
import { 
  MessageSquare, 
  Send, 
  Plus, 
  Search, 
  Copy, 
  Volume2, 
  User, 
  Cpu, 
  RotateCcw, 
  AlertCircle,
  FolderOpen,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ConversationCard from '../components/ConversationCard/ConversationCard';
import AudioPlayer from '../components/AudioPlayer/AudioPlayer';
import { BASE_URL } from '../config/config';
import { synthesizeSpeech } from '../services/api';
import styles from './History.module.css';

export default function History({ settings, backendOnline, onAudioGenerated }) {
  const [history, setHistory] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingList, setLoadingList] = useState(false);
  const [errorState, setErrorState] = useState(null);

  // Active chat details
  const [activeConv, setActiveConv] = useState(null);
  const [messagesList, setMessagesList] = useState([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [inputPrompt, setInputPrompt] = useState('');

  // Generation telemetry pipelines inside active chat
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeAudioUrl, setActiveAudioUrl] = useState(null);
  const [activeSpokenText, setActiveSpokenText] = useState('');
  const [progress, setProgress] = useState(0);
  const [readingMessageId, setReadingMessageId] = useState(null);

  // Clear active audio player when voice changes
  useEffect(() => {
    setActiveAudioUrl(null);
    setActiveSpokenText('');
  }, [settings?.voice]);

  const messageEndRef = useRef(null);

  // Load conversations on mount
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
    setErrorState(null);
    try {
      const url = searchQuery.trim() 
        ? `http://127.0.0.1:5000/history?user_id=default&search=${encodeURIComponent(searchQuery)}`
        : `http://127.0.0.1:5000/history?user_id=default`;
        
      const res = await fetch(url);
      if (res.status === 404) {
        setErrorState("No conversations found.");
        setHistory([]);
        return;
      }
      if (res.status === 500) {
        setErrorState("Unable to load history.");
        setHistory([]);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setHistory(data.conversations || []);
          
          // Auto-select conversation if specified
          if (selectId && data.conversations) {
            const found = data.conversations.find(c => c.id === selectId);
            if (found) handleSelectConv(found);
          }
        }
      }
    } catch (err) {
      console.error(err);
      setErrorState("Backend Offline.");
      setHistory([]);
    } finally {
      setLoadingList(false);
    }
  };

  const handleSearch = (val) => {
    setSearchQuery(val);
    setTimeout(() => fetchConversations(), 10);
  };

  const handleCreateChat = async () => {
    const requestUrl = "http://127.0.0.1:5000/history";
    const requestBody = { title: `Chat ${new Date().toLocaleDateString()}`, user_id: "default" };
    
    console.log("Creating conversation...");
    console.log("URL:", requestUrl);
    console.log("Body:", requestBody);

    try {
      const res = await fetch(requestUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      });
      
      let data;
      try {
        data = await res.json();
        console.log("Server response:", data);
      } catch (e) {
        throw new Error(`Invalid response format from server (Status: ${res.status})`);
      }

      if (res.ok && data.success) {
        message.success("New chat created");
        await fetchConversations(data.id);
      } else {
        throw new Error(data.error || `Server returned error status ${res.status}`);
      }
    } catch (err) {
      console.error("New Chat Creation Failed:", err);
      message.error(`Failed to create conversation: ${err.message || err}`);
    }
  };

  const handleSelectConv = async (conv) => {
    setActiveConv(conv);
    setLoadingChat(true);
    setMessagesList([]);
    setActiveAudioUrl(null);
    setActiveSpokenText('');
    try {
      const res = await fetch(`http://127.0.0.1:5000/history/${conv.id}`);
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
      const res = await fetch(`http://127.0.0.1:5000/history/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle })
      });
      if (res.ok) {
        message.success("Conversation renamed");
        fetchConversations(activeConv && activeConv.id === id ? activeConv.id : null);
        if (activeConv && activeConv.id === id) {
          setActiveConv(prev => ({ ...prev, title: newTitle }));
        }
      }
    } catch (err) {
      message.error("Failed to rename conversation.");
    }
  };

  const handleDeleteConv = (id) => {
    Modal.confirm({
      title: 'Are you sure you want to delete this conversation?',
      content: 'This will permanently delete all conversation logs from the database index.',
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'No, Keep',
      onOk: async () => {
        try {
          const res = await fetch(`http://127.0.0.1:5000/history/${id}`, {
            method: "DELETE"
          });
          if (res.ok) {
            message.success("Conversation deleted");
            if (activeConv && activeConv.id === id) {
              setActiveConv(null);
              setMessagesList([]);
              setActiveAudioUrl(null);
            }
            fetchConversations();
          }
        } catch (err) {
          message.error("Failed to delete chat.");
        }
      }
    });
  };

  const handleSendMessage = async (customText = null) => {
    const userText = customText || inputPrompt.trim();
    if (!userText || !activeConv || isGenerating) return;
    
    if (!customText) setInputPrompt('');
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
          
          const historyRes = await fetch(`http://127.0.0.1:5000/history/${activeConv.id}`);
          if (historyRes.ok) {
            const historyData = await historyRes.json();
            if (historyData.success) {
              setMessagesList(historyData.messages || []);
            }
          }

          if (data.audio_file) {
            const generatedAudioUrl = data.audio_file.startsWith('http') 
              ? data.audio_file 
              : `${BASE_URL}${data.audio_file}`;
            setActiveAudioUrl(generatedAudioUrl);
            setActiveSpokenText(data.generated_text || '');
            
            if (onAudioGenerated) {
              const textSnippet = (data.generated_text && data.generated_text.length > 80)
                ? data.generated_text.substring(0, 80) + '...'
                : data.generated_text;

              onAudioGenerated({
                id: `clip_${Date.now()}`,
                text: textSnippet,
                fullText: data.generated_text,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                audioUrl: generatedAudioUrl,
                metrics: {
                  voiceSelected: settings.voice || 'Default',
                  processingTime: data.latencies ? data.latencies.total : 1.0
                }
              });
            }
          }
          fetchConversations();
        }
      }
    } catch (err) {
      console.error(err);
      notification.error({
        message: 'Pipeline Link Offline',
        description: 'Failed to communicate with Flask backend.',
      });
    } finally {
      setIsGenerating(false);
      setTimeout(() => setProgress(0), 500);
    }
  };

  const handleReadAloudMessage = async (msgId, content, language = 'en', translate = false) => {
    setReadingMessageId(`${msgId}_${language}`);
    const requestBody = { text: content, language, translate, voice: settings.voice };
    if (language === 'hi') {
      console.log("Hindi synthesis request:", requestBody);
    } else {
      console.log("English synthesis request:", requestBody);
    }
    try {
      const res = await synthesizeSpeech(content, language, translate, settings.voice);
      if (res && res.success && res.audio_file) {
        const generatedAudioUrl = res.audio_file.startsWith('http') 
          ? res.audio_file 
          : `${BASE_URL}${res.audio_file}`;
        setActiveAudioUrl(generatedAudioUrl);
        setActiveSpokenText(res.translated_text || content || '');
      } else {
        message.error("Failed to synthesize audio for message.");
      }
    } catch (err) {
      console.error(err);
      message.error("Link offline: Failed to synthesize speech.");
    } finally {
      setReadingMessageId(null);
    }
  };

  const handleRegenerate = () => {
    const userMsgs = messagesList.filter(m => m.role === 'user');
    if (userMsgs.length > 0) {
      const lastUserMsg = userMsgs[userMsgs.length - 1];
      handleSendMessage(lastUserMsg.content);
    }
  };

  const handleCopyMessage = (content) => {
    navigator.clipboard.writeText(content)
      .then(() => message.success("Copied message text"))
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
      <Row gutter={[20, 20]}>
        {/* Left Side: Conversations list */}
        <Col xs={24} lg={8}>
          <motion.div
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card
              className={styles.sidebarCard}
              title={
                <div className={styles.sidebarHeader}>
                  <div className={styles.sidebarTitleRow}>
                    <FolderOpen size={16} className={styles.sidebarIcon} />
                    <span>Secure Chats</span>
                  </div>
                  <Button type="primary" icon={<Plus size={15} />} onClick={handleCreateChat}>
                    New Chat
                  </Button>
                </div>
              }
            >
              <div style={{ marginBottom: '16px' }}>
                <Input
                  placeholder="Search conversations..."
                  prefix={<Search size={14} style={{ color: '#b5c4d8' }} />}
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className={styles.searchInput}
                />
              </div>

              {loadingList ? (
                <div style={{ textAlign: 'center', padding: '30px 0' }}><Spin size="medium" /></div>
              ) : errorState ? (
                <div className={styles.emptyStateContainer}>
                  <AlertCircle size={28} className={styles.emptyStateIcon} />
                  <span>{errorState}</span>
                </div>
              ) : (history && Array.isArray(history) && history.length === 0) ? (
                <Empty description={<span style={{ color: '#b5c4d8' }}>No conversations found</span>} />
              ) : (
                <div className={styles.chatList}>
                  {Array.isArray(history) && history.map((conv) => (
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
          </motion.div>
        </Col>

        {/* Right Side: Message Thread */}
        <Col xs={24} lg={16}>
          <motion.div
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card
              className={styles.chatCard}
              title={
                activeConv ? (
                  <div>
                    <div className="card-title">{activeConv.title}</div>
                    <div className="card-subtitle">AI Session Memory: Connected & Persistent</div>
                  </div>
                ) : (
                  <span className="card-title">Chat Workspace</span>
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
                        <MessageSquare size={36} className={styles.emptyIcon} />
                        <p>Conversation thread initialized. Type your prompts below.</p>
                      </div>
                    ) : (
                      messagesList.map((msg) => (
                        <div 
                          key={msg.id} 
                          className={`${styles.messageWrapper} ${msg.role === 'user' ? styles.userWrapper : styles.assistantWrapper}`}
                        >
                          <div className={styles.avatar}>
                            {msg.role === 'user' ? <User size={15} /> : <Cpu size={15} />}
                          </div>
                          <div className={styles.bubble}>
                            <div className={styles.bubbleHeader}>
                              <span className={styles.sender}>{msg.role === 'user' ? 'Telemetry Input' : 'VAANI Agent'}</span>
                              <span className={styles.time}>{formatMessageTime(msg.timestamp)}</span>
                            </div>
                            <div className={styles.bubbleContent}>{msg.content}</div>
                            
                            <div className={styles.bubbleActions}>
                              <Tooltip title="Copy message text">
                                <Button 
                                  type="text" 
                                  size="small" 
                                  icon={<Copy size={13} />} 
                                  onClick={() => handleCopyMessage(msg.content)}
                                  className={styles.msgActionBtn}
                                />
                              </Tooltip>

                              {msg.role === 'assistant' && (
                                <div style={{ display: 'inline-flex', gap: '4px' }}>
                                  <Tooltip title={readingMessageId === `${msg.id}_en` ? "Synthesizing..." : "Read in English"}>
                                    <Button 
                                      type="text" 
                                      size="small" 
                                      icon={readingMessageId === `${msg.id}_en` ? <Loader2 className={`${styles.spin}`} size={12} /> : <Volume2 size={13} />} 
                                      onClick={() => handleReadAloudMessage(msg.id, msg.content, 'en', false)}
                                      className={styles.msgActionBtn}
                                      disabled={readingMessageId !== null}
                                    />
                                  </Tooltip>
                                  <Tooltip title={readingMessageId === `${msg.id}_hi` ? "Translating..." : "Read in Hindi"}>
                                    <Button 
                                      type="text" 
                                      size="small" 
                                      icon={readingMessageId === `${msg.id}_hi` ? <Loader2 className={`${styles.spin}`} size={12} /> : <span style={{ fontSize: '12px' }}>🇮🇳</span>} 
                                      onClick={() => handleReadAloudMessage(msg.id, msg.content, 'hi', true)}
                                      className={styles.msgActionBtn}
                                      disabled={readingMessageId !== null}
                                    />
                                  </Tooltip>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}

                    {isGenerating && (
                      <div className={`${styles.messageWrapper} ${styles.assistantWrapper}`}>
                        <div className={styles.avatar}><Cpu size={15} /></div>
                        <div className={styles.bubble}>
                          <div className={styles.bubbleHeader}>
                            <span className={styles.sender}>VAANI Agent</span>
                          </div>
                          <div className={styles.bubbleContent} style={{ padding: '8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Loader2 className={`${styles.spin} ${styles.loaderIcon}`} size={16} />
                            <span style={{ color: '#b5c4d8', fontSize: '13px' }}>Generating report...</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div ref={messageEndRef} />
                  </div>

                  {/* Progress bar for LLM */}
                  {isGenerating && progress > 0 && (
                    <div style={{ padding: '4px 16px' }}>
                      <Progress percent={progress} showInfo={false} size="small" strokeColor="#2E8BFF" trailColor="rgba(255,255,255,0.05)" />
                    </div>
                  )}

                  {/* Audio player if audio is generated recently */}
                  {!isGenerating && activeAudioUrl && (
                    <div className={styles.playerWrapper}>
                      <AudioPlayer audioUrl={activeAudioUrl} autoPlay={settings.autoPlay} text={activeSpokenText} />
                    </div>
                  )}

                  {/* Input box toolbar */}
                  <div className={styles.inputToolbar}>
                    {messagesList.length > 0 && (
                      <Button
                        type="default"
                        icon={<RotateCcw size={13} />}
                        onClick={handleRegenerate}
                        disabled={isGenerating}
                        className={styles.toolbarBtn}
                      >
                        Regenerate
                      </Button>
                    )}
                  </div>

                  {/* Input box */}
                  <div className={styles.inputArea}>
                    <Input.TextArea
                      placeholder="Type queries or prompts (e.g. missile logs, flight data)..."
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
                      icon={<Send size={15} />} 
                      onClick={() => handleSendMessage()} 
                      className={styles.sendBtn}
                      loading={isGenerating}
                      disabled={!inputPrompt.trim()}
                    />
                  </div>
                </div>
              ) : (
                <div className={styles.selectChatBanner}>
                  <MessageSquare size={48} className={styles.selectIcon} />
                  <h3>Select a Chat Thread</h3>
                  <p>Choose an existing conversation from the sidebar index, or launch a new conversation.</p>
                  <Button type="primary" icon={<Plus size={15} />} onClick={handleCreateChat} style={{ marginTop: '16px' }}>
                    Start New Chat
                  </Button>
                </div>
              )}
            </Card>
          </motion.div>
        </Col>
      </Row>
    </div>
  );
}
