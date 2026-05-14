/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */
import 'react-native-reanimated';
import { StatusBar, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';
import MainView from './components/views/MainView';

enableScreens(true);

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <PaperProvider>
          <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
          {/* <AppContent /> */}
          <MainView />
        </PaperProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

export default App;
