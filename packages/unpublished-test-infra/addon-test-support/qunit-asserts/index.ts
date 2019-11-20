import { configureAssertionHandler } from './assert-assertion';
import { configureDeprecationHandler } from './assert-deprecation';
import { configureWarningHandler } from './assert-warning';

export default function configureAsserts() {
  configureAssertionHandler();
  configureDeprecationHandler();
  configureWarningHandler();
}
