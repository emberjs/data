import jQuery from '@types/jquery';

declare global {
  interface Window {
    jQuery?: typeof jQuery;
  }
}
