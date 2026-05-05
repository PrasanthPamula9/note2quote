
// const CropperModal = ({ photo, onConfirm, onCancel }) => {
//   const image = useImage(photo.uri);
//   const cropRect = useSharedValue({ x: 50, y: 50, width: 200, height: 200 });
  
//   const panGesture = Gesture.Pan().onChange((e) => {
//     // Update crop rect position/size with gestures
//     'worklet';
//     cropRect.value = {
//       x: cropRect.value.x + e.changeX,
//       y: cropRect.value.y + e.changeY,
//       width: cropRect.value.width,
//       height: cropRect.value.height,
//     };
//   });
  
//   const confirmCrop = async () => {
//     // Use react-native-image-editor or native crop module
//     // For demo: save crop rect params and generate cropped image
//     const croppedUri = await cropImage(photo.uri, cropRect.value);
//     onConfirm(croppedUri);
//   };
  
//   return (
//     <Modal visible={true}>
//       <Canvas style={{ flex: 1 }}>
//         <SkiaImage image={image} fit="contain" x={0} y={0} width="100%" height="100%" />
//         <Rect 
//           x={cropRect.x} y={cropRect.y}
//           width={cropRect.width} height={cropRect.height}
//           color="rgba(0,0,0,0.5)"
//           style="stroke"
//           strokeWidth={2}
//         />
//       </Canvas>
//       <GestureDetector gesture={panGesture}>
//         <Animated.View style={{ position: 'absolute', top: 20, right: 20 }}>
//           <Button title="Confirm" onPress={confirmCrop} />
//         </Animated.View>
//       </GestureDetector>
//     </Modal>
//   );
// };
