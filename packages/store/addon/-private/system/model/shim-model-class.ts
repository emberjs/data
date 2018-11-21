export default class ShimModelClass {
    store: any;
    modelName: string;
    _id?: string;

    // TODO Maybe expose the class here?
    constructor(store: any, modelName: string, id?: string) {
        this.store = store;
        this.modelName = modelName;
        this._id = id;
    }

    get attributes() {
        let attrs = this.store._attributesDefinitionFor(this.modelName, this._id);
        return new Map(Object.entries(attrs));
    }

    get relationshipsByName() {
        let relationships = this.store._relationshipsDefinitionFor(this.modelName, this._id);
        return new Map(Object.entries(relationships));
    }

    eachAttribute(callback: Function, binding: any) {
        let attrDefs = this.store._attributesDefinitionFor(this.modelName, this._id);
        Object.keys(attrDefs).forEach((key) => {
            callback.call(binding, key, attrDefs[key]);
        });
    }

    eachRelationship(callback: Function, binding: any) {
        let relationshipDefs = this.store._relationshipsDefinitionFor(this.modelName, this._id);
        Object.keys(relationshipDefs).forEach((key) => {
            callback.call(binding, key, relationshipDefs[key]);
        });
    }

    eachTransformedAttribute(callback: Function, binding: any) {
        let relationshipDefs = this.store._relationshipsDefinitionFor(this.modelName, this._id);
        Object.keys(relationshipDefs).forEach((key) => {
            if (relationshipDefs[key].type) {
                callback.call(binding, key, relationshipDefs[key]);
            }
        });
    }
}