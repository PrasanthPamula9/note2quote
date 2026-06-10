import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Canvas, Path, Skia, StrokeCap } from '@shopify/react-native-skia';
import MaterialIcons from '@react-native-vector-icons/material-design-icons';
import NativeAdTile from '../ads/NativeAdTile';

type ExportFormat = 'png' | 'jpeg' | 'jpg';

type QuoteExportViewProps = {
  visible: boolean;
  exportFormat: ExportFormat;
  exportMenuVisible: boolean;
  exporting: boolean;
  exportProgress: number;
  exportStatus: string;
  onClose: () => void;
  onToggleMenu: () => void;
  onSelectFormat: (format: ExportFormat) => void;
  onExport: () => void;
};

const EXPORT_FORMAT_OPTIONS: Array<{ value: ExportFormat; label: string }> = [
  { value: 'png', label: 'PNG' },
  { value: 'jpeg', label: 'JPEG' },
  { value: 'jpg', label: 'JPG' },
];

export default function QuoteExportView({
  visible,
  exportFormat,
  exportMenuVisible,
  exporting,
  exportProgress,
  exportStatus,
  onClose,
  onToggleMenu,
  onSelectFormat,
  onExport,
}: QuoteExportViewProps) {
  if (!visible) {
    return null;
  }

  const renderProgressPath = (progress: number) => {
    const size = 128;
    const strokeWidth = 10;
    const path = Skia.Path.Make();
    path.addOval({
      x: strokeWidth / 2,
      y: strokeWidth / 2,
      width: size - strokeWidth,
      height: size - strokeWidth,
    });

    return { path, size, strokeWidth, progress };
  };

  const progressConfig = renderProgressPath(exportProgress);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={() => {
        if (!exporting) {
          onClose();
        }
      }}
    >
      <View style={styles.container}>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => {
              if (!exporting) {
                onClose();
              }
            }}
            hitSlop={10}
            style={styles.backButton}
          >
            <MaterialIcons name="chevron-left" size={24} color="#1f2937" />
          </Pressable>

          <View style={styles.titleWrap}>
            <Text style={styles.title}>Export Quote</Text>
            <Text style={styles.subtitle}>Choose a format and export the current quote.</Text>
          </View>

          <View style={styles.spacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>File type</Text>
            <Pressable
              style={styles.dropdown}
              onPress={() => {
                if (!exporting) {
                  onToggleMenu();
                }
              }}
            >
              <Text style={styles.dropdownText}>
                {EXPORT_FORMAT_OPTIONS.find((option) => option.value === exportFormat)?.label ?? 'PNG'}
              </Text>
              <MaterialIcons
                name={exportMenuVisible ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#344054"
              />
            </Pressable>

            {exportMenuVisible ? (
              <View style={styles.menu}>
                {EXPORT_FORMAT_OPTIONS.map((option) => (
                  <Pressable
                    key={option.value}
                    style={[
                      styles.menuItem,
                      exportFormat === option.value && styles.menuItemActive,
                    ]}
                    onPress={() => onSelectFormat(option.value)}
                  >
                    <Text style={styles.menuItemText}>{option.label}</Text>
                    {exportFormat === option.value ? (
            <MaterialIcons name="check" size={18} color="#433e3e" />
                    ) : null}
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>

          <View style={styles.progressCard}>
            <View style={styles.progressWrap}>
              <Canvas style={{ width: progressConfig.size, height: progressConfig.size }}>
                <Path
                  path={progressConfig.path}
                  start={0}
                  end={1}
                  stroke={{ width: progressConfig.strokeWidth, cap: StrokeCap.Round }}
                  color="rgba(255, 193, 7, 0.18)"
                />
                <Path
                  path={progressConfig.path}
                  start={0}
                  end={Math.max(0, Math.min(1, progressConfig.progress / 100))}
                  stroke={{ width: progressConfig.strokeWidth, cap: StrokeCap.Round }}
                  color="#ffc107"
                />
              </Canvas>

              <View style={styles.progressCenter}>
                <Text style={styles.progressText}>{Math.round(exportProgress)}%</Text>
              </View>
            </View>

            <Text style={styles.statusText}>{exportStatus}</Text>
          </View>

          <View style={styles.actions}>
            <Pressable
              style={[styles.actionButton, styles.secondaryButton, exporting && styles.disabled]}
              disabled={exporting}
              onPress={onClose}
            >
              <Text style={styles.secondaryText}>Close</Text>
            </Pressable>
            <Pressable
              style={[styles.actionButton, styles.primaryButton, exporting && styles.disabled]}
              disabled={exporting}
              onPress={onExport}
            >
              <Text style={styles.primaryText}>{exporting ? 'Exporting...' : 'Export'}</Text>
            </Pressable>
          </View>

          <View style={styles.squareAdSection}>
            <Text style={styles.sectionLabel}>Sponsored</Text>
            <View style={styles.squareAdFrame}>
              <NativeAdTile variant="square" />
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ececec',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1f2937',
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
    color: '#667085',
  },
  spacer: {
    width: 40,
  },
  content: {
    padding: 16,
    gap: 14,
  },
  squareAdSection: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#433e3e',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  squareAdFrame: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 360,
  },
  sectionCard: {
    borderRadius: 24,
    backgroundColor: '#fff',
    padding: 16,
    borderWidth: 1,
    borderColor: '#ececec',
  },
  dropdown: {
    minHeight: 50,
    marginTop: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ececec',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1f2937',
  },
  menu: {
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ececec',
    overflow: 'hidden',
  },
  menuItem: {
    minHeight: 46,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#ececec',
    backgroundColor: '#fff',
  },
  menuItemActive: {
    backgroundColor: '#ffc107',
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#433e3e',
  },
  progressCard: {
    borderRadius: 24,
    backgroundColor: '#fff',
    padding: 18,
    borderWidth: 1,
    borderColor: '#ececec',
    alignItems: 'center',
  },
  progressWrap: {
    width: 128,
    height: 128,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressCenter: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#433e3e',
  },
  statusText: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
    color: '#667085',
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ececec',
  },
  primaryButton: {
    backgroundColor: '#ffc107',
  },
  secondaryText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#344054',
  },
  primaryText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#433e3e',
  },
  disabled: {
    opacity: 0.6,
  },
});
