import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter  from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';
import { Note } from './models/Note';

let database: Database | null = null;

export const initializeDatabase = async (): Promise<Database> => {
  if (database) {
    return database;
  }

  try {
    const adapter = new SQLiteAdapter({
      schema,
      onSetUpError: (error) => {
        console.error('Database setup error:', error);
      },
    });

    database = new Database({
      adapter,
      modelClasses: [Note],
    });

    // Test the connection
    await database.write(async () => {
      // Just to ensure the database is working
    });

    console.log('Database initialized successfully');
    return database;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
};

export const getDatabase = (): Database => {
  if (!database) {
    throw new Error('Database not initialized. Call initializeDatabase first.');
  }
  return database;
};

export const closeDatabase = async () => {
  if (database) {
    try {
      await database.write(async () => {
        // Cleanup if needed
      });
      database = null;
      console.log('Database closed successfully');
    } catch (error) {
      console.error('Error closing database:', error);
    }
  }
};
