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

import { SqlExpression, SqlLiteral, SqlQuery } from '@druid-toolkit/query';
import React from 'react';

import { Loader } from '../../../../components';
import { useQueryManager } from '../../../../hooks';
import { FilterPane } from '../../../explore-view/filter-pane/filter-pane';
import type { QuerySource } from '../../../explore-view/utils';
import { TileRepository } from '../../tile-repository';

// import './overall-tile.scss';

interface FilterTileConfig {
  source: string;
}

TileRepository.registerTile<FilterTileConfig>({
  type: 'filter',
  title: 'Filter',
  description: 'Shows the count',
  parameterDefinitions: {
    source: {
      type: 'string',
      // required: true,
    },
  },
  component: function FilterTile(props) {
    const { config, myPublicState, setPublicState, runSqlQuery } = props;
    const { source } = config;

    const [querySourceState] = useQueryManager<string, QuerySource>({
      query: source,
      processQuery: async source => {
        const r = await runSqlQuery(`SELECT * FROM (${source}) LIMIT 0`);

        return {
          query: SqlQuery.parse(source),
          columns: r.header.map(c => {
            return {
              expression: SqlLiteral.NULL,
              name: c.name,
              sqlType: c.sqlType,
            };
          }),
        };
      },
    });

    if (querySourceState.loading) return <Loader />;

    const filter = SqlExpression.maybeParse(myPublicState['filter']) || SqlLiteral.TRUE;
    return (
      <div className="filter-tile" style={{ marginTop: '22px' }}>
        <FilterPane
          querySource={querySourceState.data}
          filter={filter}
          onFilterChange={f => setPublicState('filter', String(f))}
          runSqlQuery={runSqlQuery}
        />
      </div>
    );
  },
});
