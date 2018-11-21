import Store from 'ember-data/store';

class CustomModel {
    internalModel: any;
    store: any;
    constructor(store, internalModel) {
        // This goes away after store apis are fixed
        this.internalModel = internalModel;
        this.store = store;
    }/*
    get isError() {

    }
    get adapterError() {

    }

    */

    adapterErrorChanged() {

    }

    invalidErrorsChanged() {

    }

    trigger() {

    }

    save() {
        return this.store.scheduleSave(this.internalModel);
    }

    destroy() {

    }
    /*
    _notifyProperties() {

    }
    notifyBelongsToChange() {

    }
    notifyPropertyChange() {

    }
    */
    /*
    get currentState() {

    }

    set currentState() {

    }
    */
}

let CustomStore = Store.extend({
    _relationshipsDefinitionFor: function() {
        return Object.create(null);
    },
    _attributesDefinitionFor: function() {
        return Object.create(null);
    },
    instantiateRecord(modelName, createOptions) {
        return new CustomModel(createOptions.store, createOptions._internalModel);
    },
    /*
    modelFor(modelName) {
       return CustomModel;
    }
    */
});

export { CustomModel, CustomStore };