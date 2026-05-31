import React from 'react';
import type { NativeSyntheticEvent, ViewProps } from 'react-native';
import { Platform, Text, requireNativeComponent } from 'react-native';

type NativeCreateQuoteEvent = NativeSyntheticEvent<{
  text: string;
}>;

export type SelectableNoteBodyViewProps = ViewProps & {
  text: string;
  onCreateQuote?: (event: NativeCreateQuoteEvent) => void;
};

const NativeSelectableNoteBodyView = requireNativeComponent<SelectableNoteBodyViewProps>(
  'SelectableNoteBodyView',
);

export default function SelectableNoteBodyView({
  text,
  style,
  ...props
}: SelectableNoteBodyViewProps) {
  if (Platform.OS !== 'android') {
    return (
      <Text
        selectable
        style={[{ color: '#333333' }, style as any]}
      >
        {text}
      </Text>
    );
  }

  return (
    <NativeSelectableNoteBodyView
      {...props}
      style={style}
      text={text}
    />
  );
}
