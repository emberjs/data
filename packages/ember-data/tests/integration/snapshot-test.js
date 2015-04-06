var run = Ember.run;
var env, Post, Comment;

module("integration/snapshot - DS.Snapshot", {
  setup: function() {
    Post = DS.Model.extend({
      author: DS.attr(),
      title: DS.attr(),
      comments: DS.hasMany({ async: true })
    });
    Comment = DS.Model.extend({
      body: DS.attr(),
      post: DS.belongsTo({ async: true })
    });

    env = setupStore({
      post: Post,
      comment: Comment
    });
  },

  teardown: function() {
    run(function() {
      env.store.destroy();
    });
  }
});

test("record._createSnapshot() returns a snapshot", function() {
  expect(1);

  run(function() {
    var post = env.store.push('post', { id: 1, title: 'Hello World' });
    var snapshot = post._createSnapshot();

    ok(snapshot instanceof DS.Snapshot, 'snapshot is an instance of DS.Snapshot');
  });
});

test("snapshot._createSnapshot() returns a snapshot (self) but is deprecated", function() {
  expect(2);

  run(function() {
    var post = env.store.push('post', { id: 1, title: 'Hello World' });
    var snapshot1 = post._createSnapshot();
    var snapshot2;

    expectDeprecation(function() {
      snapshot2 = snapshot1._createSnapshot();
    }, /You called _createSnapshot on what's already a DS.Snapshot. You shouldn't manually create snapshots in your adapter since the store passes snapshots to adapters by default./);

    ok(snapshot2 === snapshot1, 'snapshot._createSnapshot() returns self');
  });

});

test("snapshot.id, snapshot.type and snapshot.typeKey returns correctly", function() {
  expect(3);

  run(function() {
    var post = env.store.push('post', { id: 1, title: 'Hello World' });
    var snapshot = post._createSnapshot();

    equal(snapshot.id, '1', 'id is correct');
    ok(DS.Model.detect(snapshot.type), 'type is correct');
    equal(snapshot.typeKey, 'post', 'typeKey is correct');
  });
});

test("snapshot.constructor is unique and deprecated", function() {
  expect(4);

  run(function() {
    var comment = env.store.push('comment', { id: 1, body: 'This is comment' });
    var post = env.store.push('post', { id: 2, title: 'Hello World' });
    var commentSnapshot = comment._createSnapshot();
    var postSnapshot = post._createSnapshot();

    expectDeprecation(function() {
      equal(commentSnapshot.constructor.typeKey, 'comment', 'constructor.typeKey is unique per type');
    });

    expectDeprecation(function() {
      equal(postSnapshot.constructor.typeKey, 'post', 'constructor.typeKey is unique per type');
    });
  });
});

test("snapshot.attr() does not change when record changes", function() {
  expect(2);

  run(function() {
    var post = env.store.push('post', { id: 1, title: 'Hello World' });
    var snapshot = post._createSnapshot();

    equal(snapshot.attr('title'), 'Hello World', 'snapshot title is correct');
    post.set('title', 'Tomster');
    equal(snapshot.attr('title'), 'Hello World', 'snapshot title is still correct');
  });
});

test("snapshot.attributes() returns a copy of all attributes for the current snapshot", function() {
  expect(1);

  run(function() {
    var post = env.store.push('post', { id: 1, title: 'Hello World' });
    var snapshot = post._createSnapshot();

    var attributes = snapshot.attributes();

    deepEqual(attributes, { author: undefined, title: 'Hello World' }, 'attributes are returned correctly');
  });
});

test("snapshot.belongsTo() returns undefined if relationship is undefined", function() {
  expect(1);

  run(function() {
    var comment = env.store.push('comment', { id: 1, body: 'This is comment' });
    var snapshot = comment._createSnapshot();
    var relationship = snapshot.belongsTo('post');

    equal(relationship, undefined, 'relationship is undefined');
  });
});

test("snapshot.belongsTo() returns a snapshot if relationship is set", function() {
  expect(3);

  run(function() {
    env.store.push('post', { id: 1, title: 'Hello World' });
    var comment = env.store.push('comment', { id: 2, body: 'This is comment', post: 1 });
    var snapshot = comment._createSnapshot();
    var relationship = snapshot.belongsTo('post');

    ok(relationship instanceof DS.Snapshot, 'snapshot is an instance of DS.Snapshot');
    equal(relationship.id, '1', 'post id is correct');
    equal(relationship.attr('title'), 'Hello World', 'post title is correct');
  });
});

test("snapshot.hasMany() returns ID if option.id is set", function() {
  expect(1);

  run(function() {
    env.store.push('post', { id: 1, title: 'Hello World' });
    var comment = env.store.push('comment', { id: 2, body: 'This is comment', post: 1 });
    var snapshot = comment._createSnapshot();
    var relationship = snapshot.belongsTo('post', { id: true });

    equal(relationship, '1', 'relationship ID correctly returned');
  });
});

test("snapshot.hasMany() returns empty array if relationship is undefined", function() {
  expect(2);

  run(function() {
    var post = env.store.push('post', { id: 1, title: 'Hello World' });
    var snapshot = post._createSnapshot();
    var relationship = snapshot.hasMany('comments');

    ok(relationship instanceof Array, 'relationship is an instance of Array');
    equal(relationship.length, 0, 'relationship is empty');
  });
});

test("snapshot.hasMany() returns array of snapshots if relationship is set", function() {
  expect(5);

  run(function() {
    env.store.push('comment', { id: 1, body: 'This is the first comment' });
    env.store.push('comment', { id: 2, body: 'This is the second comment' });
    var post = env.store.push('post', { id: 3, title: 'Hello World', comments: [1, 2] });
    var snapshot = post._createSnapshot();
    var relationship = snapshot.hasMany('comments');

    ok(relationship instanceof Array, 'relationship is an instance of Array');
    equal(relationship.length, 2, 'relationship has two items');

    var relationship1 = relationship[0];

    ok(relationship1 instanceof DS.Snapshot, 'relationship item is an instance of DS.Snapshot');

    equal(relationship1.id, '1', 'relationship item id is correct');
    equal(relationship1.attr('body'), 'This is the first comment', 'relationship item body is correct');
  });
});

test("snapshot.hasMany() returns array of IDs if option.ids is set", function() {
  expect(1);

  run(function() {
    var post = env.store.push('post', { id: 1, title: 'Hello World', comments: [2, 3] });
    var snapshot = post._createSnapshot();
    var relationship = snapshot.hasMany('comments', { ids: true });

    deepEqual(relationship, ['2', '3'], 'relationship IDs correctly returned');
  });
});

test("snapshot.hasMany() respects the order of items in the relationship", function() {
  expect(3);

  run(function() {
    env.store.push('comment', { id: 1, body: 'This is the first comment' });
    env.store.push('comment', { id: 2, body: 'This is the second comment' });
    var comment3 = env.store.push('comment', { id: 3, body: 'This is the third comment' });
    var post = env.store.push('post', { id: 4, title: 'Hello World', comments: [1, 2, 3] });

    post.get('comments').removeObject(comment3);
    post.get('comments').insertAt(0, comment3);

    var snapshot = post._createSnapshot();
    var relationship = snapshot.hasMany('comments');

    equal(relationship[0].id, '3', 'order of comment 3 is correct');
    equal(relationship[1].id, '1', 'order of comment 1 is correct');
    equal(relationship[2].id, '2', 'order of comment 2 is correct');
  });
});

test("snapshot.eachAttribute() proxies to record", function() {
  expect(1);

  run(function() {
    var post = env.store.push('post', { id: 1, title: 'Hello World' });
    var snapshot = post._createSnapshot();

    var attributes = [];
    snapshot.eachAttribute(function(name) {
      attributes.push(name);
    });
    deepEqual(attributes, ['author', 'title'], 'attributes are iterated correctly');
  });
});

test("snapshot.eachRelationship() proxies to record", function() {
  expect(2);

  var getRelationships = function(snapshot) {
    var relationships = [];
    snapshot.eachRelationship(function(name) {
      relationships.push(name);
    });
    return relationships;
  };

  run(function() {
    var comment = env.store.push('comment', { id: 1, body: 'This is the first comment' });
    var post = env.store.push('post', { id: 2, title: 'Hello World' });
    var snapshot;

    snapshot = comment._createSnapshot();
    deepEqual(getRelationships(snapshot), ['post'], 'relationships are iterated correctly');

    snapshot = post._createSnapshot();
    deepEqual(getRelationships(snapshot), ['comments'], 'relationships are iterated correctly');
  });
});

test("snapshot.belongsTo() does not trigger a call to store.scheduleFetch", function() {
  expect(0);

  env.store.scheduleFetch = function() {
    ok(false, 'store.scheduleFetch should not be called');
  };

  run(function() {
    var comment = env.store.push('comment', { id: 2, body: 'This is comment', post: 1 });
    var snapshot = comment._createSnapshot();

    snapshot.belongsTo('post');
  });
});

test("snapshot.hasMany() does not trigger a call to store.scheduleFetch", function() {
  expect(0);

  env.store.scheduleFetch = function() {
    ok(false, 'store.scheduleFetch should not be called');
  };

  run(function() {
    var post = env.store.push('post', { id: 1, title: 'Hello World', comments: [2, 3] });
    var snapshot = post._createSnapshot();

    snapshot.hasMany('comments');
  });
});

test("snapshot.get() is deprecated", function() {
  expect(1);

  run(function() {
    var post = env.store.push('post', { id: 1, title: 'Hello World' });
    var snapshot = post._createSnapshot();

    expectDeprecation(function() {
      snapshot.get('title');
    }, 'Using DS.Snapshot.get() is deprecated. Use .attr(), .belongsTo() or .hasMany() instead.');
  });
});

test("snapshot.get() returns id", function() {
  expect(2);

  run(function() {
    var post = env.store.push('post', { id: 1, title: 'Hello World' });
    var snapshot = post._createSnapshot();

    expectDeprecation(function() {
      equal(snapshot.get('id'), '1', 'snapshot id is correct');
    });
  });
});

test("snapshot.get() returns attribute", function() {
  expect(2);

  run(function() {
    var post = env.store.push('post', { id: 1, title: 'Hello World' });
    var snapshot = post._createSnapshot();

    expectDeprecation(function() {
      equal(snapshot.get('title'), 'Hello World', 'snapshot title is correct');
    });
  });
});

test("snapshot.get() returns belongsTo", function() {
  expect(3);

  run(function() {
    var comment = env.store.push('comment', { id: 1, body: 'This is a comment', post: 2 });
    var snapshot = comment._createSnapshot();
    var relationship;

    expectDeprecation(function() {
      relationship = snapshot.get('post');
    });

    ok(relationship instanceof DS.Snapshot, 'relationship is an instance of DS.Snapshot');
    equal(relationship.id, '2', 'relationship id is correct');
  });
});

test("snapshot.get() returns hasMany", function() {
  expect(3);

  run(function() {
    var post = env.store.push('post', { id: 1, title: 'Hello World', comments: [2, 3] });
    var snapshot = post._createSnapshot();
    var relationship;

    expectDeprecation(function() {
      relationship = snapshot.get('comments');
    });

    ok(relationship instanceof Array, 'relationship is an instance of Array');
    equal(relationship.length, 2, 'relationship has two items');
  });
});

test("snapshot.get() proxies property to record unless identified as id, attribute or relationship", function() {
  expect(2);

  run(function() {
    var post = env.store.push('post', { id: 1, title: 'Hello World' });
    var snapshot = post._createSnapshot();

    post.set('category', 'Ember.js'); // category is not defined as an DS.attr()

    expectDeprecation(function() {
      equal(snapshot.get('category'), 'Ember.js', 'snapshot proxies unknown property correctly');
    });
  });
});
