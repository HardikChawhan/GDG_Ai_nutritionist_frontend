import React, { useState, useEffect, useRef } from 'react';
import * as poseDetection from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';

import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Play, Square, Settings, User, CheckCircle2, AlertTriangle, ChevronRight, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import voiceAssistantService from '../services/voiceAssistantService';
import { getHealthProfile } from '../services/firebaseService';
import { cn } from '../utils/cn';
import { 
  calculateAngle, calculateVerticalAngle, calculateHorizontalDistance,
  SquatStateMachine, BenchPressStateMachine, DeadliftStateMachine,
  PushUpStateMachine, PullUpStateMachine, ShoulderPressStateMachine,
  LateralRaiseStateMachine, LungeStateMachine
} from '../utils/workoutUtils';

const saveCaloriesBurnedToCookie = (date, calories) => {
  const dateKey = date || new Date().toISOString().split('T')[0];
  const cookieKey = `caloriesBurned_${dateKey}`;
  const currentValue = parseInt(getCookie(cookieKey)) || 0;
  const newValue = currentValue + calories;
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);
  document.cookie = `${cookieKey}=${newValue}; expires=${expires.toUTCString()}; path=/; SameSite=Strict`;
  return newValue;
};

const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
};

const EXERCISES = {
  squat: { name: 'Squats' },
  bench: { name: 'Bench Press' },
  deadlift: { name: 'Deadlift' },
  pushup: { name: 'Push-ups' },
  pullup: { name: 'Pull-ups' },
  shoulderpress: { name: 'Shoulder Press' },
  lateralraise: { name: 'Lateral Raises' },
  lunge: { name: 'Lunges' }
};

const EXERCISE_INSTRUCTIONS = {
  squat: ['Stand sideways to camera', 'Keep entire body visible', 'Squat down until thighs parallel to ground', 'Keep knees behind toes'],
  bench: ['Face camera or use side view', 'Keep arms visible', 'Lower arms to 90° elbow angle', 'Press back up to full extension'],
  deadlift: ['Stand sideways to camera', 'Keep back straight', 'Lift from bent position to standing', 'Fully extend hips at top'],
  pushup: ['Position sideways to camera', 'Maintain plank position', 'Lower chest until elbows at 90°', 'Keep body straight - engage core'],
  pullup: ['Face camera directly', 'Hang with arms extended', 'Pull until chin above bar level', 'Control the descent'],
  shoulderpress: ['Face camera or use side view', 'Start with arms at 90° (shoulder level)', 'Press weights overhead until arms straight', 'Control descent'],
  lateralraise: ['Face camera directly', 'Arms start at sides', 'Raise arms to shoulder height', 'Control the descent'],
  lunge: ['Stand sideways to camera', 'Step forward into lunge', 'Both knees should reach 90°', 'Push back to standing']
};

function WorkoutTracker() {
  const { currentUser } = useAuth();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const isCountingRef = useRef(false);
  const currentExerciseRef = useRef('squat');
  
  const [detector, setDetector] = useState(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [currentExercise, setCurrentExercise] = useState('squat');
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [isCounting, setIsCounting] = useState(false);
  const [repCount, setRepCount] = useState(0);
  const [currentState, setCurrentState] = useState('Standing');
  const [formQuality, setFormQuality] = useState('Perfect');
  const [workoutLog, setWorkoutLog] = useState([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [caloriesResult, setCaloriesResult] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  
  const stateMachineRef = useRef(null);
  const stateMachinesRef = useRef({});

  useEffect(() => { isCountingRef.current = isCounting; }, [isCounting]);
  
  useEffect(() => {
    currentExerciseRef.current = currentExercise;
    if (stateMachinesRef.current[currentExercise]) {
      stateMachineRef.current = stateMachinesRef.current[currentExercise];
    }
  }, [currentExercise]);
  
  useEffect(() => {
    const loadUserProfile = async () => {
      if (currentUser) {
        try { setUserProfile(await getHealthProfile(currentUser.uid)); } catch (error) {}
      }
    };
    loadUserProfile();
  }, [currentUser]);

  useEffect(() => {
    const initializePoseDetection = async () => {
      try {
        await tf.setBackend('webgl');
        await tf.ready();
        const poseDetector = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
        );
        setDetector(poseDetector);
        setIsModelLoaded(true);
        stateMachinesRef.current = {
          squat: new SquatStateMachine(), bench: new BenchPressStateMachine(), deadlift: new DeadliftStateMachine(),
          pushup: new PushUpStateMachine(), pullup: new PullUpStateMachine(), shoulderpress: new ShoulderPressStateMachine(),
          lateralraise: new LateralRaiseStateMachine(), lunge: new LungeStateMachine()
        };
        stateMachineRef.current = stateMachinesRef.current['squat'];
      } catch (error) { alert('Failed to load TFJS vision model.'); }
    };
    initializePoseDetection();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      stopCamera();
    };
  }, []);
  
  useEffect(() => {
    if (isWorkoutActive && isModelLoaded) startCamera();
    else stopCamera();
  }, [isWorkoutActive, isModelLoaded]);
  
  useEffect(() => {
    if (!currentUser) return;
    const handleVoiceCommand = (command) => {
      const lowerCommand = command.toLowerCase();
      if (lowerCommand.includes('initiate workout') || lowerCommand.includes('start workout session')) {
        if (!isWorkoutActive) { setIsWorkoutActive(true); speakFeedback('Telemetry link active. Specify parameters.'); }
      } else if (lowerCommand.includes('start workout') || lowerCommand.includes('begin counting')) {
        if (isWorkoutActive && !isCounting) { setIsCounting(true); speakFeedback(`Tracking ${EXERCISES[currentExercise].name}. Initialized.`); }
      } else if (lowerCommand.includes('stop counting') || lowerCommand.includes('pause counting')) {
        if (isCounting) { setIsCounting(false); speakFeedback('Telemetry suspended.'); }
      } else if (lowerCommand.includes('end workout') || lowerCommand.includes('finish workout')) {
        if (isWorkoutActive) handleEndWorkout();
      }
    };
    const originalCallback = voiceAssistantService.onTranscriptCallback;
    voiceAssistantService.onTranscriptCallback = (transcript, isFinal) => {
      if (isFinal) handleVoiceCommand(transcript);
      if (originalCallback) originalCallback(transcript, isFinal);
    };
    return () => { voiceAssistantService.onTranscriptCallback = originalCallback; };
  }, [currentUser, isWorkoutActive, isCounting, currentExercise, workoutLog]);
  
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }, audio: false });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          if (canvasRef.current) {
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
          }
          detectPose();
        };
      }
    } catch (error) { alert('Camera access denied. Video telemetry requires permissions.'); }
  };
  
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    if (animationRef.current) { cancelAnimationFrame(animationRef.current); animationRef.current = null; }
  };
  
  const detectPose = async () => {
    if (!detector || !videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const detect = async () => {
      if (video.readyState === 4) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
        ctx.restore();
        
        const poses = await detector.estimatePoses(video);
        if (poses.length > 0) {
          const pose = poses[0];
          const mirroredPose = { ...pose, keypoints: pose.keypoints.map(kp => ({ ...kp, x: canvas.width - kp.x })) };
          drawPose(ctx, mirroredPose);
          if (isCountingRef.current) updateExerciseState(pose);
        }
      }
      animationRef.current = requestAnimationFrame(detect);
    };
    detect();
  };
  
  const drawPose = (ctx, pose) => {
    const keypoints = pose.keypoints;
    const connections = [
      ['left_shoulder', 'right_shoulder'], ['left_shoulder', 'left_elbow'], ['left_elbow', 'left_wrist'],
      ['right_shoulder', 'right_elbow'], ['right_elbow', 'right_wrist'], ['left_shoulder', 'left_hip'],
      ['right_shoulder', 'right_hip'], ['left_hip', 'right_hip'], ['left_hip', 'left_knee'],
      ['left_knee', 'left_ankle'], ['right_hip', 'right_knee'], ['right_knee', 'right_ankle']
    ];
    
    connections.forEach(([start, end]) => {
      const startKp = keypoints.find(kp => kp.name === start);
      const endKp = keypoints.find(kp => kp.name === end);
      if (startKp && endKp && startKp.score > 0.3 && endKp.score > 0.3) {
        ctx.beginPath(); ctx.moveTo(startKp.x, startKp.y); ctx.lineTo(endKp.x, endKp.y);
        ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 3; ctx.stroke();
      }
    });
    
    keypoints.forEach(kp => {
      if (kp.score > 0.3) {
        ctx.beginPath(); ctx.arc(kp.x, kp.y, 6, 0, 2 * Math.PI); ctx.fillStyle = '#ffffff'; ctx.fill();
        ctx.beginPath(); ctx.arc(kp.x, kp.y, 4, 0, 2 * Math.PI); ctx.fillStyle = '#22c55e'; ctx.fill();
      }
    });
  };
  
  const updateExerciseState = (pose) => {
    if (!stateMachineRef.current) return;
    const keypoints = pose.keypoints;
    const getPoint = (index, minConfidence = 0.3) => {
      if (!keypoints || !keypoints[index]) return null;
      const kp = keypoints[index];
      return kp.score >= minConfidence ? { x: kp.x, y: kp.y } : null;
    };
    
    let angles = {}; let distances = {};
    
    switch (currentExerciseRef.current) {
      case 'squat': {
        const shoulder = getPoint(5) || getPoint(6); const hip = getPoint(11) || getPoint(12);
        const knee = getPoint(13) || getPoint(14); const ankle = getPoint(15) || getPoint(16);
        if (hip && knee && ankle && shoulder) {
          angles.knee = calculateAngle(hip, knee, ankle); angles.hip = calculateAngle(shoulder, hip, knee);
          angles.torsoLean = calculateVerticalAngle(shoulder, hip); distances.kneeToe = calculateHorizontalDistance(knee, ankle);
          distances.legLength = Math.abs(hip.y - ankle.y);
        }
        break;
      }
      case 'bench': case 'pushup': {
        const shoulder = getPoint('left_shoulder') || getPoint('right_shoulder');
        const elbow = getPoint('left_elbow') || getPoint('right_elbow');
        const wrist = getPoint('left_wrist') || getPoint('right_wrist');
        if (shoulder && elbow && wrist) { angles.elbow = calculateAngle(shoulder, elbow, wrist); }
        break;
      }
      case 'deadlift': {
        const shoulder = getPoint('left_shoulder'); const hip = getPoint('left_hip');
        const knee = getPoint('left_knee'); const ankle = getPoint('left_ankle');
        if (shoulder && hip && knee && ankle) {
          angles.hip = calculateAngle(shoulder, hip, knee); angles.knee = calculateAngle(hip, knee, ankle);
          angles.backAngle = calculateVerticalAngle(shoulder, hip);
        }
        break;
      }
      case 'pullup': {
        const shoulder = getPoint(5) || getPoint(6); const elbow = getPoint(7) || getPoint(8); const wrist = getPoint(9) || getPoint(10);
        if (shoulder && elbow && wrist) { angles.elbow = calculateAngle(shoulder, elbow, wrist); }
        break;
      }
      case 'shoulderpress': {
        const ls = getPoint(5), le = getPoint(7), lw = getPoint(9), rs = getPoint(6), re = getPoint(8), rw = getPoint(10);
        if (ls && le && lw) angles.leftElbow = calculateAngle(ls, le, lw);
        if (rs && re && rw) angles.rightElbow = calculateAngle(rs, re, rw);
        distances = { leftWrist: lw, rightWrist: rw, leftShoulder: ls, rightShoulder: rs };
        break;
      }
      case 'lateralraise': {
        const shoulder = getPoint(5) || getPoint(6); const elbow = getPoint(7) || getPoint(8); const hip = getPoint(11) || getPoint(12);
        if (shoulder && elbow && hip) angles.shoulder = calculateAngle(hip, shoulder, elbow);
        break;
      }
      case 'lunge': {
        const hip = getPoint(11) || getPoint(12); const knee = getPoint(13) || getPoint(14); const ankle = getPoint(15) || getPoint(16);
        if (hip && knee && ankle) angles.knee = calculateAngle(hip, knee, ankle);
        break;
      }
    }
    
    const prevRepCount = stateMachineRef.current.repCount;
    stateMachineRef.current.update(angles, distances);
    const newState = stateMachineRef.current.state;
    const newRepCount = stateMachineRef.current.repCount;
    
    if (newRepCount > prevRepCount) { setRepCount(newRepCount); speakFeedback(`Rep ${newRepCount}`); }
    setCurrentState(newState);
    
    const feedback = stateMachineRef.current.feedbackMessages;
    if (feedback.length > 0) {
      if (feedback.some(f => f.type === 'error')) setFormQuality('Poor');
      else if (feedback.some(f => f.type === 'warning')) setFormQuality('Good');
      else setFormQuality('Perfect');
    }
  };
  
  const speakFeedback = (message) => { if (voiceAssistantService.ttsEnabled) voiceAssistantService.speak(message); };
  
  const handleExerciseChange = (exercise) => {
    if (isCounting) return speakFeedback('Halt active telemetry before modifying parameters.');
    setCurrentExercise(exercise);
    stateMachineRef.current = stateMachinesRef.current[exercise];
    setRepCount(0); setCurrentState('Standing'); setFormQuality('Perfect');
  };
  
  const handleStartCounting = () => { setIsCounting(true); speakFeedback(`Tracking initialized.`); };
  
  const handleStopCounting = () => {
    if (isCounting && repCount > 0) {
      const existingLog = workoutLog.find(log => log.exercise === currentExercise);
      if (existingLog) existingLog.reps += repCount;
      else setWorkoutLog([...workoutLog, { exercise: currentExercise, reps: repCount, name: EXERCISES[currentExercise].name }]);
    }
    setIsCounting(false); speakFeedback('Tracking suspended.');
  };
  
  const handleEndWorkout = async () => {
    setIsCounting(false); setIsWorkoutActive(false); setIsCalculating(true);
    let finalLog = [...workoutLog];
    if (repCount > 0) {
      const existingLog = finalLog.find(log => log.exercise === currentExercise);
      if (existingLog) existingLog.reps += repCount;
      else finalLog.push({ exercise: currentExercise, reps: repCount, name: EXERCISES[currentExercise].name });
    }
    try {
      const response = await fetch('https://ai-nutritionist-backend.onrender.com/api/workout/calculate-calories', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser?.uid, workouts: finalLog, userProfile })
      });
      const data = await response.json();
      setCaloriesResult(data.totalCalories); setIsCalculating(false); setShowResult(true);
      speakFeedback(`Energy depleted: ${Math.round(data.totalCalories)} calories.`);
      if (data?.totalCalories) saveCaloriesBurnedToCookie(null, data.totalCalories);
      setTimeout(() => { setShowResult(false); resetWorkout(); }, 5000);
    } catch (error) { setIsCalculating(false); alert('Telemetry calculation failed.'); }
  };
  
  const resetWorkout = () => {
    setWorkoutLog([]); setRepCount(0); setCurrentState('Standing'); setFormQuality('Perfect'); setCaloriesResult(null);
    Object.values(stateMachinesRef.current).forEach(sm => sm.reset());
  };
  
  if (!isWorkoutActive) {
    return (
      <div className="min-h-screen max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col items-center justify-center text-center">
         <div className="w-20 h-20 rounded-2xl bg-accent/20 flex items-center justify-center mb-6">
           <Activity className="w-10 h-10 text-accent animate-pulse" />
         </div>
         <h1 className="text-4xl font-heading font-bold mb-4 tracking-tight">Kinematic Tracking</h1>
         <p className="text-muted text-lg mb-10 max-w-xl">Initialize hardware visualization payload to track reps via onboard neural models.</p>
         
         <button onClick={() => setIsWorkoutActive(true)} disabled={!isModelLoaded} className="flex items-center gap-3 px-8 py-4 bg-accent text-background rounded-xl font-bold text-lg hover:bg-accent/90 disabled:opacity-50 transition-all shadow-[0_0_30px_rgba(34,197,94,0.2)]">
            {isModelLoaded ? <><Play className="w-5 h-5"/> Initiate Telemetry Payload</> : <><Activity className="w-5 h-5 animate-spin"/> Booting Neural Engine</>}
         </button>
         
         <div className="mt-8 font-mono text-sm text-muted bg-surface/50 p-4 border border-border/5 rounded-xl">
           [SYS MSG]: Or execute voice command: "<span className="text-foreground">{voiceAssistantService.agentConfig?.name || 'DESIGNATION'} initiate workout</span>"
         </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen lg:h-screen flex flex-col overflow-x-hidden">
      <div className="flex justify-between items-center mb-6">
         <div>
           <h1 className="text-3xl font-heading font-bold mb-1 tracking-tight">Telemetry Matrix</h1>
           <p className="text-sm text-muted">Kinematic capture engaged. Monitoring structural integrity.</p>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-[600px] lg:min-h-0">
         
         {/* Settings & Parameters */}
         <div className="lg:col-span-3 flex flex-col gap-6 order-2 lg:order-1">
            <div className="glass-panel p-6 flex flex-col lg:min-h-0 lg:h-full overflow-hidden">
               <h3 className="font-heading font-semibold text-sm uppercase tracking-wider text-muted mb-4 flex items-center gap-2 shrink-0">
                 <Settings className="w-4 h-4"/> Input Target
               </h3>
               
               <div className="overflow-x-auto lg:overflow-y-auto lg:overflow-x-hidden custom-scrollbar flex lg:flex-col lg:flex-1 lg:-mx-2 lg:px-2 gap-2 pb-2 lg:pb-0">
                 {Object.entries(EXERCISES).map(([key, { name }]) => (
                   <button key={key} disabled={isCounting} onClick={() => handleExerciseChange(key)} className={cn("shrink-0 whitespace-nowrap lg:w-full text-left px-4 py-2.5 lg:p-3 rounded-lg border text-sm font-medium transition-all flex items-center justify-between", currentExercise === key ? "bg-accent/10 border-accent/40 text-accent" : "bg-surface/30 border-border/5 hover:border-border/20 text-muted")}>
                     {name}
                     {currentExercise === key && <Check className="w-4 h-4 ml-2"/>}
                   </button>
                 ))}
               </div>
            </div>
            
            <div className="glass-panel p-5 bg-surface/30">
               <h3 className="text-xs font-semibold uppercase tracking-wider text-accent mb-3 flex items-center gap-1.5">
                 <AlertTriangle className="w-3 h-3"/> Syntax
               </h3>
               <ul className="space-y-2">
                 {EXERCISE_INSTRUCTIONS[currentExercise].map((inst, i) => (
                   <li key={i} className="text-xs text-muted flex items-start gap-2">
                     <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-accent/50 mt-1" /> {inst}
                   </li>
                 ))}
               </ul>
            </div>
         </div>
         
         {/* Hardware View & Overlays */}
         <div className="lg:col-span-9 flex flex-col h-full gap-6 order-1 lg:order-2">
            <div className="relative glass-panel rounded-2xl overflow-hidden flex-1 min-h-[350px] lg:min-h-0 bg-black border border-border/10 flex items-center justify-center isolate">
               
               {/* Video Element */}
               <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover opacity-50 z-0" />
               <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover z-10" />

               {/* Metric Overlays */}
               <div className="absolute top-3 left-3 right-3 md:top-6 md:left-6 md:right-6 z-20 flex flex-wrap justify-between gap-2 md:gap-4">
                 <div className="flex gap-2 md:gap-4">
                   <div className="px-3 py-2 md:px-5 md:py-3 rounded-xl bg-background/80 backdrop-blur-md border border-border/10 flex flex-col items-center min-w-[70px] md:min-w-[100px]">
                     <span className="text-[10px] md:text-xs font-medium text-muted uppercase tracking-wider mb-0.5 md:mb-1">Count</span>
                     <span className="text-2xl md:text-4xl font-mono font-bold text-foreground leading-none">{repCount}</span>
                   </div>
                   <div className="px-3 py-2 md:px-5 md:py-3 rounded-xl bg-background/80 backdrop-blur-md border border-border/10 flex flex-col items-center">
                     <span className="text-[10px] md:text-xs font-medium text-muted uppercase tracking-wider mb-0.5 md:mb-1">State Vector</span>
                     <span className="text-[11px] md:text-sm font-mono font-bold text-accent uppercase tracking-widest mt-1 md:mt-2">{currentState}</span>
                   </div>
                 </div>
                 
                 <div className="px-3 py-2 md:px-4 md:py-2 rounded-lg bg-background/80 backdrop-blur-md border border-border/10 flex items-center gap-1.5 md:gap-2 self-start">
                   <span className="text-[10px] md:text-xs font-medium uppercase text-muted">Integrity:</span>
                   <span className={cn("text-[10px] md:text-xs font-bold uppercase", formQuality === 'Perfect' ? "text-accent" : formQuality === 'Good' ? "text-yellow-400" : "text-red-500")}>
                     {formQuality}
                   </span>
                 </div>
               </div>

            </div>
            
            {/* Controls */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 shrink-0">
               {!isCounting ? (
                 <button onClick={handleStartCounting} className="lg:col-span-2 bg-accent text-background font-bold text-[11px] sm:text-sm tracking-wide rounded-xl hover:bg-accent/90 transition-colors flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-4 px-2 sm:px-4 text-center">
                   <Play className="w-4 h-4 sm:w-5 sm:h-5"/> Initiate Capture
                 </button>
               ) : (
                 <button onClick={handleStopCounting} className="lg:col-span-2 bg-yellow-500 text-background font-bold text-[11px] sm:text-sm tracking-wide rounded-xl hover:bg-yellow-400 transition-colors flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-4 px-2 sm:px-4 text-center">
                   <Square className="w-4 h-4 sm:w-5 sm:h-5"/> Suspend Capture
                 </button>
               )}
               <button onClick={handleEndWorkout} className="lg:col-span-2 bg-surface border border-border/10 text-foreground font-bold text-[11px] sm:text-sm tracking-wide rounded-xl hover:bg-foreground/5 transition-colors flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-4 px-2 sm:px-4 text-center">
                  Terminate Payload
               </button>
            </div>
         </div>
      </div>

      <AnimatePresence>
        {isCalculating && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/90 backdrop-blur-xl">
             <div className="flex flex-col items-center">
                <Activity className="w-16 h-16 text-accent animate-pulse mb-6" />
                <h2 className="text-2xl font-bold font-heading mb-2">Calculating Output Matrix</h2>
                <p className="text-muted font-mono text-sm">Synchronizing repetitions with biological profile variables...</p>
             </div>
          </motion.div>
        )}
        
        {showResult && caloriesResult !== null && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/90 backdrop-blur-xl">
             <div className="glass-panel max-w-lg w-full p-12 text-center overflow-hidden relative">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-accent to-transparent"></div>
                <h2 className="text-xl font-semibold mb-6 uppercase tracking-widest text-muted">Energy Depleted</h2>
                <div className="text-8xl font-black font-mono text-foreground mb-4 tracking-tighter">
                  {Math.round(caloriesResult)}
                </div>
                <div className="text-sm font-medium text-accent uppercase tracking-widest mb-8">Kilocals (Est.)</div>
                
                <div className="space-y-2 bg-surface/30 p-4 rounded-xl text-left border border-border/5">
                   <p className="text-xs text-muted uppercase font-bold tracking-wider mb-2">Payload Summary</p>
                   {workoutLog.map((log, i) => (
                     <div key={i} className="flex justify-between text-sm">
                       <span className="text-foreground">{log.name}</span>
                       <span className="font-mono">{log.reps} reps</span>
                     </div>
                   ))}
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default WorkoutTracker;
