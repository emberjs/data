var Reference = function(store, internalModel) {
  this.store = store;
  this.internalModel = internalModel;
  this.recordData = internalModel._recordData;
};

Reference.prototype = {
  constructor: Reference,
};

/**
   This returns a string that represents how the reference will be
   looked up when it is loaded. If the relationship has a link it will
   use the "link" otherwise it defaults to "id".

   Example

   ```app/models/post.js
   export default DS.Model.extend({
     comments: DS.hasMany({ async: true })
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
Reference.prototype.remoteType = function() {
  let value = this._resource();
  if (value && value.links && value.links.related) {
    return 'link';
  }

  return 'id';
};

/**
   The link Ember Data will use to fetch or reload this belongs-to
   relationship.

   Example

   ```javascript
    // models/blog.js
    export default DS.Model.extend({
      user: DS.belongsTo({ async: true })
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
Reference.prototype.link = function() {
  let link = null;
  let resource = this._resource();

  if (resource && resource.links && resource.links.related) {
    link = resource.links.related;
  }
  return link;
};

/**
   The meta data for the belongs-to relationship.

   Example

   ```javascript
    // models/blog.js
    export default DS.Model.extend({
      user: DS.belongsTo({ async: true })
    });

    let blog = store.push({
      data: {
        type: 'blog',
        id: 1,
        relationships: {
          user: {
            links: {
              related: {
                href: '/articles/1/author',
                meta: {
                  lastUpdated: 1458014400000
                }
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
Reference.prototype.meta = function() {
  let meta = null;
  let resource = this._resource();
  if (resource && resource.meta) {
    meta = resource.meta;
  }
  return meta;
};

export default Reference;
