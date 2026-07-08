import React, { useState, useEffect } from 'react';
import { Button, Tooltip, Badge, Avatar } from 'antd';
import { Shield, Settings, Menu, Bell, Cpu, Wifi, WifiOff } from 'lucide-react';
import styles from './Header.module.css';

export default function Header({ onOpenSettings, collapsed, onToggleSidebar, backendOnline }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <Button 
          type="text" 
          icon={<Menu className={styles.menuIcon} size={18} />} 
          onClick={onToggleSidebar}
          className={styles.toggleBtn}
          title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        />
        <div className={styles.iconContainer}>
          <Shield className={styles.shieldIcon} size={18} />
        </div>
        <div className={styles.brand}>
          <h1 className={styles.title}>VAANI</h1>
          <p className={styles.subtitle}>SECURE SPEECH INTELLIGENCE PLATFORM</p>
        </div>
      </div>
      
      <div className={styles.right}>
        {/* Model Spec Badge */}
        <div className={styles.metaBadge}>
          <Cpu size={14} className={styles.metaIcon} />
          <span className={styles.metaText}>Ollama: Gemma 4</span>
        </div>

        {/* Live System Time */}
        <div className={styles.timeDisplay}>
          {formatTime(time)}
        </div>

        {/* Network Status Pill */}
        <Tooltip 
          title={backendOnline ? "Flask integration server is online on http://127.0.0.1:5000. System operating securely offline." : "Cannot connect to Flask backend. Please start the backend service."} 
          placement="bottom"
        >
          <div className={`${styles.statusPill} ${backendOnline ? styles.online : styles.offline}`}>
            {backendOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span className={styles.statusText}>{backendOnline ? "Secure Offline Mode" : "Connection Offline"}</span>
          </div>
        </Tooltip>

        {/* Notifications Mock */}
        <Badge count={2} size="small" offset={[-2, 6]}>
          <Button 
            type="text" 
            icon={<Bell size={18} />} 
            className={styles.actionBtn}
            title="System alerts"
          />
        </Badge>
        
        {/* Settings button */}
        <Button 
          type="text" 
          icon={<Settings size={18} />} 
          onClick={onOpenSettings}
          className={styles.actionBtn}
          title="Open Settings"
        />

        {/* User Avatar */}
        <Avatar 
          style={{ backgroundColor: '#2E8BFF', verticalAlign: 'middle', cursor: 'pointer' }}
          size="medium"
        >
          DRDO
        </Avatar>
      </div>
    </header>
  );
}
