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

import type { SqlQuery } from '@druid-toolkit/query';
import { C, SqlStar } from '@druid-toolkit/query';

import type { ExpressionMeta } from '../models';

export class QuerySource {
  static isSimpleSelect(query: SqlQuery): boolean {
    return Boolean(
      !query.hasGroupBy() && !query.unionQuery && query.getFromExpressions().length === 1,
    );
  }

  static materializeStarIfNeeded(query: SqlQuery, columns: ExpressionMeta[]): SqlQuery {
    let columnsToExpand = columns.map(c => c.name);
    const selectExpressions = query.getSelectExpressionsArray();
    let starCount = 0;
    for (const selectExpression of selectExpressions) {
      if (selectExpression instanceof SqlStar) {
        starCount++;
        continue;
      }
      const outputName = selectExpression.getOutputName();
      if (!outputName) continue;
      columnsToExpand = columnsToExpand.filter(c => c !== outputName);
    }
    if (starCount === 0) return query;
    if (starCount > 1) throw new Error('can not handle multiple stars');

    return query
      .changeSelectExpressions(
        selectExpressions.flatMap(selectExpression =>
          selectExpression instanceof SqlStar ? columnsToExpand.map(c => C(c)) : selectExpression,
        ),
      )
      .prettify();
  }

  public query: SqlQuery;
  public columns: ExpressionMeta[];
  constructor(query: SqlQuery, columns: ExpressionMeta[]) {
    this.query = query;
    this.columns = columns;
  }

  public deleteColumn(outputName: string): SqlQuery {
    const noStarQuery = QuerySource.materializeStarIfNeeded(this.query, this.columns);
    return noStarQuery.changeSelectExpressions(
      noStarQuery.getSelectExpressionsArray().filter(ex => ex.getOutputName() !== outputName),
    );
  }
}
