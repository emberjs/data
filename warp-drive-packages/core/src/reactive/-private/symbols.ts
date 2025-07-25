///////////////////
///// WARNING /////
///////////////////

import { getOrSetGlobal } from '../../types/-private';

// Great, got your attention with that warning didn't we?
// Good. Here's the deal: typescript treats symbols as unique types.
// If by accident a module creating a symbol is processed more than
// once, the symbol will be different in each processing. This will
// cause a type error.
// It could also cause a runtime error if the symbol is used innapropriately.
// However, this case is extremely hard to hit and would require other things
// to go wrong first.
//
// So, why do the warning? And why do we lie about the types of the symbols?
//
// Because we intentionally create multiple copies of them within the types
// at build time. This is because we rollup our d.ts files in order to give
// our consumers a better experience.
//
// However, no tool today supports rolling up d.ts files with multiple entry
// points correctly. The tool we use currently (vite-plugin-dts) uses @microsoft/api-extractor
// which creates a fully unique stand-alone types file per-entry-point. Thus
// every entry point that uses one of these symbols somewhere will have accidentally
// created a new symbol type.
//
// This cast allows us to rollup these types using this tool while not encountering
// the unique symbol type issue.
//
// Note that none of these symbols are part of the public API, these are used for
// debugging DX and as a safe way to provide an intimate contract on public objects.

export const SOURCE: '___(unique) Symbol(SOURCE)' = getOrSetGlobal('SOURCE', Symbol('#source'));

export const Destroy: '___(unique) Symbol(Destroy)' = getOrSetGlobal(
  'Destroy',
  Symbol.dispose || Symbol.for('Dispose')
);
export const Checkout: '___(unique) Symbol(Checkout)' = getOrSetGlobal('Checkout', Symbol('Checkout'));
export const Commit: '___(unique) Symbol(Commit)' = getOrSetGlobal('Commit', Symbol('Commit'));
export const Context: '___(unique) Symbol(Context)' = getOrSetGlobal('Context', Symbol('Context'));
