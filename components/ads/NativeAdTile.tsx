import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import MaterialIcons from '@react-native-vector-icons/material-design-icons';
import {
  NativeAd,
  NativeAdView,
  NativeAsset,
  NativeAssetType,
  TestIds,
} from 'react-native-google-mobile-ads';

type NativeAdTileProps = {
  variant?: 'feed' | 'grid' | 'square';
  style?: StyleProp<ViewStyle>;
};

const AD_UNIT_ID = TestIds.NATIVE;

export default function NativeAdTile({ variant = 'feed', style }: NativeAdTileProps) {
  const [nativeAd, setNativeAd] = useState<NativeAd | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const nativeAdRef = useRef<NativeAd | null>(null);

  useEffect(() => {
    let active = true;

    const loadAd = async () => {
      try {
        const ad = await NativeAd.createForAdRequest(AD_UNIT_ID, {
          requestAgent: 'note2quote',
        });

        if (!active) {
          ad.destroy();
          return;
        }

        nativeAdRef.current = ad;
        setNativeAd(ad);
        setLoading(false);
        setFailed(false);
      } catch (error) {
        if (!active) {
          return;
        }

        console.warn('Failed to load native ad', error);
        setFailed(true);
        setLoading(false);
      }
    };

    loadAd();

    return () => {
      active = false;
      nativeAdRef.current?.destroy();
      nativeAdRef.current = null;
    };
  }, []);

  const rootStyle = [
    styles.card,
    variant === 'feed' && styles.feedCard,
    variant === 'grid' && styles.gridCard,
    variant === 'square' && styles.squareCard,
    style,
  ];

  if (loading || failed || !nativeAd) {
    return (
      <View style={[styles.placeholder, ...rootStyle]}>
        <View style={styles.placeholderBadge}>
          <MaterialIcons name="tag-outline" size={18} color="#9aa3af" />
          <Text style={styles.placeholderBadgeText}>Sponsored</Text>
        </View>
        <ActivityIndicator size="small" color="#1a73e8" />
        <Text style={styles.placeholderText}>
          {failed ? 'Ad not available right now' : 'Loading ad...'}
        </Text>
      </View>
    );
  }

  return (
    <NativeAdView nativeAd={nativeAd} style={rootStyle}>
      {variant === 'feed' ? (
        <View style={styles.feedLayout}>
          <View style={styles.feedIconWrap}>
            {nativeAd.icon ? (
              <NativeAsset assetType={NativeAssetType.ICON}>
                <Image
                  source={{ uri: nativeAd.icon.url }}
                  style={styles.feedIcon}
                  resizeMode="cover"
                />
              </NativeAsset>
            ) : (
              <View style={styles.feedIconFallback}>
                <MaterialIcons name="bullhorn" size={24} color="#1a73e8" />
              </View>
            )}
          </View>

          <View style={styles.feedContent}>
            <View style={styles.feedHeaderRow}>
              <Text style={styles.sponsoredLabel}>Sponsored</Text>
              <View style={styles.feedBadge}>
                <Text style={styles.feedBadgeText}>Ad</Text>
              </View>
            </View>

            <NativeAsset assetType={NativeAssetType.HEADLINE}>
              <Text style={styles.feedHeadline} numberOfLines={2}>
                {nativeAd.headline}
              </Text>
            </NativeAsset>

            <NativeAsset assetType={NativeAssetType.BODY}>
              <Text style={styles.feedBody} numberOfLines={3}>
                {nativeAd.body || 'Discover more content from a sponsored recommendation.'}
              </Text>
            </NativeAsset>

            <View style={styles.feedFooterRow}>
              <NativeAsset assetType={NativeAssetType.ADVERTISER}>
                <Text style={styles.feedAdvertiser} numberOfLines={1}>
                  {nativeAd.advertiser || 'Sponsored'}
                </Text>
              </NativeAsset>

              <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
                <View style={styles.ctaPill}>
                  <Text style={styles.ctaText}>{nativeAd.callToAction || 'Open'}</Text>
                </View>
              </NativeAsset>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.squareLayout}>
          <View style={styles.squareTopRow}>
            <View style={styles.feedIconWrap}>
              {nativeAd.icon ? (
                <NativeAsset assetType={NativeAssetType.ICON}>
                  <Image
                    source={{ uri: nativeAd.icon.url }}
                    style={styles.squareIcon}
                    resizeMode="cover"
                  />
                </NativeAsset>
              ) : (
                <View style={styles.feedIconFallback}>
                  <MaterialIcons name="bullhorn" size={24} color="#1a73e8" />
                </View>
              )}
            </View>

            <View style={styles.feedBadge}>
              <Text style={styles.feedBadgeText}>Ad</Text>
            </View>
          </View>

          <View style={styles.squareContent}>
            <NativeAsset assetType={NativeAssetType.HEADLINE}>
              <Text style={styles.squareHeadline} numberOfLines={2}>
                {nativeAd.headline}
              </Text>
            </NativeAsset>

            <NativeAsset assetType={NativeAssetType.BODY}>
              <Text style={styles.squareBody} numberOfLines={4}>
                {nativeAd.body || 'Sponsored content is showing here.'}
              </Text>
            </NativeAsset>
          </View>

          <View style={styles.squareFooter}>
            <NativeAsset assetType={NativeAssetType.ADVERTISER}>
              <Text style={styles.squareAdvertiser} numberOfLines={1}>
                {nativeAd.advertiser || 'Sponsored'}
              </Text>
            </NativeAsset>

            <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
              <View style={styles.ctaPill}>
                <Text style={styles.ctaText}>{nativeAd.callToAction || 'Open'}</Text>
              </View>
            </NativeAsset>
          </View>
        </View>
      )}
    </NativeAdView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    // borderColor: '#e6e8ee',
    // backgroundColor: '#fff',
    overflow: 'hidden',
  },
  feedCard: {
    minHeight: 148,
    borderRadius: 20,
    padding: 14,
  },
  gridCard: {
    aspectRatio: 1,
    borderRadius: 18,
    padding: 12,
  },
  squareCard: {
    aspectRatio: 1,
    borderRadius: 24,
    padding: 16,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  placeholderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#f3f4f6',
  },
  placeholderBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#667085',
  },
  placeholderText: {
    fontSize: 13,
    color: '#667085',
  },
  feedLayout: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  feedIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#f2f7ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedIcon: {
    width: '100%',
    height: '100%',
  },
  squareIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
  },
  feedIconFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8f1ff',
  },
  feedContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  feedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  sponsoredLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7b8794',
  },
  feedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#e8f0fe',
  },
  feedBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1a73e8',
    letterSpacing: 0.3,
  },
  feedHeadline: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
    color: '#1f2937',
  },
  feedBody: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: '#4b5563',
  },
  feedFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 10,
  },
  feedAdvertiser: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
    flexShrink: 1,
  },
  ctaPill: {
    minHeight: 34,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#1a73e8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
  },
  squareLayout: {
    flex: 1,
    gap: 12,
  },
  squareTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  squareContent: {
    flex: 1,
    justifyContent: 'center',
  },
  squareHeadline: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    color: '#1f2937',
  },
  squareBody: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 19,
    color: '#4b5563',
  },
  squareFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  squareAdvertiser: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
    flex: 1,
  },
});
