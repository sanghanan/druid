/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* eslint-disable @typescript-eslint/ban-types */

import type { SqlQuery } from '@druid-toolkit/query';
import { SqlExpression } from '@druid-toolkit/query';

import { filterMap, mapRecord } from '../../utils';

import type { ExpressionMeta } from './expression-meta';
import type { SplitCombine } from './split-combine';

/**
 * The possible value for an Option parameter values.
 */
export type OptionValue = string | number;

export type ModuleFunctor<T> = T | ((options: { parameterValues: Record<string, any> }) => T);

export function evaluateFunctor<T>(fn: ModuleFunctor<T>, parameterValues: Record<string, any>): T {
  if (typeof fn === 'function') {
    return (fn as any)({ parameterValues });
  } else {
    return fn;
  }
}

/**
 * Parameters can be one of those types.
 */
export interface ParameterTypes {
  /**
   * String parameter
   */
  string: string;

  /**
   * Boolean parameter
   */
  boolean: boolean;

  /**
   * Number parameter
   */
  number: number;

  /**
   * Option parameter (single value out of several)
   */
  option: OptionValue;

  /**
   * Array of option(s) parameter (multiple values out of several)
   */
  options: OptionValue[];

  /**
   * Column parameter (single value out of several)
   *
   * @see {@link ExpressionMeta}
   */
  column: ExpressionMeta;

  /**
   * Array of column(s) parameter (multiple values out of several)
   *
   * @see {@link ExpressionMeta}
   */
  columns: ExpressionMeta[];

  /**
   * Aggregate parameter (single value out of several)
   *
   * @see {@link ExpressionMeta}
   */
  aggregate: ExpressionMeta;

  /**
   * Array of aggregate(s) parameter (multiple values out of several)
   *
   * @see {@link ExpressionMeta}
   */
  aggregates: ExpressionMeta[];

  /**
   * Custom parameter (for custom UI controls)
   */
  custom: unknown;

  /**
   * SplitCombine parameter (single value out of several)
   *
   * @see {@link SplitCombine}
   */
  splitCombine: SplitCombine;

  /**
   * Array of SplitCombine(s) parameter (multiple values out of several)
   *
   * @see {@link SplitCombine}
   */
  splitCombines: SplitCombine[];

  query: SqlQuery;
}

/**
 * Metadata for a parameter that may be used to render a UI control.
 *
 * Visual modules might set defaults for some of these properties, but
 * users of those visual modules may override them during module registration.
 */
export interface ControlMeta {
  /**
   * Short description of this parameter.
   */
  label?: ModuleFunctor<string>;

  /**
   * Longer description of this parameter.
   */
  description?: ModuleFunctor<string>;

  /**
   * Text to display when the parameter has no value.
   */
  placeholder?: string;

  /**
   * Is this parameter required?
   *
   * This may be used by control UI elements for validation or to
   * determine whether to offer a "no value" option.
   */
  required?: boolean;

  /**
   * A key to transfer this parameter value to another parameter when switching to another the visual module.
   * It's the app's responsibility to exploit this key.
   *
   * @see {@link transferValues}
   */
  transferGroup?: string;

  /**
   * Determines whether the parameter should render a control.
   *
   * If provided as a function, the function will be called with the current
   * set of parameter values and should return a boolean indicating whether
   * the control should be visible.
   *
   * If provided as a boolean, the control will always be visible or hidden.
   *
   * @default true
   */
  visible?: ModuleFunctor<boolean>;

  /**
   * Determines whether changes to parameter values via the control should be debounced.
   *
   * @default 0 (no debounce)
   */
  debounced?: number;

  /**
   * Extra data to pass to your app.
   */
  [key: string]: any;
}

interface TypedControlMeta {
  option: {
    /**
     * Labels for each option.
     */
    optionLabels?: { [key: string | number]: string };

    /**
     * Whether to render the control as a select or a radio buttons bar.
     */
    type?: 'select' | 'radio-bar';
  };
  options: {
    /**
     * Labels for each option.
     */
    optionLabels?: { [key: string | number]: string };
  };

  string: {};
  boolean: {};
  number: {};
  column: {};
  splitCombine: {};
  columns: {};
  splitCombines: {};
  aggregate: {};
  aggregates: {};
  query: {};
  custom: {
    /**
     * The type (this is used by the app)
     */
    type: string;

    /**
     * Any options to pass in to the rendered control
     */
    options?: any;
  };
}

interface TypedExtensions {
  number: {
    /**
     * Minimum value.
     */
    min?: number;

    /**
     * Maximum value.
     */
    max?: number;
  };

  option: {
    /**
     * Possible values for this parameter.
     */
    options: readonly OptionValue[];
  };

  options: {
    /**
     * Possible values for this parameter.
     */
    options: readonly OptionValue[];

    /**
     * Can the same option be specified multiple times?
     */
    allowDuplicates?: boolean;
  };

  columns: {
    /**
     * Can the same column be used multiple times?
     */
    allowDuplicates?: boolean;
  };

  splitCombines: {
    /**
     * Can the same column be used multiple times?
     */
    allowDuplicates?: boolean;
  };

  string: {};
  boolean: {};
  column: {};
  splitCombine: {};
  aggregate: {};
  aggregates: {};
  query: {};
  custom: {};
}

export type TypedParameterDefinition<Type extends keyof ParameterTypes> = TypedExtensions[Type] & {
  /**
   * Parameter type.
   */
  type: Type;

  /**
   * Default value for this parameter.
   */
  default?: ParameterTypes[Type];

  /**
   * Metadata for rendering a UI control for this parameter.
   */
  control?: ControlMeta & TypedControlMeta[Type];

  /**
   * Validate the value of this parameter.
   *
   * @param value - Current parameter value or undefined if no value has been set.
   * @returns - An error message if the value is invalid, or undefined if the value is valid.
   */
  validate?: (value: ParameterTypes[Type] | undefined) => string | undefined;

  /**
   * Determines whether the parameter should exist in the visual modules parameters.
   *
   * If the provided function returns false, the parameter value will be deleted from
   * the module's parameters. If true, it will be whatever the relative control
   *
   * @default undefined
   */
  defined?: (options: { parametersValues: Record<string, any> }) => boolean;

  /**
   * Extra data to pass to your app.
   */
  [key: string]: any;
};

/**
 * A dynamic input to a visual module that may affect its query or rendering.
 */
export type ParameterDefinition =
  | TypedParameterDefinition<'string'>
  | TypedParameterDefinition<'boolean'>
  | TypedParameterDefinition<'number'>
  | TypedParameterDefinition<'option'>
  | TypedParameterDefinition<'options'>
  | TypedParameterDefinition<'column'>
  | TypedParameterDefinition<'columns'>
  | TypedParameterDefinition<'splitCombine'>
  | TypedParameterDefinition<'splitCombines'>
  | TypedParameterDefinition<'aggregate'>
  | TypedParameterDefinition<'aggregates'>
  | TypedParameterDefinition<'query'>
  | TypedParameterDefinition<'custom'>;

/**
 * Returns the label for a plugin option.
 *
 * @param optionValue the option value to get the label for
 * @param parameterDefinition the parameter definition that the option belongs to
 * @returns the label for the option
 */
export function getModuleOptionLabel(
  optionValue: OptionValue,
  parameterDefinition: ParameterDefinition,
): string {
  if (parameterDefinition.type !== 'option' && parameterDefinition.type !== 'options') {
    return 'Not an option parameter';
  }

  const { optionLabels } = parameterDefinition.control ?? {};

  return (
    optionLabels?.[optionValue] ??
    (typeof optionValue === 'string'
      ? optionValue
      : typeof optionValue !== 'undefined'
      ? String(optionValue)
      : 'Malformed option')
  );
}

export type ParameterValues = Record<string, any>;
export type Parameters = Record<string, ParameterDefinition>;

export function inflateParameterValues(
  parameterValues: ParameterValues | undefined,
  parameters: Parameters,
): ParameterValues {
  return mapRecord(parameters, (parameter, parameterName) =>
    inflateParameterValue(parameterValues?.[parameterName], parameter),
  );
}

function inflateParameterValue(value: unknown, parameter: ParameterDefinition): any {
  if (typeof value === 'undefined') return;
  switch (parameter.type) {
    case 'boolean':
      return Boolean(value);

    case 'number': {
      let v = Number(value);
      if (isNaN(v)) v = 0;
      if (typeof parameter.min === 'number') {
        v = Math.max(v, parameter.min);
      }
      if (typeof parameter.max === 'number') {
        v = Math.min(v, parameter.max);
      }
      return v;
    }

    case 'option':
      if (!parameter.options || !parameter.options.includes(value as OptionValue)) return;
      return value as OptionValue;

    case 'options': {
      if (!Array.isArray(value)) return [];
      const options = parameter.options || [];
      return value.filter(v => options.includes(v));
    }

    case 'column':
    case 'aggregate':
    case 'splitCombine':
      return inflateExpressionMeta(value);

    case 'columns':
    case 'aggregates':
    case 'splitCombines':
      return inflateExpressionMetas(value);

    default:
      return value as any;
  }
}

function inflateExpressionMeta(value: any): ExpressionMeta | undefined {
  if (!value) return;

  const expression = SqlExpression.maybeParse(value.expression);
  if (!expression) return;

  return { ...value, expression };
}

function inflateExpressionMetas(value: any): ExpressionMeta[] {
  if (!Array.isArray(value)) return [];
  return filterMap(value, inflateExpressionMeta);
}

function defaultForType(parameterType: keyof ParameterTypes): any {
  switch (parameterType) {
    case 'boolean':
      return false;

    case 'columns':
    case 'aggregates':
    case 'splitCombines':
      return [];

    default:
      return;
  }
}

export function effectiveParameterDefault(parameter: ParameterDefinition): any {
  return parameter.default ?? defaultForType(parameter.type);
}

export function restrictWhereToColumns(
  where: SqlExpression,
  columns: ExpressionMeta[],
): SqlExpression {
  const parts = where.decomposeViaAnd();
  const filterParts = parts.filter(ex => expressionWithinColumns(ex, columns));
  if (parts.length === filterParts.length) return where;
  return SqlExpression.and(...filterParts);
}

export function restrictParameterValuesToColumns(
  parameterValues: ParameterValues,
  parameters: Parameters,
  columns: ExpressionMeta[],
): ParameterValues {
  return mapRecord(parameters, (parameter, k) =>
    restrictParameterValueToColumns(parameterValues[k], parameter, columns),
  );
}

function restrictParameterValueToColumns(
  parameterValue: any,
  parameter: ParameterDefinition,
  columns: ExpressionMeta[],
): any {
  if (typeof parameterValue !== 'undefined') {
    switch (parameter.type) {
      case 'column':
      case 'aggregate':
        if (!validateExpressionMeta(parameterValue, columns)) return undefined;
        break;

      case 'splitCombine':
        if (!validateSplitCombine(parameterValue, columns)) return undefined;
        break;

      case 'columns':
      case 'aggregates': {
        const valid = parameterValue.filter((v: ExpressionMeta) =>
          validateExpressionMeta(v, columns),
        );
        if (valid.length !== parameterValue.length) return valid;
        break;
      }

      case 'splitCombines': {
        const valid = parameterValue.filter((v: SplitCombine) => validateSplitCombine(v, columns));
        if (valid.length !== parameterValue.length) return valid;
        break;
      }

      default:
        break;
    }
  }
  return parameterValue;
}

function validateExpressionMeta(
  e: ExpressionMeta | undefined,
  columns: ExpressionMeta[],
): e is ExpressionMeta {
  if (!e) return false;
  return expressionWithinColumns(e.expression, columns);
}

function validateSplitCombine(
  e: SplitCombine | undefined,
  columns: ExpressionMeta[],
): e is SplitCombine {
  if (!e) return false;
  return expressionWithinColumns(e.expression, columns);
}

function expressionWithinColumns(ex: SqlExpression, columns: ExpressionMeta[]): boolean {
  const usedColumns = ex.getUsedColumnNames();
  return usedColumns.every(columnName =>
    columns.some(c => c.expression.getFirstColumnName() === columnName),
  );
}
