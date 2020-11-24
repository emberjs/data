/**
 * Creates a `parent` with `nrChildren` children and each `child` has `nrFriends` friends.
 * If `nrFriends > 0` then each child also has a `bestFriend` and a `secondBestFriend`.
 */
export function createParentPayload(nrChildren, nrFriends) {
  const parentId = '1';
  const payload = {
    data: [
      {
        id: parentId,
        type: 'parent',
        attributes: {
          parentName: 'parent name',
        },
        relationships: {
          children: {
            data: [],
          },
        },
      },
    ],
    included: [],
  };
  const childrenRel = payload.data[0].relationships.children.data;
  const included = payload.included;

  for (let i = 0; i < nrChildren; i++) {
    const childId = `${parentId}-${i}`;
    let child = {
      id: childId,
      type: 'child',
    };
    childrenRel.push(child);

    child = Object.assign({}, child, {
      attributes: {
        childName: `child-${childId}`,
      },
    });
    included.push(child);

    if (nrFriends > 0) {
      Object.assign(child, {
        relationships: {
          friends: {
            data: [],
          },
          bestFriend: {
            data: {
              id: `${parentId}-${(i + 1) % nrChildren}`,
              type: 'child',
            },
          },
          secondBestFriend: {
            data: {
              id: `${parentId}-${(i + 2) % nrChildren}`,
              type: 'child',
            },
          },
        },
      });

      const friendsRel = child.relationships.friends.data;
      for (let j = 0; j < nrFriends; j++) {
        friendsRel.push({
          id: `${parentId}-${(i + 1) % nrChildren}`,
          type: 'child',
        });
      }
    }
  }

  return payload;
}
