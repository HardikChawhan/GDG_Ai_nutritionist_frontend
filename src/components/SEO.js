import React from 'react';
import { Helmet } from 'react-helmet-async';

const SITE_URL = 'https://ainutritionist.tech';
const BRAND = 'AI Nutritionist';
const DEFAULT_DESCRIPTION = 'AI Nutritionist — Your personal AI-powered health coach. Get personalized meal plans, real-time food analysis, calorie tracking, and smart workout guidance.';
const DEFAULT_OG_IMAGE = `${SITE_URL}/og/og-landing.png`;

const SEO = ({
  title,
  description = DEFAULT_DESCRIPTION,
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
