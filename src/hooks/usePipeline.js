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
  
  // Real-time stage timers and current task string description
  const [stageTimers, setStageTimers] = useState({ query: 0, llm: 0, tts: 0 });
  const [currentTask, setCurrentTask] = useState('Idle');
  
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
    setStageTimers({ query: 0, llm: 0, tts: 0 });
    setCurrentTask('Idle');
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
    setStageTimers({ query: 0, llm: 0, tts: 0 });
    setCurrentTask('Receiving Prompt...');

    // Start high-precision elapsed timer and simulated progress indicators
    const startTime = performance.now();
    let currentStage = 0; // 0: query, 1: llm, 2: tts
    let queryElapsed = 0;
    let llmElapsed = 0;
    let ttsElapsed = 0;

    timerRef.current = setInterval(() => {
      const elapsed = (performance.now() - startTime) / 1000;
      setElapsedTime(elapsed);

      if (currentStage === 0) {
        queryElapsed += 0.05;
        setStageTimers(prev => ({ ...prev, query: parseFloat(queryElapsed.toFixed(2)) }));
        setProgress(prev => Math.min(18, prev + 2));
        if (queryElapsed >= 0.3) {
          currentStage = 1;
          setStepStates(['completed', 'active', 'pending']);
          setCurrentTask('Generating Response...');
        }
      } else if (currentStage === 1) {
        llmElapsed += 0.05;
        setStageTimers(prev => ({ ...prev, llm: parseFloat(llmElapsed.toFixed(2)) }));
        setProgress(prev => Math.min(48, prev + 1));
        if (llmElapsed >= 2.0) {
          setCurrentTask('Structuring Output...');
        }
        if (llmElapsed >= 3.2) {
          currentStage = 2;
          setStepStates(['completed', 'completed', 'active']);
          setCurrentTask('Preparing Speech...');
        }
      } else if (currentStage === 2) {
        ttsElapsed += 0.05;
        setStageTimers(prev => ({ ...prev, tts: parseFloat(ttsElapsed.toFixed(2)) }));
        setProgress(prev => Math.min(94, prev + 0.5));
        if (ttsElapsed >= 1.5 && ttsElapsed < 3.8) {
          setCurrentTask('Synthesizing Voice...');
        } else if (ttsElapsed >= 3.8) {
          setCurrentTask('Encoding MP3...');
        }
      }
    }, 50);

    try {
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
      
      // Stop elapsed stopwatch
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      const finalTotalTime = parseFloat(((performance.now() - startTime) / 1000).toFixed(2));
      
      // Parse exact timings from backend (use real backend values)
      const backendResponseTime = response?.response_time || response?.latencies?.total || finalTotalTime;
      const llmTime = response?.latencies?.ollama || 0;
      const ttsTime = response?.latencies?.chatterbox || 0;
      const encodingTime = response?.latencies?.encoding || 0;
      const queryTime = parseFloat(Math.max(0.05, backendResponseTime - (llmTime + ttsTime)).toFixed(2));

      setStageTimers({
        query: queryTime,
        llm: llmTime,
        tts: ttsTime
      });

      setStepStates(['completed', 'completed', 'completed']);
      setProgress(100);
      setCurrentTask('Completed');
      setElapsedTime(finalTotalTime);

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

      const tokenCount = Math.max(1, Math.ceil((response?.generated_text || "").length / 4));
      
      const combinedMetrics = {
        generatedTokens: tokenCount,
        audioDuration: response?.audio_duration || 0,
        voiceSelected: settings.voice || 'Default',
        processingTime: finalTotalTime,
        responseTime: backendResponseTime,
        llmTime: llmTime,
        ttsTime: ttsTime,
        encodingTime: encodingTime,
        queryTime: queryTime
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
      setCurrentTask('Idle');
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
    stageTimers,
    currentTask,
    generate,
    clear
  };
}
