import * as React from 'react';
import { AppState, DeviceEventEmitter, ImageBackground, NativeModules, Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@react-native-vector-icons/material-design-icons';
import {
  NavigationContainer,
  useNavigationContainerRef,
} from '@react-navigation/native';
import {
  BottomTabBarProps,
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NotesContainer from '../utils/NotesContainer';
import QuotesContainer from '../utils/QuotesContainer';

type RootTabParamList = {
  Notes: undefined;
  Quotes: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

const TAB_ICONS: Record<keyof RootTabParamList, { focused: string; unfocused: string }> = {
  Notes: { focused: 'note-text', unfocused: 'note-text-outline' },
  Quotes: { focused: 'format-quote-close', unfocused: 'format-quote-close-outline' },
};

const TAB_LABELS: Record<keyof RootTabParamList, string> = {
  Notes: 'Notes',
  Quotes: 'Quotes',
};

type ProcessTextModuleType = {
  consumePendingText?: () => Promise<string | null>;
};

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.tabBar,
        {
          paddingBottom: Math.max(insets.bottom, 8) + 8,
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const iconSet = TAB_ICONS[route.name as keyof RootTabParamList];
        const label = TAB_LABELS[route.name as keyof RootTabParamList];

        return (
          <Pressable
            key={route.key}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            }}
            onLongPress={() =>
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              })
            }
            style={styles.tabItem}
          >
            <View style={styles.tabIconWrap}>
              <MaterialIcons
                name={(focused ? iconSet.focused : iconSet.unfocused) as any}
                size={26}
                color={focused ? '#ffc107' : '#555'}
              />
            </View>
            <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const MainView = () => {
  const navigationRef = useNavigationContainerRef<RootTabParamList>();
  const processTextModule = NativeModules.ProcessTextModule as ProcessTextModuleType | undefined;
  const consumingProcessTextRef = React.useRef(false);
  const lastHandledProcessTextRef = React.useRef<{ text: string; at: number }>({ text: '', at: 0 });
  const [draftQuoteRequest, setDraftQuoteRequest] = React.useState<{
    id: number;
    text: string;
  } | null>(null);

  const handleCreateQuoteFromNote = React.useCallback((quoteText: string) => {
    const text = quoteText.trim();
    if (!text) {
      return;
    }

    setDraftQuoteRequest({
      id: Date.now(),
      text,
    });
    navigationRef.navigate('Quotes');
  }, [navigationRef]);

  const handleIncomingProcessText = React.useCallback((text: string) => {
    const normalizedText = text.trim();
    if (!normalizedText) {
      return;
    }

    const now = Date.now();
    const lastHandled = lastHandledProcessTextRef.current;
    if (lastHandled.text === normalizedText && now - lastHandled.at < 3000) {
      return;
    }

    lastHandledProcessTextRef.current = { text: normalizedText, at: now };
    handleCreateQuoteFromNote(normalizedText);
  }, [handleCreateQuoteFromNote]);

  const handleDraftConsumed = () => {
    setDraftQuoteRequest(null);
  };

  React.useEffect(() => {
    let isMounted = true;

    const consumePendingProcessText = async () => {
      if (consumingProcessTextRef.current) {
        return;
      }

      consumingProcessTextRef.current = true;

      try {
        const pendingText = await processTextModule?.consumePendingText?.();
        if (!isMounted || !pendingText?.trim()) {
          return;
        }

        handleIncomingProcessText(pendingText);
      } finally {
        consumingProcessTextRef.current = false;
      }
    };

    void consumePendingProcessText();

    const processTextSubscription = DeviceEventEmitter.addListener(
      'processTextReceived',
      (event: { text?: string }) => {
        const nextText = event?.text?.trim();
        if (!nextText) {
          return;
        }

        handleIncomingProcessText(nextText);
        void processTextModule?.consumePendingText?.();
      },
    );

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void consumePendingProcessText();
      }
    });

    return () => {
      isMounted = false;
      processTextSubscription.remove();
      subscription.remove();
    };
  }, [handleCreateQuoteFromNote, handleIncomingProcessText, processTextModule]);

  return (
    <ImageBackground
      source={require('../../assets/app_bg.png')}
      resizeMode="cover"
      imageStyle={styles.backgroundImage}
      style={styles.shell}
    >
      <NavigationContainer ref={navigationRef}>
        <Tab.Navigator
          tabBar={(props) => <CustomTabBar {...props} />}
          screenOptions={{ headerShown: false }}
        >
          <Tab.Screen name="Notes">
            {() => <NotesContainer onCreateQuote={handleCreateQuoteFromNote} />}
          </Tab.Screen>
          <Tab.Screen name="Quotes">
            {() => (
              <QuotesContainer
                draftQuoteRequest={draftQuoteRequest}
                onDraftConsumed={handleDraftConsumed}
              />
            )}
          </Tab.Screen>
        </Tab.Navigator>
      </NavigationContainer>
    </ImageBackground>
  );
};

export default MainView;

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    borderTopWidth: 1,
    borderTopColor: 'rgba(224, 224, 224, 0.7)',
    paddingTop: 8,
    paddingHorizontal: 10,
    elevation: 0,
    shadowOpacity: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 0,
  },
  backgroundImage: {
    opacity: 0.28,
  },
  shell: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  tabIconWrap: {
    minHeight: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 12,
    color: '#555',
  },
  tabLabelActive: {
    color: '#ffc107',
  },
});
