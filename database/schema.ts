import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'notes',
      columns: [
        { name: 'title', type: 'string', isIndexed: true },
        { name: 'content', type: 'string' },
        { name: 'notebook', type: 'string', isIndexed: true },
        { name: 'is_handwritten', type: 'boolean', isIndexed: true },
        { name: 'color', type: 'string', isOptional: true },
        { name: 'thumbnail', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
  ],
});
