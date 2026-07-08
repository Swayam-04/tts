import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Slider, Tooltip } from 'antd';
import { Play, Pause, Volume2, VolumeX, Download, RotateCcw } from 'lucide-react';
import { playAudio, downloadAudio as downloadAudioService } from '../../services/ttsService';
import styles from './AudioPlayer.module.css';

export default function AudioPlayer({ audioUrl, autoPlay, text }) {
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
      
      if (autoPlay) {
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

  const handleReplay = () => {
    if (!audioUrl || !audioRef.current) return;
    audioRef.current.currentTime = 0;
    playAudio(audioRef.current)
      .then(() => setIsPlaying(true))
      .catch(err => console.error("Error replaying audio:", err));
  };

  const handleSeek = (value) => {
    if (!audioUrl) return;
    audioRef.current.currentTime = value;
    setCurrentTime(value);
  };

  const handleVolumeChange = (value) => {
    setVolume(value);
    setIsMuted(value === 0);
    if (audioRef.current) {
      audioRef.current.volume = value / 100;
      audioRef.current.muted = value === 0;
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (audioRef.current) {
      audioRef.current.muted = nextMuted;
    }
  };

  const downloadAudio = () => {
    if (!audioUrl) return;
    downloadAudioService(audioUrl, `vaani_speech_${Date.now()}.mp3`);
  };

  const formatTime = (timeInSecs) => {
    if (isNaN(timeInSecs)) return '00:00';
    const mins = Math.floor(timeInSecs / 60);
    const secs = Math.floor(timeInSecs % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const waveBarsCount = 36;
  const renderWavebars = () => {
    const bars = [];
    for (let i = 0; i < waveBarsCount; i++) {
      bars.push(
        <div 
          key={i} 
          className={`wave-bar ${isPlaying ? 'active' : ''}`}
          style={{
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
      title={<span className="card-title">Acoustic Player Deck</span>}
      extra={
        <Tooltip title={isPlayerDisabled ? "No audio generated yet" : "Download MP3 file"}>
          <Button
            type="primary"
            icon={<Download size={14} />}
            disabled={isPlayerDisabled}
            onClick={downloadAudio}
            className={styles.downloadBtn}
          >
            Download MP3
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
        <div className={styles.playbackButtons}>
          <Button 
            type="primary" 
            shape="circle" 
            size="large"
            icon={isPlaying ? <Pause size={18} /> : <Play size={18} />}
            onClick={togglePlay}
            disabled={isPlayerDisabled}
            className={`${styles.playBtn} ${isPlaying ? styles.pulseBtn : ''}`}
          />
          <Tooltip title="Replay from start">
            <Button 
              type="default"
              shape="circle"
              icon={<RotateCcw size={16} />}
              onClick={handleReplay}
              disabled={isPlayerDisabled}
              className={styles.replayBtn}
            />
          </Tooltip>
        </div>
        
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
            icon={isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
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

      {text && (
        <div className={styles.speechTextContainer}>
          <div className={styles.speechTextHeader}>
            <span>Active Transcription</span>
            <span className={styles.speechTimer}>
              {isPlaying ? "Speaking..." : "Paused"} ({formatTime(currentTime)} / {formatTime(duration)})
            </span>
          </div>
          <div className={styles.speechTextContent}>
            {text}
          </div>
        </div>
      )}
    </Card>
  );
}
