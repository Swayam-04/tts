import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider, Layout, theme } from 'antd';
import Header from './components/Header/Header';
import Sidebar from './components/Sidebar/Sidebar';
import StatusPanel from './components/StatusPanel/StatusPanel';
import SettingsDrawer from './components/SettingsDrawer/SettingsDrawer';
import Dashboard from './pages/Dashboard';
import Generator from './pages/Generator';
import AudioOutput from './pages/AudioOutput';
import Settings from './pages/Settings';
import About from './pages/About';
import History from './pages/History';
import Documents from './pages/Documents';
import { usePipeline } from './hooks/usePipeline';

const { Content } = Layout;

function AppContent() {
  const [collapsed, setCollapsed] = useState(false);
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false);
  
  // Local Text Buffer state
  const [text, setText] = useState('');
  const [historyTrigger, setHistoryTrigger] = useState(0);

  // Backend online state checks
  const [backendOnline, setBackendOnline] = useState(false);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch("http://127.0.0.1:5000/health");
        if (res.ok) {
          const data = await res.json();
          if (data.status === "online") {
            setBackendOnline(true);
            return;
          }
        }
        setBackendOnline(false);
      } catch (err) {
        setBackendOnline(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  // Instantiating Pipeline Orchestration Hook
  const pipeline = usePipeline();

  // System Configurations with Memory & RAG additions
  const [settings, setSettings] = useState({
    voice: 'default',
    language: 'en',
    speed: 1.0,
    volume: 80,
    autoPlay: true,
    darkTheme: true,
    memoryEnabled: true,
    contextWindow: 10,
    chunkSize: 500,
    chunkOverlap: 100,
    preferredModel: 'gemma4'
  });

  // Pull settings from SQLite when backend becomes online
  useEffect(() => {
    if (!backendOnline) return;
    const fetchPrefs = async () => {
      try {
        const res = await fetch("http://127.0.0.1:5000/preferences?user_id=default");
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.preferences) {
            const p = data.preferences;
            setSettings(prev => ({
              ...prev,
              voice: p.preferred_voice || prev.voice,
              language: p.language || prev.language,
              speed: p.speech_speed || prev.speed,
              memoryEnabled: p.memory_enabled === 1,
              contextWindow: p.context_window || prev.contextWindow,
              chunkSize: p.chunk_size || prev.chunkSize,
              chunkOverlap: p.chunk_overlap || prev.chunkOverlap,
              preferredModel: p.preferred_model || prev.preferredModel
            }));
          }
        }
      } catch (err) {
        console.error("Preferences load failed:", err);
      }
    };
    fetchPrefs();
  }, [backendOnline]);

  const handleUpdateSetting = (key, value) => {
    setSettings((prev) => {
      const updated = { ...prev, [key]: value };
      
      // Save updated preferences to local SQLite db
      if (backendOnline) {
        const payload = {
          user_id: "default",
          preferred_voice: updated.voice,
          language: updated.language,
          speech_speed: updated.speed,
          theme: updated.darkTheme ? 'dark' : 'light',
          memory_enabled: updated.memoryEnabled ? 1 : 0,
          context_window: updated.contextWindow,
          chunk_size: updated.chunkSize,
          chunk_overlap: updated.chunkOverlap,
          preferred_model: updated.preferredModel
        };
        fetch("http://127.0.0.1:5000/preferences", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }).catch(err => console.error("Failed to sync preferences:", err));
      }
      return updated;
    });
  };

  const handleAudioGenerated = (clip) => {
    // Force refresh history log views
    setHistoryTrigger(prev => prev + 1);
  };

  return (
    <div className="app-container">
      <Header 
        collapsed={collapsed}
        onToggleSidebar={() => setCollapsed(!collapsed)}
        onOpenSettings={() => setSettingsDrawerOpen(true)}
        backendOnline={backendOnline}
      />
      
      <Layout style={{ minHeight: 'calc(100vh - 64px)', flexDirection: 'row', background: 'transparent' }}>
        <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />
        
        <Layout style={{ flexDirection: 'row', background: 'transparent' }} className="workspace-layout">
          <Content className="main-workspace-wrapper">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route 
                path="/generator" 
                element={
                  <Generator 
                    text={text}
                    setText={setText}
                    pipeline={pipeline}
                    settings={settings}
                    onAudioGenerated={handleAudioGenerated}
                    backendOnline={backendOnline}
                  />
                } 
              />
              <Route 
                path="/audio" 
                element={<AudioOutput settings={settings} key={historyTrigger} />} 
              />
              <Route 
                path="/history" 
                element={<History settings={settings} backendOnline={backendOnline} onAudioGenerated={handleAudioGenerated} />} 
              />
              <Route 
                path="/documents" 
                element={<Documents settings={settings} backendOnline={backendOnline} />} 
              />
              <Route 
                path="/settings" 
                element={<Settings settings={settings} onUpdateSetting={handleUpdateSetting} />} 
              />
              <Route path="/about" element={<About />} />
            </Routes>
          </Content>
          
          <div className="status-panel-wrapper">
            <StatusPanel 
              isGenerating={pipeline.isGenerating}
              progress={pipeline.progress}
              audioStatus={pipeline.audioStatus}
              llmStatus={pipeline.llmStatus}
              ttsStatus={pipeline.ttsStatus}
            />
          </div>
        </Layout>
      </Layout>
      
      <SettingsDrawer 
        visible={settingsDrawerOpen}
        onClose={() => setSettingsDrawerOpen(false)}
        settings={settings}
        onUpdateSetting={handleUpdateSetting}
      />
    </div>
  );
}

export default function App() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#1e88e5',
          colorPrimaryHover: '#1565c0',
          colorBgContainer: '#0e1626',
          colorBgElevated: '#141f35',
          colorBorder: '#162238',
          colorText: '#f0f6fc',
          colorTextDescription: '#8b949e',
          colorTextHeading: '#f0f6fc',
          borderRadius: 8,
        },
        components: {
          Card: {
            headerBg: '#061830',
          },
          Progress: {
            remainingColor: 'rgba(255, 255, 255, 0.05)',
          },
          Slider: {
            trackBg: '#1e88e5',
            trackHoverBg: '#1e88e5',
            handleColor: '#1e88e5',
            handleActiveColor: '#1e88e5',
          },
        },
      }}
    >
      <Router>
        <AppContent />
      </Router>
    </ConfigProvider>
  );
}
