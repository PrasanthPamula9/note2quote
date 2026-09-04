/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';
import { DEFAULT_EDITOR_CONFIG } from '../utils/quoteConfig';

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});

test('quote editor defaults to a typewriter font', () => {
  expect(DEFAULT_EDITOR_CONFIG.font_family).toBe('Courier Prime');
});
