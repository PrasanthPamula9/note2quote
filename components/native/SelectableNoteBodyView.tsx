import type { NativeSyntheticEvent, ViewProps } from 'react-native';
import { requireNativeComponent } from 'react-native';

type NativeCreateQuoteEvent = NativeSyntheticEvent<{
  text: string;
}>;

export type SelectableNoteBodyViewProps = ViewProps & {
  text: string;
  onCreateQuote?: (event: NativeCreateQuoteEvent) => void;
};

export default requireNativeComponent<SelectableNoteBodyViewProps>(
  'SelectableNoteBodyView',
);
