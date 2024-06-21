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

import type { SqlType } from '@druid-toolkit/query';
import { F, SqlExpression, SqlFunction } from '@druid-toolkit/query';

export interface CastBreakdown {
  formula: string;
  castType?: SqlType;
  forceMultiValue: boolean;
  outputName: string;
}

export function expressionToCastBreakdown(expression: SqlExpression): CastBreakdown {
  const outputName = expression.getOutputName() || '';
  expression = expression.getUnderlyingExpression();

  if (expression instanceof SqlFunction) {
    const asType = expression.getCastType();
    const formula = String(expression.getArg(0));
    if (asType) {
      return {
        formula,
        castType: asType,
        forceMultiValue: false,
        outputName,
      };
    } else if (expression.getEffectiveFunctionName() === 'ARRAY_TO_MV') {
      return {
        formula,
        forceMultiValue: true,
        outputName,
      };
    }
  }

  return {
    formula: String(expression),
    forceMultiValue: false,
    outputName,
  };
}

export function castBreakdownToExpression({
  formula,
  castType,
  forceMultiValue,
  outputName,
}: CastBreakdown): SqlExpression {
  let newExpression = SqlExpression.parse(formula);
  const defaultOutputName = newExpression.getOutputName();

  if (castType) {
    newExpression = newExpression.cast(castType);
  } else if (forceMultiValue) {
    newExpression = F('ARRAY_TO_MV', newExpression);
  }

  if (!defaultOutputName && !outputName) {
    throw new Error('Must explicitly define an output name');
  }

  if (newExpression.getOutputName() !== outputName) {
    newExpression = newExpression.as(outputName);
  }

  return newExpression;
}

export function castBreakdownsEqual(a: CastBreakdown, b: CastBreakdown): boolean {
  return (
    a.formula === b.formula &&
    String(a.castType) === String(b.castType) &&
    a.forceMultiValue === b.forceMultiValue &&
    a.outputName === b.outputName
  );
}
