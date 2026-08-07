import { describe, expect, it } from 'vitest';
import { InMemoryAIFeatureControl } from './InMemoryAIFeatureControl.js';

describe('InMemoryAIFeatureControl', () => {
  it('defaults to enabled (installing this package must not break an existing app)', () => {
    const control = new InMemoryAIFeatureControl();
    expect(control.isEnabled()).toBe(true);
    expect(control.getState()).toEqual({ enabled: true, features: {} });
  });

  it('accepts an explicit initial enabled state', () => {
    const control = new InMemoryAIFeatureControl({ enabled: false });
    expect(control.isEnabled()).toBe(false);
  });

  it('setEnabled(false) disables globally, with no feature given', () => {
    const control = new InMemoryAIFeatureControl();
    control.setEnabled(false);
    expect(control.isEnabled()).toBe(false);
  });

  it('setEnabled(false) disables every feature, even ones explicitly enabled', () => {
    const control = new InMemoryAIFeatureControl();
    control.setFeatureEnabled('text-generation', true);
    control.setEnabled(false);
    expect(control.isEnabled('text-generation')).toBe(false);
  });

  it('a feature-level override can disable one feature while global stays enabled', () => {
    const control = new InMemoryAIFeatureControl();
    control.setFeatureEnabled('structured-output', false);
    expect(control.isEnabled('structured-output')).toBe(false);
    expect(control.isEnabled('text-generation')).toBe(true);
    expect(control.isEnabled()).toBe(true);
  });

  it('a feature with no override follows the global flag', () => {
    const control = new InMemoryAIFeatureControl();
    expect(control.isEnabled('unregistered-feature')).toBe(true);
  });

  it('clearFeatureOverride() reverts a feature to following the global flag', () => {
    const control = new InMemoryAIFeatureControl();
    control.setFeatureEnabled('text-generation', false);
    control.clearFeatureOverride('text-generation');
    expect(control.isEnabled('text-generation')).toBe(true);
  });

  it('getState() reflects global state and every feature override', () => {
    const control = new InMemoryAIFeatureControl();
    control.setFeatureEnabled('text-generation', false);
    control.setFeatureEnabled('structured-output', true);

    expect(control.getState()).toEqual({
      enabled: true,
      features: { 'text-generation': false, 'structured-output': true },
    });
  });

  it('getState() never carries provider/secret data — this class has no knowledge of either', () => {
    const control = new InMemoryAIFeatureControl();
    control.setFeatureEnabled('text-generation', false);
    const keys = Object.keys(control.getState());
    expect(keys).toEqual(['enabled', 'features']);
  });

  it('re-enabling globally restores prior feature-level overrides rather than clearing them', () => {
    const control = new InMemoryAIFeatureControl();
    control.setFeatureEnabled('text-generation', false);
    control.setEnabled(false);
    control.setEnabled(true);
    expect(control.isEnabled('text-generation')).toBe(false);
  });
});
