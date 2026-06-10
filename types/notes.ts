export interface Note {
  id: string;
  header: string;
  body: string;
  notebook_id: string;
  pinned: number;
  created_at: number;
  updated_at: number;
}

export interface Notebook {
  id: string;
  name: string;
  is_default: number;
  created_at: number;
  updated_at: number;
  note_count?: number;
}

export type NotebookFilter = 'all' | 'handwritten' | 'default';
