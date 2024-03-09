import { expectTypeOf } from 'expect-type';

import type { TransformName } from '@warp-drive/core-types/symbols';

import type {
  AttrOptions,
  DataDecorator,
  GetMaybeDeserializeValue,
  OptionsFromInstance,
  TypedTransformInstance,
  TypeFromInstance,
} from './attr';
import { attr } from './attr';

// ------------------------------
//              💚
// ==============================
//          Type Tests
// ==============================
//              🐹
// ⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇

expectTypeOf<{ defaultValue: () => object }>().toMatchTypeOf<AttrOptions<object>>();
expectTypeOf<{ defaultValue: () => object }>().toMatchTypeOf<AttrOptions>();
expectTypeOf<{ defaultValue: () => object }>().not.toMatchTypeOf<AttrOptions<object[]>>();
expectTypeOf<{ defaultValue: () => object }>().not.toMatchTypeOf<AttrOptions<string>>();
expectTypeOf<{ defaultValue: () => string }>().not.toMatchTypeOf<AttrOptions<object>>();

type ExampleDateTransform = {
  serialize(value: Date, options: { dateOnly: boolean }): string;
  deserialize(value: string, options: { stripTimeZone?: boolean }): Date;
  [TransformName]: 'date';
};

expectTypeOf<
  TypedTransformInstance<GetMaybeDeserializeValue<ExampleDateTransform>, TypeFromInstance<ExampleDateTransform>>
>().toMatchTypeOf<TypedTransformInstance<Date, 'date'>>();
expectTypeOf<ExampleDateTransform>().toMatchTypeOf<TypedTransformInstance<Date, 'date'>>();
expectTypeOf<TypeFromInstance<ExampleDateTransform>>().toEqualTypeOf<'date'>();
expectTypeOf<GetMaybeDeserializeValue<ExampleDateTransform>>().toEqualTypeOf<Date>();
expectTypeOf<OptionsFromInstance<ExampleDateTransform>>().toMatchTypeOf<{
  dateOnly: boolean;
  stripTimeZone?: boolean;
  defaultValue?: () => Date;
}>();
expectTypeOf({ dateOnly: true }).toMatchTypeOf<OptionsFromInstance<ExampleDateTransform>>();
expectTypeOf({ dateOnly: true, stripTimeZone: true }).toMatchTypeOf<OptionsFromInstance<ExampleDateTransform>>();
expectTypeOf({ dateOnly: true, stripTimeZone: true, defaultValue: () => new Date() }).toMatchTypeOf<
  OptionsFromInstance<ExampleDateTransform>
>();

expectTypeOf(attr({}, 'key', {})).toEqualTypeOf<void>();
expectTypeOf(attr('string')).toEqualTypeOf<DataDecorator>();
expectTypeOf(attr({})).toEqualTypeOf<DataDecorator>();
expectTypeOf(attr()).toEqualTypeOf<DataDecorator>();

expectTypeOf(attr('string', { defaultValue: 'hello' })).toEqualTypeOf<DataDecorator>();
expectTypeOf(attr({ defaultValue: 'hello' })).toEqualTypeOf<DataDecorator>();
expectTypeOf(attr('string', { defaultValue: () => ({}) })).toEqualTypeOf<DataDecorator>();
expectTypeOf(attr({ defaultValue: () => ({}) })).toEqualTypeOf<DataDecorator>();

expectTypeOf<TypeFromInstance<ExampleDateTransform>>().toEqualTypeOf<'date'>();
expectTypeOf(attr<ExampleDateTransform>('date')).toEqualTypeOf<DataDecorator>();
/* prettier-ignore */
expectTypeOf(attr<ExampleDateTransform>('date', {
  dateOnly: true,
  // @ts-expect-error - defaultValue needs to be a Date so it can be serialized, so must be a function that produces one
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  defaultValue: string
})).toBeNever;

/* prettier-ignore */
expectTypeOf(
  // @ts-expect-error
  attr(
    'string',
    { defaultValue: ({}) }
  )
).toEqualTypeOf<DataDecorator>();

/* prettier-ignore */
expectTypeOf(attr<ExampleDateTransform>('date', {
  // @ts-expect-error - no stateful default values
  defaultValue: new Date()
})).toBeNever;
expectTypeOf(
  attr<ExampleDateTransform>('date', { dateOnly: false, defaultValue: () => new Date() })
).toEqualTypeOf<DataDecorator>();

/* prettier-ignore */
expectTypeOf(
  attr(
    // @ts-expect-error
    { defaultValue: {} }
  )
).toBeNever;
expectTypeOf(
  attr(
    // @ts-expect-error
    1,
    { defaultValue: 'hello' }
  )
).toBeNever;

expectTypeOf(
  (function () {
    class User {
      @attr() declare name: string;
    }
    return User;
  })()
).toMatchTypeOf<{ name: string }>();
expectTypeOf(
  (function () {
    class User {
      @attr declare name: string;
    }
    return User;
  })()
).toMatchTypeOf<{ name: string }>();
