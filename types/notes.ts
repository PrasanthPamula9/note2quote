export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  notebook: string;
  isHandwritten?: boolean;
  color?: string;
  thumbnail?: string;
}

export type NotebookFilter = 'all' | 'handwritten' | 'default';
