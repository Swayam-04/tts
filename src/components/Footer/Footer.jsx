import React from 'react';
import { FiLock, FiGlobe, FiCpu } from 'react-icons/fi';
import styles from './Footer.module.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className={styles.footer}>
      <div className={styles.securityItems}>
        <div className={styles.item}>
          <FiLock className={styles.icon} />
          <span>Offline Mode Enabled</span>
        </div>
        <div className={styles.dot} />
        <div className={styles.item}>
          <FiGlobe className={styles.icon} />
          <span>No Internet Connection Required</span>
        </div>
        <div className={styles.dot} />
        <div className={styles.item}>
          <FiCpu className={styles.icon} />
          <span>Built for Secure AI Processing</span>
        </div>
      </div>
      <div className={styles.copyright}>
        © {currentYear} Secure Text-to-Speech System. Local Deployment Only.
      </div>
    </footer>
  );
}
