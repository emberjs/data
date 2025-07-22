import Store from '../../store';

import { getContext, setContext } from 'svelte';

const CONTEXT_KEY = Symbol('context:store');

export function createStore() {
  const storeService = new Store();
  setContext<Store>(CONTEXT_KEY, storeService);
}

export function getStore() {
  return getContext<Store>(CONTEXT_KEY);
}
