import React, { useState, useEffect } from 'react';
import { Card, Button, Row, Col, Input, List, Spin, Empty, Modal, Tabs, Progress, notification } from 'antd';
import { 
  Upload, 
  Search, 
  FileText, 
  Activity, 
  Volume2, 
  Trash2, 
  Play, 
  Download, 
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import UploadDialog from '../components/UploadDialog/UploadDialog';
import DocumentCard from '../components/DocumentCard/DocumentCard';
import AudioPlayer from '../components/AudioPlayer/AudioPlayer';
import { BASE_URL } from '../config/config';
import styles from './Documents.module.css';

export default function Documents({ settings, backendOnline }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadVisible, setUploadVisible] = useState(false);
  
  // Selected doc details
  const [activeDoc, setActiveDoc] = useState(null);
  const [activeTab, setActiveTab] = useState('summary');
  
  // Summary state
  const [summary, setSummary] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Question / RAG state
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState([]);
  const [loadingAnswer, setLoadingAnswer] = useState(false);

  // Read Aloud / TTS state
  const [audioUrl, setAudioUrl] = useState(null);
  const [generatingSpeech, setGeneratingSpeech] = useState(false);
  const [speechStage, setSpeechStage] = useState('');
  const [activeTextToSpeak, setActiveTextToSpeak] = useState('');

  // Load documents on mount
  useEffect(() => {
    if (backendOnline) {
      fetchDocuments();
    }
  }, [backendOnline]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:5000/documents");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setDocuments(data.documents);
        }
      }
    } catch (err) {
      console.error(err);
      notification.error({
        message: 'Database Error',
        description: 'Failed to fetch documents from database.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDoc = (doc) => {
    setActiveDoc(doc);
    setSummary('');
    setAnswer('');
    setSources([]);
    setAudioUrl(null);
    setActiveTab('summary');
  };

  const handleSummarize = async (doc) => {
    handleSelectDoc(doc);
    setLoadingSummary(true);
    try {
      const res = await fetch("http://127.0.0.1:5000/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_id: doc.id })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSummary(data.summary);
        } else {
          setSummary("Failed to generate summary: " + data.error);
        }
      }
    } catch (err) {
      setSummary("Network error generating summary.");
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleAskQuestion = async () => {
    if (!question.trim()) return;
    setLoadingAnswer(true);
    setAnswer('');
    setSources([]);
    try {
      const res = await fetch("http://127.0.0.1:5000/ask-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question,
          document_id: activeDoc ? activeDoc.id : null
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setAnswer(data.answer);
          setSources(data.sources || []);
        } else {
          setAnswer("Error matching document content: " + data.error);
        }
      }
    } catch (err) {
      setAnswer("Network error matching documents.");
    } finally {
      setLoadingAnswer(false);
    }
  };

  const handleReadAloud = async (doc) => {
    handleSelectDoc(doc);
    setActiveTab('narrator');
    setGeneratingSpeech(true);
    setAudioUrl(null);
    setActiveTextToSpeak('');
    
    // Stage 1: Extracting document
    setSpeechStage("Extracting document...");
    
    try {
      // Small timeout to simulate progress steps visibly
      await new Promise(r => setTimeout(r, 600));
      
      // Stage 2: Preparing speech
      setSpeechStage("Preparing speech...");
      await new Promise(r => setTimeout(r, 600));
      
      // Stage 3: Generating audio
      setSpeechStage("Generating audio...");
      
      const res = await fetch("http://127.0.0.1:5000/read-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_id: doc.id,
          read_type: "full"
        })
      });
      
      const data = await res.json();
      
      if (res.ok && data.success && data.audio_file) {
        // Stage 4: Ready
        setSpeechStage("Ready");
        setActiveTextToSpeak(data.text || doc.filename);
        
        const generatedUrl = data.audio_file.startsWith('http') 
          ? data.audio_file 
          : `${BASE_URL}${data.audio_file}`;
        setAudioUrl(generatedUrl);
        notification.success({
          message: 'TTS Synthesized',
          description: 'Document has been successfully synthesized.',
        });
      } else {
        const errorMsg = data.error || 'Failed to read document aloud.';
        notification.error({
          message: 'TTS Failure',
          description: errorMsg,
        });
      }
    } catch (err) {
      console.error(err);
      notification.error({
        message: 'TTS Failure',
        description: err.message || 'Failed to read document aloud.',
      });
    } finally {
      setGeneratingSpeech(false);
    }
  };

  const handleDeleteDoc = (doc) => {
    Modal.confirm({
      title: 'Confirm deletion',
      content: `Are you sure you want to permanently delete and remove ${doc.filename}? This cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          const res = await fetch(`http://127.0.0.1:5000/documents/${doc.id}`, {
            method: "DELETE"
          });
          if (res.ok) {
            const data = await res.json();
            if (data.success) {
              notification.success({ message: 'Deleted successfully' });
              fetchDocuments();
              if (activeDoc && activeDoc.id === doc.id) {
                setActiveDoc(null);
              }
            }
          }
        } catch (err) {
          message.error("Failed to delete document.");
        }
      }
    });
  };

  return (
    <div className={styles.container}>
      <Row gutter={[24, 24]}>
        {/* Left column: List of indexed files */}
        <Col xs={24} lg={10}>
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
                    <FileText size={16} className={styles.sidebarIcon} />
                    <span>Document Vault</span>
                  </div>
                  <Button 
                    type="primary" 
                    icon={<Upload size={15} />} 
                    onClick={() => setUploadVisible(true)}
                    disabled={!backendOnline}
                  >
                    Upload File
                  </Button>
                </div>
              }
            >
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}><Spin size="large" /></div>
              ) : documents.length === 0 ? (
                <Empty 
                  description={
                    <span style={{ color: '#b5c4d8' }}>
                      No secure files indexed. Upload PDFs, DOCX, or TXT documents.
                    </span>
                  } 
                />
              ) : (
                <div className={styles.docList}>
                  {documents.map((doc) => (
                    <div 
                      key={doc.id} 
                      className={`${styles.cardWrapper} ${activeDoc && activeDoc.id === doc.id ? styles.activeWrapper : ''}`}
                      onClick={() => handleSelectDoc(doc)}
                    >
                      <DocumentCard 
                        doc={doc}
                        onSummarize={handleSummarize}
                        onAsk={(d) => { handleSelectDoc(d); setActiveTab('rag'); }}
                        onRead={handleReadAloud}
                        onDelete={handleDeleteDoc}
                        isActive={activeDoc && activeDoc.id === doc.id}
                      />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>
        </Col>

        {/* Right column: Workspace */}
        <Col xs={24} lg={14}>
          <motion.div
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            style={{ height: '100%' }}
          >
            {activeDoc ? (
              <Card
                className={styles.workspaceCard}
                title={
                  <div>
                    <div className="card-title" title={activeDoc.filename}>{activeDoc.filename}</div>
                    <div className="card-subtitle">Format: {activeDoc.type.toUpperCase()} | Secure Local Analysis</div>
                  </div>
                }
              >
                <Tabs
                  activeKey={activeTab}
                  onChange={setActiveTab}
                  className={styles.tabsContainer}
                  items={[
                    {
                      key: 'summary',
                      label: <span className={styles.tabLabel}><Activity size={14} /> Summary</span>,
                      children: (
                        <div className={styles.tabContent}>
                          {loadingSummary ? (
                            <div style={{ textAlign: 'center', padding: '30px 0' }}>
                              <Spin size="medium" />
                              <div style={{ marginTop: '12px', color: '#b5c4d8' }}>Summarizing document with local LLM...</div>
                            </div>
                          ) : summary ? (
                            <div className={styles.summaryText}>
                              {summary}
                            </div>
                          ) : (
                            <div className={styles.placeholderTab}>
                              <Button type="primary" icon={<Sparkles size={14} />} onClick={() => handleSummarize(activeDoc)}>
                                Generate Auto-Summary
                              </Button>
                            </div>
                          )}
                        </div>
                      )
                    },
                    {
                      key: 'rag',
                      label: <span className={styles.tabLabel}><Search size={14} /> Ask Document</span>,
                      children: (
                        <div className={styles.tabContent}>
                          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                            <Input
                              placeholder="Ask any question about this document (e.g. 'What is Section 4?')..."
                              value={question}
                              onChange={(e) => setQuestion(e.target.value)}
                              onPressEnter={handleAskQuestion}
                              className={styles.questionInput}
                            />
                            <Button type="primary" onClick={handleAskQuestion} loading={loadingAnswer}>
                              Query
                            </Button>
                          </div>

                          {loadingAnswer && (
                            <div style={{ textAlign: 'center', padding: '30px 0' }}>
                              <Spin size="medium" />
                              <div style={{ marginTop: '12px', color: '#b5c4d8' }}>Running local vector similarity search and LLM processing...</div>
                            </div>
                          )}

                          {answer && (
                            <div className={styles.answerSection}>
                              <div className={styles.answerBox}>
                                <h4>Answer:</h4>
                                <p>{answer}</p>
                              </div>
                              
                              {sources.length > 0 && (
                                <div className={styles.sourcesBox}>
                                  <h4>Retrieved Sources:</h4>
                                  <List
                                    size="small"
                                    dataSource={sources}
                                    renderItem={(item) => (
                                      <List.Item style={{ border: 0, padding: '4px 0', color: '#b5c4d8' }}>
                                        <FileText size={12} style={{ marginRight: '6px', display: 'inline-block', verticalAlign: 'middle' }} />
                                        {item.filename} {item.page ? `(Page ${item.page})` : '(Main text block)'}
                                      </List.Item>
                                    )}
                                  />
                                </div>
                              )}
                            </div>
                          )}

                          {!loadingAnswer && !answer && (
                            <Empty description={<span style={{ color: '#b5c4d8' }}>Query the RAG pipeline to retrieve contextual page answers.</span>} />
                          )}
                        </div>
                      )
                    },
                    {
                      key: 'narrator',
                      label: <span className={styles.tabLabel}><Volume2 size={14} /> Read Aloud</span>,
                      children: (
                        <div className={styles.tabContent}>
                          <div className={styles.narratorCard}>
                            {generatingSpeech ? (
                              <div style={{ textAlign: 'center', padding: '30px 0' }}>
                                <Spin size="medium" />
                                <div style={{ marginTop: '12px', color: '#b5c4d8', fontWeight: '500' }}>{speechStage}</div>
                              </div>
                            ) : audioUrl ? (
                              <div className={styles.audioPlayerWrapper}>
                                <AudioPlayer audioUrl={audioUrl} autoPlay={settings.autoPlay} text={activeTextToSpeak} />
                                <div style={{ marginTop: '20px', textAlign: 'center' }}>
                                  <Button 
                                    icon={<Download size={14} />} 
                                    type="default" 
                                    onClick={() => {
                                      const a = document.createElement('a');
                                      a.href = audioUrl;
                                      a.download = `vaani_doc_speech_${activeDoc.id}.mp3`;
                                      document.body.appendChild(a);
                                      a.click();
                                      document.body.removeChild(a);
                                    }}
                                  >
                                    Download Audio (.mp3)
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div style={{ textAlign: 'center', padding: '30px 0' }}>
                                <Button type="primary" icon={<Volume2 size={14} />} onClick={() => handleReadAloud(activeDoc)}>
                                  Synthesize Speech (Full Document)
                                </Button>
                                <div style={{ marginTop: '10px', color: '#b5c4d8', fontSize: '12px' }}>
                                  Generates audio using Chatterbox and enables download.
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    }
                  ]}
                />
              </Card>
            ) : (
              <Card className={styles.workspaceCard}>
                <div className={styles.selectDocPlaceholder}>
                  <FileText size={48} className={styles.selectDocIcon} />
                  <h3>Select a Document</h3>
                  <p>Choose an indexed document from the vault to perform summaries, RAG queries, or voice outputs.</p>
                </div>
              </Card>
            )}
          </motion.div>
        </Col>
      </Row>

      <UploadDialog
        visible={uploadVisible}
        onClose={() => setUploadVisible(false)}
        onUploadSuccess={fetchDocuments}
      />
    </div>
  );
}
