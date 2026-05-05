import { Model } from '@nozbe/watermelondb';
import { field, date, text, readonly } from '@nozbe/watermelondb/decorators';

export class Note extends Model {
  static table = 'notes';

  @text('title') title!: string ;
  @text('content') content!: string;
  @text('notebook') notebook!: string;
  @field('is_handwritten') isHandwritten!: boolean;
  @text('color') color?: string;
  @text('thumbnail') thumbnail?: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  // Method to convert to plain object
  toObject() {
    return {
      id: this.id,
      title: this.title,
      content: this.content,
      notebook: this.notebook,
      isHandwritten: this.isHandwritten,
      color: this.color,
      thumbnail: this.thumbnail,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
