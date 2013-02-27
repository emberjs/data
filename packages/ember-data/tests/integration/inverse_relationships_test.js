var Post, Comment, store;

module('Inverse Relationships', {
  setup: function() {
    store = DS.Store.create();
  },

  teardown: function() {
    store.destroy();
  }
});

test("When a record is added to a has-many relationship, the inverse belongsTo is determined automatically", function() {
  Post = DS.Model.extend();

  Comment = DS.Model.extend({
    post: DS.belongsTo(Post)
  });

  Post.reopen({
    comments: DS.hasMany(Comment)
  });

  var comment = store.createRecord(Comment);
  var post = store.createRecord(Post);

  equal(comment.get('post'), null, "no post has been set on the comment");

  post.get('comments').pushObject(comment);
  equal(comment.get('post'), post, "post was set on the comment");
});

test("When a record is added to a has-many relationship, the inverse belongsTo can be set explicitly", function() {
  Post = DS.Model.extend();

  Comment = DS.Model.extend({
    onePost: DS.belongsTo(Post),
    twoPost: DS.belongsTo(Post),
    redPost: DS.belongsTo(Post),
    bluePost: DS.belongsTo(Post)
  });

  Post.reopen({
    comments: DS.hasMany(Comment, {
      inverse: 'redPost'
    })
  });

  var comment = store.createRecord(Comment);
  var post = store.createRecord(Post);

  equal(comment.get('onePost'), null, "onePost has not been set on the comment");
  equal(comment.get('twoPost'), null, "twoPost has not been set on the comment");
  equal(comment.get('redPost'), null, "redPost has not been set on the comment");
  equal(comment.get('bluePost'), null, "bluePost has not been set on the comment");

  post.get('comments').pushObject(comment);

  equal(comment.get('onePost'), null, "onePost has not been set on the comment");
  equal(comment.get('twoPost'), null, "twoPost has not been set on the comment");
  equal(comment.get('redPost'), post, "redPost has been set on the comment");
  equal(comment.get('bluePost'), null, "bluePost has not been set on the comment");
});

test("When a record's belongsTo relationship is set, it can specify the inverse hasMany to which the new child should be added", function() {
  Post = DS.Model.extend();

  Comment = DS.Model.extend({
    post: DS.belongsTo(Post, {
      inverse: 'youComments'
    }),
  });

  Post.reopen({
    meComments: DS.hasMany(Comment),
    youComments: DS.hasMany(Comment),
    everyoneWeKnowComments: DS.hasMany(Comment)
  });

  var comment = store.createRecord(Comment);
  var post = store.createRecord(Post);

  equal(post.get('meComments.length'), 0, "meComments has no posts");
  equal(post.get('youComments.length'), 0, "youComments has no posts");
  equal(post.get('everyoneWeKnowComments.length'), 0, "everyoneWeKnowComments has no posts");

  comment.set('post', post);

  equal(post.get('meComments.length'), 0, "meComments has no posts");
  equal(post.get('youComments.length'), 1, "youComments had the post added");
  equal(post.get('everyoneWeKnowComments.length'), 0, "everyoneWeKnowComments has no posts");
});

test("When a record is added to a has-one relationship, the inverse belongsTo is determined automatically", function() {
  var Person = DS.Model.extend(),
      Address = DS.Model.extend();

  Person.reopen({
    address: DS.hasOne(Address)
  });
  Address.reopen({
    person: DS.belongsTo(Person)
  });

  var person = store.createRecord(Person),
      address = store.createRecord(Address);

  equal(address.get('person'), null, "no person has been set on the address");

  person.set('address', address);
  equal(address.get('person'), person, "person was set on the address");
});

test("When a record is added to a has-one relationship, the inverse belongsTo can be set explicitly", function() {
  var Person = DS.Model.extend(),
      Address = DS.Model.extend();

  Person.reopen({
    address: DS.hasOne(Address, { inverse: 'tenant' })
  });
  Address.reopen({
    landlord: DS.belongsTo(Person),
    tenant: DS.belongsTo(Person)
  });

  var person = store.createRecord(Person),
      address = store.createRecord(Address);

  equal(address.get('landlord'), null, "landlord is initially null");
  equal(address.get('tenant'), null, "tenant is initially null");

  person.set('address', address);
  equal(address.get('landlord'), null, "no landlord was set on the address");
  equal(address.get('tenant'), person, "tenant was set on the address");
});
