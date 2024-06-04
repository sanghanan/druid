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

import type { QueryResult } from '@druid-toolkit/query';
import { SqlQuery } from '@druid-toolkit/query';
import React, { useMemo } from 'react';

import { Issue, Loader } from '../components';
import { useQueryManager } from '../hooks';
import { formatInteger } from '../utils';

import type { ExpressionMeta } from './models';
import { ModuleRepository } from './module-repository/module-repository';

import './overall-module.scss';

interface OverallParameterValues {
  metrics: ExpressionMeta[];
}

ModuleRepository.registerModule<OverallParameterValues>({
  id: 'overall',
  title: 'Overall',
  description: 'Shows the count',
  parameters: {
    metrics: {
      type: 'aggregates',
      default: [],
      control: {
        label: 'Aggregates',
        // transferGroup: 'show-agg',
      },
    },
  },
  component: function OverallModule(props) {
    const { querySource, where, parameterValues, runSqlQuery } = props;
    const { metrics } = parameterValues;

    const query = useMemo(() => {
      if (!metrics.length) return;
      return SqlQuery.from(querySource.query)
        .changeWhereExpression(where)
        .changeSelectExpressions(metrics.map(metric => metric.expression.as(metric.name)))
        .changeGroupByExpressions([])
        .toString();
    }, [querySource.query, where, metrics]);

    const [valuesState] = useQueryManager<string, QueryResult>({
      query: query,
      processQuery: runSqlQuery,
    });

    if (valuesState.loading) return <Loader />;

    const errorMessage = valuesState.getErrorMessage();
    if (errorMessage) return <Issue issue={errorMessage} />;

    const row = valuesState.data?.toObjectArray()?.[0];
    return (
      <div className="overall-module">
        {metrics.map(metric => (
          <div className="metric-entry">
            <div className="metric-name">{metric.name}</div>
            <div className="metric-value">{row ? formatInteger(row[metric.name]) : '-'}</div>
          </div>
        ))}
        {metrics.length === 0 && <div className="no-metrics">No metrics</div>}
      </div>
    );
  },
});
