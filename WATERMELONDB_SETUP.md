# WatermelonDB Integration Guide

## Overview

This project now uses **WatermelonDB** for local data persistence in React Native. All notes are automatically saved to the device database.

## File Structure

```
database/
├── index.ts          # Database initialization and export functions
├── schema.ts         # Database schema definition
└── models/
    └── Note.ts       # Note model class

hooks/
└── useNotes.ts       # Custom hook for managing notes operations
```

## Database Schema

### Notes Table

The `notes` table stores all note data with the following columns:

- `id` (string) - Unique identifier (auto-generated)
- `title` (string) - Note title, indexed for quick lookups
- `content` (string) - Note content
- `notebook` (string) - Notebook name, indexed
- `is_handwritten` (boolean) - Whether note is handwritten, indexed
- `color` (string, optional) - Note color
- `thumbnail` (string, optional) - Note thumbnail
- `created_at` (number) - Timestamp of creation
- `updated_at` (number) - Timestamp of last update

## API Reference

### Database Functions

#### `initializeDatabase()`
Initializes the WatermelonDB database. Called automatically in `App.tsx`.

```typescript
import { initializeDatabase } from './database';

await initializeDatabase();
```

#### `getDatabase()`
Retrieves the initialized database instance. Throws an error if database isn't initialized.

```typescript
import { getDatabase } from './database';

const database = getDatabase();
```

#### `closeDatabase()`
Closes the database connection. Should be called on app shutdown.

```typescript
import { closeDatabase } from './database';

await closeDatabase();
```

### useNotes Hook

The `useNotes` hook provides all CRUD operations for notes:

```typescript
import { useNotes } from '../hooks/useNotes';

const {
  notes,              // Array of all notes
  isLoading,          // Loading state
  createNote,         // Create a new note
  updateNote,         // Update an existing note
  deleteNote,         // Delete a note
  fetchNotes,         // Manually refresh notes
  getNotesByNotebook, // Get notes filtered by notebook
  getHandwrittenNotes // Get all handwritten notes
} = useNotes();
```

#### Creating a Note

```typescript
const { createNote } = useNotes();

await createNote({
  title: 'My Note',
  content: 'Note content here',
  notebook: 'Default notebook',
  isHandwritten: false,
  color: '#FF5252',
  thumbnail: undefined
});
```

#### Updating a Note

```typescript
const { updateNote } = useNotes();

await updateNote(noteId, {
  title: 'Updated Title',
  content: 'Updated content'
  // Only include fields you want to update
});
```

#### Deleting a Note

```typescript
const { deleteNote } = useNotes();

await deleteNote(noteId);
```

#### Filtering Notes

```typescript
const { getNotesByNotebook, getHandwrittenNotes } = useNotes();

const defaultNotes = getNotesByNotebook('Default notebook');
const handwrittenNotes = getHandwrittenNotes();
```

## Integration Points

### App.tsx
- Initializes the database on app startup
- Shows loading state while database is initializing
- Displays error messages if initialization fails

### NotesContainer.tsx
- Uses the `useNotes` hook to manage notes
- Handles CRUD operations
- Passes notes array to NotesView component
- Manages error states

### NotesView.tsx
- Displays notes from the database
- Updated to reactively show notes as they change

## Features

✅ Automatic data persistence  
✅ Real-time note updates  
✅ Filtering by notebook and type  
✅ Error handling  
✅ Loading states  
✅ Type-safe database models  

## Best Practices

1. **Error Handling**: Always wrap database operations in try-catch blocks
2. **Loading States**: Show UI indicators while data is loading
3. **Async Operations**: All database operations are async, use `await`
4. **Refresh Data**: Call `fetchNotes()` after bulk operations
5. **Type Safety**: Leverage TypeScript types for database operations

## Testing

To test the WatermelonDB integration:

1. Create a new note - verify it appears in the list
2. Edit a note - verify changes are saved
3. Delete a note - verify it's removed from the list
4. Restart the app - verify notes persist

## Troubleshooting

### Database not initialized error
Make sure `initializeDatabase()` is called in `App.tsx` and the promise is awaited before rendering components.

### Notes not appearing
Check that:
- Database is initialized
- Notes are being created (check console for errors)
- `useNotes` hook is being used in the component
- Notes array is passed to NotesView

### Performance issues
If the app is slow:
- Consider pagination for large note lists
- Use the filtering functions to reduce rendered items
- Check database size and consider archiving old notes

## Future Enhancements

- Add search functionality
- Implement note categories/tags
- Add cloud sync
- Implement note versioning
- Add full-text search
- Implement note sharing
