HEADER

PATCH /user/1 <update a user's non-relationship fields>
DELETE /user/1 <delete a user>
POST /user/1/_operations <update/delete a user in any way, including relationships>
POST /user <create a new user>
POST /user/_operations <update/create/delete a group of users in any way, including relationships>

{
  operations: [
    {
      "op": "update",
      "ref": { type: 'user", id: '1' },
      "data": {
        attributes: {
          /// all changed attributes
        }
      }
    }
  ]
}


{
  data: {
    /// all changed attributes
  }
}

{
  jsonapi1: abc
  jsonapi2: abc
  <header of dsl>
  <payload of dsl>
  jsonapi.meta: abc
}
