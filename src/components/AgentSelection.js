import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Activity, CheckCircle2, ShieldAlert, Cpu, UserCircle, Save } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { saveAgentSettings } from '../services/firebaseService';
import { cn } from '../utils/cn';

const PRESET_AGENTS = [
  { id: 'alex', name: 'Alex', voice: 'Google US English', personality: 'Empathetic & motivational coach', icon: UserCircle },
  { id: 'nova', name: 'Nova', voice: 'Google UK English Female', personality: 'Clinical & precise nutritionist', icon: Activity },
  { id: 'kai', name: 'Kai', voice: 'Google UK English Male', personality: 'Energetic & direct wellness guide', icon: Cpu }
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
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
      if (voices.length > 0 && !customVoice) setCustomVoice(voices[0].name);
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, [customVoice]);

  const handleAgentSelect = (agent) => {
    setSelectedAgent(agent);
    if (agent.id !== 'custom') setCustomName('');
  };

  const handleContinue = async () => {
    if (!acceptedDisclaimer) return alert('Audio telemetry consent required.');
    if (!selectedAgent) return alert('Intelligence selection required.');
    if (selectedAgent.id === 'custom' && !customName.trim()) return alert('Custom designation required.');

    setSaving(true);
    try {
      const agentConfig = selectedAgent.id === 'custom' 
        ? { id: 'custom', name: customName.trim(), voice: customVoice, personality: 'Custom Neural Instance', avatar: '🤖' }
        : { ...selectedAgent, avatar: '🎧' };

      try { await navigator.mediaDevices.getUserMedia({ audio: true }); } 
      catch (error) {
        alert('Hardware access denied. Voice telemetry requires microphone permissions.');
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
          
          <h2 className="text-2xl font-heading font-semibold mb-4">Audio Telemetry Consent</h2>
          <p className="text-muted text-sm mb-6">Continuous hardware access is required for passive voice recognition. Data is processed locally on-device.</p>
          
          <div className="space-y-4 mb-8">
            <div className="bg-surface/50 border border-white/5 rounded-xl p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted mb-3 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4"/> Security Architecture
              </h3>
              <ul className="space-y-2 text-sm text-foreground/80">
                <li className="flex gap-2 items-start"><CheckCircle2 className="w-4 h-4 text-accent mt-0.5 shrink-0"/> Client-side voice processing via Web Speech API</li>
                <li className="flex gap-2 items-start"><CheckCircle2 className="w-4 h-4 text-accent mt-0.5 shrink-0"/> No audio payloads transmitted to external servers</li>
                <li className="flex gap-2 items-start"><CheckCircle2 className="w-4 h-4 text-accent mt-0.5 shrink-0"/> Actionable on explicit wake-word invocation</li>
              </ul>
            </div>
          </div>
          
          <label className="flex items-start gap-3 cursor-pointer p-4 border border-white/10 rounded-xl hover:bg-white/5 transition-colors mb-6 group">
             <input type="checkbox" className="mt-1 w-4 h-4 rounded border-white/20 text-accent focus:ring-accent focus:ring-offset-background" checked={acceptedDisclaimer} onChange={e => setAcceptedDisclaimer(e.target.checked)} />
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
    <div className="min-h-screen max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-heading font-bold mb-4 tracking-tight">Intelligence Selection</h1>
        <p className="text-muted max-w-xl mx-auto text-lg">Select a pre-trained behavioral model or instantiate a custom neural interface.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {PRESET_AGENTS.map((agent) => (
          <motion.button whileHover={{ y: -4 }} whileTap={{ scale: 0.98 }} key={agent.id} onClick={() => handleAgentSelect(agent)} className={cn("text-left glass-panel p-6 border-2 transition-all group flex flex-col h-full", selectedAgent?.id === agent.id ? "border-accent bg-accent/5" : "border-transparent hover:border-white/20")}>
             <div className="w-12 h-12 rounded-xl bg-surface flex items-center justify-center mb-4 border border-white/10 group-hover:scale-110 transition-transform">
               <agent.icon className="w-6 h-6 text-foreground" />
             </div>
             <h3 className="font-heading font-semibold text-lg mb-1">{agent.name}</h3>
             <p className="text-sm text-foreground/80 mb-4 flex-1">{agent.personality}</p>
             <p className="text-xs text-muted font-mono bg-surface px-2 py-1 rounded inline-block truncate">{agent.voice}</p>
             
             {selectedAgent?.id === agent.id && <div className="absolute top-4 right-4"><CheckCircle2 className="w-5 h-5 text-accent"/></div>}
          </motion.button>
        ))}

        <motion.button whileHover={{ y: -4 }} whileTap={{ scale: 0.98 }} onClick={() => handleAgentSelect({ id: 'custom' })} className={cn("text-left glass-panel p-6 border-2 transition-all flex flex-col h-full relative", selectedAgent?.id === 'custom' ? "border-blue-500 bg-blue-500/5" : "border-transparent hover:border-white/20")}>
           <div className="w-12 h-12 rounded-xl bg-surface flex items-center justify-center mb-4 border border-white/10">
             <Cpu className="w-6 h-6 text-foreground" />
           </div>
           <h3 className="font-heading font-semibold text-lg mb-1">Custom Protocol</h3>
           <p className="text-sm text-muted">Initialize custom parameters</p>
           {selectedAgent?.id === 'custom' && <div className="absolute top-4 right-4"><CheckCircle2 className="w-5 h-5 text-blue-500"/></div>}
        </motion.button>
      </div>

      <AnimatePresence>
        {selectedAgent?.id === 'custom' && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="glass-panel p-8 mb-12 border border-blue-500/30 overflow-hidden">
             <h3 className="font-heading font-semibold mb-6 flex items-center gap-2"><Cpu className="w-5 h-5 text-blue-400"/> Custom Neural Interface</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                   <label className="text-sm font-medium text-muted block mb-2">Designation (Wake Word)</label>
                   <input type="text" maxLength={20} value={customName} onChange={e => setCustomName(e.target.value)} className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-foreground focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none placeholder:text-white/20" placeholder="e.g. JARVIS" />
                </div>
                <div>
                   <label className="text-sm font-medium text-muted block mb-2">Vocal Synthesis Model</label>
                   <select value={customVoice} onChange={e => setCustomVoice(e.target.value)} className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-foreground focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none">
                     {availableVoices.map((v, i) => <option key={i} value={v.name}>{v.name}</option>)}
                   </select>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col items-center max-w-lg mx-auto border-t border-white/10 pt-8 mt-8">
         <p className="text-sm text-center text-muted mb-6 bg-surface p-4 rounded-xl border border-white/5 font-mono">
           [SYS MSG]: Invoke system by broadcasting "<span className="text-foreground font-semibold">{selectedAgent?.id === 'custom' ? (customName || 'DESIGNATION') : (selectedAgent?.name || 'DESIGNATION')}</span>" followed by your physiological input stream.
         </p>
         
         <button onClick={handleContinue} disabled={!selectedAgent || saving} className="w-full max-w-sm flex items-center justify-center gap-2 py-4 rounded-xl bg-accent text-background text-lg font-bold hover:bg-accent/90 disabled:opacity-50 transition-colors">
            {saving ? <Activity className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {saving ? 'Initializing Subsystems...' : 'Confirm Matrix parameters'}
         </button>
      </div>

    </div>
  );
};
export default AgentSelection;
