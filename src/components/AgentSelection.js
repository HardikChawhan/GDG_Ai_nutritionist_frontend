import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mic, Activity, CheckCircle2, ShieldAlert, Cpu, Save } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { saveAgentSettings } from '../services/firebaseService';
import SEO from './SEO';

const AgentSelection = ({ onComplete }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [customName, setCustomName] = useState('');
  const [customVoice, setCustomVoice] = useState('');
  const [availableVoices, setAvailableVoices] = useState([]);
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const [acceptedDisclaimer, setAcceptedDisclaimer] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
      if (voices.length > 0 && !customVoice) setCustomVoice(voices[0].name);
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, [customVoice]);

  const handleContinue = async () => {
    if (!acceptedDisclaimer) return alert('Microphone permission is required.');
    if (!customName.trim()) return alert('Custom designation required.');

    setSaving(true);
    try {
      const agentConfig = { id: 'custom', name: customName.trim(), voice: customVoice, personality: 'Custom Neural Instance', avatar: '🤖' };

      try { await navigator.mediaDevices.getUserMedia({ audio: true }); } 
      catch (error) {
        alert('Microphone access denied. Voice tracking requires microphone permissions.');
        setSaving(false); return;
      }

      if (currentUser) await saveAgentSettings(currentUser.uid, agentConfig);
      if (onComplete) onComplete(agentConfig);
      navigate('/dashboard');
    } catch (error) {
      alert('Initialization failed. Check network link.');
      setSaving(false);
    }
  };

  if (showDisclaimer && !acceptedDisclaimer) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel max-w-xl w-full p-8 relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-6">
            <Mic className="w-8 h-8 text-orange-400" />
          </div>
          
          <h2 className="text-2xl font-heading font-semibold mb-4">Microphone Permission Required</h2>
          <p className="text-muted text-sm mb-6">Continuous hardware access is required for passive voice recognition. Data is processed locally on-device.</p>
          
          <div className="space-y-4 mb-8">
            <div className="bg-surface/50 border border-border/5 rounded-xl p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted mb-3 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4"/> Security Architecture
              </h3>
              <ul className="space-y-2 text-sm text-foreground/80">
                <li className="flex gap-2 items-start"><CheckCircle2 className="w-4 h-4 text-accent mt-0.5 shrink-0"/> Client-side voice processing via Web Speech API</li>
                <li className="flex gap-2 items-start"><CheckCircle2 className="w-4 h-4 text-accent mt-0.5 shrink-0"/> No audio data is saved or sent to external servers</li>
                <li className="flex gap-2 items-start"><CheckCircle2 className="w-4 h-4 text-accent mt-0.5 shrink-0"/> Actionable on explicit wake-word invocation</li>
              </ul>
            </div>
          </div>
          
          <label className="flex items-start gap-3 cursor-pointer p-4 border border-border/10 rounded-xl hover:bg-foreground/5 transition-colors mb-6 group">
             <input type="checkbox" className="mt-1 w-4 h-4 rounded border-border/20 text-accent focus:ring-accent focus:ring-offset-background" checked={acceptedDisclaimer} onChange={e => setAcceptedDisclaimer(e.target.checked)} />
             <span className="text-sm font-medium group-hover:text-white transition-colors">I acknowledge and authorize continuous hardware microphone access for localized audio processing.</span>
          </label>
          
          <button onClick={() => setShowDisclaimer(false)} disabled={!acceptedDisclaimer} className="w-full bg-accent text-background font-semibold py-4 rounded-xl hover:bg-accent/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
             Proceed to Initialization
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative z-10">
      <SEO
        title="Voice Agent Setup"
        description="Configure your personalized AI voice nutritionist. Set up a custom wake word and voice model for hands-free health coaching."
        canonical="/agent-setup"
        noIndex={true}
      />
      <div className="w-full max-w-2xl">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-heading font-bold mb-4 tracking-tight">Intelligence Initialization</h1>
          <p className="text-muted max-w-xl mx-auto text-lg">Define the operational parameters for your personalized neural nutritionist.</p>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-8 md:p-10 border border-accent/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            
            <h3 className="font-heading font-semibold text-xl mb-8 flex items-center gap-3 relative">
              <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center"><Cpu className="w-5 h-5 text-accent"/></div>
              System Parameters
            </h3>
            
            <div className="space-y-6 relative">
              <div>
                  <label className="text-sm font-medium text-foreground block mb-2">Designation (Wake Word)</label>
                  <input type="text" maxLength={20} value={customName} onChange={e => setCustomName(e.target.value)} className="w-full bg-surface border border-border/10 rounded-xl px-4 py-3.5 text-foreground focus:ring-1 focus:ring-accent focus:border-accent outline-none placeholder:text-foreground/20 text-lg shadow-inner" placeholder="e.g. JARVIS" />
                  <p className="text-xs text-muted mt-2">The vocal prompt used to wake the assistant.</p>
              </div>
              
              <div>
                  <label className="text-sm font-medium text-foreground block mb-2">Vocal Synthesis Model</label>
                  <select value={customVoice} onChange={e => setCustomVoice(e.target.value)} className="w-full bg-surface border border-border/10 rounded-xl px-4 py-3.5 text-foreground focus:ring-1 focus:ring-accent focus:border-accent outline-none appearance-none cursor-pointer">
                    {availableVoices.map((v, i) => <option key={i} value={v.name}>{v.name}</option>)}
                  </select>
                  <p className="text-xs text-muted mt-2">Voice engine used for verbal output.</p>
              </div>
            </div>

            <div className="mt-10 pt-8 border-t border-border/10 relative">
                <p className="text-sm text-center text-muted mb-6 bg-surface p-4 rounded-xl border border-border/5 font-mono">
                  [SYS MSG]: Invoke system by broadcasting "<span className="text-accent font-semibold">{customName || 'DESIGNATION'}</span>" followed by your physiological input stream.
                </p>
                
                <button onClick={handleContinue} disabled={saving} className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-accent text-background text-lg font-bold hover:bg-accent/90 disabled:opacity-50 transition-all shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.4)]">
                  {saving ? <Activity className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  {saving ? 'Initializing Subsystems...' : 'Confirm Matrix parameters'}
                </button>
            </div>
        </motion.div>
      </div>
    </div>
  );
};
export default AgentSelection;
