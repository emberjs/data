export interface RelationshipState {
  /*
      This flag indicates whether we should consider the content
       of this relationship "known".

      If we have no relationship knowledge, and the relationship
       is `async`, we will attempt to fetch the relationship on
       access if it is also stale.

     Snapshot uses this to tell the difference between unknown
      (`undefined`) or empty (`null`). The reason for this is that
      we wouldn't want to serialize  unknown relationships as `null`
      as that might overwrite remote state.

      All relationships for a newly created (`store.createRecord()`) are
       considered known (`hasReceivedData === true`).

      true when
        => we receive a push with either new data or explicit empty (`[]` or `null`)
        => the relationship is a belongsTo and we have received data from
             the other side.

      false when
        => we have received no signal about what data belongs in this relationship
        => the relationship is a hasMany and we have only received data from
            the other side.
     */
  hasReceivedData: boolean;
  /*
      Flag that indicates whether an empty relationship is explicitly empty
        (signaled by push giving us an empty array or null relationship)
        e.g. an API response has told us that this relationship is empty.

      Thus far, it does not appear that we actually need this flag; however,
        @runspired has found it invaluable when debugging relationship tests
        to determine whether (and why if so) we are in an incorrect state.

      true when
        => we receive a push with explicit empty (`[]` or `null`)
        => we have received no signal about what data belongs in this relationship
        => on initial create (as no signal is known yet)

      false at all other times
     */

  isEmpty: boolean;
  /*
       This flag indicates whether we should
        re-fetch the relationship the next time
        it is accessed.

        The difference between this flag and `shouldForceReload`
        is in how we treat the presence of partially missing data:
          - for a forced reload, we will reload the link or EVERY record
          - for a stale reload, we will reload the link (if present) else only MISSING records

        Ideally these flags could be merged, but because we don't give the
        request layer the option of deciding how to resolve the data being queried
        we are forced to differentiate for now.

        It is also possible for a relationship to remain stale after a forced reload; however,
        in this case `state.hasFailedLoadAttempt` ought to be `true`.

      false when
        => recordData.isNew() on initial setup
        => a previously triggered request has resolved
        => we get relationship data via push

      true when
        => !recordData.isNew() on initial setup
        => an inverse has been unloaded
        => we get a new link for the relationship

      TODO @runspired unskip the acceptance tests and fix these flags
     */
  isStale: boolean;

  hasFailedLoadAttempt: boolean;
  /*
     This flag forces fetch. `true` for a single request once `reload()`
       has been called `false` at all other times.
    */
  shouldForceReload: boolean;
  /*
     This flag indicates whether we should
      **partially** re-fetch the relationship the
      next time it is accessed.

    false when
      => initial setup
      => a previously triggered request has resolved

    true when
      => an inverse has been unloaded
    */
  hasDematerializedInverse: boolean;

  // TODO do we want this anymore? Seems somewhat useful
  //   especially if we rename to `hasUpdatedLink`
  //   which would tell us slightly more about why the
  //   relationship is stale
  // updatedLink: boolean;
}

export function createState(): RelationshipState {
  return {
    hasReceivedData: false,
    isEmpty: true,
    isStale: false,
    hasFailedLoadAttempt: false,
    shouldForceReload: false,
    hasDematerializedInverse: false,
  };
}
