import type { ResourceKey } from '../../../types/identifier.ts';
import type { UpgradedMeta } from '../-edge-definition.ts';

export type ImplicitMeta = UpgradedMeta & { kind: 'implicit'; isImplicit: true };

/**
   Implicit relationships are relationships which have not been declared but the inverse side exists on
   another record somewhere

   For example consider the following two models

   ::: code-group

   ```js [./models/comment.js]
   import { Model, attr } from '@warp-drive/legacy/model';

   export default class Comment extends Model {
     @attr text;
   }
   ```

   ```js [./models/post.js]
    import { Model, attr, hasMany } from '@warp-drive/legacy/model';

   export default class Post extends Model {
     @attr title;
     @hasMany('comment', { async: true, inverse: null }) comments;
   }
   ```

   :::

   Then we would have a implicit 'post' relationship for the comment record in order
   to be do things like remove the comment from the post if the comment were to be deleted.
*/
export interface ImplicitEdge {
  definition: ImplicitMeta;
  identifier: ResourceKey;
  localMembers: Set<ResourceKey>;
  remoteMembers: Set<ResourceKey>;
}

export function createImplicitEdge(definition: ImplicitMeta, identifier: ResourceKey): ImplicitEdge {
  return {
    definition,
    identifier,
    localMembers: new Set(),
    remoteMembers: new Set(),
  };
}
