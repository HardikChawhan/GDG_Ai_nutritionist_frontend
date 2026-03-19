import React from 'react';
import { Helmet } from 'react-helmet-async';

const SITE_URL = 'https://ainutritionist.tech';
const BRAND = 'AI Nutritionist';
const DEFAULT_DESCRIPTION = 'AI Nutritionist — Your personal AI-powered health coach. Get personalized meal plans, real-time food analysis, calorie tracking, and smart workout guidance.';
const DEFAULT_OG_IMAGE = `${SITE_URL}/og/og-landing.png`;
const DEFAULT_KEYWORDS = "AI Nutritionist, AI meal planner generator free, Best AI app to create a weekly diet plan, Generate meal plan from macros AI, Free AI nutritionist for weight loss, AI diet coach for muscle gain, Custom meal plan maker based on body type, AI-generated grocery list from diet plan, Auto-generate healthy recipes for the week, Strict keto meal planner AI, Vegan AI nutritionist tool, Smart macro calculator and meal generator, App that calculates calories from a picture, AI food analyzer and macro tracker, Scan food to get nutritional info AI, Real-time AI food tracking app, Easiest way to track macros using AI, Automatic food diary app, Identify food calories with camera, AI-powered diet adherence tracker, AI workout tracker with camera, Real-time AI pose detection fitness app, AI personal trainer for home workouts, App that watches you workout and corrects form, Free AI fitness coach and meal planner, Smart rep counter and workout analyzer, AI camera app for weightlifting form, AI workout generator based on equipment, Fitness app with daily streaks, Gamified diet tracker with leaderboard, App to track daily health habits, Compete with friends fitness streak app, Health app with community rankings, Daily consistency tracker for diet and exercise, Can ChatGPT make me a meal plan, How to use AI to lose weight faster, What is the best AI alternative to MyFitnessPal, Is there an AI that acts as a dietitian, How to track macros without entering ingredients manually, Can an AI camera fix my squat form, How to stick to a diet plan every day, AI software for nutritionists to manage clients, Data-driven precision nutrition tool, Algorithmic dietary analysis software, HIPAA compliant AI health tracker, AI diet planner for marathon training, Smart dietary restriction management app";

const SEO = ({
  title,
  description = DEFAULT_DESCRIPTION,
  keywords = DEFAULT_KEYWORDS,
  canonical,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = 'website',
  noIndex = false,
}) => {
  const fullTitle = title ? `${title} | ${BRAND}` : `${BRAND} — Your Personal AI Health Coach`;
  const canonicalUrl = canonical ? `${SITE_URL}${canonical}` : SITE_URL;

  return (
    <Helmet>
      {/* Primary Meta */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={canonicalUrl} />
      {noIndex && <meta name="robots" content="noindex,nofollow" />}

      {/* Open Graph */}
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={BRAND} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:url" content={canonicalUrl} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
};

export default SEO;
