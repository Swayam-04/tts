import React, { useState, useEffect } from 'react';
import { Card, Button, Row, Col, Input, List, Spin, Empty, Modal, Tabs, Progress, notification } from 'antd';
import { FiUpload, FiSearch, FiFileText, FiActivity, FiVolume2, FiTrash2, FiPlay, FiDownload } from 'react-icons/fi';
import UploadDialog from '../components/UploadDialog/UploadDialog';
import DocumentCard from '../components/DocumentCard/DocumentCard';
import AudioPlayer from '../components/AudioPlayer/AudioPlayer';
import { BASE_URL } from '../config/config';
import styles from './Documents.module.css';

const { Search } = Input;

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
          document_id: activeDoc ? activeDoc.id : null // searches specific or all
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
    try {
      const res = await fetch("http://127.0.0.1:5000/read-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_id: doc.id,
          read_type: "full"
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.audio_file) {
          const generatedUrl = data.audio_file.startsWith('http') 
            ? data.audio_file 
            : `${BASE_URL}${data.audio_file}`;
          setAudioUrl(generatedUrl);
          notification.success({
            message: 'TTS Synthesized',
            description: 'Document has been successfully synthesized.',
          });
        }
      }
    } catch (err) {
      notification.error({
        message: 'TTS Failure',
        description: 'Failed to read document aloud.',
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
          <Card
            className={styles.sidebarCard}
            title={
              <div className={styles.sidebarHeader}>
                <span className="card-title">Document Vault</span>
                <Button 
                  type="primary" 
                  icon={<FiUpload />} 
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
                  <span style={{ color: '#8b949e' }}>
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
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Col>

        {/* Right column: Workspace */}
        <Col xs={24} lg={14}>
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
                items={[
                  {
                    key: 'summary',
                    label: <span><FiActivity /> Summary</span>,
                    children: (
                      <div className={styles.tabContent}>
                        {loadingSummary ? (
                          <div style={{ textAlign: 'center', padding: '30px 0' }}>
                            <Spin size="medium" />
                            <div style={{ marginTop: '12px', color: '#8b949e' }}>Summarizing document with local LLM...</div>
                          </div>
                        ) : summary ? (
                          <div className={styles.summaryText}>
                            {summary}
                          </div>
                        ) : (
                          <div className={styles.placeholderTab}>
                            <Button type="primary" onClick={() => handleSummarize(activeDoc)}>
                              Generate Auto-Summary
                            </Button>
                          </div>
                        )}
                      </div>
                    )
                  },
                  {
                    key: 'rag',
                    label: <span><FiSearch /> Ask Document</span>,
                    children: (
                      <div className={styles.tabContent}>
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                          <Input
                            placeholder="Ask any question about this document (e.g. 'What is Section 4?')..."
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            onPressEnter={handleAskQuestion}
                            style={{ background: '#0e1626', color: '#f0f6fc', border: '1px solid #162238' }}
                          />
                          <Button type="primary" onClick={handleAskQuestion} loading={loadingAnswer}>
                            Query
                          </Button>
                        </div>

                        {loadingAnswer && (
                          <div style={{ textAlign: 'center', padding: '30px 0' }}>
                            <Spin size="medium" />
                            <div style={{ marginTop: '12px', color: '#8b949e' }}>Running local vector similarity search and LLM processing...</div>
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
                                    <List.Item style={{ border: 0, padding: '4px 0', color: '#8b949e' }}>
                                      <FiFileText style={{ marginRight: '6px' }} />
                                      {item.filename} {item.page ? `(Page ${item.page})` : '(Main text block)'}
                                    </List.Item>
                                  )}
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {!loadingAnswer && !answer && (
                          <Empty description={<span style={{ color: '#8b949e' }}>Query the RAG pipeline to retrieve contextual page answers.</span>} />
                        )}
                      </div>
                    )
                  },
                  {
                    key: 'narrator',
                    label: <span><FiVolume2 /> Read Aloud</span>,
                    children: (
                      <div className={styles.tabContent}>
                        <div className={styles.narratorCard}>
                          {generatingSpeech ? (
                            <div style={{ textAlign: 'center', padding: '30px 0' }}>
                              <Spin size="medium" />
                              <div style={{ marginTop: '12px', color: '#8b949e' }}>Synthesizing speech via local Chatterbox model...</div>
                            </div>
                          ) : audioUrl ? (
                            <div className={styles.audioPlayerWrapper}>
                              <AudioPlayer audioUrl={audioUrl} autoPlay={settings.autoPlay} />
                              <div style={{ marginTop: '20px', textAlign: 'center' }}>
                                <Button 
                                  icon={<FiDownload />} 
                                  type="default" 
                                  onClick={() => {
                                    const a = document.createElement('a');
                                    a.href = audioUrl;
                                    a.download = `vaani_doc_speech_${activeDoc.id}.wav`;
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                  }}
                                >
                                  Download Audio (.wav)
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ textAlign: 'center', padding: '30px 0' }}>
                              <Button type="primary" onClick={() => handleReadAloud(activeDoc)}>
                                Synthesize Speech (Full Document)
                              </Button>
                              <div style={{ marginTop: '10px', color: '#8b949e', fontSize: '12px' }}>
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
              <Empty 
                description={
                  <span style={{ color: '#8b949e' }}>
                    Select a document from the vault to summarize, explain, query, or generate voice files.
                  </span>
                } 
              />
            </Card>
          )}
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
