import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'org.orchidarc.orquidea',
  appName: 'OrquIDea',
  webDir: 'capacitor-www',
  server: {
    url: 'https://orquidea.orchidarc.org',
    cleartext: false,
  },
};

export default config;
