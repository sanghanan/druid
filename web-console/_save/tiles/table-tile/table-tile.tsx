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

import { sql } from '@druid-toolkit/query';
import React, { useMemo } from 'react';

import { Issue, Loader } from '../../../../components';
import { useQueryManager } from '../../../../hooks';
import { GenericOutputTable } from '../../../explore-view/modules/components';
import { TileRepository } from '../../tile-repository';
import { inlineState } from '../../utils/inline-state';

import './table-tile.scss';

interface TableTileConfig {
  source: string;
  splitColumn: string;
}

TileRepository.registerTile<TableTileConfig>({
  type: 'table',
  title: 'Table',
  description: 'A universal table',
  configFields: [
    {
      name: 'source',
      type: 'string',
      required: true,
    },
    {
      name: 'splitColumn',
      type: 'string',
      required: true,
    },
  ],
  component: function TableTile(props) {
    const { config, publicState, setPublicState, runSqlQuery } = props;
    const { source, splitColumn } = config;

    const query = useMemo(() => {
      return String(sql`
        SELECT
          "${splitColumn}",
          COUNT(*) AS "cnt"
        FROM (${inlineState(source, publicState)})
        GROUP BY 1
        ORDER BY 2 DESC
      `);
    }, [source, publicState]);

    const [resultState] = useQueryManager<string, any>({
      query: query,
      processQuery: async query => {
        setPublicState('query', query);
        return await runSqlQuery(query);
      },
    });

    if (resultState.loading) return <Loader />;

    const errorMessage = resultState.getErrorMessage();
    if (errorMessage) return <Issue issue={errorMessage} />;

    return (
      <div className="table-tile">
        {resultState.data && (
          <GenericOutputTable
            runeMode={false}
            queryResult={resultState.data}
            showTypeIcons={false}
            onQueryAction={action => {
              console.log(action);
            }}
          />
        )}
      </div>
    );
  },
});
