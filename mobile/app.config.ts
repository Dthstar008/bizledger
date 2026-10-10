import { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? (config.extra?.apiUrl as string | undefined);
  // A preview APK goes to real phones too, so it gets the same guard: without
  // it, a missing URL silently fell back to the emulator address (10.0.2.2).
  const isReleaseBuild = ['preview', 'production'].includes(process.env.EAS_BUILD_PROFILE ?? '');

  if (isReleaseBuild) {
    if (!apiUrl || !apiUrl.startsWith('https://')) {
      throw new Error('EXPO_PUBLIC_API_URL must be a public HTTPS API URL for production builds.');
    }

    const hostname = new URL(apiUrl).hostname;
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('172.16.') ||
      hostname.startsWith('172.17.') ||
      hostname.startsWith('172.18.') ||
      hostname.startsWith('172.19.') ||
      hostname.startsWith('172.20.') ||
      hostname.startsWith('172.21.') ||
      hostname.startsWith('172.22.') ||
      hostname.startsWith('172.23.') ||
      hostname.startsWith('172.24.') ||
      hostname.startsWith('172.25.') ||
      hostname.startsWith('172.26.') ||
      hostname.startsWith('172.27.') ||
      hostname.startsWith('172.28.') ||
      hostname.startsWith('172.29.') ||
      hostname.startsWith('172.30.') ||
      hostname.startsWith('172.31.')
    ) {
      throw new Error('EXPO_PUBLIC_API_URL must use a public hostname in production builds.');
    }
  }

  return {
    ...config,
    name: config.name ?? 'BizLedger',
    slug: config.slug ?? 'bizledger',
    extra: {
      ...config.extra,
      // Left unset when no URL is given so src/api/client.ts picks the right default per build type.
      ...(apiUrl ? { apiUrl } : {}),
    },
  };
};
