import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.udantechnologies.ptesathi',
  appName: 'PTE Sathi',
  webDir: 'dist',
  server: {
    url: 'https://c5790141-506b-43be-8146-c7853819639a.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    Microphone: {},
  },
};

export default config;
