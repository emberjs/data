import InternalModel from './model/internal-model';
export interface RecordIdentifier {
    type: string;
    id: string | null;
    lid: string;
}

let lid = 1;
export function identifierFor(im: InternalModel): RecordIdentifier {
    if (!im.clientId) {
        im.clientId = '' + lid;
        lid++;
    }
    return {
        type: im.modelName,
        id: im.id,
        lid: im.clientId
    }
}

// TODO 
export function identifierForModel(model): RecordIdentifier  {
    return identifierFor(model._internalModel);
}