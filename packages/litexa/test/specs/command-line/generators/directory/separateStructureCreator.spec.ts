/*
 * +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
 * Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 * +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
 */

import { assert } from 'chai';
import { match, spy, stub } from 'sinon';
import { join } from 'path';

import SeparateStructureCreator from '../../../../../src/command-line/generators/directory/separateStructureCreator';

describe('SeparateStructureCreator', () => {
  const rootPath = '.';
  let loggerInterface: any = undefined;
  let templateFilesHandler: any = undefined;

  beforeEach(() => {
    loggerInterface = {
      log() {}
    };
    templateFilesHandler = {
      syncDir() {}
    };
  });

  /*
  describe('#create', () => {
    it('creates the appropriate directory structure', () => {
      const ensureDirExistsStub = stub(SeparateStructureCreator.prototype, 'ensureDirExists').callsFake(() => true);
      const separateStructureCreator = new SeparateStructureCreator({
        logger: loggerInterface,
        rootPath
      });

      separateStructureCreator.create();

      assert(ensureDirExistsStub.calledWith('litexa'), 'created the litexa directory');
      assert(ensureDirExistsStub.calledWith(path.join('lib', 'services')), 'created the lib services directory');
      return assert(ensureDirExistsStub.calledWith(path.join('lib', 'components')), 'created the lib components directory');
    });
  });
  */

  describe('#sync', () => {
    it('targets the correct destination directory', () => {
      const syncDirSpy = spy(templateFilesHandler, 'syncDir');

      const separateStructureCreator = new SeparateStructureCreator({
        logger: loggerInterface,
        sourceLanguage: 'javascript',
        bundlingStrategy: 'none',
        rootPath,
        templateFilesHandler
      });

      separateStructureCreator.sync();

      assert(syncDirSpy.calledWith(match({destination: 'litexa'})), 'targets the litexa directory');
      assert(syncDirSpy.calledWith(match({destination: 'lib'})), 'targets the lib directory');
    });


    it('targets the correct directories for npm-link bundling with JavaScript', () => {
      const syncDirSpy = spy(templateFilesHandler, 'syncDir');
      const separateStructureCreator = new SeparateStructureCreator({
        logger: loggerInterface,
        sourceLanguage: 'javascript',
        bundlingStrategy: 'npm-link',
        rootPath,
        templateFilesHandler
      });

      separateStructureCreator.sync();

      const expectedDirsLitexa = [
        join('common', 'litexa'),
        join('separate', 'litexa')
      ];
      const expectedDirsJavaScript = [
        join('common', 'javascript'),
        join('separate', 'javascript')
      ];

      assert(syncDirSpy.calledWith(match({ sourcePaths: expectedDirsLitexa })),
        'reads from the correct directories for the litexa files');
      return assert(syncDirSpy.calledWith(match({ sourcePaths: expectedDirsJavaScript })),
        'reads from the correct directories for the javascript files');
    });

    it('targets the correct directories for npm-link bundling with TypeScript', () => {
      const syncDirSpy = spy(templateFilesHandler, 'syncDir');
      const separateStructureCreator = new SeparateStructureCreator({
        logger: loggerInterface,
        sourceLanguage: 'typescript',
        bundlingStrategy: 'npm-link',
        rootPath,
        templateFilesHandler
      });

      separateStructureCreator.sync();

      const expectedDirsLitexa = [
        join('common', 'litexa'),
        join('separate', 'litexa')
      ];
      const expectedDirsTypeScript = [
        join('common', 'typescript', 'source'),
        join('separate', 'typescript')
      ];

      assert(syncDirSpy.calledWith(match({ sourcePaths: expectedDirsLitexa })),
        'reads from the correct directories for the litexa files');
      assert(syncDirSpy.calledWith(match({ sourcePaths: expectedDirsTypeScript })),
        'reads from the correct directories for the typescript files');
    });

    it('targets the correct directories for npm-link bundling with CoffeeScript', () => {
      const syncDirSpy = spy(templateFilesHandler, 'syncDir');
      const separateStructureCreator = new SeparateStructureCreator({
        logger: loggerInterface,
        sourceLanguage: 'coffee',
        bundlingStrategy: 'npm-link',
        rootPath,
        templateFilesHandler
      });

      separateStructureCreator.sync();

      const expectedDirsLitexa = [
        join('common', 'litexa'),
        join('separate', 'litexa')
      ];
      const expectedDirsCoffeeScript = [
        join('common', 'coffee'),
        join('separate', 'coffee')
      ];

      assert(syncDirSpy.calledWith(match({ sourcePaths: expectedDirsLitexa })),
        'reads from the correct directories for the litexa files');
      assert(syncDirSpy.calledWith(match({ sourcePaths: expectedDirsCoffeeScript })),
        'reads from the correct directories for the coffee files');
    });
  });
});
