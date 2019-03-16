import string from "ember-data/transforms/string";

export interface ExistingResourceIdentifierObject {
    lid?: string;
    id: string;
    type: string;
}

export interface NewResourceIdentifierObject {
    lid: string;
    id: string | null;
    type: string;
}

export type ResourceIdentifierObject = ExistingResourceIdentifierObject | NewResourceIdentifierObject;

export interface NewResourceObject {
  id: string | null;
  type: string;
}