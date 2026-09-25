import { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? 'BizLedger',
  slug: config.slug ?? 'bizledger',
  extra: {
    ...config.extra,
    apiUrl:
      process.env.EXPO_PUBLIC_API_URL ??
      (config.extra?.apiUrl as string | undefined) ??
      'http://10.0.2.2:3000',
  },
});
