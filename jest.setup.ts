import i18n from '@/i18n';

// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => ({ addListener: jest.fn(), play: jest.fn(), pause: jest.fn(), replace: jest.fn(), remove: jest.fn(), isLoaded: false, duration: 0 })),
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
}));

// i test leggono i testi in italiano, qualunque sia la lingua della macchina
beforeAll(async () => {
  await i18n.changeLanguage('it');
});
