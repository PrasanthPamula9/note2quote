package com.note2quote

import android.view.ActionMode
import android.view.Menu
import android.view.MenuItem
import androidx.appcompat.widget.AppCompatTextView
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.uimanager.events.RCTEventEmitter

class SelectableNoteBodyView(private val reactContext: ReactContext) :
  AppCompatTextView(reactContext) {

  private var quoteSelectionListener: ((String) -> Unit)? = null

  companion object {
    private const val MENU_ID_CREATE_QUOTE = 0x2001
    private const val EVENT_NAME_CREATE_QUOTE = "topCreateQuote"
  }

  init {
    isFocusable = true
    isFocusableInTouchMode = true
    setTextIsSelectable(true)
    customSelectionActionModeCallback = object : ActionMode.Callback {
      override fun onCreateActionMode(mode: ActionMode, menu: Menu): Boolean {
        menu.add(0, MENU_ID_CREATE_QUOTE, 100, "Create quote")
        return true
      }

      override fun onPrepareActionMode(mode: ActionMode, menu: Menu): Boolean {
        return false
      }

      override fun onActionItemClicked(mode: ActionMode, item: MenuItem): Boolean {
        if (item.itemId == MENU_ID_CREATE_QUOTE) {
          val selected = getSelectedText().trim()
          if (selected.isNotEmpty()) {
            quoteSelectionListener?.invoke(selected)
          }
          mode.finish()
          return true
        }
        return false
      }

      override fun onDestroyActionMode(mode: ActionMode) {}
    }
  }

  fun setNoteText(value: String?) {
    text = value ?: ""
  }

  fun setQuoteSelectionListener(listener: ((String) -> Unit)?) {
    quoteSelectionListener = listener
  }

  private fun getSelectedText(): String {
    val start = selectionStart.coerceAtLeast(0)
    val end = selectionEnd.coerceAtLeast(0)
    if (start == end) {
      return ""
    }
    return text?.subSequence(start, end)?.toString().orEmpty()
  }

  fun emitCreateQuote(text: String) {
    val event = Arguments.createMap().apply {
      putString("text", text)
    }
    reactContext.getJSModule(RCTEventEmitter::class.java)
      .receiveEvent(id, EVENT_NAME_CREATE_QUOTE, event)
  }
}
