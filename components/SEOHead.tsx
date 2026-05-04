import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title: string;
  description: string;
  path?: string;
  ogImage?: string;
  ogType?: string;
  noindex?: boolean;
}

const BASE_URL = 'https://pharmko.app';

export const SEOHead: React.FC<SEOHeadProps> = ({
  title,
  description,
  path = '/',
  ogImage = `${BASE_URL}/icons/og-image.png`,
  ogType = 'website',
  noindex = false,
}) => {
  const canonicalUrl = `${BASE_URL}${path}`;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />

      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content={ogType} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="PharmKo" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
};
