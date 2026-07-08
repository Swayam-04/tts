import React from 'react';
import { Layout, Menu } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiHome, FiEdit, FiVolume2, FiSettings, FiInfo, FiMessageSquare, FiFileText } from 'react-icons/fi';
import styles from './Sidebar.module.css';

const { Sider } = Layout;

export default function Sidebar({ collapsed, onCollapse }) {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      key: '/',
      icon: <FiHome className={styles.icon} />,
      label: 'Dashboard',
    },
    {
      key: '/generator',
      icon: <FiEdit className={styles.icon} />,
      label: 'Text Generator',
    },
    {
      key: '/history',
      icon: <FiMessageSquare className={styles.icon} />,
      label: 'Chat History',
    },
    {
      key: '/documents',
      icon: <FiFileText className={styles.icon} />,
      label: 'Documents',
    },
    {
      key: '/audio',
      icon: <FiVolume2 className={styles.icon} />,
      label: 'Audio Output',
    },
    {
      key: '/settings',
      icon: <FiSettings className={styles.icon} />,
      label: 'Settings',
    },
    {
      key: '/about',
      icon: <FiInfo className={styles.icon} />,
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
      width={240}
      collapsedWidth={80}
      className={styles.sider}
      trigger={null} // We will use a header button or default trigger
    >
      <div className={styles.logoContainer}>
        <div className={styles.logoBadge}>V</div>
        {!collapsed && (
          <div className={styles.logoText}>
            <div className={styles.logoTitle}>VAANI AI</div>
            <div className={styles.logoSubtitle}>SECURE PLATFORM</div>
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
    </Sider>
  );
}
