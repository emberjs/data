// @ts-expect-error
import JSONSerializer from '@ember-data/serializer/json';
// @ts-expect-error
import { EmbeddedRecordsMixin } from '@ember-data/serializer/rest';

export default JSONSerializer.extend(EmbeddedRecordsMixin, {});
