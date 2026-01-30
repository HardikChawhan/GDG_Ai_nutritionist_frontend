import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { saveAgentSettings } from '../services/firebaseService';
import './AgentSelection.css';

const PRESET_AGENTS = [
  {
    id: 'alex',
    name: 'Alex',
    voice: 'Google US English',
    personality: 'Friendly and motivational fitness coach',
    avatar: '🏋️'
  },
  {
    id: 'nova',
    name: 'Nova',
    voice: 'Google UK English Female',
    personality: 'Professional nutrition expert',
    avatar: '🥗'
  },
  {
    id: 'kai',
    name: 'Kai',
    voice: 'Google UK English Male',
    personality: 'Energetic wellness enthusiast',
    avatar: '⚡'
  }
];

const AgentSelection = ({ onComplete }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [customName, setCustomName] = useState('');
  const [customVoice, setCustomVoice] = useState('');
  const [availableVoices, setAvailableVoices] = useState([]);
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const [acceptedDisclaimer, setAcceptedDisclaimer] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Load available voices
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
      if (voices.length > 0 && !customVoice) {
        setCustomVoice(voices[0].name);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, [customVoice]);

  const handleAgentSelect = (agent) => {
    setSelectedAgent(agent);
    if (agent.id !== 'custom') {
      setCustomName('');
    }
  };

  const handleContinue = async () => {
    if (!acceptedDisclaimer) {
      alert('Please accept the microphone usage disclaimer to continue.');
      return;
    }

    if (!selectedAgent) {
      alert('Please select an agent to continue.');
      return;
    }

    if (selectedAgent.id === 'custom' && !customName.trim()) {
      alert('Please enter a name for your custom agent.');
      return;
    }

    setSaving(true);

    try {
      const agentConfig = selectedAgent.id === 'custom' 
        ? {
            id: 'custom',
            name: customName.trim(),
            voice: customVoice,
            personality: 'Custom AI health assistant',
            avatar: '🤖'
          }
        : selectedAgent;

      // Request microphone permission
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (error) {
        alert('Microphone access is required for voice assistant. Please allow microphone permission.');
        setSaving(false);
        return;
      }

      // Save to Firebase
      if (currentUser) {
        await saveAgentSettings(currentUser.uid, agentConfig);
      }

      // Complete onboarding
      if (onComplete) {
        onComplete(agentConfig);
      }
      
      // Navigate to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Error saving agent settings:', error);
      alert('Failed to save agent settings. Please try again.');
      setSaving(false);
    }
  };

  if (showDisclaimer && !acceptedDisclaimer) {
    return (
      <div className="agent-selection-container">
        <div className="disclaimer-card">
          <div className="disclaimer-icon">🎤</div>
          <h2>Voice Assistant Microphone Access</h2>
          <div className="disclaimer-content">
            <p className="disclaimer-text">
              Your AI health assistant will need continuous access to your microphone to function properly.
            </p>
            
            <div className="disclaimer-points">
              <h3>How it works:</h3>
              <ul>
                <li>
                  <span className="point-icon">✅</span>
                  Your microphone will be active while you're using the app
                </li>
                <li>
                  <span className="point-icon">✅</span>
                  The assistant only responds when you say its name (wake word)
                </li>
                <li>
                  <span className="point-icon">✅</span>
                  All voice processing happens in your browser - no audio is sent to servers
                </li>
                <li>
                  <span className="point-icon">✅</span>
                  You can disable the assistant anytime from your dashboard
                </li>
              </ul>
            </div>

            <div className="disclaimer-privacy">
              <h3>Privacy & Security:</h3>
              <ul>
                <li>Audio is processed locally using Web Speech API</li>
                <li>Only transcribed text is sent to AI for responses</li>
                <li>No audio recordings are stored</li>
                <li>Conversations are session-only (cleared on page reload)</li>
              </ul>
            </div>
          </div>

          <div className="disclaimer-actions">
            <label className="accept-checkbox">
              <input 
                type="checkbox" 
                checked={acceptedDisclaimer}
                onChange={(e) => setAcceptedDisclaimer(e.target.checked)}
              />
              <span>I understand and accept continuous microphone access for voice assistant features</span>
            </label>
            
            <button 
              className="btn btn-primary"
              onClick={() => setShowDisclaimer(false)}
              disabled={!acceptedDisclaimer}
            >
              Continue to Agent Selection
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="agent-selection-container">
      <div className="agent-selection-header">
        <h2>Choose Your AI Health Assistant</h2>
        <p>Select one of our preset agents or create your own custom assistant</p>
      </div>

      <div className="agents-grid">
        {/* Preset Agents */}
        {PRESET_AGENTS.map((agent) => (
          <div
            key={agent.id}
            className={`agent-card ${selectedAgent?.id === agent.id ? 'selected' : ''}`}
            onClick={() => handleAgentSelect(agent)}
          >
            <div className="agent-avatar">{agent.avatar}</div>
            <h3>{agent.name}</h3>
            <p className="agent-personality">{agent.personality}</p>
            <p className="agent-voice">Voice: {agent.voice}</p>
            <div className="agent-selected-indicator">
              {selectedAgent?.id === agent.id && <span>✓ Selected</span>}
            </div>
          </div>
        ))}

        {/* Custom Agent */}
        <div
          className={`agent-card custom-agent ${selectedAgent?.id === 'custom' ? 'selected' : ''}`}
          onClick={() => handleAgentSelect({ id: 'custom' })}
        >
          <div className="agent-avatar">🤖</div>
          <h3>Create Custom</h3>
          <p className="agent-personality">Design your own assistant</p>
          {selectedAgent?.id === 'custom' && (
            <div className="custom-agent-form" onClick={(e) => e.stopPropagation()}>
              <div className="form-group">
                <label>Assistant Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., JARVIS, Friday, etc."
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  maxLength={20}
                />
              </div>
              
              <div className="form-group">
                <label>Voice</label>
                <select 
                  className="form-select"
                  value={customVoice}
                  onChange={(e) => setCustomVoice(e.target.value)}
                >
                  {availableVoices.map((voice, index) => (
                    <option key={index} value={voice.name}>
                      {voice.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="agent-selection-footer">
        <div className="info-box">
          <p>
            <strong>💡 Tip:</strong> Say your assistant's name followed by your command. 
            Example: "{selectedAgent?.id === 'custom' ? customName || 'Assistant' : selectedAgent?.name || 'Assistant'}, 
            I ate chicken and rice"
          </p>
        </div>
        
        <button 
          className="btn btn-primary btn-large"
          onClick={handleContinue}
          disabled={!selectedAgent || saving}
        >
          {saving ? 'Setting up your assistant...' : 'Complete Setup'}
        </button>
      </div>
    </div>
  );
};

export default AgentSelection;
