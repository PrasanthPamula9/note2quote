package com.note2quote

object ProcessTextStore {
  @Volatile
  private var pendingText: String? = null

  fun setPendingText(text: String?) {
    pendingText = text?.trim()?.takeIf { it.isNotEmpty() }
  }

  fun consumePendingText(): String? {
    val nextText = pendingText
    pendingText = null
    return nextText
  }
}
