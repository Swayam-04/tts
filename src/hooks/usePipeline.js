/**
 * VAANI AI - Custom Pipeline Orchestration Hook
 * Manages the 3-stage telemetry loading pipeline connecting to the local Flask backend.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { generateMissileReport, parseInputToMissileData } from '../services/api';
import { BASE_URL } from '../config/config';
import { getGenerationHistory, saveGenerationHistory } from '../services/ttsService';

export function usePipeline() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [stepStates, setStepStates] = useState(['pending', 'pending', 'pending']);
  
  const [decodedText, setDecodedText] = useState('');
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioStatus, setAudioStatus] = useState('Waiting');
  const [metrics, setMetrics] = useState(null);
  
  const [llmStatus, setLlmStatus] = useState('Ready');
  const [ttsStatus, setTtsStatus] = useState('Ready');
  
  const timerRef = useRef(null);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const clear = useCallback(() => {
    setDecodedText('');
    setAudioUrl(null);
    setAudioStatus('Waiting');
    setProgress(0);
    setElapsedTime(0);
    setStepStates(['pending', 'pending', 'pending']);
    setMetrics(null);
    setLlmStatus('Ready');
    setTtsStatus('Ready');
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const generate = useCallback(async (text, settings, onAudioGenerated) => {
    if (!text.trim() || isGenerating) return;

    // Validate fields before running the request
    const parsedData = parseInputToMissileData(text);
    if (!parsedData) {
      const valError = new Error("Invalid input format. Please supply a valid JSON payload or lines containing: Missile, Velocity (mv), Pitch (pv), and Launch Time.");
      throw valError;
    }

    // Reset state parameters
    setIsGenerating(true);
    setProgress(0);
    setElapsedTime(0);
    setAudioStatus('Processing');
    setLlmStatus('Processing');
    setTtsStatus('Ready');
    setAudioUrl(null);
    setDecodedText('');
    setMetrics(null);
    setStepStates(['active', 'pending', 'pending']);

    // Start high-precision elapsed timer
    const startTime = performance.now();
    timerRef.current = setInterval(() => {
      const elapsed = (performance.now() - startTime) / 1000;
      setElapsedTime(parseFloat(elapsed.toFixed(2)));
    }, 40);

    try {
      // Step 1: Connecting to Local Backend
      setStepStates(['active', 'pending', 'pending']);
      setProgress(25);
      
      // Step 2 & 3: Generating English Report & Waiting
      setStepStates(['completed', 'active', 'active']);
      setProgress(60);

      // Perform API call
      const response = await generateMissileReport(parsedData);
      
      console.log("Backend Response:", response);
      
      if (response?.error) {
        throw new Error(response.error);
      }
      
      if (!response?.generated_text || response.generated_text.length === 0) {
        throw new Error("No text generated.");
      }
      
      if (!response?.audio_file || response.audio_file.length === 0) {
        throw new Error("Speech generation failed.");
      }
      
      setProgress(100);

      // Stop elapsed stopwatch
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      setStepStates(['completed', 'completed', 'completed']);

      // Format audio URL if present
      let generatedAudioUrl = null;
      if (response?.audio_file) {
        const audioPath = response.audio_file;
        generatedAudioUrl = audioPath.startsWith('http') ? audioPath : `${BASE_URL}/${audioPath}`;
      }

      // Finish loop
      setIsGenerating(false);
      setDecodedText(response?.generated_text);
      setAudioUrl(generatedAudioUrl);
      setAudioStatus(response?.audio_file ? 'Ready' : 'Waiting');
      setLlmStatus('Ready');
      setTtsStatus('Ready');

      const finalTotalTime = parseFloat(((performance.now() - startTime) / 1000).toFixed(2));
      const tokenCount = Math.max(1, Math.ceil((response?.generated_text || "").length / 4));
      
      const combinedMetrics = {
        generatedTokens: tokenCount,
        audioDuration: response?.audio_duration || 0,
        voiceSelected: settings.voice || 'Default',
        processingTime: finalTotalTime
      };

      setMetrics(combinedMetrics);

      const textSnippet = (response?.generated_text && response.generated_text.length > 80)
        ? response.generated_text.substring(0, 80) + '...'
        : response?.generated_text;

      const finalizedClip = {
        id: `clip_${Date.now()}`,
        text: textSnippet,
        fullText: response?.generated_text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        audioUrl: generatedAudioUrl,
        metrics: combinedMetrics,
        settings: { ...settings }
      };

      // Push to session history
      const history = getGenerationHistory();
      history.unshift(finalizedClip);
      
      // NEW: Persist to localStorage
      saveGenerationHistory();

      if (onAudioGenerated) {
        onAudioGenerated(finalizedClip);
      }

      return {
        success: true,
        decodedText: response.generated_text,
        audioUrl: generatedAudioUrl,
        metrics: combinedMetrics
      };

    } catch (error) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setIsGenerating(false);
      setProgress(0);
      setAudioStatus('Waiting');
      setLlmStatus('Ready');
      setTtsStatus('Ready');
      setStepStates(['pending', 'pending', 'pending']);
      throw error;
    }
  }, [isGenerating]);

  return {
    isGenerating,
    progress,
    elapsedTime,
    stepStates,
    decodedText,
    audioUrl,
    audioStatus,
    metrics,
    llmStatus,
    ttsStatus,
    generate,
    clear
  };
}
