/**
 * @format
 */

import { AppRegistry } from 'react-native';
import { DatabaseProvider } from '@nozbe/watermelondb/react';
import App from './App';
import { name as appName } from './app.json';
import migrations from './model/migration';
import { SQLiteAdapter } from '@nozbe/watermelondb/adapters/sqlite';
import { mySchema } from './model/schema';
import { Database } from '@nozbe/watermelondb';
import Note from './model/notes';

const adapter = new SQLiteAdapter({
  schema: mySchema,
  migrations,
});

const database = new Database({
  adapter,
  modelClasses: [Note],
});

function Root() {
  return (
    <DatabaseProvider database={database}>
      <App />
    </DatabaseProvider>
  );
}

AppRegistry.registerComponent(appName, () => Root);
