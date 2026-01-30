// Voice Assistant Service - Integrates JARVIS with Gemini AI
import Cookies from 'js-cookie';

class VoiceAssistantService {
  constructor() {
    this.recognition = null;
    this.synthesis = window.speechSynthesis;
    this.isListening = false;
    this.isActive = false;
    this.isSpeaking = false;
    this.ttsEnabled = false;
    this.pendingMessages = [];
    this.agentConfig = null;
    this.conversationHistory = [];
    this.onTranscriptCallback = null;
    this.onResponseCallback = null;
    this.userContext = null;
  }

  enableTTS() {
    console.log('🎙️ TTS enabled by user interaction');
    this.ttsEnabled = true;
    
    // Speak any pending messages
    if (this.pendingMessages.length > 0) {
      const message = this.pendingMessages.shift();
      this.speak(message);
    }
  }

  // Initialize with agent configuration
  async initialize(agentConfig, userContext) {
    this.agentConfig = agentConfig;
    this.userContext = userContext;
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      throw new Error('Speech Recognition not supported in this browser');
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true; // Continuous listening
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 1;

    // Initialize TTS with silent utterance to enable it (Chrome autoplay policy workaround)
    try {
      await this.loadVoices();
      const utterance = new SpeechSynthesisUtterance('');
      this.synthesis.speak(utterance);
      console.log('✅ TTS initialized successfully');
    } catch (error) {
      console.warn('⚠️ TTS initialization warning:', error);
    }

    this.setupRecognitionHandlers();
  }

  async loadVoices() {
    return new Promise((resolve) => {
      let voices = this.synthesis.getVoices();
      if (voices.length > 0) {
        console.log('📢 Voices loaded:', voices.length);
        resolve(voices);
      } else {
        this.synthesis.onvoiceschanged = () => {
          voices = this.synthesis.getVoices();
          console.log('📢 Voices loaded (delayed):', voices.length);
          resolve(voices);
        };
        // Timeout fallback
        setTimeout(() => resolve(this.synthesis.getVoices()), 1000);
      }
    });
  }

  setupRecognitionHandlers() {
    this.recognition.onstart = () => {
      console.log('Voice recognition started');
      this.isListening = true;
      
      // Stop any ongoing speech when user starts speaking
      if (this.isSpeaking) {
        console.log('User started speaking, stopping TTS');
        this.synthesis.cancel();
        this.isSpeaking = false;
      }
    };

    this.recognition.onresult = (event) => {
      this.handleRecognitionResult(event);
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      
      if (event.error === 'no-speech') {
        // Automatically restart if stopped
        if (this.isActive) {
          setTimeout(() => this.start(), 100);
        }
      } else if (event.error === 'audio-capture' || event.error === 'not-allowed') {
        this.isListening = false;
        this.isActive = false;
        console.error('Microphone access error');
      }
    };

    this.recognition.onend = () => {
      console.log('Voice recognition ended, isActive:', this.isActive, 'isSpeaking:', this.isSpeaking);
      this.isListening = false;
      
      // Auto-restart if still active (with delay to prevent race conditions)
      if (this.isActive) {
        console.log('⏰ Scheduling restart in 300ms...');
        setTimeout(() => {
          if (this.isActive && !this.isListening) {
            console.log('🔄 Auto-restarting recognition');
            this.start();
          } else {
            console.log('❌ Not restarting - isActive:', this.isActive, 'isListening:', this.isListening);
          }
        }, 300);
      }
    };
  }

  handleRecognitionResult(event) {
    const results = event.results;
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < results.length; i++) {
      const transcript = results[i][0].transcript;
      
      if (results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }

    // Show interim results
    if (interimTranscript) {
      console.log('🎤 Interim:', interimTranscript);
      if (this.onTranscriptCallback) {
        this.onTranscriptCallback(interimTranscript, false);
      }
    }

    // Process final results - check for wake word
    if (finalTranscript) {
      console.log('✅ Final transcript:', finalTranscript);
      this.processFinalTranscript(finalTranscript.trim());
    }
  }

  async processFinalTranscript(transcript) {
    const lowerTranscript = transcript.toLowerCase();
    const wakeWord = this.agentConfig?.name?.toLowerCase() || 'assistant';
    
    console.log('🔍 Checking for wake word:', wakeWord, 'in:', lowerTranscript);

    // Check if wake word is mentioned
    if (lowerTranscript.includes(wakeWord)) {
      console.log('✅ Wake word detected!');
      
      // Extract command (remove wake word)
      const command = transcript
        .replace(new RegExp(this.agentConfig.name, 'gi'), '')
        .trim();

      // Show transcript
      if (this.onTranscriptCallback) {
        this.onTranscriptCallback(transcript, true);
      }

      // If no command, just greet
      if (command.length === 0) {
        const greeting = {
          success: true,
          message: `Yes? I'm listening. How can I help you?`,
          intent: 'wake_word_only'
        };
        
        if (this.onResponseCallback) {
          this.onResponseCallback(greeting);
        }
        this.speak(greeting.message);
      } else {
        // Process command
        await this.processCommand(command);
      }
    } else {
      console.log('❌ Wake word not detected. Looking for:', wakeWord);
    }
  }

  async processCommand(command) {
    console.log('Processing command:', command);

    // Detect intent
    const intent = this.detectIntent(command);
    console.log('Detected intent:', intent);

    let response;

    try {
      // Route to appropriate handler
      switch (intent.type) {
        case 'navigation':
          response = await this.handleNavigation(intent);
          break;
        case 'nutrition_log':
          response = await this.handleNutritionLog(intent);
          break;
        case 'nutrition_query':
          response = await this.handleNutritionQuery(intent);
          break;
        case 'workout_log':
          response = await this.handleWorkoutLog(intent);
          break;
        case 'general_query':
        default:
          response = await this.handleGeneralQuery(intent);
          break;
      }

      // Add to conversation history
      this.conversationHistory.push({
        user: command,
        assistant: response.message,
        timestamp: new Date().toISOString()
      });

      // Show response
      if (this.onResponseCallback) {
        this.onResponseCallback(response);
      }

      // Speak response
      this.speak(response.message);

      return response;
    } catch (error) {
      console.error('Error processing command:', error);
      const errorResponse = {
        success: false,
        message: "I'm having trouble processing that. Could you try again?",
        intent: intent.type
      };
      
      if (this.onResponseCallback) {
        this.onResponseCallback(errorResponse);
      }
      
      this.speak(errorResponse.message);
      return errorResponse;
    }
  }

  detectIntent(input) {
    const lower = input.toLowerCase();
    
    // Navigation patterns - "initiate workout"
    if (this.matchPattern(lower, ['initiate workout', 'start workout session', 'begin workout', 'open workout'])) {
      return { type: 'navigation', destination: '/workout', rawInput: input };
    }
    
    // Nutrition logging patterns - INCLUDING "log" keyword
    if (this.matchPattern(lower, ['ate', 'had', 'consumed', 'eating', 'just ate', 'log', 'track', 'add'])) {
      return { type: 'nutrition_log', rawInput: input, entities: this.extractFoodEntities(input) };
    }
    
    // Nutrition query patterns
    if (this.matchPattern(lower, ['calories', 'macros', 'protein', 'carbs', 'nutrition', 'how much'])) {
      return { type: 'nutrition_query', rawInput: input };
    }
    
    // Workout logging patterns
    if (this.matchPattern(lower, ['did', 'completed', 'finished', 'workout', 'exercise', 'ran', 'lifted'])) {
      return { type: 'workout_log', rawInput: input, entities: this.extractWorkoutEntities(input) };
    }
    
    return { type: 'general_query', rawInput: input };
  }

  matchPattern(text, keywords) {
    return keywords.some(keyword => text.includes(keyword));
  }

  extractFoodEntities(input) {
    // Remove common action words to get clean food name
    const actionWords = [
      'i ate', 'i had', 'i consumed', 'i\'m eating', 'just ate', 'just had',
      'log', 'track', 'add', 'i', 'ate', 'had', 'consumed', 'eating',
      'just', 'a', 'some', 'my'
    ];
    
    let cleanInput = input.toLowerCase().trim();
    
    // Remove action words from the beginning
    actionWords.forEach(word => {
      const pattern = new RegExp(`^${word}\\s+`, 'i');
      cleanInput = cleanInput.replace(pattern, '');
    });
    
    // Return the COMPLETE food name, not keywords
    // AI will understand the full dish (e.g., "1 kg paneer biryani")
    return { 
      foods: [cleanInput],  // Send complete food description
      rawText: input,
      cleanFoodName: cleanInput
    };
  }

  extractWorkoutEntities(input) {
    const lower = input.toLowerCase();
    const numbers = input.match(/\d+/g);
    
    const exercises = [];
    const commonExercises = [
      'push-ups', 'pushups', 'pull-ups', 'pullups', 'squats', 'bench press',
      'deadlift', 'running', 'jogging', 'cycling', 'swimming'
    ];
    
    commonExercises.forEach(exercise => {
      if (lower.includes(exercise)) {
        exercises.push(exercise);
      }
    });
    
    return {
      exercises,
      reps: numbers ? parseInt(numbers[0]) : null,
      rawText: input
    };
  }

  async handleNavigation(intent) {
    // Navigate to the specified destination
    const destination = intent.destination;
    
    // Dispatch navigation event
    const event = new CustomEvent('voice-navigation', {
      detail: { destination }
    });
    window.dispatchEvent(event);
    
    let message = '';
    if (destination === '/workout') {
      message = 'Opening workout tracker. Get ready to crush it!';
    } else {
      message = `Navigating to ${destination}`;
    }
    
    return {
      success: true,
      message: message,
      intent: intent.type
    };
  }

  async handleNutritionLog(intent) {
    const { foods, cleanFoodName } = intent.entities;
    
    if (!foods || foods.length === 0) {
      return {
        success: false,
        message: "I couldn't identify the food. Could you be more specific?",
        intent: intent.type
      };
    }

    // Call backend to get nutrition data (database + AI hybrid)
    const response = await this.callGeminiAPI({
      intent: 'nutrition_log',
      foods: foods,
      command: intent.rawInput,
      userContext: this.userContext
    });

    // If successful, trigger a custom event to save to Firebase
    if (response.success && response.data) {
      try {
        console.log('💾 Nutrition data received:', response.data);
        
        // Extract nutrition data from backend response
        // Backend returns { foods: [...], totals: {...} }
        let foodData = {
          food: cleanFoodName || (response.data.foods && response.data.foods[0] ? response.data.foods[0].name : intent.rawInput),
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          serving: '1 serving'
        };
        
        // Use totals from all foods combined
        if (response.data.totals) {
          foodData.calories = Math.round(response.data.totals.calories) || 0;
          foodData.protein = Math.round(response.data.totals.protein * 10) / 10 || 0;
          foodData.carbs = Math.round(response.data.totals.carbs * 10) / 10 || 0;
          foodData.fat = Math.round(response.data.totals.fat * 10) / 10 || 0;
        } 
        
        // Get serving size from first food
        if (response.data.foods && response.data.foods.length > 0) {
          const firstFood = response.data.foods[0];
          foodData.serving = firstFood.serving || '1 serving';
        }
        
        console.log('📊 Food data to log:', foodData);
        
        // Dispatch custom event that the app will listen for
        const event = new CustomEvent('voice-food-log', {
          detail: foodData
        });
        window.dispatchEvent(event);
        
        // Simple success message
        const simpleMessage = `Logged ${foodData.food}: ${foodData.calories} calories, ${foodData.protein}g protein, ${foodData.carbs}g carbs, ${foodData.fat}g fat.`;
        
        return {
          success: true,
          message: simpleMessage,
          intent: intent.type,
          data: response.data
        };
      } catch (error) {
        console.error('Error dispatching food log event:', error);
      }
    }

    return response;
  }

  async handleNutritionQuery(intent) {
    // Query current nutrition stats
    const response = await this.callGeminiAPI({
      intent: 'nutrition_query',
      command: intent.rawInput,
      userContext: this.userContext
    });

    return response;
  }

  async handleWorkoutLog(intent) {
    const { exercises, reps } = intent.entities;
    
    const response = await this.callGeminiAPI({
      intent: 'workout_log',
      exercises: exercises,
      reps: reps,
      command: intent.rawInput,
      userContext: this.userContext
    });

    return response;
  }

  async handleGeneralQuery(intent) {
    const response = await this.callGeminiAPI({
      intent: 'general_query',
      command: intent.rawInput,
      userContext: this.userContext
    });

    return response;
  }

  async callGeminiAPI(payload) {
    try {
      // Build context-aware prompt
      const prompt = this.buildContextPrompt(payload);

      // Call backend API
      const response = await fetch('https://ai-nutritionist-backend.onrender.com/api/voice-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          agentName: this.agentConfig?.name || 'Assistant',
          intent: payload.intent,
          payload: payload
        })
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      return {
        success: true,
        message: data.response,
        intent: payload.intent,
        data: data.data || {}
      };
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      
      // Fallback response
      return {
        success: false,
        message: "I'm having trouble connecting to my AI brain. Please try again.",
        intent: payload.intent
      };
    }
  }

  buildContextPrompt(payload) {
    const agentName = this.agentConfig?.name || 'Assistant';
    const userProfile = this.userContext?.healthProfile || {};
    const todayNutrition = this.userContext?.todayNutrition || { foods: [], totals: {} };

    let prompt = `You are ${agentName}, a friendly AI health and fitness assistant. `;
    prompt += `Respond in a conversational, helpful tone as ${agentName}. `;
    prompt += `IMPORTANT: Keep responses SHORT - maximum 2-3 sentences. Be concise and direct.\n`;
    
    // Add user context
    if (userProfile.age) {
      prompt += `\n\nUser Profile:\n`;
      prompt += `- Age: ${userProfile.age}\n`;
      prompt += `- Weight: ${userProfile.weight} kg\n`;
      prompt += `- Goal: ${userProfile.goal}\n`;
      prompt += `- Activity Level: ${userProfile.activityLevel}\n`;
      prompt += `- Dietary Restrictions: ${userProfile.dietaryRestrictions || 'None'}\n`;
      prompt += `- Health Conditions: ${userProfile.healthConditions || 'None'}\n`;
    }

    // Add today's nutrition
    if (todayNutrition.foods && todayNutrition.foods.length > 0) {
      prompt += `\n\nToday's Food Log:\n`;
      todayNutrition.foods.forEach(food => {
        prompt += `- ${food.name} (${food.calories} cal, ${food.protein}g protein)\n`;
      });
      prompt += `\nTotal so far: ${todayNutrition.totals.calories || 0} calories, `;
      prompt += `${todayNutrition.totals.protein || 0}g protein\n`;
    }

    // Add intent-specific context
    prompt += `\n\nUser Command: "${payload.command}"\n`;
    prompt += `Intent: ${payload.intent}\n`;

    if (payload.intent === 'nutrition_log') {
      // For nutrition logging, we don't need conversational response
      // The backend will handle data fetching directly
      prompt += `\n(Nutrition data will be fetched from database/AI automatically)\n`;
    } else if (payload.intent === 'nutrition_query') {
      prompt += `\nProvide a brief summary of their current nutrition progress. Maximum 2 sentences.`;
    } else if (payload.intent === 'workout_log') {
      prompt += `\nAcknowledge the workout briefly and encourage. One sentence only.`;
    } else {
      prompt += `\nRespond helpfully in 1-2 sentences maximum.`;
    }

    return prompt;
  }

  speak(text) {
    console.log('🔊 Speaking:', text.substring(0, 50) + '...');
    
    // If TTS not enabled, queue the message
    if (!this.ttsEnabled) {
      console.log('⚠️ TTS not enabled yet, queueing message. Click the wake word indicator to enable voice.');
      this.pendingMessages.push(text);
      return;
    }
    
    // Stop any ongoing speech
    this.synthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    utterance.lang = 'en-US';

    // Set voice if available
    if (this.agentConfig?.voice) {
      const voices = this.synthesis.getVoices();
      const selectedVoice = voices.find(v => v.name === this.agentConfig.voice);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        console.log('🎙️ Using voice:', selectedVoice.name);
      } else {
        console.log('⚠️ Voice not found, using default');
      }
    }

    utterance.onstart = () => {
      console.log('🔊 TTS started');
      this.isSpeaking = true;
    };

    utterance.onend = () => {
      console.log('🔊 TTS ended');
      this.isSpeaking = false;
      
      // Restart recognition if it stopped during speech
      if (this.isActive && !this.isListening) {
        console.log('🔄 Restarting recognition after TTS');
        setTimeout(() => {
          if (this.isActive && !this.isListening) {
            this.start();
          }
        }, 100);
      }
    };

    utterance.onerror = (event) => {
      console.error('🔊 TTS error:', event.error);
      this.isSpeaking = false;
      
      // If still blocked, disable TTS and queue message
      if (event.error === 'not-allowed') {
        console.log('⚠️ TTS blocked - disabling and queueing. Click wake word indicator to re-enable.');
        this.ttsEnabled = false;
        if (!this.pendingMessages.includes(text)) {
          this.pendingMessages.push(text);
        }
      }
    };

    this.synthesis.speak(utterance);
  }

  start() {
    if (this.recognition && !this.isListening) {
      try {
        if (!this.isActive) {
          this.isActive = true;
        }
        console.log('🎤 Starting recognition, isActive:', this.isActive);
        this.recognition.start();
        console.log('Voice assistant started');
      } catch (error) {
        // Handle "already started" error gracefully
        if (error.message && error.message.includes('already started')) {
          console.log('Recognition already active, skipping start');
          this.isActive = true;
        } else {
          console.error('Error starting recognition:', error);
        }
      }
    }
  }

  stop() {
    this.isActive = false;
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      console.log('Voice assistant stopped');
    }
    if (this.isSpeaking) {
      this.synthesis.cancel();
    }
  }

  updateUserContext(newContext) {
    this.userContext = { ...this.userContext, ...newContext };
  }

  setTranscriptCallback(callback) {
    this.onTranscriptCallback = callback;
  }

  setResponseCallback(callback) {
    this.onResponseCallback = callback;
  }

  clearConversation() {
    this.conversationHistory = [];
  }

  getConversationHistory() {
    return this.conversationHistory;
  }
}

export default new VoiceAssistantService();
