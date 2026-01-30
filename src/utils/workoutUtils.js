// ==============================================
// UTILITY FUNCTIONS FOR FITNESS POSE DETECTION
// ==============================================

// ==============================================
// 1. ANGLE CALCULATION FUNCTIONS
// ==============================================

/**
 * Calculate angle between three points (A, B, C) where B is the vertex
 * Returns angle in degrees at point B
 * @param {Object} pointA - {x, y} coordinates
 * @param {Object} pointB - {x, y} coordinates (vertex)
 * @param {Object} pointC - {x, y} coordinates
 * @returns {number} - angle in degrees (0-180)
 */
export function calculateAngle(pointA, pointB, pointC) {
  if (!pointA || !pointB || !pointC) return null;
  
  const radians1 = Math.atan2(pointA.y - pointB.y, pointA.x - pointB.x);
  const radians2 = Math.atan2(pointC.y - pointB.y, pointC.x - pointB.x);
  
  let angle = Math.abs(radians1 - radians2) * (180 / Math.PI);
  
  if (angle > 180) {
    angle = 360 - angle;
  }
  
  return angle;
}

/**
 * Calculate angle between a line segment and vertical axis
 * @param {Object} point1 - {x, y} top point
 * @param {Object} point2 - {x, y} bottom point
 * @returns {number} - angle from vertical in degrees
 */
export function calculateVerticalAngle(point1, point2) {
  if (!point1 || !point2) return null;
  
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  
  const angleFromVertical = Math.abs(Math.atan2(dx, dy) * (180 / Math.PI));
  
  return angleFromVertical;
}

/**
 * Calculate horizontal distance between two points
 * @param {Object} point1 - {x, y}
 * @param {Object} point2 - {x, y}
 * @returns {number} - horizontal distance
 */
export function calculateHorizontalDistance(point1, point2) {
  if (!point1 || !point2) return null;
  return Math.abs(point1.x - point2.x);
}

/**
 * Calculate Euclidean distance between two points
 * @param {Object} point1 - {x, y}
 * @param {Object} point2 - {x, y}
 * @returns {number} - distance
 */
export function calculateDistance(point1, point2) {
  if (!point1 || !point2) return null;
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// ==============================================
// 2. SQUAT STATE MACHINE
// ==============================================

export class SquatStateMachine {
  constructor() {
    this.state = 'standing';
    this.repCount = 0;
    this.feedbackMessages = [];
    this.lastRepTime = 0;
    
    // More relaxed thresholds for easier detection
    this.thresholds = {
      descendKneeAngle: 150,  // Start descending when knee bends just a bit
      descendHipAngle: 150,
      bottomKneeAngle: 110,   // Don't need to go as deep
      bottomHipAngle: 120,
      ascendKneeAngle: 150,   // Standing position
      depthKneeAngle: 130,    // Min depth required for valid rep
      kneeToeRatio: 0.20,
      torsoLeanAngle: 50
    };
    
    this.minDepthReached = false;
  }
  
  update(angles, distances) {
    this.feedbackMessages = [];
    
    if (!angles.knee) {
      this.feedbackMessages.push({type: 'warning', text: 'Cannot detect legs'});
      console.log('⚠️ Squat SM: Missing knee angle');
      return;
    }
    
    const { knee, hip, torsoLean } = angles;
    const { kneeToe, legLength } = distances || {};
    
    console.log('🦵 Squat:', this.state, '| Knee:', knee?.toFixed(0), '°| Hip:', hip?.toFixed(0), '°| Thresholds: descend<', this.thresholds.descendKneeAngle, 'bottom<', this.thresholds.bottomKneeAngle);
    
    switch(this.state) {
      case 'standing':
        // Start descending when knee angle decreases
        if (knee < this.thresholds.descendKneeAngle) {
          console.log('✅ Squat: standing → descending (knee:', knee.toFixed(0), ')');
          this.state = 'descending';
          this.minDepthReached = false;
        }
        break;
        
      case 'descending':
        // Check for minimum depth
        if (knee < this.thresholds.depthKneeAngle) {
          if (!this.minDepthReached) {
            console.log('✅ Min depth reached! Knee:', knee.toFixed(0));
          }
          this.minDepthReached = true;
        }
        
        // Check if reached bottom position
        if (knee < this.thresholds.bottomKneeAngle) {
          console.log('✅ Squat: descending → bottom (knee:', knee.toFixed(0), ')');
          this.state = 'bottom';
        }
        break;
        
      case 'bottom':
        // Start ascending
        if (knee > this.thresholds.bottomKneeAngle + 15) {
          console.log('✅ Squat: bottom → ascending (knee:', knee.toFixed(0), ')');
          this.state = 'ascending';
        }
        break;
        
      case 'ascending':
        // Complete rep when back to standing
        if (knee > this.thresholds.ascendKneeAngle) {
          if (this.minDepthReached) {
            this.repCount++;
            console.log('🎉 SQUAT REP COMPLETED! Count:', this.repCount);
            this.feedbackMessages.push({type: 'success', text: 'Good rep!'});
            this.lastRepTime = Date.now();
          } else {
            console.log('❌ Rep rejected - did not reach min depth');
            this.feedbackMessages.push({type: 'error', text: 'Too shallow'});
          }
          this.state = 'standing';
          this.minDepthReached = false;
        }
        break;
    }
  }
  
  checkSquatForm(torsoLean, kneeToe, legLength) {
    if (legLength && kneeToe / legLength > this.thresholds.kneeToeRatio) {
      this.feedbackMessages.push({type: 'warning', text: 'Keep knees behind toes'});
    }
    
    if (torsoLean && torsoLean > this.thresholds.torsoLeanAngle) {
      this.feedbackMessages.push({type: 'warning', text: 'Keep torso more upright'});
    }
  }
  
  reset() {
    this.repCount = 0;
    this.state = 'standing';
    this.minDepthReached = false;
  }
}

// ==============================================
// 3. BENCH PRESS STATE MACHINE
// ==============================================

export class BenchPressStateMachine {
  constructor() {
    this.state = 'extended';
    this.repCount = 0;
    this.feedbackMessages = [];
    
    this.thresholds = {
      extendedAngle: 160,
      descendingAngle: 120,
      bottomAngle: 90,
      ascendingAngle: 120
    };
  }
  
  update(angles, distances) {
    this.feedbackMessages = [];
    
    if (!angles.elbow) {
      this.feedbackMessages.push({type: 'warning', text: 'Cannot detect pose'});
      return;
    }
    
    const { elbow } = angles;
    
    switch(this.state) {
      case 'extended':
        if (elbow < this.thresholds.descendingAngle) {
          this.state = 'descending';
        }
        break;
        
      case 'descending':
        if (elbow < this.thresholds.bottomAngle) {
          this.state = 'bottom';
        }
        break;
        
      case 'bottom':
        if (elbow > this.thresholds.bottomAngle + 10) {
          this.state = 'ascending';
        }
        break;
        
      case 'ascending':
        if (elbow > this.thresholds.extendedAngle) {
          this.repCount++;
          this.feedbackMessages.push({type: 'success', text: 'Good rep!'});
          this.state = 'extended';
        }
        break;
    }
  }
  
  reset() {
    this.repCount = 0;
    this.state = 'extended';
  }
}

// ==============================================
// 4. DEADLIFT STATE MACHINE
// ==============================================

export class DeadliftStateMachine {
  constructor() {
    this.state = 'standing';
    this.repCount = 0;
    this.feedbackMessages = [];
    
    this.thresholds = {
      standingHipAngle: 160,
      bendingHipAngle: 120,
      bottomHipAngle: 90,
      liftingHipAngle: 120
    };
  }
  
  update(angles, distances) {
    this.feedbackMessages = [];
    
    if (!angles.hip) {
      this.feedbackMessages.push({type: 'warning', text: 'Cannot detect pose'});
      return;
    }
    
    const { hip } = angles;
    
    switch(this.state) {
      case 'standing':
        if (hip < this.thresholds.bendingHipAngle) {
          this.state = 'bending';
        }
        break;
        
      case 'bending':
        if (hip < this.thresholds.bottomHipAngle) {
          this.state = 'bottom';
        }
        break;
        
      case 'bottom':
        if (hip > this.thresholds.bottomHipAngle + 10) {
          this.state = 'lifting';
        }
        break;
        
      case 'lifting':
        if (hip > this.thresholds.standingHipAngle) {
          this.repCount++;
          this.feedbackMessages.push({type: 'success', text: 'Good rep!'});
          this.state = 'standing';
        }
        break;
    }
  }
  
  reset() {
    this.repCount = 0;
    this.state = 'standing';
  }
}

// ==============================================
// 5. PUSH-UP STATE MACHINE
// ==============================================

export class PushUpStateMachine {
  constructor() {
    this.state = 'up';
    this.repCount = 0;
    this.feedbackMessages = [];
    
    this.thresholds = {
      upAngle: 160,
      descendingAngle: 120,
      bottomAngle: 90,
      ascendingAngle: 120
    };
  }
  
  update(angles, distances) {
    this.feedbackMessages = [];
    
    if (!angles.elbow) {
      this.feedbackMessages.push({type: 'warning', text: 'Cannot detect pose'});
      return;
    }
    
    const { elbow } = angles;
    
    switch(this.state) {
      case 'up':
        if (elbow < this.thresholds.descendingAngle) {
          this.state = 'descending';
        }
        break;
        
      case 'descending':
        if (elbow < this.thresholds.bottomAngle) {
          this.state = 'bottom';
        }
        break;
        
      case 'bottom':
        if (elbow > this.thresholds.bottomAngle + 10) {
          this.state = 'ascending';
        }
        break;
        
      case 'ascending':
        if (elbow > this.thresholds.upAngle) {
          this.repCount++;
          this.feedbackMessages.push({type: 'success', text: 'Good rep!'});
          this.state = 'up';
        }
        break;
    }
  }
  
  reset() {
    this.repCount = 0;
    this.state = 'up';
  }
}

// ==============================================
// 6. PULL-UP STATE MACHINE
// ==============================================

export class PullUpStateMachine {
  constructor() {
    this.state = 'hanging';
    this.repCount = 0;
    this.feedbackMessages = [];
    
    this.thresholds = {
      hangingAngle: 160,
      pullingAngle: 120,
      topAngle: 90,
      descendingAngle: 120
    };
  }
  
  update(angles, distances) {
    this.feedbackMessages = [];
    
    if (!angles.elbow) {
      this.feedbackMessages.push({type: 'warning', text: 'Cannot detect pose'});
      return;
    }
    
    const { elbow } = angles;
    
    switch(this.state) {
      case 'hanging':
        if (elbow < this.thresholds.pullingAngle) {
          this.state = 'pulling';
        }
        break;
        
      case 'pulling':
        if (elbow < this.thresholds.topAngle) {
          this.state = 'top';
        }
        break;
        
      case 'top':
        if (elbow > this.thresholds.topAngle + 10) {
          this.state = 'descending';
        }
        break;
        
      case 'descending':
        if (elbow > this.thresholds.hangingAngle) {
          this.repCount++;
          this.feedbackMessages.push({type: 'success', text: 'Good rep!'});
          this.state = 'hanging';
        }
        break;
    }
  }
  
  reset() {
    this.repCount = 0;
    this.state = 'hanging';
  }
}

// ==============================================
// 7. SHOULDER PRESS STATE MACHINE
// ==============================================

export class ShoulderPressStateMachine {
  constructor() {
    this.state = 'down';
    this.repCount = 0;
    this.feedbackMessages = [];
    this.lastRepTime = 0;
    
    this.thresholds = {
      downElbowAngle: 100,
      upElbowAngle: 160,
      armBalanceTolerance: 20
    };
  }
  
  update(angles, positions) {
    this.feedbackMessages = [];
    
    if (!angles.leftElbow && !angles.rightElbow) {
      this.feedbackMessages.push({type: 'warning', text: 'Face camera - ensure arms visible'});
      return;
    }
    
    const { leftElbow, rightElbow } = angles;
    const { leftWrist, rightWrist, leftShoulder, rightShoulder } = positions || {};
    
    let avgElbow = null;
    if (leftElbow && rightElbow) {
      avgElbow = (leftElbow + rightElbow) / 2;
      
      if (Math.abs(leftElbow - rightElbow) > this.thresholds.armBalanceTolerance) {
        this.feedbackMessages.push({type: 'warning', text: 'Balance both arms evenly'});
      }
    } else {
      avgElbow = leftElbow || rightElbow;
    }
    
    console.log('🏋️ ShoulderPress SM:', { state: this.state, avgElbow: avgElbow?.toFixed(1), thresholdUp: this.thresholds.upElbowAngle, thresholdDown: this.thresholds.downElbowAngle });
    
    let wristsAboveShoulder = false;
    if (leftWrist && leftShoulder && rightWrist && rightShoulder) {
      wristsAboveShoulder = (leftWrist.y < leftShoulder.y && rightWrist.y < rightShoulder.y);
    } else if ((leftWrist && leftShoulder) || (rightWrist && rightShoulder)) {
      // Check at least one side
      wristsAboveShoulder = (leftWrist && leftShoulder && leftWrist.y < leftShoulder.y) ||
                           (rightWrist && rightShoulder && rightWrist.y < rightShoulder.y);
    }
    
    switch(this.state) {
      case 'down':
        if (avgElbow > this.thresholds.upElbowAngle) {
          console.log('✅ ShoulderPress: down → up');
          this.state = 'up';
        }
        break;
        
      case 'up':
        if (avgElbow < this.thresholds.downElbowAngle) {
          this.repCount++;
          console.log('🎉 ShoulderPress REP:', this.repCount);
          this.feedbackMessages.push({type: 'success', text: 'Good rep!'});
          this.state = 'down';
          this.lastRepTime = Date.now();
        }
        break;
    }
  }
  
  reset() {
    this.repCount = 0;
    this.state = 'down';
  }
}

// ==============================================
// 8. LATERAL RAISE STATE MACHINE
// ==============================================

export class LateralRaiseStateMachine {
  constructor() {
    this.state = 'down';
    this.repCount = 0;
    this.feedbackMessages = [];
    
    this.thresholds = {
      downAngle: 30,
      raisingAngle: 60,
      topAngle: 90,
      loweringAngle: 60
    };
  }
  
  update(angles, distances) {
    this.feedbackMessages = [];
    
    if (!angles.shoulder) {
      this.feedbackMessages.push({type: 'warning', text: 'Cannot detect pose'});
      return;
    }
    
    const { shoulder } = angles;
    
    switch(this.state) {
      case 'down':
        if (shoulder > this.thresholds.raisingAngle) {
          this.state = 'raising';
        }
        break;
        
      case 'raising':
        if (shoulder > this.thresholds.topAngle) {
          this.state = 'top';
        }
        break;
        
      case 'top':
        if (shoulder < this.thresholds.topAngle - 10) {
          this.state = 'lowering';
        }
        break;
        
      case 'lowering':
        if (shoulder < this.thresholds.downAngle) {
          this.repCount++;
          this.feedbackMessages.push({type: 'success', text: 'Good rep!'});
          this.state = 'down';
        }
        break;
    }
  }
  
  reset() {
    this.repCount = 0;
    this.state = 'down';
  }
}

// ==============================================
// 9. LUNGE STATE MACHINE
// ==============================================

export class LungeStateMachine {
  constructor() {
    this.state = 'standing';
    this.repCount = 0;
    this.feedbackMessages = [];
    
    this.thresholds = {
      standingKneeAngle: 160,
      descendingKneeAngle: 120,
      bottomKneeAngle: 90,
      ascendingKneeAngle: 120
    };
  }
  
  update(angles, distances) {
    this.feedbackMessages = [];
    
    if (!angles.knee) {
      this.feedbackMessages.push({type: 'warning', text: 'Cannot detect pose'});
      return;
    }
    
    const { knee } = angles;
    
    switch(this.state) {
      case 'standing':
        if (knee < this.thresholds.descendingKneeAngle) {
          this.state = 'descending';
        }
        break;
        
      case 'descending':
        if (knee < this.thresholds.bottomKneeAngle) {
          this.state = 'bottom';
        }
        break;
        
      case 'bottom':
        if (knee > this.thresholds.bottomKneeAngle + 10) {
          this.state = 'ascending';
        }
        break;
        
      case 'ascending':
        if (knee > this.thresholds.standingKneeAngle) {
          this.repCount++;
          this.feedbackMessages.push({type: 'success', text: 'Good rep!'});
          this.state = 'standing';
        }
        break;
    }
  }
  
  reset() {
    this.repCount = 0;
    this.state = 'standing';
  }
}
