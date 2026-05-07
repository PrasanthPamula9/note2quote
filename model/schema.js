import { appSchema, tableSchema } from '@nozbe/watermelondb'

export const mySchema = appSchema({
  version: 2,
  tables: [
    tableSchema({
      name: 'notes',
      columns: [
        { name: 'title', type: 'string', isIndexed: true },
        { name: 'body', type: 'string', isOptional: true },
        { name: 'content', type: 'string', isOptional: true },
        { name: 'notebook', type: 'string', isOptional: true },
        { name: 'is_handwritten', type: 'boolean', isOptional: true },
        { name: 'created_at', type: 'number', isOptional: false },
        { name: 'updated_at', type: 'number', isOptional: false },
      ],
    }),
  ],
})
