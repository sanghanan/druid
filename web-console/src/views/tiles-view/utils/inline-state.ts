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

import { SqlExpression, SqlFunction, SqlLiteral } from '@druid-toolkit/query';

export function inlineState(
  expression: SqlExpression | string,
  publicState: Readonly<Record<string, Readonly<Record<string, any>>>>,
): SqlExpression {
  return SqlExpression.parse(expression).walk(ex => {
    if (ex instanceof SqlFunction && ex.getEffectiveFunctionName() === 'STATE') {
      const tileName = ex.getArgAsString(0);
      if (!tileName) throw new Error('needs tile name');

      const stateName = ex.getArgAsString(1);
      if (!stateName) throw new Error('needs state name');

      return (
        SqlExpression.maybeParse(publicState[tileName]?.[stateName]) ||
        ex.getArg(2) ||
        SqlLiteral.NULL
      ).ensureParens();
    }
    return ex;
  }) as SqlExpression;
}
