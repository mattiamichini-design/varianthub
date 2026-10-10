import {describe,it,expect} from 'vitest';
import {normalizeVariantHubState} from './provider';

describe('browser preference migration',()=>{
  it('retains compatible selection and rejects malformed or duplicate IDs',()=>{
    const old=JSON.parse('{"components":{"example":{"variantOrder":["a","a",42,"b"],"selectedVariants":["b"],"favoriteVariants":"bad","zoom":999,"variantUpdatedAt":{"a":"2020-01-01"}}}}');
    const current=normalizeVariantHubState(old).components.example;
    expect(current.variantOrder).toEqual(['a','b']);
    expect(current.comparedVariantIds).toEqual(['b']);
    expect(current.favoriteVariants).toEqual([]);
    expect(current.zoom).toBe(200);
    expect(current.variantUpdatedAt).toEqual({});
  });
});
