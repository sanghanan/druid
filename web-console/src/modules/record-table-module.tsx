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

import { C, SqlQuery } from '@druid-toolkit/query';
import React, { useMemo } from 'react';

import { Loader } from '../components';
import { useQueryManager } from '../hooks';

import { GenericOutputTable } from './components';
import { ModuleRepository } from './module-repository/module-repository';

import './record-table-module.scss';

interface RecordTableParameterValues {
  maxRows: number;
  ascending: boolean;
  showTypeIcons: boolean;
}

ModuleRepository.registerModule<RecordTableParameterValues>({
  id: 'record-table',
  title: 'Grouping table',
  description: 'A table with extensive compare support',
  parameters: {
    maxRows: {
      type: 'number',
      default: 200,
      min: 1,
      max: 100000,
      control: {
        label: 'Max rows',
        required: true,
      },
    },
    ascending: {
      type: 'boolean',
      default: false,
    },
    showTypeIcons: {
      type: 'boolean',
      default: true,
    },
  },
  component: function RecordTableModule(props) {
    const { querySource, where, parameterValues, runSqlQuery } = props;

    const query = useMemo((): string | undefined => {
      return SqlQuery.create(querySource.query)
        .changeWhereExpression(where)
        .changeLimitValue(parameterValues.maxRows)
        .applyIf(
          querySource.columns.some(e => e.name === '__time') && !parameterValues.ascending,
          q => q.changeOrderByExpression(C('__time').toOrderByExpression('DESC')),
          q => q.changeOrderByClause(querySource.query.orderByClause),
        )
        .toString();
    }, [querySource, parameterValues]);

    const [resultState] = useQueryManager({
      query: query,
      processQuery: runSqlQuery,
    });

    const resultData = resultState.getSomeData();
    return (
      <div className="record-table-module">
        {resultState.error ? (
          <div>
            <div>{resultState.getErrorMessage()}</div>
          </div>
        ) : resultData ? (
          <GenericOutputTable
            runeMode={false}
            queryResult={resultData}
            showTypeIcons={parameterValues.showTypeIcons}
            onQueryAction={_action => {
              // const query = getInitQuery(table, where);
              // if (!query) return;
              // const nextQuery = action(query);
              // const prevWhere = query.getWhereExpression() || SqlLiteral.TRUE;
              // const nextWhere = nextQuery.getWhereExpression() || SqlLiteral.TRUE;
              // if (prevWhere && nextWhere && !prevWhere.equals(nextWhere)) {
              //   updateWhere(nextWhere);
              // }
            }}
          />
        ) : undefined}
        {resultState.loading && <Loader />}
      </div>
    );
  },
});
