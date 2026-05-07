import { Model } from '@nozbe/watermelondb'

export default class Note extends Model {
  static table = 'notes'

  get title() {
    return this._getRaw('title')
  }

  set title(value) {
    this._setRaw('title', typeof value === 'string' ? value.trim() : null)
  }

  get body() {
    return this._getRaw('body')
  }

  set body(value) {
    this._setRaw('body', typeof value === 'string' ? value.trim() : null)
  }

  get content() {
    return this._getRaw('content')
  }

  set content(value) {
    this._setRaw('content', typeof value === 'string' ? value.trim() : null)
  }

  get notebook() {
    return this._getRaw('notebook')
  }

  set notebook(value) {
    this._setRaw('notebook', typeof value === 'string' ? value.trim() : null)
  }

  get isHandwritten() {
    return Boolean(this._getRaw('is_handwritten'))
  }

  set isHandwritten(value) {
    this._setRaw('is_handwritten', Boolean(value))
  }

  get createdAt() {
    const raw = this._getRaw('created_at')
    return typeof raw === 'number' ? new Date(raw) : null
  }

  set createdAt(value) {
    this._setRaw('created_at', value ? +new Date(value) : null)
  }

  get updatedAt() {
    const raw = this._getRaw('updated_at')
    return typeof raw === 'number' ? new Date(raw) : null
  }

  set updatedAt(value) {
    this._setRaw('updated_at', value ? +new Date(value) : null)
  }
}

