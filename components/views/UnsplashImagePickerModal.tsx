import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MaterialIcons from '@react-native-vector-icons/material-design-icons';
import {
  searchUnsplashPhotos,
  type UnsplashPhoto,
  type UnsplashSearchOrientation,
  UNSPLASH_CLIENT_ID,
} from '../../utils/unsplash';

type UnsplashImagePickerModalProps = {
  visible: boolean;
  orientation?: UnsplashSearchOrientation;
  onClose: () => void;
  onSelect: (photo: UnsplashPhoto) => Promise<void> | void;
};

const DEFAULT_QUERY = 'background';

export default function UnsplashImagePickerModal({
  visible,
  orientation,
  onClose,
  onSelect,
}: UnsplashImagePickerModalProps) {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [submittedQuery, setSubmittedQuery] = useState(DEFAULT_QUERY);
  const [refreshToken, setRefreshToken] = useState(0);
  const [photos, setPhotos] = useState<UnsplashPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setQuery(DEFAULT_QUERY);
    setSubmittedQuery(DEFAULT_QUERY);
    setRefreshToken((current) => current + 1);
    setPhotos([]);
    setError(null);
  }, [visible]);

  useEffect(() => {
    if (!visible || !UNSPLASH_CLIENT_ID) {
      return;
    }

    const timer = setTimeout(() => {
      const nextQuery = query.trim() || DEFAULT_QUERY;
      setSubmittedQuery(nextQuery);
      setRefreshToken((current) => current + 1);
    }, 350);

    return () => clearTimeout(timer);
  }, [query, visible]);

  useEffect(() => {
    if (!visible || !UNSPLASH_CLIENT_ID) {
      return;
    }

    let active = true;
    const currentRequestId = ++requestIdRef.current;

    const load = async () => {
      try {
        setError(null);
        setLoading(true);

        const result = await searchUnsplashPhotos({
          query: submittedQuery,
          orientation,
        });

        if (!active || !mountedRef.current || currentRequestId !== requestIdRef.current) {
          return;
        }

        setPhotos(result.results.slice(0, 30));
      } catch (fetchError) {
        if (!active || !mountedRef.current || currentRequestId !== requestIdRef.current) {
          return;
        }

        const message = fetchError instanceof Error ? fetchError.message : 'Unable to load Unsplash photos.';
        setError(message);
      } finally {
        if (!active || !mountedRef.current || currentRequestId !== requestIdRef.current) {
          return;
        }

        setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [orientation, refreshToken, submittedQuery, visible]);

  const handleSelectPhoto = async (photo: UnsplashPhoto) => {
    try {
      await onSelect(photo);
    } catch (selectError) {
      const message = selectError instanceof Error ? selectError.message : 'Unable to use this photo.';
      Alert.alert('Could not use photo', message);
    }
  };

  const footer = useMemo(() => {
    if (!UNSPLASH_CLIENT_ID) {
      return (
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Add your Unsplash access key</Text>
          <Text style={styles.noticeBody}>
            Set `unsplash_access_key` in `app.json` to unlock search and selection here.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Unsplash attribution</Text>
        <Text style={styles.noticeBody}>
          Each image card shows the photographer name. Unsplash download tracking is triggered when you select a photo.
        </Text>
      </View>
    );
  }, []);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.title}>Unsplash</Text>
            <Text style={styles.subtitle}>Search and pick a background image</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={10} style={styles.closeButton}>
            <MaterialIcons name="close" size={22} color="#1f1a17" />
          </Pressable>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <MaterialIcons name="magnify" size={20} color="#7a746f" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search photos"
              placeholderTextColor="#8e8883"
              style={styles.searchInput}
              returnKeyType="search"
              onSubmitEditing={() => {
                setSubmittedQuery(query.trim() || DEFAULT_QUERY);
                setRefreshToken((current) => current + 1);
              }}
            />
          </View>
          <Pressable
            onPress={() => {
              setSubmittedQuery(query.trim() || DEFAULT_QUERY);
              setRefreshToken((current) => current + 1);
            }}
            style={styles.searchButton}
          >
            <Text style={styles.searchButtonText}>Search</Text>
          </Pressable>
        </View>

        <View style={styles.content}>
          {!UNSPLASH_CLIENT_ID ? (
            footer
          ) : loading && photos.length === 0 ? (
            <View style={styles.stateWrap}>
              <ActivityIndicator size="large" color="#c9792b" />
              <Text style={styles.stateTitle}>Loading photos</Text>
            </View>
          ) : error ? (
            <View style={styles.stateWrap}>
              <Text style={styles.stateTitle}>Could not load photos</Text>
              <Text style={styles.stateBody}>{error}</Text>
              <Pressable
                onPress={() => {
                  setSubmittedQuery(query.trim() || DEFAULT_QUERY);
                  setRefreshToken((current) => current + 1);
                }}
                style={styles.retryButton}
              >
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            </View>
          ) : (
            <FlatList
              data={photos}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={styles.gridRow}
              contentContainerStyle={styles.gridContent}
              ListFooterComponent={footer}
              renderItem={({ item }) => {
                const photographerProfile = `${item.user.links.html}?utm_source=note2quote&utm_medium=referral`;

                return (
                  <Pressable style={styles.card} onPress={() => void handleSelectPhoto(item)}>
                    <Image source={{ uri: item.urls.small }} style={styles.cardImage} />
                    <View style={styles.cardOverlay}>
                      <Text style={styles.cardName} numberOfLines={1}>
                        Photo by {item.user.name} on Unsplash
                      </Text>
                      <Pressable
                        onPress={() => {
                          void Linking.openURL(photographerProfile);
                        }}
                        hitSlop={8}
                      >
                        <Text style={styles.cardLink}>View profile</Text>
                      </Pressable>
                    </View>
                  </Pressable>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5efe7',
    paddingTop: 18,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  title: {
    color: '#201914',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  subtitle: {
    color: '#6f655d',
    marginTop: 4,
    fontSize: 13,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#fff9f3',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 18,
    paddingBottom: 14,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff9f3',
    borderRadius: 18,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: '#eadfce',
  },
  searchInput: {
    flex: 1,
    color: '#201914',
    fontSize: 15,
  },
  searchButton: {
    height: 48,
    paddingHorizontal: 18,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1f1a17',
  },
  searchButtonText: {
    color: '#fff9f3',
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: 14,
  },
  gridContent: {
    paddingBottom: 20,
  },
  gridRow: {
    gap: 12,
  },
  card: {
    flex: 1,
    marginBottom: 12,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#ddd1c1',
    minHeight: 220,
  },
  cardImage: {
    width: '100%',
    height: 220,
  },
  cardOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(23,18,15,0.66)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  cardName: {
    color: '#fff8f0',
    fontSize: 13,
    fontWeight: '700',
  },
  cardLink: {
    color: '#f0cf9c',
    marginTop: 2,
    fontSize: 11,
    fontWeight: '600',
  },
  stateWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  stateTitle: {
    marginTop: 14,
    color: '#201914',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  stateBody: {
    marginTop: 8,
    color: '#6f655d',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  retryButton: {
    marginTop: 16,
    borderRadius: 14,
    backgroundColor: '#1f1a17',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryText: {
    color: '#fff9f3',
    fontWeight: '700',
  },
  notice: {
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 18,
    padding: 14,
    backgroundColor: '#fff9f3',
    borderWidth: 1,
    borderColor: '#eadfce',
  },
  noticeTitle: {
    color: '#201914',
    fontSize: 13,
    fontWeight: '800',
  },
  noticeBody: {
    color: '#6f655d',
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
  },
});
