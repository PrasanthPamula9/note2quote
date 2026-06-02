/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */
import React, { useEffect } from 'react';
import 'react-native-reanimated';
import { StatusBar, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';
import mobileAds from 'react-native-google-mobile-ads';
import MainView from './components/views/MainView';
import { BundledFontProviderGate } from './contexts/BundledFontProviderContext';

enableScreens(true);

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  useEffect(() => {
    mobileAds().initialize();
  }, []);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <PaperProvider>
          <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
          <BundledFontProviderGate>
            <MainView />
          </BundledFontProviderGate>
        </PaperProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

export default App;
