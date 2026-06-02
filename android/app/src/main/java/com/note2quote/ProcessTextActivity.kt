package com.note2quote

import android.app.Activity
import android.content.Intent
import android.os.Bundle

class ProcessTextActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    handleIntent(intent)
    finish()
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    handleIntent(intent)
    finish()
  }

  private fun handleIntent(intent: Intent?) {
    val selectedText = intent
      ?.getCharSequenceExtra(Intent.EXTRA_PROCESS_TEXT)
      ?.toString()
      ?.trim()
      .orEmpty()

    if (selectedText.isEmpty()) {
      return
    }

    ProcessTextStore.setPendingText(selectedText)

    val launchIntent = Intent(this, MainActivity::class.java).apply {
      action = Intent.ACTION_PROCESS_TEXT
      addFlags(
        Intent.FLAG_ACTIVITY_CLEAR_TOP or
          Intent.FLAG_ACTIVITY_SINGLE_TOP or
          Intent.FLAG_ACTIVITY_NEW_TASK,
      )
      putExtra(Intent.EXTRA_PROCESS_TEXT, selectedText)
    }

    startActivity(launchIntent)
  }
}
