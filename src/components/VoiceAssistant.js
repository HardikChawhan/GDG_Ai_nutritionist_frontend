import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, X, Minimize2, Maximize2, Volume2, User, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import voiceAssistantService from '../services/voiceAssistantService';
import { cn } from '../utils/cn';

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
  const chatContainerRef = useRef(null);
  
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  const enableTTS = () => {
    voiceAssistantService.enableTTS();
    setTtsEnabled(true);
  };

  const toggleMobileMic = () => {
    if (isMobileRecording) {
      voiceAssistantService.stopMobileRecording();
      setIsMobileRecording(false);
      setIsListening(false);
    } else {
      voiceAssistantService.startMobileRecording();
      setIsMobileRecording(true);
      setIsListening(true);
      enableTTS();
    }
  };

  useEffect(() => {
    if (!agentConfig || !isEnabled) return;

    const agentChanged = currentAgentRef.current && currentAgentRef.current.id !== agentConfig.id;
    
    if (agentChanged) {
      voiceAssistantService.stop();
      isInitializedRef.current = false;
      setMessages([]);
    }

    if (isInitializedRef.current && !agentChanged) return;

    const initializeAssistant = async () => {
      try {
        isInitializedRef.current = true;
        currentAgentRef.current = agentConfig;
        
        await voiceAssistantService.initialize(agentConfig, userContext);

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
          
          if (isMobile && isMobileRecording) {
            setTimeout(() => {
              voiceAssistantService.stopMobileRecording();
              setIsMobileRecording(false);
              setIsListening(false);
            }, 500);
          }
        });

        if (!isMobile) {
          voiceAssistantService.start();
          setIsListening(true);
        }
      } catch (error) {
        console.error('Failed to initialize voice assistant:', error);
      }
    };

    initializeAssistant();

    return () => {
      isInitializedRef.current = false;
      voiceAssistantService.stop();
      setIsMobileRecording(false);
    };
  }, [agentConfig, isEnabled, isMobile]);

  useEffect(() => {
    if (voiceAssistantService && userContext && isInitializedRef.current) {
      voiceAssistantService.updateUserContext(userContext);
    }
  }, [userContext]);

  useEffect(() => {
    if (messagesEndRef.current && !isMinimized) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, currentTranscript, isProcessing, isMinimized]);

  const toggleMinimize = () => setIsMinimized(!isMinimized);
  
  const closeAssistant = () => {
    setIsVisible(false);
    setIsMinimized(true);
  };

  const clearChat = () => {
    setMessages([]);
    voiceAssistantService.clearConversation();
  };

  if (!agentConfig || !isEnabled) return null;

  return (
    <>
      {/* Mobile Mic Float */}
      {isMobile && (
        <motion.div 
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-2"
        >
          {isMobileRecording && (
            <span className="bg-surface/90 glass-panel px-3 py-1 text-xs text-red-400 font-medium whitespace-nowrap">
              Recording...
            </span>
          )}
          <button 
            onClick={toggleMobileMic}
            className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center shadow-glass transition-all border",
              isMobileRecording 
                ? "bg-red-500/10 border-red-500 text-red-500 animate-pulse" 
                : "bg-surface border-border/10 text-muted hover:text-foreground"
            )}
          >
            {isMobileRecording ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
          </button>
        </motion.div>
      )}

      {/* Desktop Listening Indicator Tab */}
      {!isMobile && isListening && !isVisible && (
        <motion.div
           initial={{ y: 50, opacity: 0 }}
           animate={{ y: 0, opacity: 1 }}
           className="fixed bottom-6 right-6 z-40"
        >
          <button 
            onClick={() => { setIsVisible(true); setIsMinimized(false); enableTTS(); }}
            className="glass-panel flex items-center gap-3 px-4 py-3 hover:bg-foreground/5 transition-colors group cursor-pointer"
          >
            <div className="relative">
              <Mic className="w-5 h-5 text-accent" />
              <span className="absolute inset-0 bg-accent rounded-full opacity-20 animate-ping" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-sm font-medium text-foreground">Listening...</span>
              <span className="text-xs text-muted">Say "{agentConfig.name}" to open</span>
            </div>
          </button>
        </motion.div>
      )}

      {/* Main Assistant Panel */}
      <AnimatePresence>
        {isVisible && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              height: isMinimized ? 'auto' : (isMobile ? '100dvh' : '500px'),
              width: isMobile ? '100vw' : '380px',
              bottom: isMobile ? 0 : 24,
              right: isMobile ? 0 : 24
            }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
            className={cn(
               "fixed z-50 flex flex-col bg-surface/90 backdrop-blur-xl shadow-2xl border border-border/10",
               isMobile ? "rounded-t-2xl sm:rounded-2xl" : "rounded-2xl overflow-hidden"
            )}
            style={{ 
               transformOrigin: 'bottom right',
               maxHeight: isMobile ? '100dvh' : '80vh'
            }}
          >
            {/* Header */}
            <div 
              className={cn(
                "flex items-center justify-between px-4 py-3 border-b border-border/5",
                isListening ? "bg-accent/5" : ""
              )}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-surface border border-border/10 flex items-center justify-center overflow-hidden">
                   {/* Removed emoji avatar support; use icon if no valid image */}
                   <span className="text-sm font-bold text-accent">{agentConfig.name.charAt(0)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-heading font-medium text-sm leading-tight text-foreground">{agentConfig.name}</span>
                  <span className="text-xs text-muted leading-tight flex items-center gap-1">
                    {isProcessing ? "Processing..." : isListening ? (
                      <><span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"/> Listening</>
                    ) : (
                      "Idle"
                    )}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                {!ttsEnabled && (
                  <button onClick={enableTTS} className="p-1.5 text-muted hover:text-foreground hover:bg-foreground/5 rounded-md" title="Enable Voice Audio">
                    <Volume2 className="w-4 h-4" />
                  </button>
                )}
                {!isMobile && (
                  <button onClick={toggleMinimize} className="p-1.5 text-muted hover:text-foreground hover:bg-foreground/5 rounded-md">
                    {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                  </button>
                )}
                <button onClick={closeAssistant} className="p-1.5 text-muted hover:text-red-400 hover:bg-red-500/10 rounded-md">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chat Area */}
            <AnimatePresence>
              {!isMinimized && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 overflow-y-auto p-4 flex flex-col gap-4"
                  ref={chatContainerRef}
                >
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center flex-1 h-full text-center p-6 mt-10">
                      <div className="w-16 h-16 rounded-2xl bg-surface border border-border/5 flex items-center justify-center mb-6 shadow-inner">
                        <Mic className="w-8 h-8 text-muted" />
                      </div>
                      <h3 className="font-medium text-foreground mb-2">I'm listening...</h3>
                      <p className="text-sm text-muted mb-6">Say my name, "{agentConfig.name}", followed by a command.</p>
                      
                      <div className="w-full text-left space-y-2 bg-black/20 p-4 rounded-xl border border-border/5">
                        <p className="text-xs font-medium text-muted uppercase tracking-wider mb-3">Example Commands</p>
                        <p className="text-sm text-foreground/80">"Log 200g of chicken breast"</p>
                        <p className="text-sm text-foreground/80">"What are my macros today?"</p>
                        <p className="text-sm text-foreground/80">"Suggest a post-workout meal"</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {messages.map((msg, idx) => (
                        <div key={idx} className={cn("flex gap-3", msg.type === 'user' ? "flex-row-reverse" : "")}>
                          <div className={cn(
                            "w-7 h-7 shrink-0 rounded-full flex items-center justify-center mt-1",
                            msg.type === 'user' ? "bg-foreground/10" : "bg-accent/10 border border-accent/20"
                          )}>
                            {msg.type === 'user' ? <User className="w-3.5 h-3.5 text-muted" /> : <Mic className="w-3.5 h-3.5 text-accent" />}
                          </div>
                          <div className={cn(
                            "max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
                            msg.type === 'user' ? "bg-surface border border-border/10 text-foreground rounded-tr-sm" : "bg-accent/5 text-foreground/90 rounded-tl-sm"
                          )}>
                            {msg.text}
                          </div>
                        </div>
                      ))}

                      {currentTranscript && (
                        <div className="flex gap-3 flex-row-reverse opacity-70">
                          <div className="w-7 h-7 shrink-0 rounded-full bg-foreground/10 flex items-center justify-center mt-1">
                            <User className="w-3.5 h-3.5 text-muted" />
                          </div>
                          <div className="max-w-[80%] px-4 py-2.5 rounded-2xl text-sm bg-surface border border-border/5 text-foreground rounded-tr-sm border-dashed">
                            {currentTranscript}
                          </div>
                        </div>
                      )}

                      {isProcessing && (
                        <div className="flex gap-3 items-center">
                          <div className="w-7 h-7 shrink-0 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center">
                            <Mic className="w-3.5 h-3.5 text-accent" />
                          </div>
                          <div className="flex gap-1.5 px-4 py-3 bg-accent/5 rounded-2xl rounded-tl-sm">
                            <motion.span animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-1.5 h-1.5 rounded-full bg-accent/60" />
                            <motion.span animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1.5 h-1.5 rounded-full bg-accent/60" />
                            <motion.span animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1.5 h-1.5 rounded-full bg-accent/60" />
                          </div>
                        </div>
                      )}
                      
                      <div ref={messagesEndRef} className="h-2" />
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Footer */}
            {!isMinimized && messages.length > 0 && (
              <div className="p-3 border-t border-border/5 bg-background/50">
                <button 
                  onClick={clearChat}
                  className="w-full flex items-center justify-center gap-2 text-xs font-medium text-muted hover:text-red-400 py-2 rounded-lg hover:bg-foreground/5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear Conversation Context
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default VoiceAssistant;
