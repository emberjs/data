import Mixin from '@ember/object/mixin';

export default Mixin.create({
  validate() {
    return this.isValid();
  },

  isValid() {
    return true;
  },

  get validationMessage() {
    return this.isValid() ? 'Valid' : 'Invalid';
  }
});