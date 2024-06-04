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

import { Button, Intent, Menu, MenuItem, Position } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { Popover2 } from '@blueprintjs/popover2';
import type { QueryResult } from '@druid-toolkit/query';
import { L, QueryRunner, sql, SqlLiteral, SqlQuery, SqlTable, T } from '@druid-toolkit/query';
import React from 'react';

import { SpecDialog } from '../../dialogs';
import { QuerySource } from '../../modules';
import { ModulePane } from '../../modules/module-pane';
import { Api } from '../../singletons';
import {
  deepGet,
  localStorageGetJson,
  LocalStorageKeys,
  localStorageSetJson,
  queryDruidSql,
  removeObjectKey,
} from '../../utils';

import type { ModuleTileConfig } from './common';
import { EditTileDialog } from './edit-tile-dialog/edit-tile-dialog';

import './tiles-view.scss';

// micro-cache
const MAX_TIME_TTL = 60000;
let lastMaxTimeTable: string | undefined;
let lastMaxTimeValue: Date | undefined;
let lastMaxTimeTimestamp = 0;

async function getMaxTimeForTable(tableName: string): Promise<Date | undefined> {
  // micro-cache get
  if (
    lastMaxTimeTable === tableName &&
    lastMaxTimeValue &&
    Date.now() < lastMaxTimeTimestamp + MAX_TIME_TTL
  ) {
    return lastMaxTimeValue;
  }

  const d = await queryDruidSql({
    query: sql`SELECT MAX(__time) AS "maxTime" FROM ${T(tableName)}`,
  });

  const maxTime = new Date(deepGet(d, '0.maxTime'));
  if (isNaN(maxTime.valueOf())) return;

  // micro-cache set
  lastMaxTimeTable = tableName;
  lastMaxTimeValue = maxTime;
  lastMaxTimeTimestamp = Date.now();

  return maxTime;
}

function getFirstTableName(q: SqlQuery): string | undefined {
  let tableName: string | undefined;
  q.walk(ex => {
    if (ex instanceof SqlTable) {
      tableName = ex.getName();
      return;
    }
    return ex;
  });
  return tableName;
}

const queryRunner = new QueryRunner({
  inflateDateStrategy: 'none',
  executor: async (payload, isSql, cancelToken) => {
    if (isSql && payload.query.includes('MAX_DATA_TIME()')) {
      const parsed = SqlQuery.parse(payload.query);
      const tableName = getFirstTableName(parsed);
      if (tableName) {
        const maxTime = await getMaxTimeForTable(tableName);
        if (maxTime) {
          payload = {
            ...payload,
            query: payload.query.replace(/MAX_DATA_TIME\(\)/g, L(maxTime)),
          };
        }
      }
    }

    console.debug('Running query:');
    console.debug(payload.query ?? payload);
    return Api.instance.post(`/druid/v2${isSql ? '/sql' : ''}`, payload, { cancelToken });
  },
});

function runSqlQuery(query: string | SqlQuery): Promise<QueryResult> {
  return queryRunner.runQuery({
    query,
  });
}

export interface TilesViewProps {}

export interface TilesViewState {
  tileConfigs: ModuleTileConfig[];
  tilePublicState: Record<string, Record<string, any>>;
  editTile?: {
    tileConfig: ModuleTileConfig;
    index: number;
  };
  showConfigs: boolean;
}

export class TilesView extends React.PureComponent<TilesViewProps, TilesViewState> {
  constructor(props: TilesViewProps) {
    super(props);

    this.state = {
      tileConfigs: localStorageGetJson(LocalStorageKeys.TILES) || [
        { type: 'filter', moduleName: 'MainFilter', config: { source: 'SELECT * FROM wikipedia' } },
        {
          type: 'table',
          moduleName: 'Table',
          config: {
            source: `SELECT * FROM wikipedia WHERE STATE('MainFilter', 'filter', TRUE)`,
            splitColumn: 'channel',
          },
        },
        {
          type: 'overall',
          moduleName: 'Tile 3',
          config: { source: `SELECT * FROM wikipedia WHERE STATE('MainFilter', 'filter', TRUE)` },
        },
        { type: 'picker', moduleName: 'Tile 4', config: { options: ['A', 'B', 'C'] } },
        { type: 'hello-world', moduleName: 'Tile 2', config: { alt: 'Moon' } },
      ],
      tilePublicState: {},
      showConfigs: false,
    };
  }

  private handleTileConfigsChange(tileConfigs: ModuleTileConfig[]) {
    localStorageSetJson(LocalStorageKeys.TILES, tileConfigs);
    this.setState({ tileConfigs });
  }

  render() {
    const { tileConfigs, tilePublicState, editTile, showConfigs } = this.state;

    return (
      <div className="tiles-view app-view">
        <Popover2
          className="control-button"
          position={Position.BOTTOM_LEFT}
          content={
            <Menu>
              <MenuItem text="Show configs" onClick={() => this.setState({ showConfigs: true })} />
              <MenuItem
                text="Clear view local storage"
                intent={Intent.DANGER}
                onClick={() => {
                  localStorageSetJson(LocalStorageKeys.TILES, null);
                  window.location.reload();
                }}
              />
            </Menu>
          }
        >
          <Button icon={IconNames.COG} />
        </Popover2>
        <div className="tiles-container">
          {tileConfigs.map((moduleTileConfig, i) => (
            <ModulePane
              key={i}
              moduleId={moduleTileConfig.moduleId}
              moduleName={moduleTileConfig.moduleName}
              querySource={new QuerySource(SqlQuery.parse('ToDo: ???'), [])}
              where={SqlLiteral.TRUE}
              parameterValues={moduleTileConfig.parameterValues}
              publicState={tilePublicState}
              setPublicState={(key, value) => {
                setTimeout(() => {
                  let { tilePublicState } = this.state;
                  const myPublicState = tilePublicState[moduleTileConfig.moduleName] ?? {};
                  const currentValue = myPublicState[key];
                  if (value === currentValue) return;
                  if (typeof value === 'undefined') {
                    tilePublicState = {
                      ...tilePublicState,
                      [moduleTileConfig.moduleName]: removeObjectKey(myPublicState, key),
                    };
                  } else {
                    tilePublicState = {
                      ...tilePublicState,
                      [moduleTileConfig.moduleName]: {
                        ...myPublicState,
                        [key]: value,
                      },
                    };
                  }
                  this.setState({ tilePublicState });
                }, 1);
              }}
              runSqlQuery={runSqlQuery}
              onEdit={() => {
                this.setState({
                  editTile: {
                    tileConfig: moduleTileConfig,
                    index: i,
                  },
                });
              }}
            />
          ))}
        </div>
        {editTile && (
          <EditTileDialog
            initTileConfig={editTile.tileConfig}
            onSave={newTileConfig => {
              if (!editTile) return;
              this.handleTileConfigsChange(
                tileConfigs.map((t, i) => (i === editTile?.index ? newTileConfig : t)),
              );
            }}
            onClose={() => this.setState({ editTile: undefined })}
          />
        )}
        {showConfigs && (
          <SpecDialog
            title="Tile configs"
            initSpec={tileConfigs}
            onSubmit={v => {
              if (!Array.isArray(v)) return;
              this.setState({ tileConfigs: v });
            }}
            onClose={() => {
              this.setState({ showConfigs: false });
            }}
          />
        )}
      </div>
    );
  }
}
