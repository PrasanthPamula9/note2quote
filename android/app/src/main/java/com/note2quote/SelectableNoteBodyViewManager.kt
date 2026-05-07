package com.note2quote

import com.facebook.react.common.MapBuilder
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

class SelectableNoteBodyViewManager :
  SimpleViewManager<SelectableNoteBodyView>() {

  override fun getName(): String = "SelectableNoteBodyView"

  override fun createViewInstance(reactContext: ThemedReactContext): SelectableNoteBodyView {
    val view = SelectableNoteBodyView(reactContext)
    if (view.id == android.view.View.NO_ID) {
      view.id = android.view.View.generateViewId()
    }
    view.setQuoteSelectionListener { selectedText ->
      view.emitCreateQuote(selectedText)
    }
    return view
  }

  @ReactProp(name = "text")
  fun setText(view: SelectableNoteBodyView, text: String?) {
    view.setNoteText(text)
  }

  override fun getExportedCustomDirectEventTypeConstants(): MutableMap<String, Any> {
    return MapBuilder.of(
      "topCreateQuote",
      MapBuilder.of("registrationName", "onCreateQuote"),
    )
  }
}
