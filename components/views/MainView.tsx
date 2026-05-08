import * as React from 'react';
import { BottomNavigation } from 'react-native-paper';
import NotesContainer from '../utils/NotesContainer';
import QuotesContainer from '../utils/QuotesContainer';

// const RecentsRoute = () => <Text>Recents</Text>;

// const NotificationsRoute = () => <Text>Notifications</Text>;

const MainView = () => {
  const [index, setIndex] = React.useState(0);
  const [draftQuoteRequest, setDraftQuoteRequest] = React.useState<{
    id: number;
    text: string;
  } | null>(null);
  const [routes] = React.useState([
    { key: 'notes', title: 'Notes', focusedIcon: 'note-text', unfocusedIcon: 'note-text-outline'},
    { key: 'quotes', title: 'Quotes', focusedIcon: 'format-quote-close',unfocusedIcon: 'format-quote-close-outline' },

  ]);

  const handleCreateQuoteFromNote = (quoteText: string) => {
    const text = quoteText.trim();
    if (!text) {
      return;
    }

    setDraftQuoteRequest({
      id: Date.now(),
      text,
    });
    setIndex(1);
  };

  const handleDraftConsumed = () => {
    setDraftQuoteRequest(null);
  };

  return (
    <BottomNavigation
      navigationState={{ index, routes }}
      onIndexChange={setIndex}
      renderScene={({ route }) => {
        switch (route.key) {
          case 'notes':
            return <NotesContainer onCreateQuote={handleCreateQuoteFromNote} />;
          case 'quotes':
            return (
              <QuotesContainer
                draftQuoteRequest={draftQuoteRequest}
                onDraftConsumed={handleDraftConsumed}
              />
            );
          default:
            return null;
        }
      }}
    />
  );
};

export default MainView;
