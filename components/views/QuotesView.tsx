import React, { useMemo, useState } from 'react'
import { View, Text, StyleSheet, useWindowDimensions, Modal, FlatList, Pressable, Platform, ScrollView, Alert, TextInput } from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import Animated, { useSharedValue, runOnJS } from 'react-native-reanimated';
import { Canvas, Rect, Image as SkiaImage, useImage, Paragraph, Skia, TextAlign, FontWeight, FontSlant } from '@shopify/react-native-skia';
import { Appbar, Icon } from 'react-native-paper'
import {listFontFamilies} from "@shopify/react-native-skia";
import {launchImageLibrary, launchCamera} from 'react-native-image-picker';
import Slider from '@react-native-community/slider';

import ColorPickerComponent, { HueSlider, Panel1 } from 'reanimated-color-picker';
// ─── Canvas size presets ─────────────────────────────────────────────────────
// nativeWidth / nativeHeight = the actual export/render resolution
// aspectRatio is derived from those values and used to scale the on-screen canvas
type CanvasPresetKey =
  | 'instagram_post_square'
  | 'instagram_post_portrait'
  | 'instagram_post_landscape'
  | 'instagram_story'
  | 'whatsapp_status';

type CanvasPreset = {
  label: string;
  nativeWidth: number;
  nativeHeight: number;
  aspectRatio: number; // width / height
};

const CANVAS_PRESETS: Record<CanvasPresetKey, CanvasPreset> = {
  // Instagram Feed – square  (1:1)
  instagram_post_square: {
    label: 'Instagram Post – Square',
    nativeWidth: 1080,
    nativeHeight: 1080,
    aspectRatio: 1080 / 1080, // 1.00
  },
  // Instagram Feed – portrait  (4:5)  recommended by Meta for best reach
  instagram_post_portrait: {
    label: 'Instagram Post – Portrait',
    nativeWidth: 1080,
    nativeHeight: 1350,
    aspectRatio: 1080 / 1350, // 0.80
  },
  // Instagram Feed – landscape  (1.91:1)
  instagram_post_landscape: {
    label: 'Instagram Post – Landscape',
    nativeWidth: 1080,
    nativeHeight: 566,
    aspectRatio: 1080 / 566, // 1.91
  },
  // Instagram Story  (9:16)
  instagram_story: {
    label: 'Instagram Story',
    nativeWidth: 1080,
    nativeHeight: 1920,
    aspectRatio: 1080 / 1920, // 0.5625
  },
  // WhatsApp Status  (9:16) – identical canvas to Instagram Story
  whatsapp_status: {
    label: 'WhatsApp Status',
    nativeWidth: 1080,
    nativeHeight: 1920,
    aspectRatio: 1080 / 1920, // 0.5625
  },
};



export default function QuotesView() {

  //Todo  make the width and height of the canvas based on user selection quote verticle / instagram view etc
  //Todo  make the background color of the canvas based on user selection
  //Toto impliment color picker 
  //Todo impliment text aligment and font selection
  //todo impliment text input by default at the center of the canvas
  //todo create saving mechanisum without loosing user created layout, fonts, colors etc
  
  const [activeCanvasKey, setActiveCanvasKey] = useState<CanvasPresetKey>('instagram_post_portrait');
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [backgroundImageUri, setBackgroundImageUri] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentFeature, setCurrentFeature] = useState<string | null>(null);
  const [imageOpacity, setImageOpacity] = useState(0.6);
  const [fontSize, setFontSize] = useState(14);
  const [fontColor, setFontColor] = useState('white');
  const [bgColor, setBgColor] = useState('#222222');
  const [fontFamily, setFontFamily] = useState('serif');
  const [fontShadow, setFontShadow] = useState(0);
  const [fontWeight, setFontWeight] = useState(FontWeight.Bold);
  const [textAlign, setTextAlign] = useState(TextAlign.Center);
  const [quoteText, setQuoteText] = useState('Go and build something amazing with React Native Skia!');
  // text position as percentages of canvas dimensions
  const [textXPercent, setTextXPercent] = useState(0.05);
  const [textYPercent, setTextYPercent] = useState(0.35);
  // get available fonts
  const availableFonts = listFontFamilies();
  // shared values for gesture handling
  const textXShared = useSharedValue(textXPercent);
  const textYShared = useSharedValue(textYPercent);

    const activePreset = CANVAS_PRESETS[activeCanvasKey];

  // Scale the preset down to fit within 90 % of screen width and 70 % of
  // screen height while preserving the preset's aspect ratio.
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const maxDisplayWidth = screenWidth * 0.9;
  // Use 55 % so the dropdown trigger always has room below the canvas
  const maxDisplayHeight = screenHeight * 0.55;

  const scaleByWidth = maxDisplayWidth;
  const scaleByHeight = maxDisplayHeight * activePreset.aspectRatio;
  const canvasWidth = Math.min(scaleByWidth, scaleByHeight);
  const canvasHeight = canvasWidth / activePreset.aspectRatio;
  const FeaturesArray=[
  {
    name:"BackgroundImage",
    icon:'file-image-plus-outline',
    label:"Image"
  },
  {
    name:"BackgroundColor",
    icon:'format-color-highlight',
    label:"Bg Color"
  },
  {
    name:"FontColor",
    icon:'format-color',
    label:"Font Color"
  },
  {
    name:"ImageOpacity",
    icon:'file-image-plus-outline',
    label:"Opacity"
  },
  {
    name:"FontSize",
    icon:'format-size',
    label:"Font Size"
  },
  {
    name:"FontFamily",
    icon:'format-font',
    label:"Fonts"
  },
  {
    name:"CanvasSize",
    icon:'image-size-select-large',
    label:"Size"
  },
  {
    name:"FontShadow",
    icon:'shadow',
    label:"Shadow"
  },
  {
    name:"FontWeight",
    icon:'format-bold',
    label:"Weight"
  },
  {
    name:"TextEdit",
    icon:'pencil',
    label:"Edit Text"
  },
  {
    name:"TextPosition",
    icon:'move-resize-variant',
    label:"Text Position"
  }
];
const imageUri = backgroundImageUri || require("../../assets/test.jpg");
  const image = useImage(imageUri);

  const paragraph = useMemo(() => {
    const builder = Skia.ParagraphBuilder.Make({
      textAlign: textAlign,
      textStyle: {
        color: Skia.Color(fontColor),
        fontFamilies: [fontFamily],
        fontSize,
        fontStyle: {
          weight: fontWeight,
          slant: FontSlant.Italic,
        },
        shadows: fontShadow > 0 ? [{ color: Skia.Color('rgba(0,0,0,0.6)'), offset: { x: 1, y: 1 }, blurRadius: fontShadow }] : [],
      },
    });
    builder.addText(quoteText);
    return builder.build();
  }, [fontSize, fontFamily, fontColor, fontShadow, fontWeight, textAlign, quoteText]);


  

  const HandleFeature = (featureName:string) => {
    console.log("clicked on feature", featureName)
        setCurrentFeature(featureName);
        setModalVisible(true);
    
    // switch(featureName){
    //   case "BackgroundImage":
    //     setCurrentFeature(featureName);
    //     setModalVisible(true);
    //     break;
    //   case "BackgroundColor":
    //     //handle background color selection
    //     setCurrentFeature(featureName);
    //     setModalVisible(true);
    //     break;
    // }
  };

  const HandleOpactyChange = (value:number) => {
    console.log("Opacity value changed:", value);
    setImageOpacity(value);
  }

  const HandleFontSizeChange = (value:number) => {
    console.log("Font size value changed:", value);
    setFontSize(value); // Scale to a more typical font size range
  }

  const renderModalContent = () => {
    switch(currentFeature) {
      case "BackgroundImage":
        return (
          <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)}>
            <View style={[styles.modalContent, { height: screenHeight * 0.3 }]}>
              <Text style={styles.modalTitle}>Select Background Image Source</Text>
              <View style={styles.modalOptions}>
                <Pressable style={styles.modalOption} onPress={() => {
                  launchCamera({ mediaType: 'photo' }, (response) => {
                    if (response.assets && response.assets[0] && response.assets[0].uri) {
                      setBackgroundImageUri(response.assets[0].uri);
                      setModalVisible(false);
                    }
                  });
                }}>
                  <Icon source="camera" size={24} />
                  <Text style={styles.modalOptionText}>Camera</Text>
                </Pressable>
                <Pressable style={styles.modalOption} onPress={() => {
                  launchImageLibrary({ mediaType: 'photo' }, (response) => {
                    if (response.assets && response.assets[0] && response.assets[0].uri) {
                      setBackgroundImageUri(response.assets[0].uri);
                      setModalVisible(false);
                    }
                  });
                }}>
                  <Icon source="folder-image" size={24} />
                  <Text style={styles.modalOptionText}>Device</Text>
                </Pressable>
                <Pressable style={styles.modalOption} onPress={() => {
                  Alert.alert('Coming Soon', 'Unsplash integration is coming soon!');
                  setModalVisible(false);
                }}>
                  <Icon source="image-search" size={24} />
                  <Text style={styles.modalOptionText}>Unsplash</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        );
      case 'BackgroundColor':
      case 'FontColor':
        return (
          <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)}>
            <View style={[styles.modalContent, { height: screenHeight * 0.4 }]} onStartShouldSetResponder={() => true}>
              <Text style={styles.modalTitle}>
                {currentFeature === 'FontColor' ? 'Font Color' : 'Background Color'}
              </Text>
              <ColorPickerComponent
                value={currentFeature === 'FontColor' ? fontColor : bgColor}
                onCompleteJS={(color) => {
                  if (currentFeature === 'FontColor') {
                    setFontColor(color.hex);
                  } else {
                    setBgColor(color.hex);
                  }
                }}
              >
                <Panel1 style={{ borderRadius: 16 }} />
                <HueSlider style={{ marginTop: 16, borderRadius: 16 }} />
              </ColorPickerComponent>
            </View>
          </Pressable>
        )
      case 'ImageOpacity':
        return (
          
          <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)}>
            <View style={[styles.modalContent, { height: screenHeight * 0.3 }]}>
              <Slider
                style={{width: 200, height: 40}}
                minimumValue={0}
                maximumValue={1}
                value={imageOpacity}
                minimumTrackTintColor="#FFFFFF"
                maximumTrackTintColor="#000000"
                onValueChange={(value) => HandleOpactyChange(value)}
                />
            </View>
          </Pressable>
        );
      case 'FontSize':
        return (
          <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)}>
            <View style={[styles.modalContent, { height: screenHeight * 0.3 }]}>
                  <Slider
                style={{width: 200, height: 40}}
                minimumValue={10}
                maximumValue={30}
                value={fontSize}
                minimumTrackTintColor="#FFFFFF"
                maximumTrackTintColor="#000000"
                onValueChange={(value) => HandleFontSizeChange(value)}
                />
                </View>
          </Pressable>
        );
      case 'FontFamily':
        return (
          <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)}>
            <View style={[styles.modalContent, { height: screenHeight * 0.6 }]} onStartShouldSetResponder={() => true}>
              <Text style={styles.modalTitle}>Select Font</Text>
              <FlatList
                data={availableFonts}
                keyExtractor={(item, index) => `${item}-${index}`}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => {
                      setFontFamily(item);
                      setModalVisible(false);
                    }}
                    style={[styles.fontOption, fontFamily === item && styles.fontOptionActive]}
                  >
                    <Text style={[styles.fontOptionText, fontFamily === item && styles.fontOptionTextActive]} numberOfLines={1}>
                      {item}
                    </Text>
                    {fontFamily === item && <Icon source="check" size={20} color="#1a73e8" />}
                  </Pressable>
                )}
                scrollEnabled={true}
                nestedScrollEnabled={true}
              />
            </View>
          </Pressable>
        );
      case 'CanvasSize':
        return (
          <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)}>
            <View style={[styles.modalContent, { height: screenHeight * 0.4 }]}>
              <Text style={styles.modalTitle}>Quote Size</Text>
              <View style={styles.sizeOptionsContainer}>
                {/* Square Size */}
                <Pressable
                  onPress={() => {
                    setActiveCanvasKey('instagram_post_square');
                    setModalVisible(false);
                  }}
                  style={[styles.sizeOption, activeCanvasKey === 'instagram_post_square' && styles.sizeOptionActive]}
                >
                  <View style={[styles.squarePreview, activeCanvasKey === 'instagram_post_square' && styles.squarePreviewActive]} />
                  <Text style={styles.sizeLabel}>Square</Text>
                </Pressable>

                {/* Story Size */}
                <Pressable
                  onPress={() => {
                    setActiveCanvasKey('instagram_story');
                    setModalVisible(false);
                  }}
                  style={[styles.sizeOption, activeCanvasKey === 'instagram_story' && styles.sizeOptionActive]}
                >
                  <View style={[styles.storyPreview, activeCanvasKey === 'instagram_story' && styles.storyPreviewActive]} />
                  <Text style={styles.sizeLabel}>Story</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        );
      case 'FontShadow':
        return (
          <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)}>
            <View style={[styles.modalContent, { height: screenHeight * 0.3 }]}>
              <Text style={styles.modalTitle}>Shadow</Text>
              <View style={styles.sliderSection}>
                <Slider
                  style={styles.sliderLarge}
                  minimumValue={0}
                  maximumValue={10}
                  value={fontShadow}
                  minimumTrackTintColor="#1a73e8"
                  maximumTrackTintColor="#ddd"
                  onValueChange={(value) => setFontShadow(value)}
                />
                <Text style={styles.sliderPercentText}>{Math.round(fontShadow)}</Text>
              </View>
            </View>
          </Pressable>
        );
      case 'FontWeight':
        const fontWeights = [
          { label: 'Light', value: FontWeight.Thin },
          { label: 'Normal', value: FontWeight.Normal },
          { label: 'Medium', value: FontWeight.Bold },
          { label: 'SemiBold', value: FontWeight.Bold },
          { label: 'Bold', value: FontWeight.Bold },
          { label: 'ExtraBold', value: FontWeight.Bold },
        ];
        return (
          <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)}>
            <View style={[styles.modalContent, { height: screenHeight * 0.5 }]}>
              <Text style={styles.modalTitle}>Font Weight</Text>
              <View style={styles.weightOptionsContainer}>
                {fontWeights.map((item, index) => (
                  <Pressable
                    key={index}
                    onPress={() => {
                      setFontWeight(item.value);
                      setModalVisible(false);
                    }}
                    style={[styles.weightOption, fontWeight === item.value && styles.weightOptionActive]}
                  >
                    <Text style={[styles.weightOptionText, fontWeight === item.value && styles.weightOptionTextActive]}>
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </Pressable>
        );
      case 'TextEdit':
        return (
          <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)}>
            <View style={[styles.modalContent, { height: screenHeight * 0.65, maxHeight: screenHeight * 0.8 }]} onStartShouldSetResponder={() => true}>
              <Text style={styles.modalTitle}>Edit Quote</Text>
              
              {/* Alignment Buttons */}
              <View style={styles.alignmentContainer}>
                <Pressable
                  onPress={() => setTextAlign(TextAlign.Left)}
                  style={[styles.alignButton, textAlign === TextAlign.Left && styles.alignButtonActive]}
                >
                  <Icon source="format-align-left" size={24} color={textAlign === TextAlign.Left ? '#1a73e8' : '#666'} />
                </Pressable>
                <Pressable
                  onPress={() => setTextAlign(TextAlign.Center)}
                  style={[styles.alignButton, textAlign === TextAlign.Center && styles.alignButtonActive]}
                >
                  <Icon source="format-align-center" size={24} color={textAlign === TextAlign.Center ? '#1a73e8' : '#666'} />
                </Pressable>
                <Pressable
                  onPress={() => setTextAlign(TextAlign.Right)}
                  style={[styles.alignButton, textAlign === TextAlign.Right && styles.alignButtonActive]}
                >
                  <Icon source="format-align-right" size={24} color={textAlign === TextAlign.Right ? '#1a73e8' : '#666'} />
                </Pressable>
              </View>

              {/* Text Input */}
              <Text style={styles.textInputLabel}>Tap to write quote</Text>
              <TextInput
                style={styles.quoteTextInput}
                placeholder="Enter your quote here..."
                placeholderTextColor="#999"
                multiline={true}
                value={quoteText}
                onChangeText={setQuoteText}
                textAlignVertical="top"
              />

              {/* Close Button */}
              <Pressable
                onPress={() => setModalVisible(false)}
                style={styles.editCloseButton}
              >
                <Text style={styles.editCloseButtonText}>Done</Text>
              </Pressable>
            </View>
          </Pressable>
        );
      case 'TextPosition':
        return (
          <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)}>
            <View style={[styles.modalContent, { height: screenHeight * 0.35 }]}>
              <Text style={styles.modalTitle}>Text Position</Text>
              
              {/* X Position Slider */}
              <View style={styles.sliderSection}>
                <Text style={styles.sliderLabelText}>X Position</Text>
                <Slider
                  style={styles.sliderLarge}
                  minimumValue={0}
                  maximumValue={1}
                  value={textXPercent}
                  minimumTrackTintColor="#1a73e8"
                  maximumTrackTintColor="#ddd"
                  onValueChange={(value) => setTextXPercent(value)}
                />
                <Text style={styles.sliderPercentText}>{Math.round(textXPercent * 100)}%</Text>
              </View>

              {/* Y Position Slider */}
              <View style={styles.sliderSection}>
                <Text style={styles.sliderLabelText}>Y Position</Text>
                <Slider
                  style={styles.sliderLarge}
                  minimumValue={0}
                  maximumValue={1}
                  value={textYPercent}
                  minimumTrackTintColor="#1a73e8"
                  maximumTrackTintColor="#ddd"
                  onValueChange={(value) => setTextYPercent(value)}
                />
                <Text style={styles.sliderPercentText}>{Math.round(textYPercent * 100)}%</Text>
              </View>
            </View>
          </Pressable>
        );
        
                
      default:
        return (
          <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)}>
            <View style={[styles.modalContent, { height: screenHeight * 0.3 }]}>
              <Text style={styles.modalTitle}>Default Modal Content</Text>
            </View>
          </Pressable>
        );
    }
  };


  return (
    <>
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="Notes" />
      </Appbar.Header>

      <Pressable
        onPress={() => {
          setCurrentFeature('TextEdit');
          setModalVisible(true);
        }}
        style={[styles.canvas, { width: canvasWidth, height: canvasHeight }]}
      >
        <Canvas style={{ width: canvasWidth, height: canvasHeight }}>
          <Rect x={0} y={0} width={canvasWidth} height={canvasHeight} color={bgColor} />
          {image && (
            <SkiaImage
              image={image}
              //make control for opacity and fit in the future
              opacity={imageOpacity}
              fit="cover"
              x={0}
              y={0}
              width={canvasWidth}
              height={canvasHeight}
            />
          )}
          <Paragraph
            paragraph={paragraph}
            x={canvasWidth * textXPercent}
            y={canvasHeight * textYPercent}
            width={canvasWidth * 0.9}
          />
          {/* Drag overlay for moving text */}
        </Canvas>
      </Pressable>
        <View style={styles.settingsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator
            contentContainerStyle={styles.settingsScrollContent}
          >
            <View style={styles.settingsGrid}>
              {/* {Array.from({ length: 20 }, (_, index) => (
                <View key={`setting-item-${index}`} style={styles.settingsGridItem}>
                  <Text style={styles.settingsGridItemText}>{index + 1}</Text>

                </View>
              ))} */}
              {FeaturesArray.map((feature, index) => (
                <View key={`feature-item-${index}`} style={styles.settingsGridItem} onTouchEnd={() => HandleFeature(feature.name)}>
                  <Icon source={feature.icon} size={24} />
                  <Text style={styles.settingsGridItemText}>{feature.label}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
    </View>
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        
        onRequestClose={() => setModalVisible(false)}
      >
        {renderModalContent()}
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: '100%',
    //  backgroundColor: 'red'

  },
  canvas: {
    marginTop: 12,
    marginLeft: '5%',
    marginRight: '5%',
  },
  // // ── Dropdown trigger ──────────────────────────────────────────────────────
  // dropdownTrigger: {
  //   flexDirection: 'row',
  //   alignItems: 'center',
  //   marginTop: 10,
  //   marginHorizontal: '5%',
  //   paddingVertical: 10,
  //   paddingHorizontal: 14,
  //   backgroundColor: '#f0f0f0',
  //   borderRadius: 8,
  //   borderWidth: 1,
  //   borderColor: '#ddd',
  //   dropdownTriggerPressed: {
  //     backgroundColor: '#e0e0e0',
  //   },
  // },
  // dropdownTriggerText: {
  //   flex: 1,
  //   fontSize: 14,
  //   fontWeight: '600',
  //   color: '#222',
  // },
  // dropdownTriggerHint: {
  //   fontSize: 11,
  //   color: '#888',
  //   marginRight: 8,
  // },
  // dropdownChevron: {
  //   fontSize: 16,
  //   color: '#555',
  // },
  // // ── Dropdown modal ────────────────────────────────────────────────────────
  // modalBackdrop: {
  //   flex: 1,
  //   backgroundColor: 'rgba(0,0,0,0.4)',
  //   justifyContent: 'flex-end',
  // },
  // dropdownList: {
  //   backgroundColor: '#fff',
  //   borderTopLeftRadius: 16,
  //   borderTopRightRadius: 16,
  //   paddingBottom: 24,
  //   maxHeight: '60%',
  // },
  // dropdownListTitle: {
  //   textAlign: 'center',
  //   paddingVertical: 14,
  //   fontSize: 13,
  //   fontWeight: '700',
  //   color: '#444',
  //   borderBottomWidth: 1,
  //   borderBottomColor: '#eee',
  // },
  // dropdownItem: {
  //   paddingVertical: 14,
  //   paddingHorizontal: 20,
  //   borderBottomWidth: 1,
  //   borderBottomColor: '#f2f2f2',
  // },
  // dropdownItemActive: {
  //     dropdownItemPressed: {
  //       backgroundColor: '#f5f5f5',
  //     },
  //   backgroundColor: '#e8f0fe',
  // },
  // dropdownItemLabel: {
  //   fontSize: 14,
  //   color: '#222',
  // },
  // dropdownItemLabelActive: {
  //   fontWeight: '700',
  //   color: '#1a73e8',
  // },
  // dropdownItemHint: {
  //   fontSize: 11,
  //   color: '#999',
  //   marginTop: 2,
  // },
  settingsContainer: {
    // backgroundColor: 'green',
    height: '20%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flex:1
  },
  settingsGrid: {
    height: '100%',
    flexDirection: 'column',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
  },
  settingsScrollContent: {
    // paddingHorizontal: 4,
  },
  settingsGridItem: {
    width: 72,
    height: '50%',
   
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  settingsGridItemText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#222',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  modalOption: {
    alignItems: 'center',
    padding: 10,
  },
  modalOptionText: {
    fontSize: 14,
    marginTop: 5,
  },
  previewContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
  },
  sliderSection: {
    marginVertical: 20,
    marginHorizontal: 10,
  },
  sliderLabelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginBottom: 12,
  },
  sliderLarge: {
    width: '100%',
    height: 50,
    marginVertical: 0,
  },
  sliderPercentText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  inputsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    marginTop: 16,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#222',
    backgroundColor: '#f9f9f9',
  },
  fontOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  fontOptionActive: {
    backgroundColor: '#e8f0fe',
  },
  fontOptionText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  fontOptionTextActive: {
    fontWeight: '600',
    color: '#1a73e8',
  },
  sizeOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sizeOption: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  sizeOptionActive: {
    opacity: 1,
  },
  squarePreview: {
    width: 60,
    height: 60,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 4,
    backgroundColor: '#f5f5f5',
    marginBottom: 12,
  },
  squarePreviewActive: {
    borderColor: '#1a73e8',
    borderWidth: 3,
    backgroundColor: '#e8f0fe',
  },
  storyPreview: {
    width: 40,
    height: 70,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 4,
    backgroundColor: '#f5f5f5',
    marginBottom: 12,
  },
  storyPreviewActive: {
    borderColor: '#1a73e8',
    borderWidth: 3,
    backgroundColor: '#e8f0fe',
  },
  sizeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
    textAlign: 'center',
  },
  weightOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  weightOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginVertical: 8,
    marginHorizontal: 4,
    minWidth: '30%',
    alignItems: 'center',
  },
  weightOptionActive: {
    borderColor: '#1a73e8',
    backgroundColor: '#e8f0fe',
    borderWidth: 2,
  },
  weightOptionText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  weightOptionTextActive: {
    color: '#1a73e8',
    fontWeight: '700',
  },
  alignmentContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginVertical: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  alignButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f9f9f9',
  },
  alignButtonActive: {
    borderColor: '#1a73e8',
    backgroundColor: '#e8f0fe',
    borderWidth: 2,
  },
  textInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
    marginBottom: 8,
  },
  quoteTextInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#222',
    backgroundColor: '#f9f9f9',
    minHeight: 120,
    marginBottom: 16,
  },
  editCloseButton: {
    backgroundColor: '#1a73e8',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  editCloseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
})
