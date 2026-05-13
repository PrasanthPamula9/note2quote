import { useState } from 'react';
import { View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import type { ColorFormatsObject } from 'reanimated-color-picker';
import { default as ColorPickerComponent, colorKit, HueSlider, Panel1, PreviewText, Swatches } from 'reanimated-color-picker';

import BaseContainer from './BaseContainer';
import Divider from './Divider';
import { colorPickerStyle } from './ColorPickerStle';

const customSwatches = new Array(6).fill('#fff').map(() => colorKit.randomRgbColor().hex());

export default function ColorPicker() {
  const [resultColor, setResultColor] = useState(customSwatches[0]);
  const currentColor = useSharedValue(customSwatches[0]);

  const onColorChange = (color: ColorFormatsObject) => {
    setResultColor(color.hex);
    currentColor.value = color.hex;
  };

  return (
    <BaseContainer name='Panel1' backgroundColor={currentColor}>
      <View style={colorPickerStyle.pickerContainer}>
        <ColorPickerComponent
          value={resultColor}
          sliderThickness={25}
          thumbSize={24}
          thumbShape='circle'
          boundedThumb
          onChangeJS={onColorChange}
          style={colorPickerStyle.picker}
        >
          <Panel1
            boundedThumb
            thumbShape='circle'
            thumbSize={24}
            style={colorPickerStyle.panelStyle}
          />
          <HueSlider style={colorPickerStyle.sliderStyle} />
          <Divider />
          <PreviewText style={colorPickerStyle.previewTxt} colorFormat='hwba' />
          <Swatches
            style={colorPickerStyle.swatchesContainer}
            swatchStyle={colorPickerStyle.swatchStyle}
            colors={customSwatches}
          />
        </ColorPickerComponent>
      </View>
    </BaseContainer>
  );
}
