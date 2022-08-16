/**
 * Creates a `parent` with `nrChildren` children and each `child` has `nrFriends` friends.
 * If `nrFriends > 0` then each child also has a `bestFriend` and a `secondBestFriend`.
 */
let parentFixtureId = 1;
let childFixtureId = 1;

module.exports = function createParentRecords(nrParents = 1, nrChildren, nrFriends) {
  const fullPayload = {
    data: [],
    included: [],
  };

  for (let i = 0; i < nrParents; i++) {
    let payload = createParentPayload(`${parentFixtureId++}`, nrChildren, nrFriends);

    if (nrParents === 1) {
      return payload;
    }

    fullPayload.data.push(payload.data);
    fullPayload.included.push(...payload.included);
  }

  return fullPayload;
};

function createParentPayload(parentId = '1', nrChildren = 0, nrFriends = 0) {
  const PARENT = createJsonApiResource('parent', parentId, {
    parentName: 'Scott',
  });

  const ALL_FRIENDS = new Array(nrChildren * nrFriends).fill(null).map((i) => {
    const child = createJsonApiResource('child', `${childFixtureId++}`, {
      childName: `Not Scott's child ${i + 1}`,
    });
    child.relationships = {
      parent: {
        data: { type: 'parent', id: `${parentFixtureId++}` },
      },
    };
    return child;
  });

  let friendIndex = 0;
  const ALL_CHILDREN = new Array(nrChildren).fill(null).map((i) => {
    const child = createJsonApiResource('child', `${childFixtureId++}`, {
      childName: `Scott child ${i + 1}`,
    });
    child.relationships = {
      parent: {
        data: { type: 'parent', id: parentId },
      },
    };

    const childIdentifier = extractIdentifiers(child);
    if (nrFriends > 0) {
      let bestFriend = ALL_FRIENDS[friendIndex];
      child.relationships.bestFriend = {
        data: extractIdentifiers(bestFriend),
      };
      bestFriend.relationships.bestFriend = {
        data: childIdentifier,
      };
      const otherFriends = [];
      child.relationships.friends = {
        data: otherFriends,
      };
      for (let i = 0; i < nrFriends; i++) {
        let friend = ALL_FRIENDS[friendIndex + i];
        friend.relationships.friends = {
          data: [childIdentifier],
        };
        otherFriends.push(extractIdentifiers(friend));
      }
    }
    if (nrFriends > 1) {
      let secondBestFriend = ALL_FRIENDS[friendIndex + 1];
      child.relationships.secondBestFriend = {
        data: extractIdentifiers(secondBestFriend),
      };
      secondBestFriend.relationships.secondBestFriend = {
        data: childIdentifier,
      };
    }
    friendIndex += nrFriends;

    return child;
  });

  PARENT.relationships = {
    children: {
      data: extractIdentifiers(ALL_CHILDREN),
    },
  };

  const payload = {
    data: PARENT,
    included: [].concat(ALL_CHILDREN, ALL_FRIENDS),
  };

  return payload;
}

function extractIdentifiers(objOrArr) {
  if (Array.isArray(objOrArr)) {
    return objOrArr.map((o) => {
      return { id: o.id, type: o.type };
    });
  }
  return { id: objOrArr.id, type: objOrArr.type };
}

function createJsonApiResource(type, id, attributes) {
  return {
    type,
    id,
    attributes,
  };
}
