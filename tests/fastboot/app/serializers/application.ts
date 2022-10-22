import JSONSerializer from '@ember-data/serializer/json';
import { EmbeddedRecordsMixin } from '@ember-data/serializer/rest';

export default JSONSerializer.extend(EmbeddedRecordsMixin, {});
