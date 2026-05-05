import * as React from 'react';
import { BottomNavigation, Text } from 'react-native-paper';
import NotesContainer from '../utils/NotesContainer';
import QuotesView from './QuotesView';

const NotesRoute = () => <NotesContainer />;

const QuotesRoute = () => <QuotesView></QuotesView>;

// const RecentsRoute = () => <Text>Recents</Text>;

// const NotificationsRoute = () => <Text>Notifications</Text>;

const MainView = () => {
  const [index, setIndex] = React.useState(0);
  const [routes] = React.useState([
    { key: 'notes', title: 'Notes', focusedIcon: 'file-image-plus-outline', unfocusedIcon: 'heart-outline'},
    { key: 'quotes', title: 'Quotes', focusedIcon: 'album',unfocusedIcon: 'heart-outline' },

  ]);

  const renderScene = BottomNavigation.SceneMap({
    notes: NotesRoute,
    quotes: QuotesRoute,

  });

  return (
    <BottomNavigation
      navigationState={{ index, routes }}
      onIndexChange={setIndex}
      renderScene={renderScene}
    />
  );
};

export default MainView;