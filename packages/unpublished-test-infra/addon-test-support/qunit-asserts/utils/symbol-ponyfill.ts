const d = Date.now();
function FakeSymbol(str: string): string {
  return `symbol:${d}-${str}`;
}

window.Symbol = typeof window.Symbol !== 'undefined' ? window.Symbol : (FakeSymbol as unknown as SymbolConstructor);
