import InternalModel from '../model/internal-model';
import recordDataFor from '../record-data-for';
import { Object as JSONObject, Value as JSONValue } from 'json-typescript';
import CoreStore from '../core-store';
import { PaginationLinks, LinkObject } from '../../ts-interfaces/ember-data-json-api';
import { JsonApiRelationship } from '../../ts-interfaces/record-data-json-api';
import { FULL_LINKS_ON_RELATIONSHIPS } from '@ember-data/canary-features';
import { Dict } from '../../ts-interfaces/utils';

/**
  @module @ember-data/store
*/

interface ResourceIdentifier {
  links?: {
    related?: string;
  };
  meta?: JSONObject;
}

function isResourceIdentiferWithRelatedLinks(
  value: any
): value is ResourceIdentifier & { links: { related: string | LinkObject | null } } {
  return value && value.links && value.links.related;
}

/**
  This is the baseClass for the different References
  like RecordReference/HasManyReference/BelongsToReference

 @class Reference
 */
interface Reference {
  links(): PaginationLinks | null;
}
abstract class Reference {
  public recordData: InternalModel['_recordData'];
  constructor(public store: CoreStore, public internalModel: InternalModel) {
    this.recordData = recordDataFor(this);
  }

  public _resource(): ResourceIdentifier | JsonApiRelationship | void {}

  /**
   This returns a string that represents how the reference will be
   looked up when it is loaded. If the relationship has a link it will
   use the "link" otherwise it defaults to "id".

   Example

   ```app/models/post.js
   import Model, { hasMany } from '@ember-data/model';

   export default Model.extend({
     comments: hasMany({ async: true })
   });
   ```

   ```javascript
   let post = store.push({
     data: {
       type: 'post',
       id: 1,
       relationships: {
         comments: {
           data: [{ type: 'comment', id: 1 }]
         }
       }
     }
   });

   let commentsRef = post.hasMany('comments');

   // get the identifier of the reference
   if (commentsRef.remoteType() === "ids") {
     let ids = commentsRef.ids();
   } else if (commentsRef.remoteType() === "link") {
     let link = commentsRef.link();
   }
   ```

   @method remoteType
   @return {String} The name of the remote type. This should either be "link" or "ids"
   */
  remoteType(): 'link' | 'id' | 'identity' {
    let value = this._resource();
    if (isResourceIdentiferWithRelatedLinks(value)) {
      return 'link';
    }
    return 'id';
  }

  /**
   The link Ember Data will use to fetch or reload this belongs-to
   relationship.

   Example

   ```javascript
   // models/blog.js
   import Model, { belongsTo } from '@ember-data/model';
   export default Model.extend({
      user: belongsTo({ async: true })
    });

   let blog = store.push({
      data: {
        type: 'blog',
        id: 1,
        relationships: {
          user: {
            links: {
              related: '/articles/1/author'
            }
          }
        }
      }
    });
   let userRef = blog.belongsTo('user');

   // get the identifier of the reference
   if (userRef.remoteType() === "link") {
      let link = userRef.link();
    }
   ```

   @method link
   @return {String} The link Ember Data will use to fetch or reload this belongs-to relationship.
   */
  link(): string | null {
    let link;
    let resource = this._resource();

    if (isResourceIdentiferWithRelatedLinks(resource)) {
      if (resource.links) {
        link = resource.links.related;
        link = !link || typeof link === 'string' ? link : link.href;
      }
    }
    return link || null;
  }

  /**
   The meta data for the belongs-to relationship.

   Example

   ```javascript
   // models/blog.js
   import Model, { belongsTo } from '@ember-data/model';
   export default Model.extend({
      user: belongsTo({ async: true })
    });

   let blog = store.push({
      data: {
        type: 'blog',
        id: 1,
        relationships: {
          user: {
            links: {
              related: {
                href: '/articles/1/author'
              },
              meta: {
                lastUpdated: 1458014400000
              }
            }
          }
        }
      }
    });

   let userRef = blog.belongsTo('user');

   userRef.meta() // { lastUpdated: 1458014400000 }
   ```

   @method meta
   @return {Object} The meta information for the belongs-to relationship.
   */
  meta() {
    let meta: Dict<JSONValue> | null = null;
    let resource = this._resource();
    if (resource && resource.meta && typeof resource.meta === 'object') {
      meta = resource.meta;
    }
    return meta;
  }
}

if (FULL_LINKS_ON_RELATIONSHIPS) {
  Reference.prototype.links = function links(): PaginationLinks | null {
    let resource = this._resource();

    return resource && resource.links ? resource.links : null;
  };
}

export default Reference;
