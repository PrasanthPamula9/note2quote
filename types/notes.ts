export interface Note {
  id: string;
  header: string;
  body: string;
  created_at: number;
  updated_at: number;
}

export type NotebookFilter = 'all' | 'handwritten' | 'default';
