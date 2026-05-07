import { schemaMigrations } from '@nozbe/watermelondb/Schema/migrations'

export default schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        {
          type: 'add_columns',
          table: 'notes',
          columns: [
            { name: 'content', type: 'string', isOptional: true },
            { name: 'notebook', type: 'string', isOptional: true },
            { name: 'is_handwritten', type: 'boolean', isOptional: true },
            { name: 'created_at', type: 'number', isOptional: true },
            { name: 'updated_at', type: 'number', isOptional: true },
          ],
        },
      ],
    },
  ],
})
