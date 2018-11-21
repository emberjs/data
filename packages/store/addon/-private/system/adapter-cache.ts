import normalizeModelName from './normalize-model-name';
import { assert} from '@ember/debug';
import { getOwner } from '@ember/application';
import { isPresent } from '@ember/utils';
import { set } from '@ember/object';

export class AdapterCache {
    _adapterCache: { [s: string]: any };
    _store: any;

    constructor(store: any) {
        this._adapterCache = Object.create(null);
        this._store = store;
    }

    adapterFor(modelName: string): any {
        assert(`You need to pass a model name to the store's adapterFor method`, isPresent(modelName));
        assert(
            `Passing classes to store.adapterFor has been removed. Please pass a dasherized string instead of ${modelName}`,
            typeof modelName === 'string'
        );
        let normalizedModelName = normalizeModelName(modelName);

        let _adapterCache  = this._adapterCache;
        let adapter = _adapterCache[normalizedModelName];
        if (adapter) {
            return adapter;
        }

        let owner = getOwner(this._store);

        adapter = owner.lookup(`adapter:${normalizedModelName}`);
        if (adapter !== undefined) {
            set(adapter, 'store', this._store);
            _adapterCache[normalizedModelName] = adapter;
            return adapter;
        }

        // no adapter found for the specific model, fallback and check for application adapter
        adapter = _adapterCache.application || owner.lookup('adapter:application');
        if (adapter !== undefined) {
            set(adapter, 'store', this._store);
            _adapterCache[normalizedModelName] = adapter;
            _adapterCache.application = adapter;
            return adapter;
        }

        // no model specific adapter or application adapter, check for an `adapter`
        // property defined on the store
        let adapterName = this._store.get('adapter');
        adapter = adapterName
            ? _adapterCache[adapterName] || owner.lookup(`adapter:${adapterName}`)
            : undefined;
        if (adapter !== undefined) {
            set(adapter, 'store', this._store);
            _adapterCache[normalizedModelName] = adapter;
            _adapterCache[adapterName] = adapter;
            return adapter;
        }

        // final fallback, no model specific adapter, no application adapter, no
        // `adapter` property on store: use json-api adapter
        adapter = _adapterCache['-json-api'] || owner.lookup('adapter:-json-api');
        assert(
            `No adapter was found for '${modelName}' and no 'application', store.adapter = 'adapter-fallback-name', or '-json-api' adapter were found as fallbacks.`,
            adapter !== undefined
        );
        set(adapter, 'store', this._store);
        _adapterCache[normalizedModelName] = adapter;
        _adapterCache['-json-api'] = adapter;
        return adapter;
    }

}