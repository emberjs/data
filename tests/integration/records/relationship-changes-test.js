import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';

import DS from 'ember-data';
import { module, test } from 'qunit';

const { run } = Ember;
const { attr, belongsTo, hasMany, Model } = DS;

let env, store;

const Author = Model.extend({
  name: attr('string')
});

const Post = Model.extend({
  author: belongsTo()
});

const Person = DS.Model.extend({
  firstName: attr('string'),
  lastName: attr('string'),
  siblings: hasMany('person')
});

const sibling1 = {
  type: 'person',
  id: '1',
  attributes: {
    firstName: 'Dogzn',
    lastName: 'Katz'
  }
};

const sibling1Ref = {
  type: 'person',
  id: '1'
};

const sibling2 = {
  type: 'person',
  id: '2',
  attributes: {
    firstName: 'Katzn',
    lastName: 'Dogz'
  }
};

const sibling2Ref = {
  type: 'person',
  id: '2'
};

const sibling3 = {
  type: 'person',
  id: '3',
  attributes: {
    firstName: 'Snakezn',
    lastName: 'Ladderz'
  }
};

const sibling3Ref = {
  type: 'person',
  id: '3'
};

const sibling4 = {
  type: 'person',
  id: '4',
  attributes: {
    firstName: 'Hamsterzn',
    lastName: 'Gerbilz'
  }
};

const sibling4Ref = {
  type: 'person',
  id: '4'
};

const sibling5 = {
  type: 'person',
  id: '5',
  attributes: {
    firstName: 'Donkeyzn',
    lastName: 'Llamaz'
  }
};

const sibling5Ref = {
  type: 'person',
  id: '5'
};

module('integration/records/relationship-changes - Relationship changes', {
  beforeEach() {
    env = setupStore({
      person: Person,
      author: Author,
      post: Post
    });
    store = env.store;
  },

  afterEach() {
    run(function() {
      env.container.destroy();
    });
  }
});

test('Calling push with relationship triggers observers once if the relationship was empty and is added to', function(assert) {
  assert.expect(1);
  let person = null;
  let observerCount = 0;

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: 'wat',
        attributes: {
          firstName: 'Yehuda',
          lastName: 'Katz'
        },
        relationships: {
          siblings: {
            data: []
          }
        }
      }
    });
    person = store.peekRecord('person', 'wat');
  });

  person.addObserver('siblings', function() {
    observerCount++;
  });

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: 'wat',
        attributes: {
        },
        relationships: {
          siblings: {
            data: [sibling1Ref]
          }
        }
      },
      included: [
        sibling1
      ]
    });
  });

  run(function() {
    assert.equal(observerCount, 1, 'siblings observer should be triggered once');
  });
});

test('Calling push with relationship triggers observers once if the relationship was not empty and was added to', function(assert) {
  assert.expect(1);
  let person = null;
  let observerCount = 0;

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: 'wat',
        attributes: {
          firstName: 'Yehuda',
          lastName: 'Katz'
        },
        relationships: {
          siblings: {
            data: [sibling1Ref]
          }
        }
      },
      included: [
        sibling1
      ]
    });
    person = store.peekRecord('person', 'wat');
  });

  person.addObserver('siblings', function() {
    observerCount++;
  });

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: 'wat',
        attributes: {
        },
        relationships: {
          siblings: {
            data: [sibling1Ref, sibling2Ref]
          }
        }
      },
      included: [
        sibling2
      ]
    });
  });

  run(function() {
    assert.equal(observerCount, 1, 'siblings observer should be triggered once');
  });
});

test('Calling push with relationship triggers observers once if the relationship was made shorter', function(assert) {
  assert.expect(1);
  let person = null;
  let observerCount = 0;

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: 'wat',
        attributes: {
          firstName: 'Yehuda',
          lastName: 'Katz'
        },
        relationships: {
          siblings: {
            data: [sibling1Ref]
          }
        }
      },
      included: [
        sibling1
      ]
    });
    person = store.peekRecord('person', 'wat');
  });

  person.addObserver('siblings', function() {
    observerCount++;
  });

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: 'wat',
        attributes: {
        },
        relationships: {
          siblings: {
            data: []
          }
        }
      },
      included: []
    });
  });

  run(function() {
    assert.equal(observerCount, 1, 'siblings observer should be triggered once');
  });
});

test('Calling push with relationship triggers observers once if the relationship was reordered', function(assert) {
  assert.expect(1);
  let person = null;
  let observerCount = 0;

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: 'wat',
        attributes: {
          firstName: 'Yehuda',
          lastName: 'Katz'
        },
        relationships: {
          siblings: {
            data: [sibling1Ref, sibling2Ref]
          }
        }
      },
      included: [
        sibling1,
        sibling2
      ]

    });
    person = store.peekRecord('person', 'wat');
  });

  person.addObserver('siblings', function() {
    observerCount++;
  });

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: 'wat',
        attributes: {
        },
        relationships: {
          siblings: {
            data: [sibling2Ref, sibling1Ref]
          }
        }
      },
      included: []
    });
  });

  run(function() {
    assert.equal(observerCount, 1, 'siblings observer should be triggered once');
  });
});

test('Calling push with relationship does not trigger observers if the relationship was not changed', function(assert) {
  assert.expect(1);
  let person = null;
  let observerCount = 0;

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: 'wat',
        attributes: {
          firstName: 'Yehuda',
          lastName: 'Katz'
        },
        relationships: {
          siblings: {
            data: [sibling1Ref]
          }
        }
      },
      included: [
        sibling1
      ]

    });
    person = store.peekRecord('person', 'wat');
  });

  person.addObserver('siblings', function() {
    observerCount++;
  });

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: 'wat',
        attributes: {
        },
        relationships: {
          siblings: {
            data: [sibling1Ref]
          }
        }
      },
      included: []
    });
  });

  run(function() {
    assert.equal(observerCount, 0, 'siblings observer should not be triggered');
  });
});

test('Calling push with relationship triggers willChange and didChange with detail when appending', function(assert) {
  const done = assert.async();
  let person = null;
  let willChangeCount = 0;
  let didChangeCount = 0;

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: 'wat',
        attributes: {
          firstName: 'Yehuda',
          lastName: 'Katz'
        },
        relationships: {
          siblings: {
            data: [sibling1Ref]
          }
        }
      },
      included: [
        sibling1
      ]

    });
    person = store.peekRecord('person', 'wat');

    person.get('siblings')
    .then(siblings => {
      siblings.addArrayObserver(this, {
        arrayWillChange(array, start, removing, adding) {
          willChangeCount++;
          assert.equal(start, 1);
          assert.equal(removing, 0);
          assert.equal(adding, 1);
        },
        arrayDidChange(array, start, removed, added) {
          didChangeCount++;
          assert.equal(start, 1);
          assert.equal(removed, 0);
          assert.equal(added, 1);
        }
      });
    });
  });

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: 'wat',
        attributes: {
        },
        relationships: {
          siblings: {
            data: [sibling1Ref, sibling2Ref]
          }
        }
      },
      included: [
        sibling2
      ]
    });
  });

  run(function() {
    assert.equal(willChangeCount, 1, 'willChange observer should be triggered once');
    assert.equal(didChangeCount, 1, 'didChange observer should be triggered once');
    done();
  });
});

test('Calling push with relationship triggers willChange and didChange with detail when truncating', function(assert) {
  const done = assert.async();
  let person = null;
  let willChangeCount = 0;
  let didChangeCount = 0;

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: 'wat',
        attributes: {
          firstName: 'Yehuda',
          lastName: 'Katz'
        },
        relationships: {
          siblings: {
            data: [sibling1Ref, sibling2Ref]
          }
        }
      },
      included: [
        sibling1, sibling2
      ]

    });
    person = store.peekRecord('person', 'wat');

    person.get('siblings')
    .then(siblings => {
      siblings.addArrayObserver(this, {
        arrayWillChange(array, start, removing, adding) {
          willChangeCount++;
          assert.equal(start, 1);
          assert.equal(removing, 1);
          assert.equal(adding, 0);
        },
        arrayDidChange(array, start, removed, added) {
          didChangeCount++;
          assert.equal(start, 1);
          assert.equal(removed, 1);
          assert.equal(added, 0);
        }
      });
    });

  });

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: 'wat',
        attributes: {
        },
        relationships: {
          siblings: {
            data: [sibling1Ref]
          }
        }
      },
      included: []
    });
  });

  run(function() {
    assert.equal(willChangeCount, 1, 'willChange observer should be triggered once');
    assert.equal(didChangeCount, 1, 'didChange observer should be triggered once');
    done();
  });
});

test('Calling push with relationship triggers willChange and didChange with detail when inserting at front', function(assert) {
  const done = assert.async();
  let person = null;
  let willChangeCount = 0;
  let didChangeCount = 0;

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: 'wat',
        attributes: {
          firstName: 'Yehuda',
          lastName: 'Katz'
        },
        relationships: {
          siblings: {
            data: [sibling2Ref]
          }
        }
      },
      included: [
        sibling2
      ]

    });
    person = store.peekRecord('person', 'wat');

    person.get('siblings')
    .then(siblings => {
      siblings.addArrayObserver(this, {
        arrayWillChange(array, start, removing, adding) {
          willChangeCount++;
          assert.equal(start, 0);
          assert.equal(removing, 0);
          assert.equal(adding, 1);
        },
        arrayDidChange(array, start, removed, added) {
          didChangeCount++;
          assert.equal(start, 0);
          assert.equal(removed, 0);
          assert.equal(added, 1);
        }
      });
    });

  });

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: 'wat',
        attributes: {
        },
        relationships: {
          siblings: {
            data: [sibling1Ref, sibling2Ref]
          }
        }
      },
      included: [
        sibling2
      ]
    });
  });

  run(function() {
    assert.equal(willChangeCount, 1, 'willChange observer should be triggered once');
    assert.equal(didChangeCount, 1, 'didChange observer should be triggered once');
    done();
  });
});

test('Calling push with relationship triggers willChange and didChange with detail when inserting in middle', function(assert) {
  const done = assert.async();
  let person = null;
  let willChangeCount = 0;
  let didChangeCount = 0;

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: 'wat',
        attributes: {
          firstName: 'Yehuda',
          lastName: 'Katz'
        },
        relationships: {
          siblings: {
            data: [sibling1Ref, sibling3Ref]
          }
        }
      },
      included: [
        sibling1,
        sibling3
      ]

    });
    person = store.peekRecord('person', 'wat');

    person.get('siblings')
    .then(siblings => {
      siblings.addArrayObserver(this, {
        arrayWillChange(array, start, removing, adding) {
          willChangeCount++;
          assert.equal(start, 1);
          assert.equal(removing, 0);
          assert.equal(adding, 1);
        },
        arrayDidChange(array, start, removed, added) {
          didChangeCount++;
          assert.equal(start, 1);
          assert.equal(removed, 0);
          assert.equal(added, 1);
        }
      });
    });

  });

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: 'wat',
        attributes: {
        },
        relationships: {
          siblings: {
            data: [sibling1Ref, sibling2Ref, sibling3Ref]
          }
        }
      },
      included: [
        sibling2
      ]
    });
  });

  run(function() {
    assert.equal(willChangeCount, 1, 'willChange observer should be triggered once');
    assert.equal(didChangeCount, 1, 'didChange observer should be triggered once');
    done();
  });
});

test('Calling push with relationship triggers willChange and didChange with detail when replacing different length in middle', function(assert) {
  const done = assert.async();
  let person = null;
  let willChangeCount = 0;
  let didChangeCount = 0;

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: 'wat',
        attributes: {
          firstName: 'Yehuda',
          lastName: 'Katz'
        },
        relationships: {
          siblings: {
            data: [sibling1Ref, sibling2Ref, sibling3Ref]
          }
        }
      },
      included: [
        sibling1,
        sibling2,
        sibling3
      ]

    });
    person = store.peekRecord('person', 'wat');

    person.get('siblings')
    .then(siblings => {
      siblings.addArrayObserver(this, {
        arrayWillChange(array, start, removing, adding) {
          willChangeCount++;
          assert.equal(start, 1);
          assert.equal(removing, 1);
          assert.equal(adding, 2);
        },
        arrayDidChange(array, start, removed, added) {
          didChangeCount++;
          assert.equal(start, 1);
          assert.equal(removed, 1);
          assert.equal(added, 2);
        }
      });
    });

  });

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: 'wat',
        attributes: {
        },
        relationships: {
          siblings: {
            data: [sibling1Ref, sibling4Ref, sibling5Ref, sibling3Ref]
          }
        }
      },
      included: [
        sibling4,
        sibling5
      ]
    });
  });

  run(function() {
    assert.equal(willChangeCount, 1, 'willChange observer should be triggered once');
    assert.equal(didChangeCount, 1, 'didChange observer should be triggered once');
    done();
  });
});

test('Calling push with updated belongsTo relationship trigger observer', function(assert) {
  assert.expect(1);

  let observerCount = 0;

  run(function() {
    let post = env.store.push({
      data: {
        type: 'post',
        id: '1',
        relationships: {
          author: {
            data: { type: 'author', id: '2' }
          }
        }
      }
    });

    post.addObserver('author', function() {
      observerCount++;
    });

    env.store.push({
      data: {
        type: 'post',
        id: '1',
        relationships: {
          author: {
            data: { type: 'author', id: '3' }
          }
        }
      }
    });
  });

  assert.equal(observerCount, 1, 'author observer should be triggered once');
});

test('Calling push with same belongsTo relationship does not trigger observer', function(assert) {
  assert.expect(1);

  let observerCount = 0;

  run(function() {
    let post = env.store.push({
      data: {
        type: 'post',
        id: '1',
        relationships: {
          author: {
            data: { type: 'author', id: '2' }
          }
        }
      }
    });

    post.addObserver('author', function() {
      observerCount++;
    });

    env.store.push({
      data: {
        type: 'post',
        id: '1',
        relationships: {
          author: {
            data: { type: 'author', id: '2' }
          }
        }
      }
    });
  });

  assert.equal(observerCount, 0, 'author observer should not be triggered');
});
