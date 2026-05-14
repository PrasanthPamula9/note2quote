import * as React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
  const [draftQuoteRequest, setDraftQuoteRequest] = React.useState<{
    id: number;
    text: string;
  } | null>(null);

  const handleCreateQuoteFromNote = (quoteText: string) => {
    const text = quoteText.trim();
    if (!text) {
      return;
    }

    setDraftQuoteRequest({
      id: Date.now(),
      text,
    });
    navigationRef.navigate('Quotes');
  };

  const handleDraftConsumed = () => {
    setDraftQuoteRequest(null);
  };

  return (
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
  );
};

export default MainView;

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 8,
    paddingHorizontal: 10,
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
