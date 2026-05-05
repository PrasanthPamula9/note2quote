import { useState } from 'react';
import { View } from 'react-native';
import { useSharedValue, runOnUI } from 'react-native-reanimated';

import type { ColorFormatsObject } from 'reanimated-color-picker';
import { default as ColorPickerComponent, colorKit, HueSlider, OpacitySlider, Panel1, PreviewText, Swatches } from 'reanimated-color-picker';

import BaseContainer from './BaseContainer';
import Divider from './Divider';
import { colorPickerStyle } from './ColorPickerStle';

// generate 6 random colors for swatches
const customSwatches = new Array(6).fill('#fff').map(() => colorKit.randomRgbColor().hex());

const onComplete = (c) => {
  'worklet';
  // No-op worklet to satisfy UI thread requirement
};

export default function ColorPicker() {
  // No‑op worklet to satisfy onComplete UI‑thread requirement
  const onComplete = (c) => {
    'worklet';
    // Intentionally empty – prevents non‑worklet call error
  };

  const [resultColor, setResultColor] = useState(customSwatches[0]);

  const currentColor = useSharedValue(customSwatches[0]);

  // runs on the js thread on color pick
  const onColorPick = (color: ColorFormatsObject) => {
    setResultColor(color.hex);
    // Update the shared value on the UI thread
    runOnUI(() => {
      'worklet';
      currentColor.value = color.hex;
    })();
  };

  return (
    <BaseContainer name='Panel1' backgroundColor={currentColor}>
      <View style={colorPickerStyle.pickerContainer}>
        <ColorPickerComponent
          value={resultColor}
          sliderThickness={25}
          thumbSize={24}
          thumbShape='circle'
          onCompleteJS={onColorPick}
          style={colorPickerStyle.picker}
          boundedThumb
        >
          <Panel1 style={colorPickerStyle.panelStyle} />
          <HueSlider style={colorPickerStyle.sliderStyle} />
          {/* <OpacitySlider style={colorPickerStyle.sliderStyle} /> */}

          <Divider />
          {/* <Swatches
            style={colorPickerStyle.swatchesContainer}
            swatchStyle={colorPickerStyle.swatchStyle}
            colors={customSwatches}
          />
          <Divider /> */}

          <PreviewText style={colorPickerStyle.previewTxt} colorFormat='hwba' />
        </ColorPickerComponent>
      </View>
    </BaseContainer>
  );
}
