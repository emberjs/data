var getPath = Ember.getPath;

DS.Model.reopen({
  validate: Ember.K,

  valid: function() {
    this.send('becameValid');

    this.validate();

    if (!getPath(this, 'errors.isEmpty')) {
      this.send('becameInvalid');
      return false;
    }

    return true;
  }
});
