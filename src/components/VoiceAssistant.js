import React, { useState, useEffect, useRef } from 'react';
import voiceAssistantService from '../services/voiceAssistantService';
import './VoiceAssistant.css';

const VoiceAssistant = ({ agentConfig, userContext, isEnabled }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const [messages, setMessages] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [isMobileRecording, setIsMobileRecording] = useState(false);
  const messagesEndRef = useRef(null);
  const isInitializedRef = useRef(false);
  const currentAgentRef = useRef(null);
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Enable TTS on first user interaction
  const enableTTS = () => {
    console.log('🎙️ User clicked to enable TTS');
    voiceAssistantService.enableTTS();
    setTtsEnabled(true);
  };

  // Mobile: Toggle microphone on/off
  const toggleMobileMic = () => {
    if (isMobileRecording) {
      // Stop recording
      console.log('📱 Mobile: Stopping recording');
      voiceAssistantService.stopMobileRecording();
      setIsMobileRecording(false);
      setIsListening(false);
    } else {
      // Start recording
      console.log('📱 Mobile: Starting recording');
      voiceAssistantService.startMobileRecording();
      setIsMobileRecording(true);
      setIsListening(true);
      enableTTS(); // Enable TTS on first interaction
    }
  };

  useEffect(() => {
    if (!agentConfig || !isEnabled) return;

    // Check if agent changed - reinitialize if different
    const agentChanged = currentAgentRef.current && 
                         currentAgentRef.current.id !== agentConfig.id;
    
    if (agentChanged) {
      console.log('Agent changed, reinitializing...');
      voiceAssistantService.stop();
      isInitializedRef.current = false;
      setMessages([]);
    }

    if (isInitializedRef.current && !agentChanged) return;

    const initializeAssistant = async () => {
      try {
        // Mark as initialized to prevent multiple calls
        isInitializedRef.current = true;
        currentAgentRef.current = agentConfig;
        
        console.log('Initializing voice assistant with agent:', agentConfig.name);

        // Initialize voice assistant service
        await voiceAssistantService.initialize(agentConfig, userContext);

        // Set callbacks
        voiceAssistantService.setTranscriptCallback((transcript, isFinal) => {
          if (isFinal) {
            setCurrentTranscript('');
            setMessages(prev => [...prev, {
              type: 'user',
              text: transcript,
              timestamp: new Date()
            }]);
            setIsVisible(true);
            setIsMinimized(false);
            setIsProcessing(true);
          } else {
            setCurrentTranscript(transcript);
          }
        });

        voiceAssistantService.setResponseCallback((response) => {
          setMessages(prev => [...prev, {
            type: 'assistant',
            text: response.message,
            timestamp: new Date(),
            data: response.data
          }]);
          setIsProcessing(false);
          
          // On mobile, auto-stop recording after response
          if (isMobile && isMobileRecording) {
            setTimeout(() => {
              voiceAssistantService.stopMobileRecording();
              setIsMobileRecording(false);
              setIsListening(false);
            }, 500);
          }
        });

        // Start listening (desktop only - mobile uses push-to-talk)
        if (!isMobile) {
          voiceAssistantService.start();
          setIsListening(true);
        }

        console.log('Voice assistant initialized');
      } catch (error) {
        console.error('Failed to initialize voice assistant:', error);
      }
    };

    initializeAssistant();

    return () => {
      console.log('Cleanup: stopping voice assistant');
      isInitializedRef.current = false;
      voiceAssistantService.stop();
      setIsMobileRecording(false);
    };
  }, [agentConfig, isEnabled, isMobile]);

  // Update user context when it changes WITHOUT restarting
  useEffect(() => {
    if (voiceAssistantService && userContext && isInitializedRef.current) {
      console.log('Updating user context (no restart)');
      voiceAssistantService.updateUserContext(userContext);
    }
  }, [userContext]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const closeAssistant = () => {
    setIsVisible(false);
    setIsMinimized(true);
  };

  const clearChat = () => {
    setMessages([]);
    voiceAssistantService.clearConversation();
  };

  if (!agentConfig || !isEnabled) {
    return null;
  }

  return (
    <>
      {/* Mobile Microphone Button */}
      {isMobile && (
        <div className="mobile-mic-container">
          <button 
            className={`mobile-mic-btn ${isMobileRecording ? 'recording' : ''}`}
            onClick={toggleMobileMic}
            aria-label={isMobileRecording ? 'Stop recording' : 'Start recording'}
          >
            {isMobileRecording ? (
              <>
                <span className="mic-icon recording">🎤</span>
                <span className="recording-pulse"></span>
              </>
            ) : (
              <span className="mic-icon">🎤</span>
            )}
          </button>
          {isMobileRecording && (
            <div className="recording-status">Recording... Speak now</div>
          )}
        </div>
      )}

      {/* Wake Word Indicator (Desktop only) */}
      {!isMobile && isListening && !isVisible && (
        <div className="voice-indicator" onClick={enableTTS}>
          <div className="voice-indicator-pulse"></div>
          <span className="voice-indicator-text">
            {agentConfig.avatar} Say "{agentConfig.name}" to activate
            {!ttsEnabled && <span className="tts-hint"> (Click to enable voice)</span>}
          </span>
        </div>
      )}

      {/* Voice Assistant Popup */}
      {isVisible && (
        <div className={`voice-assistant-popup ${isMinimized ? 'minimized' : ''}`}>
          {/* Header */}
          <div className="voice-assistant-header">
            <div className="assistant-info">
              <span className="assistant-avatar">{agentConfig.avatar}</span>
              <div className="assistant-details">
                <span className="assistant-name">{agentConfig.name}</span>
                {isListening && (
                  <span className="assistant-status">
                    <span className="status-indicator"></span>
                    Listening...
                  </span>
                )}
              </div>
            </div>
            <div className="assistant-controls">
              <button 
                className="control-btn"
                onClick={toggleMinimize}
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                {isMinimized ? '▲' : '▼'}
              </button>
              <button 
                className="control-btn"
                onClick={closeAssistant}
                title="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Chat Messages */}
          {!isMinimized && (
            <div className="voice-assistant-content">
              <div className="messages-container">
                {messages.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">{agentConfig.avatar}</div>
                    <p>Say "{agentConfig.name}" followed by your command</p>
                    <div className="example-commands">
                      <p className="example-title">Try saying:</p>
                      <ul>
                        <li>"{agentConfig.name}, I ate chicken and rice"</li>
                        <li>"{agentConfig.name}, how many calories today?"</li>
                        <li>"{agentConfig.name}, I did 50 push-ups"</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((message, index) => (
                      <div 
                        key={index} 
                        className={`message ${message.type}`}
                      >
                        <div className="message-avatar">
                          {message.type === 'user' ? '👤' : agentConfig.avatar}
                        </div>
                        <div className="message-content">
                          <div className="message-text">{message.text}</div>
                          <div className="message-time">
                            {message.timestamp.toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Current transcript while speaking */}
                    {currentTranscript && (
                      <div className="message user interim">
                        <div className="message-avatar">👤</div>
                        <div className="message-content">
                          <div className="message-text">{currentTranscript}</div>
                        </div>
                      </div>
                    )}

                    {/* Processing indicator */}
                    {isProcessing && (
                      <div className="message assistant">
                        <div className="message-avatar">{agentConfig.avatar}</div>
                        <div className="message-content">
                          <div className="typing-indicator">
                            <span></span>
                            <span></span>
                            <span></span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Footer Actions */}
              {messages.length > 0 && (
                <div className="voice-assistant-footer">
                  <button 
                    className="clear-chat-btn"
                    onClick={clearChat}
                  >
                    Clear Chat
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default VoiceAssistant;
