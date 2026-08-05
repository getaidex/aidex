import { Injectable, effect, signal } from '@angular/core';

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'docs-theme';

/** Persists and applies a light/dark/system theme preference. Generic — no product branding. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly preference = signal<ThemePreference>(this.readStoredPreference());

  readonly resolved = signal<'light' | 'dark'>(this.resolveInitial());

  constructor() {
    effect(() => {
      const preference = this.preference();
      localStorage.setItem(STORAGE_KEY, preference);
      const resolved = preference === 'system' ? this.systemPreference() : preference;
      this.resolved.set(resolved);
      document.documentElement.classList.toggle('dark', resolved === 'dark');
    });

    if (typeof window !== 'undefined' && window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (this.preference() === 'system') {
          this.resolved.set(this.systemPreference());
          document.documentElement.classList.toggle('dark', this.resolved() === 'dark');
        }
      });
    }
  }

  setPreference(preference: ThemePreference): void {
    this.preference.set(preference);
  }

  private readStoredPreference(): ThemePreference {
    if (typeof localStorage === 'undefined') return 'system';
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
  }

  private resolveInitial(): 'light' | 'dark' {
    const preference = this.readStoredPreference();
    return preference === 'system' ? this.systemPreference() : preference;
  }

  private systemPreference(): 'light' | 'dark' {
    if (typeof window === 'undefined' || !window.matchMedia) return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
