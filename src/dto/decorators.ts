import { Transform } from 'class-transformer';
import { ValidateIf } from 'class-validator';

const mapString = (fn: (s: string) => string) => (value: unknown) => (typeof value === 'string' ? fn(value) : value);

/** Trims a string value before validation. */
export const Trim = (): PropertyDecorator => Transform(({ value }) => mapString((s) => s.trim())(value));

/** Trims and lowercases a string value before validation. */
export const TrimLowerCase = (): PropertyDecorator => Transform(({ value }) => mapString((s) => s.trim().toLowerCase())(value));

/** Trims and lowercases every string of an array before validation. */
export const TrimLowerCaseEach = (): PropertyDecorator =>
  Transform(({ value }) => (Array.isArray(value) ? value.map(mapString((s) => s.trim().toLowerCase())) : value));

/** Removes duplicates from an array before validation. */
export const Distinct = (): PropertyDecorator =>
  Transform(({ value }) => (Array.isArray(value) ? [...new Set(value)] : value));

/** Skips validation only when the property is absent; unlike @IsOptional, null is still rejected. */
export const Optional = (): PropertyDecorator => ValidateIf((_object, value) => value !== undefined);
