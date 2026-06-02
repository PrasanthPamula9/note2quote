package com.note2quote

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class ProcessTextModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "ProcessTextModule"

  @ReactMethod
  fun consumePendingText(promise: Promise) {
    promise.resolve(ProcessTextStore.consumePendingText())
  }
}
