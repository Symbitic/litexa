/*
 * +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
 * Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 * +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
 */

import { expect } from 'chai';
import { assert, match, stub } from 'sinon';

import { Artifacts } from '../../../src/deployment/artifacts';
import isp from '../../../src/command-line/isp';

describe('ISP', () => {
  isp.artifacts = undefined;
  isp.skillId = undefined;
  let mockArtifactSummary = undefined;
  let mockProduct = undefined;
  let smapiStub = undefined;

  beforeEach(() => {
    mockArtifactSummary = {};
    const mockArtifacts = new Artifacts(null, {
      versions: [
        {}
      ]
    });
    mockArtifacts.setVariant('development');
    mockArtifacts.save('monetization', {});

    isp.init({
      artifacts: mockArtifacts,
      logger: { log() { return undefined; } },
      root: '.',
      skillId: 'mockSkillId',
      stage: 'development'
    });

    mockProduct = {
      productId: 'mockProductId',
      referenceName: 'mockReferenceName',
      filePath: 'mockFilePath'
    };

    const fakeSmapiCall = args => Promise.resolve('{}');
    smapiStub = stub(isp.smapi, 'call').callsFake(fakeSmapiCall);
  });

  afterEach(() => smapiStub.restore());

  it('successfully checks a list for a specific product', () => {
    const mockList = [
      {
        productId: 'otherId'
      }
    ];
    expect(isp.listContainsProduct(mockList, mockProduct)).to.be.false;

    mockList.push({
      productId: 'mockProductId'
    });
    expect(isp.listContainsProduct(mockList, mockProduct)).to.be.true;
  });

  it('provides correct CLI args for pulling a list of remote products', async () => {
    await isp.pullRemoteProductList(mockProduct, mockArtifactSummary);

    expect(smapiStub.callCount).to.equal(1);
    assert.calledWithMatch(smapiStub, {
      command: 'list-isp-for-skill',
      params: {
        'skill-id': isp.skillId,
        'stage': isp.stage
      }
    });
  });

  it('provides correct CLI args for retrieving definition for a product', async () => {
    await isp.getProductDefinition(mockProduct);

    expect(smapiStub.callCount).to.equal(1);
    return assert.calledWithMatch(smapiStub, {
      command: 'get-isp',
      params: {
        'isp-id': mockProduct.productId,
        'stage': isp.stage
      }
    });
  });

  it('provides correct CLI args for creating a remote product', async () => {
    isp.artifacts.save('monetization', {
      mockReferenceName: {
        productId: 'mockProductId'
      }
    });

    await isp.createRemoteProduct(mockProduct, mockArtifactSummary);

    expect(smapiStub.callCount).to.equal(2);
    assert.calledWithMatch(smapiStub.firstCall, {
      command: 'create-isp',
      params: {
        file: mockProduct.filePath
      }
    });

    assert.calledWithMatch(smapiStub.secondCall, {
      command: 'associate-isp',
      params: {
        'isp-id': mockProduct.productId,
        'skill-id': isp.skillId
      }
    });
  });

  it('provides correct CLI args for updating a remote product', async () => {
    isp.artifacts.save('monetization', {
      mockReferenceName: {
        productId: 'mockProductId'
      }
    });

    await isp.updateRemoteProduct(mockProduct, mockArtifactSummary);

    expect(smapiStub.callCount).to.equal(1);
    assert.calledWithMatch(smapiStub, {
      command: 'update-isp',
      params: {
        'isp-id': mockProduct.productId,
        file: mockProduct.filePath,
        stage: isp.stage
      }
    });

    expect(mockArtifactSummary).to.deep.equal({
      [mockProduct.referenceName]: {
        productId: mockProduct.productId
        }
      });
  });

  it('provides correct CLI args for disassociating and deleting a remote product', async () => {
    await isp.deleteRemoteProduct(mockProduct);

    expect(smapiStub.callCount).to.equal(2);
    assert.calledWithMatch(smapiStub.firstCall, {
      command: 'disassociate-isp',
      params: {
        'isp-id': mockProduct.productId,
        'skill-id': isp.skillId
      }
    });

    assert.calledWithMatch(smapiStub.secondCall, {
      command: 'delete-isp',
      params: {
        'isp-id': mockProduct.productId,
        stage: isp.stage
      }
    });
  });

  it('provides correct CLI args for associating a product', async () => {
    await isp.associateProduct(mockProduct);

    expect(smapiStub.callCount).to.equal(1);
    assert.calledWithMatch(smapiStub, {
      command: 'associate-isp',
      params: {
        'isp-id': mockProduct.productId,
        'skill-id': isp.skillId
      }
    });
  });
});
