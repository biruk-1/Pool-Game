import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import { COLORS } from './src/game/constants';

/**
 * Web entry: CanvasKit (Skia's WebAssembly build) must be loaded before any
 * Skia component renders. The wasm file lives in /public (see setup-skia-web).
 */
export default function App() {
  return (
    <WithSkiaWeb
      getComponent={() => import('./src/AppRoot')}
      opts={{ locateFile: (file: string) => `/${file}` }}
      fallback={
        <View style={styles.loading}>
          <ActivityIndicator color={COLORS.accent} />
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
});
