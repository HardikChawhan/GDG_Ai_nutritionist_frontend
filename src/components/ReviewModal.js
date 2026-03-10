import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, X, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { saveReview, deferReview, shouldShowReviewPrompt } from '../services/firebaseService';
import { cn } from '../utils/cn';

const ReviewModal = () => {
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const handleTrigger = async () => {
       if (!currentUser) return;
       // Check if we should prompt the user today
       const shouldPrompt = await shouldShowReviewPrompt(currentUser.uid);
       if (shouldPrompt && !isOpen) {
          setIsOpen(true);
          setSubmitted(false);
          setRating(0);
          setReviewText('');
       }
    };

    window.addEventListener('trigger-review', handleTrigger);
    return () => window.removeEventListener('trigger-review', handleTrigger);
  }, [currentUser, isOpen]);

  const handleDefer = async () => {
    if (currentUser) {
       await deferReview(currentUser.uid);
    }
    setIsOpen(false);
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      alert("Please select a star rating before submitting!");
      return;
    }

    setIsSubmitting(true);
    try {
       await saveReview(currentUser.uid, rating, reviewText.trim());
       setSubmitted(true);
       setTimeout(() => {
          setIsOpen(false);
       }, 2000);
    } catch (error) {
       alert("Failed to save review. Please try again.");
    } finally {
       setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="glass-panel w-full max-w-md p-8 relative flex flex-col pt-8"
          >
            {submitted ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }} 
                animate={{ opacity: 1, scale: 1 }} 
                className="flex flex-col items-center justify-center py-6"
              >
                <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-2xl font-heading font-semibold text-center mb-2">Thank You!</h3>
                <p className="text-muted text-center text-sm">Your feedback helps us refine our AI models.</p>
              </motion.div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-heading font-semibold mb-2 flex items-center justify-center gap-2">
                    <Star className="w-6 h-6 text-accent fill-accent" />
                    How's your experience?
                  </h3>
                  <p className="text-muted text-sm">We'd love to hear your feedback on the AI Nutritionist platform.</p>
                </div>

                <div className="flex justify-center gap-2 mb-8">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 focus:outline-none transition-transform hover:scale-110"
                    >
                      <Star 
                        className={cn(
                          "w-10 h-10 transition-colors",
                          (hoverRating || rating) >= star 
                            ? "text-yellow-400 fill-yellow-400" 
                            : "text-muted/30"
                        )} 
                      />
                    </button>
                  ))}
                </div>

                <div className="mb-8">
                  <label className="text-xs font-medium text-muted mb-2 block uppercase tracking-wider">Share your thoughts (Optional)</label>
                  <textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Tell us what you love or what we can improve..."
                    className="w-full h-24 bg-surface/50 border border-border/10 rounded-xl px-4 py-3 focus:ring-1 focus:ring-accent focus:border-accent text-sm text-foreground placeholder-white/20 resize-none transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <button 
                    onClick={handleSubmit} 
                    disabled={isSubmitting || rating === 0}
                    className="w-full bg-foreground text-background font-semibold py-3.5 rounded-xl hover:bg-foreground/90 disabled:opacity-50 transition-colors shadow-lg"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                  </button>
                  <button 
                    onClick={handleDefer} 
                    className="w-full border border-border/10 text-muted font-medium py-3 rounded-xl hover:bg-foreground/5 hover:text-foreground transition-colors"
                  >
                    Not right now
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ReviewModal;
