#!/usr/bin/env bun

import { configureEsbuildFallback, ensureRollupNativeFallback } from '../shared/rollupNativeFallback';

process.env.ROLLUP_SKIP_NODEJS_NATIVE ??= '1';

ensureRollupNativeFallback();
configureEsbuildFallback();

await Bun.$`vite build --mode=development --watch`;
