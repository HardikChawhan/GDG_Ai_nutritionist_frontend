import React, { useState, useEffect, useRef } from 'react';
import * as poseDetection from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import './WorkoutTracker.css';
import { useAuth } from '../contexts/AuthContext';
import voiceAssistantService from '../services/voiceAssistantService';
import { getHealthProfile } from '../services/firebaseService';

// Cookie helpers for calories burned
const saveCaloriesBurnedToCookie = (date, calories) => {
  const dateKey = date || new Date().toISOString().split('T')[0];
  const cookieKey = `caloriesBurned_${dateKey}`;
  
  // Get current value
  const currentValue = parseInt(getCookie(cookieKey)) || 0;
  const newValue = currentValue + calories;
  
  // Save with 1 year expiry
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);
  document.cookie = `${cookieKey}=${newValue}; expires=${expires.toUTCString()}; path=/; SameSite=Strict`;
  
  console.log(`✅ Calories burned saved to cookie: ${cookieKey}=${newValue}`);
  return newValue;
};

const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
};

// Import workout utilities
import { 
  calculateAngle, 
  calculateVerticalAngle,
  calculateHorizontalDistance,
  SquatStateMachine,
  BenchPressStateMachine,
  DeadliftStateMachine,
  PushUpStateMachine,
  PullUpStateMachine,
  ShoulderPressStateMachine,
  LateralRaiseStateMachine,
  LungeStateMachine
} from '../utils/workoutUtils';

const EXERCISES = {
  squat: { name: 'Squats', icon: '🧍' },
  bench: { name: 'Bench Press', icon: '💪' },
  deadlift: { name: 'Deadlift', icon: '🏋️' },
  pushup: { name: 'Push-ups', icon: '🤸' },
  pullup: { name: 'Pull-ups', icon: '🔥' },
  shoulderpress: { name: 'Shoulder Press', icon: '💪' },
  lateralraise: { name: 'Lateral Raises', icon: '✋' },
  lunge: { name: 'Lunges', icon: '🚶' }
};

const EXERCISE_INSTRUCTIONS = {
  squat: [
    'Stand sideways to camera',
    'Keep entire body visible',
    'Squat down until thighs parallel to ground',
    'Keep knees behind toes'
  ],
  bench: [
    'Face camera or use side view',
    'Keep arms visible',
    'Lower arms to 90° elbow angle',
    'Press back up to full extension'
  ],
  deadlift: [
    'Stand sideways to camera',
    'Keep back straight',
    'Lift from bent position to standing',
    'Fully extend hips at top'
  ],
  pushup: [
    'Position sideways to camera',
    'Maintain plank position',
    'Lower chest until elbows at 90°',
    'Keep body straight - engage core'
  ],
  pullup: [
    'Face camera directly',
    'Hang with arms extended',
    'Pull until chin above bar level',
    'Control the descent'
  ],
  shoulderpress: [
    'Face camera or use side view',
    'Start with arms at 90° (shoulder level)',
    'Press weights overhead until arms straight',
    'Control the descent back to start'
  ],
  lateralraise: [
    'Face camera directly',
    'Arms start at sides',
    'Raise arms to shoulder height',
    'Control the descent'
  ],
  lunge: [
    'Stand sideways to camera',
    'Step forward into lunge',
    'Both knees should reach 90°',
    'Push back to standing'
  ]
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
  
  // Keep refs in sync with state for animation loop
  useEffect(() => {
    isCountingRef.current = isCounting;
  }, [isCounting]);
  
  useEffect(() => {
    currentExerciseRef.current = currentExercise;
    if (stateMachinesRef.current[currentExercise]) {
      stateMachineRef.current = stateMachinesRef.current[currentExercise];
    }
  }, [currentExercise]);
  
  // Load user health profile
  useEffect(() => {
    const loadUserProfile = async () => {
      if (currentUser) {
        try {
          const profile = await getHealthProfile(currentUser.uid);
          setUserProfile(profile);
          console.log('✅ User profile loaded for workout:', profile);
        } catch (error) {
          console.error('Error loading user profile:', error);
        }
      }
    };
    
    loadUserProfile();
  }, [currentUser]);
  
  // Initialize TensorFlow and pose detection
  useEffect(() => {
    const initializePoseDetection = async () => {
      try {
        console.log('🧠 Loading pose detection model...');
        
        await tf.setBackend('webgl');
        await tf.ready();
        
        const detectorConfig = {
          modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING
        };
        
        const poseDetector = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          detectorConfig
        );
        
        setDetector(poseDetector);
        setIsModelLoaded(true);
        console.log('✅ Model loaded successfully');
        
        // Initialize state machines
        initializeStateMachines();
      } catch (error) {
        console.error('❌ Error loading model:', error);
        alert('Failed to load pose detection model. Please refresh the page.');
      }
    };
    
    initializePoseDetection();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      stopCamera();
    };
  }, []);
  
  // Initialize camera when workout becomes active
  useEffect(() => {
    if (isWorkoutActive && isModelLoaded) {
      startCamera();
    } else {
      stopCamera();
    }
  }, [isWorkoutActive, isModelLoaded]);
  
  // Voice command listener
  useEffect(() => {
    if (!currentUser) return;
    
    const handleVoiceCommand = (command) => {
      const lowerCommand = command.toLowerCase();
      
      if (lowerCommand.includes('initiate workout') || lowerCommand.includes('start workout session')) {
        if (!isWorkoutActive) {
          setIsWorkoutActive(true);
          speakFeedback('Workout session initiated. Select an exercise to begin.');
        }
      } else if (lowerCommand.includes('start workout') || lowerCommand.includes('begin counting')) {
        if (isWorkoutActive && !isCounting) {
          setIsCounting(true);
          speakFeedback(`Starting ${EXERCISES[currentExercise].name}. Let's go!`);
        }
      } else if (lowerCommand.includes('stop counting') || lowerCommand.includes('pause counting')) {
        if (isCounting) {
          setIsCounting(false);
          speakFeedback('Counting paused.');
        }
      } else if (lowerCommand.includes('end workout') || lowerCommand.includes('finish workout')) {
        if (isWorkoutActive) {
          handleEndWorkout();
        }
      }
    };
    
    // Listen for voice commands via the voice assistant service
    const originalCallback = voiceAssistantService.onTranscriptCallback;
    voiceAssistantService.onTranscriptCallback = (transcript, isFinal) => {
      if (isFinal) {
        handleVoiceCommand(transcript);
      }
      if (originalCallback) originalCallback(transcript, isFinal);
    };
    
    return () => {
      voiceAssistantService.onTranscriptCallback = originalCallback;
    };
  }, [currentUser, isWorkoutActive, isCounting, currentExercise, workoutLog]);
  
  const initializeStateMachines = () => {
    console.log('🔧 Initializing state machines...');
    stateMachinesRef.current = {
      squat: new SquatStateMachine(),
      bench: new BenchPressStateMachine(),
      deadlift: new DeadliftStateMachine(),
      pushup: new PushUpStateMachine(),
      pullup: new PullUpStateMachine(),
      shoulderpress: new ShoulderPressStateMachine(),
      lateralraise: new LateralRaiseStateMachine(),
      lunge: new LungeStateMachine()
    };
    
    // Default to squat
    stateMachineRef.current = stateMachinesRef.current['squat'];
    console.log('✅ State machines initialized. Current:', stateMachineRef.current);
  };
  
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      });
      
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
    } catch (error) {
      console.error('Camera error:', error);
      alert('Failed to access camera. Please check permissions.');
    }
  };
  
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  };
  
  const detectPose = async () => {
    if (!detector || !videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const detect = async () => {
      if (video.readyState === 4) {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw video frame
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
        ctx.restore();
        
        // Detect poses
        const poses = await detector.estimatePoses(video);
        
        if (poses.length > 0) {
          const pose = poses[0];
          console.log('✅ Pose detected with', pose.keypoints.length, 'keypoints');
          
          // Mirror keypoint coordinates to match video
          const mirroredPose = {
            ...pose,
            keypoints: pose.keypoints.map(kp => ({
              ...kp,
              x: canvas.width - kp.x
            }))
          };
          
          drawPose(ctx, mirroredPose);
          
          // Only count reps when isCounting is true (use ref for animation loop)
          if (isCountingRef.current) {
            console.log('🔢 Counting mode - updating exercise state');
            updateExerciseState(pose); // Use original pose for angle calculations
          }
        } else {
          console.log('⚠️ No pose detected in frame');
        }
      }
      
      animationRef.current = requestAnimationFrame(detect);
    };
    
    detect();
  };
  
  const drawPose = (ctx, pose) => {
    const keypoints = pose.keypoints;
    
    // Draw skeleton connections first (underneath keypoints)
    const connections = [
      ['left_shoulder', 'right_shoulder'],
      ['left_shoulder', 'left_elbow'],
      ['left_elbow', 'left_wrist'],
      ['right_shoulder', 'right_elbow'],
      ['right_elbow', 'right_wrist'],
      ['left_shoulder', 'left_hip'],
      ['right_shoulder', 'right_hip'],
      ['left_hip', 'right_hip'],
      ['left_hip', 'left_knee'],
      ['left_knee', 'left_ankle'],
      ['right_hip', 'right_knee'],
      ['right_knee', 'right_ankle']
    ];
    
    connections.forEach(([start, end]) => {
      const startKp = keypoints.find(kp => kp.name === start);
      const endKp = keypoints.find(kp => kp.name === end);
      
      if (startKp && endKp && startKp.score > 0.3 && endKp.score > 0.3) {
        ctx.beginPath();
        ctx.moveTo(startKp.x, startKp.y);
        ctx.lineTo(endKp.x, endKp.y);
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    });
    
    // Draw keypoints on top
    keypoints.forEach(kp => {
      if (kp.score > 0.3) {
        // Draw outer circle (border)
        ctx.beginPath();
        ctx.arc(kp.x, kp.y, 7, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        
        // Draw inner circle
        ctx.beginPath();
        ctx.arc(kp.x, kp.y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = '#00ff00';
        ctx.fill();
      }
    });
  };
  
  const updateExerciseState = (pose) => {
    if (!stateMachineRef.current) {
      console.log('❌ State machine not initialized');
      return;
    }
    
    const keypoints = pose.keypoints;
    
    // Helper to get keypoint by index with confidence check
    const getPoint = (index, minConfidence = 0.3) => {
      if (!keypoints || !keypoints[index]) return null;
      const kp = keypoints[index];
      return kp.score >= minConfidence ? { x: kp.x, y: kp.y } : null;
    };
    
    console.log('📊 Current exercise:', currentExerciseRef.current, '| State:', stateMachineRef.current.state, '| Reps:', stateMachineRef.current.repCount);
    
    // Calculate angles based on exercise type
    let angles = {};
    let distances = {};
    
    switch (currentExerciseRef.current) {
      case 'squat': {
        // MoveNet indices: 5=left_shoulder, 11=left_hip, 13=left_knee, 15=left_ankle
        const leftShoulder = getPoint(5);
        const leftHip = getPoint(11);
        const leftKnee = getPoint(13);
        const leftAnkle = getPoint(15);
        
        // Fallback to right side: 6=right_shoulder, 12=right_hip, 14=right_knee, 16=right_ankle
        const rightShoulder = getPoint(6);
        const rightHip = getPoint(12);
        const rightKnee = getPoint(14);
        const rightAnkle = getPoint(16);
        
        // Use whichever side is more visible
        const shoulder = leftShoulder || rightShoulder;
        const hip = leftHip || rightHip;
        const knee = leftKnee || rightKnee;
        const ankle = leftAnkle || rightAnkle;
        
        if (hip && knee && ankle && shoulder) {
          angles.knee = calculateAngle(hip, knee, ankle);
          angles.hip = calculateAngle(shoulder, hip, knee);
          angles.torsoLean = calculateVerticalAngle(shoulder, hip);
          distances.kneeToe = calculateHorizontalDistance(knee, ankle);
          distances.legLength = Math.abs(hip.y - ankle.y);
          console.log('🦵 Squat angles:', {
            knee: angles.knee?.toFixed(1),
            hip: angles.hip?.toFixed(1),
            torsoLean: angles.torsoLean?.toFixed(1)
          });
        } else {
          console.log('⚠️ Missing squat keypoints:', { hip: !!hip, knee: !!knee, ankle: !!ankle, shoulder: !!shoulder });
        }
        break;
      }
      
      case 'bench':
      case 'pushup': {
        // Use elbow angle for bench press and push-ups
        const shoulder = getPoint('left_shoulder') || getPoint('right_shoulder');
        const elbow = getPoint('left_elbow') || getPoint('right_elbow');
        const wrist = getPoint('left_wrist') || getPoint('right_wrist');
        
        if (shoulder && elbow && wrist) {
          angles.elbow = calculateAngle(shoulder, elbow, wrist);
        }
        break;
      }
      
      case 'deadlift': {
        const shoulder = getPoint('left_shoulder');
        const hip = getPoint('left_hip');
        const knee = getPoint('left_knee');
        const ankle = getPoint('left_ankle');
        
        if (shoulder && hip && knee && ankle) {
          angles.hip = calculateAngle(shoulder, hip, knee);
          angles.knee = calculateAngle(hip, knee, ankle);
          angles.backAngle = calculateVerticalAngle(shoulder, hip);
        }
        break;
      }
      
      case 'pullup': {
        const shoulder = getPoint(5) || getPoint(6);
        const elbow = getPoint(7) || getPoint(8);
        const wrist = getPoint(9) || getPoint(10);
        
        if (shoulder && elbow && wrist) {
          angles.elbow = calculateAngle(shoulder, elbow, wrist);
        }
        break;
      }
      
      case 'shoulderpress': {
        const leftShoulder = getPoint(5);
        const leftElbow = getPoint(7);
        const leftWrist = getPoint(9);
        const rightShoulder = getPoint(6);
        const rightElbow = getPoint(8);
        const rightWrist = getPoint(10);
        
        if (leftShoulder && leftElbow && leftWrist) {
          angles.leftElbow = calculateAngle(leftShoulder, leftElbow, leftWrist);
        }
        if (rightShoulder && rightElbow && rightWrist) {
          angles.rightElbow = calculateAngle(rightShoulder, rightElbow, rightWrist);
        }
        
        // Pass positions for wrist height check
        distances = { leftWrist, rightWrist, leftShoulder, rightShoulder };
        
        console.log('💪 ShoulderPress angles:', {
          leftElbow: angles.leftElbow?.toFixed(1),
          rightElbow: angles.rightElbow?.toFixed(1)
        });
        break;
      }
      
      case 'lateralraise': {
        const shoulder = getPoint(5) || getPoint(6);
        const elbow = getPoint(7) || getPoint(8);
        const hip = getPoint(11) || getPoint(12);
        
        if (shoulder && elbow && hip) {
          angles.shoulder = calculateAngle(hip, shoulder, elbow);
        }
        break;
      }
      
      case 'lunge': {
        const hip = getPoint(11) || getPoint(12);
        const knee = getPoint(13) || getPoint(14);
        const ankle = getPoint(15) || getPoint(16);
        
        if (hip && knee && ankle) {
          angles.knee = calculateAngle(hip, knee, ankle);
        }
        break;
      }
    }
    
    // Update state machine
    const prevRepCount = stateMachineRef.current.repCount;
    const prevState = stateMachineRef.current.state;
    stateMachineRef.current.update(angles, distances);
    const newState = stateMachineRef.current.state;
    const newRepCount = stateMachineRef.current.repCount;
    
    // Log state changes
    if (prevState !== newState) {
      console.log('🔄 State changed:', prevState, '→', newState);
    }
    
    // Check if rep count increased
    if (newRepCount > prevRepCount) {
      console.log('🎉 REP COUNTED! Total:', newRepCount);
      setRepCount(newRepCount);
      speakFeedback(`Rep ${newRepCount}`);
    }
    
    // Update UI
    setCurrentState(newState);
    
    // Update form quality based on feedback
    const feedback = stateMachineRef.current.feedbackMessages;
    if (feedback.length > 0) {
      const hasError = feedback.some(f => f.type === 'error');
      const hasWarning = feedback.some(f => f.type === 'warning');
      
      if (hasError) setFormQuality('Poor');
      else if (hasWarning) setFormQuality('Good');
      else setFormQuality('Perfect');
    }
  };
  
  const speakFeedback = (message) => {
    if (voiceAssistantService.ttsEnabled) {
      voiceAssistantService.speak(message);
    }
  };
  
  const handleExerciseChange = (exercise) => {
    if (isCounting) {
      speakFeedback('Please stop counting before changing exercise.');
      return;
    }
    
    setCurrentExercise(exercise);
    stateMachineRef.current = stateMachinesRef.current[exercise];
    setRepCount(0);
    setCurrentState('Standing');
    setFormQuality('Perfect');
  };
  
  const handleStartCounting = () => {
    setIsCounting(true);
    speakFeedback(`Starting ${EXERCISES[currentExercise].name}. Let's go!`);
  };
  
  const handleStopCounting = () => {
    if (isCounting && repCount > 0) {
      // Log the workout
      const existingLog = workoutLog.find(log => log.exercise === currentExercise);
      if (existingLog) {
        existingLog.reps += repCount;
      } else {
        setWorkoutLog([...workoutLog, {
          exercise: currentExercise,
          reps: repCount,
          name: EXERCISES[currentExercise].name
        }]);
      }
    }
    
    setIsCounting(false);
    speakFeedback('Counting paused.');
  };
  
  const handleEndWorkout = async () => {
    setIsCounting(false);
    setIsWorkoutActive(false);
    setIsCalculating(true);
    
    // Add current exercise to log if counting
    let finalLog = [...workoutLog];
    if (repCount > 0) {
      const existingLog = finalLog.find(log => log.exercise === currentExercise);
      if (existingLog) {
        existingLog.reps += repCount;
      } else {
        finalLog.push({
          exercise: currentExercise,
          reps: repCount,
          name: EXERCISES[currentExercise].name
        });
      }
    }
    
    try {
      // Send workout data to backend for calorie calculation
      const response = await fetch('http://localhost:5000/api/workout/calculate-calories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.uid,
          workouts: finalLog,
          userProfile: userProfile // Include user's health profile for personalized calculation
        })
      });
      
      const data = await response.json();
      
      setCaloriesResult(data.totalCalories);
      setIsCalculating(false);
      setShowResult(true);
      
      speakFeedback(`Congratulations! You have burned ${Math.round(data.totalCalories)} calories!`);

      // Save calories burned to cookies (persists across refresh and hosting)
      if (data?.totalCalories) {
        try {
          const newTotal = saveCaloriesBurnedToCookie(null, data.totalCalories);
          console.log(`✅ Total calories burned today: ${newTotal}`);
        } catch (error) {
          console.error('❌ Error saving calories to cookie:', error);
        }
      }
      
      // Hide result after 5 seconds
      setTimeout(() => {
        setShowResult(false);
        resetWorkout();
      }, 5000);
    } catch (error) {
      console.error('Error calculating calories:', error);
      setIsCalculating(false);
      alert('Failed to calculate calories. Please try again.');
    }
  };
  
  const resetWorkout = () => {
    setWorkoutLog([]);
    setRepCount(0);
    setCurrentState('Standing');
    setFormQuality('Perfect');
    setCaloriesResult(null);
    
    // Reset all state machines
    Object.values(stateMachinesRef.current).forEach(sm => sm.reset());
  };
  
  return (
    <div className="workout-tracker">
      <div className="workout-header">
        <h1>🏋️ AI Fitness Tracker</h1>
        <p>Real-time rep counting with AI feedback</p>
      </div>
      
      {!isWorkoutActive ? (
        <div className="workout-start-screen">
          <button 
            className="start-workout-btn"
            onClick={() => setIsWorkoutActive(true)}
            disabled={!isModelLoaded}
          >
            {isModelLoaded ? 'Start Workout Session' : 'Loading Model...'}
          </button>
          <p className="voice-hint">Or say: "{voiceAssistantService.agentConfig?.name || 'Jarvis'} initiate workout"</p>
        </div>
      ) : (
        <>
          <div className="exercise-selection">
            <h3>Select Exercise</h3>
            <div className="exercise-grid">
              {Object.entries(EXERCISES).map(([key, { name, icon }]) => (
                <button
                  key={key}
                  className={`exercise-btn ${currentExercise === key ? 'active' : ''}`}
                  onClick={() => handleExerciseChange(key)}
                  disabled={isCounting}
                >
                  <span className="exercise-icon">{icon}</span>
                  <span className="exercise-name">{name}</span>
                </button>
              ))}
            </div>
          </div>
          
          <div className="workout-instructions">
            <h3>Instructions for {EXERCISES[currentExercise].name}</h3>
            <ul>
              {EXERCISE_INSTRUCTIONS[currentExercise].map((instruction, index) => (
                <li key={index}>{instruction}</li>
              ))}
            </ul>
          </div>
          
          <div className="video-section">
            <div className="video-container">
              <video ref={videoRef} autoPlay playsInline muted />
              <canvas ref={canvasRef} />
            </div>
            
            <div className="stats-panel">
              <div className="stat-card">
                <div className="stat-label">Reps</div>
                <div className="stat-value">{repCount}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">State</div>
                <div className="stat-value small">{currentState}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Form</div>
                <div className="stat-value small">{formQuality}</div>
              </div>
            </div>
          </div>
          
          <div className="workout-controls">
            {!isCounting ? (
              <button className="control-btn start" onClick={handleStartCounting}>
                Start Counting
              </button>
            ) : (
              <button className="control-btn pause" onClick={handleStopCounting}>
                Pause Counting
              </button>
            )}
            <button className="control-btn end" onClick={handleEndWorkout}>
              End Workout
            </button>
          </div>
          
          {workoutLog.length > 0 && (
            <div className="workout-log">
              <h3>Workout Summary</h3>
              <ul>
                {workoutLog.map((log, index) => (
                  <li key={index}>
                    {log.name}: {log.reps} reps
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
      
      {(isCalculating || showResult) && (
        <div className="result-overlay">
          <div className="glass-effect">
            {isCalculating ? (
              <div className="loading-spinner">
                <div className="spinner"></div>
                <p>Calculating calories burned...</p>
              </div>
            ) : (
              <div className="success-popup">
                <div className="confetti"></div>
                <h2>🎉 Congratulations! 🎉</h2>
                <p className="calories-burned">
                  You burned <span className="calories-number">{Math.round(caloriesResult)}</span> calories!
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkoutTracker;
