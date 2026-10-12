import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LayerZeroFeeEstimator } from '../src/lz-estimator.js';

describe('LayerZeroFeeEstimator', () => {
  const estimator = new LayerZeroFeeEstimator();

  it('calculates deterministic gas quote based on payload length', () => {
    const fee1 = estimator.estimateFee({
      srcEid: 30268,
      dstEid: 30110,
      receiver: '0x1111111111111111111111111111111111111111',
      payloadLength: 128,
    });

    const fee2 = estimator.estimateFee({
      srcEid: 30268,
      dstEid: 30110,
      receiver: '0x1111111111111111111111111111111111111111',
      payloadLength: 256,
    });

    assert.ok(fee2.nativeFee > fee1.nativeFee);
    assert.equal(fee1.lzTokenFee, 0n);
  });

  it('validates supported cross-chain endpoint pairings', () => {
    assert.equal(estimator.validateEndpointCompatibility(30268, 30110), true);
    assert.equal(estimator.validateEndpointCompatibility(30268, 30268), false);
    assert.equal(estimator.validateEndpointCompatibility(99999, 30110), false);
  });
});
