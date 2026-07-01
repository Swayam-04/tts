import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Slider, Space, Tooltip } from 'antd';
import { FiPlay, FiPause, FiVolume2, FiVolumeX, FiDownload } from 'react-icons/fi';
import { playAudio, downloadAudio as downloadAudioService } from '../../services/ttsService';
import styles from './AudioPlayer.module.css';

export default function AudioPlayer({ audioUrl, autoPlay }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef(null);

  // Initialize Audio
  useEffect(() => {
    audioRef.current = new Audio();
    
    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  // Update audio source when audioUrl changes
  useEffect(() => {
    if (audioRef.current && audioUrl) {
      audioRef.current.src = audioUrl;
      audioRef.current.load();
      setCurrentTime(0);
      setIsPlaying(false);
      
      // Auto-play support
      if (autoPlay) {
        // Use a short timeout to let the UI register the load
        setTimeout(() => {
          playAudio(audioRef.current)
            .then(() => setIsPlaying(true))
            .catch(err => console.log("Autoplay blocked by browser policy:", err));
        }, 150);
      }
    } else if (audioRef.current) {
      audioRef.current.src = '';
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    }
  }, [audioUrl, autoPlay]);

  // Handle Play/Pause
  const togglePlay = () => {
    if (!audioUrl) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      playAudio(audioRef.current)
        .then(() => setIsPlaying(true))
        .catch(err => console.error("Error playing audio:", err));
    }
  };

  // Handle Seek
  const handleSeek = (value) => {
    if (!audioUrl) return;
    audioRef.current.currentTime = value;
    setCurrentTime(value);
  };

  // Handle Volume Change
  const handleVolumeChange = (value) => {
    setVolume(value);
    setIsMuted(value === 0);
    if (audioRef.current) {
      audioRef.current.volume = value / 100;
      audioRef.current.muted = value === 0;
    }
  };

  // Toggle Mute
  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (audioRef.current) {
      audioRef.current.muted = nextMuted;
    }
  };

  // Download Audio
  const downloadAudio = () => {
    if (!audioUrl) return;
    downloadAudioService(audioUrl, `vaani_speech_${Date.now()}.wav`);
  };

  // Format time (MM:SS)
  const formatTime = (timeInSecs) => {
    if (isNaN(timeInSecs)) return '00:00';
    const mins = Math.floor(timeInSecs / 60);
    const secs = Math.floor(timeInSecs % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Generate mock waves for visualizer
  const waveBarsCount = 28;
  const renderWavebars = () => {
    const bars = [];
    for (let i = 0; i < waveBarsCount; i++) {
      bars.push(
        <div 
          key={i} 
          className={`wave-bar ${isPlaying ? 'active' : ''}`}
          style={{
            // Add custom heights for inactive state so it looks like a sound wave
            height: isPlaying ? undefined : `${4 + Math.sin(i * 0.4) * 12 + Math.cos(i * 0.2) * 8}px`
          }}
        />
      );
    }
    return bars;
  };

  const isPlayerDisabled = !audioUrl;

  return (
    <Card 
      className={styles.card}
      title={
        <div>
          <div className="card-title">Generated Audio</div>
        </div>
      }
      extra={
        <Tooltip title={isPlayerDisabled ? "No audio generated yet" : "Download WAV file"}>
          <Button
            type="primary"
            icon={<FiDownload />}
            disabled={isPlayerDisabled}
            onClick={downloadAudio}
            className={styles.downloadBtn}
          >
            Download
          </Button>
        </Tooltip>
      }
    >
      <div className={styles.visualizer}>
        <div className="waveform-container">
          {renderWavebars()}
        </div>
      </div>
      
      <div className={styles.controlsRow}>
        <Button 
          type="primary" 
          shape="circle" 
          size="large"
          icon={isPlaying ? <FiPause /> : <FiPlay />}
          onClick={togglePlay}
          disabled={isPlayerDisabled}
          className={`${styles.playBtn} ${isPlaying ? styles.pulseBtn : ''}`}
        />
        
        <div className={styles.sliderContainer}>
          <div className={styles.timeLabel}>{formatTime(currentTime)}</div>
          <Slider
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            disabled={isPlayerDisabled}
            tooltip={{ formatter: formatTime }}
            className={styles.slider}
          />
          <div className={styles.timeLabel}>{formatTime(duration)}</div>
        </div>
        
        <div className={styles.volumeContainer}>
          <Button 
            type="text" 
            icon={isMuted ? <FiVolumeX /> : <FiVolume2 />}
            onClick={toggleMute}
            disabled={isPlayerDisabled}
            className={styles.volumeBtn}
          />
          <Slider
            min={0}
            max={100}
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            disabled={isPlayerDisabled}
            className={styles.volumeSlider}
          />
        </div>
      </div>
    </Card>
  );
}
