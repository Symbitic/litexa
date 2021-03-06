/*
 * +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
 * Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 * +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
 */

import path from 'path';
import preamble from '../preamble';
import test from '@litexa/core/src/command-line/test';

describe('supports testing a skill', () => {
  it('runs a test on a simple skill', async () => {
    const root = path.join(__dirname, '..', 'data', 'simple-skill');

    const options = {
      root,
      logger: console,
      dontExit: true
    };

    return await test.run(options);
  });

  it('supports capturing/resuming tests', () => {
    return preamble.runSkill('test-capture-resume');
  });
});
