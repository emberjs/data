import NumberTransform from '../transforms/number';
import DateTransform from '../transforms/date';
import StringTransform from '../transforms/string';
import BooleanTransform from '../transforms/boolean';

/*
  Configures a registry for use with Ember-Data
  transforms.

  @method initializeTransforms
  @param {Ember.Registry} registry
*/
export default function initializeTransforms(registry) {
  registry.register('transform:boolean', BooleanTransform);
  registry.register('transform:date', DateTransform);
  registry.register('transform:number', NumberTransform);
  registry.register('transform:string', StringTransform);
}
