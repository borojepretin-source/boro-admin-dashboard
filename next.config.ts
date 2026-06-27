import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Allow images from Firebase Storage
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
    ],
  },
  // Skip build-time Firebase errors — all Firebase usage is client-side
  // The app uses 'use client' directives and relies on useEffect for Firebase calls
};

export default nextConfig;
