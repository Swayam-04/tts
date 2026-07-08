import React, { useState, useEffect } from 'react';
import { Layout, Menu, Progress } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Terminal, 
  MessageSquareCode, 
  FolderArchive, 
  FileAudio, 
  Settings, 
  HelpCircle,
  HardDrive,
  Cpu,
  ShieldCheck
} from 'lucide-react';
import styles from './Sidebar.module.css';

const { Sider } = Layout;

export default function Sidebar({ collapsed, onCollapse }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [storageUsed, setStorageUsed] = useState(38); // Mock active storage calculation
  const [statusOnline, setStatusOnline] = useState(true);

  // Check backend status briefly on load
  useEffect(() => {
    fetch("http://127.0.0.1:5000/health")
      .then(res => res.json())
      .then(data => setStatusOnline(data.success || data.status === 'UP'))
      .catch(() => setStatusOnline(false));
  }, []);

  const menuItems = [
    {
      key: '/',
      icon: <LayoutDashboard size={18} />,
      label: 'Security Dashboard',
    },
    {
      key: '/generator',
      icon: <Terminal size={18} />,
      label: 'Speech Generator',
    },
    {
      key: '/history',
      icon: <MessageSquareCode size={18} />,
      label: 'Secure Chats',
    },
    {
      key: '/documents',
      icon: <FolderArchive size={18} />,
      label: 'Document Vault',
    },
    {
      key: '/audio',
      icon: <FileAudio size={18} />,
      label: 'Audio Outputs',
    },
    {
      key: '/settings',
      icon: <Settings size={18} />,
      label: 'System Parameters',
    },
    {
      key: '/about',
      icon: <HelpCircle size={18} />,
      label: 'About Platform',
    },
  ];

  const handleMenuClick = (info) => {
    navigate(info.key);
  };

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      width={260}
      collapsedWidth={80}
      className={styles.sider}
      trigger={null}
    >
      <div className={styles.logoContainer}>
        <div className={styles.logoBadge}>
          <ShieldCheck size={18} />
        </div>
        {!collapsed && (
          <div className={styles.logoText}>
            <div className={styles.logoTitle}>VAANI</div>
            <div className={styles.logoSubtitle}>INTELLIGENCE ENGINE</div>
          </div>
        )}
      </div>

      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={handleMenuClick}
        className={styles.menu}
      />

      {/* Sidebar Footer System Brief */}
      <div className={styles.footerSection}>
        {collapsed ? (
          <div className={styles.collapsedFooterIcon} title="Platform Status: Active">
            <Cpu size={16} style={{ color: statusOnline ? '#31D17B' : '#FF5E5E' }} />
          </div>
        ) : (
          <div className={styles.footerInner}>
            <div className={styles.divider} />
            
            {/* Storage Progress Widget */}
            <div className={styles.footerWidget}>
              <div className={styles.widgetHeader}>
                <span className={styles.widgetLabel}>
                  <HardDrive size={12} className={styles.widgetIcon} /> Storage Used
                </span>
                <span className={styles.widgetValue}>{storageUsed}%</span>
              </div>
              <Progress 
                percent={storageUsed} 
                size="small" 
                showInfo={false} 
                strokeColor="#2E8BFF"
                trailColor="rgba(255,255,255,0.05)"
                className={styles.widgetProgress}
              />
            </div>

            {/* Platform spec details */}
            <div className={styles.sysBriefGrid}>
              <div className={styles.sysBriefItem}>
                <span className={styles.sysBriefLabel}>Engine</span>
                <span className={styles.sysBriefValue}>Gemma 4</span>
              </div>
              <div className={styles.sysBriefItem}>
                <span className={styles.sysBriefLabel}>Version</span>
                <span className={styles.sysBriefValue}>v1.2.0</span>
              </div>
              <div className={styles.sysBriefItem}>
                <span className={styles.sysBriefLabel}>Platform</span>
                <span className={styles.sysBriefValue} style={{ color: statusOnline ? '#31D17B' : '#FF5E5E' }}>
                  {statusOnline ? 'Secure Link' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Sider>
  );
}
