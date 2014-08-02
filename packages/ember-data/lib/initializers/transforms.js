import {
  BooleanTransform,
  DateTransform,
  StringTransform,
  NumberTransform
} from "ember-data/transforms";

/**
  Configures a container for use with Ember-Data
  transforms.

  @method initializeTransforms
  @param {Ember.Container} container
*/
export default function initializeTransforms(container){
  container.register('transform:boolean', BooleanTransform);
  container.register('transform:date',    DateTransform);
  container.register('transform:number',  NumberTransform);
  container.register('transform:string',  StringTransform);
};
