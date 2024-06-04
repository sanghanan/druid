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

import { Intent, Menu, MenuItem } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import {
  type QueryResult,
  C,
  L,
  QueryRunner,
  sql,
  SqlExpression,
  SqlLiteral,
  SqlQuery,
  SqlTable,
  T,
} from '@druid-toolkit/query';
import classNames from 'classnames';
import copy from 'copy-to-clipboard';
import React, { useEffect, useRef, useState } from 'react';

import { ShowValueDialog } from '../../dialogs/show-value-dialog/show-value-dialog';
import { useLocalStorageState, useQueryManager } from '../../hooks';
import type { ExpressionMeta, ParameterValues } from '../../modules';
import {
  inflateParameterValues,
  QuerySource,
  restrictParameterValuesToColumns,
  restrictWhereToColumns,
} from '../../modules';
import { ModulePane } from '../../modules/module-pane';
import { ModuleRepository } from '../../modules/module-repository/module-repository';
import { Api, AppToaster } from '../../singletons';
import { deepGet, DruidError, LocalStorageKeys, queryDruidSql } from '../../utils';

import { ControlPane } from './control-pane/control-pane';
import { DroppableContainer } from './droppable-container/droppable-container';
import { FilterPane } from './filter-pane/filter-pane';
import { FullSourcePane } from './full-source-pane/full-source-pane';
import { HighlightBubble } from './highlight-bubble/highlight-bubble';
import { ModulePicker } from './module-picker/module-picker';
import { ResourcePane } from './resource-pane/resource-pane';
import { SourcePane } from './source-pane/source-pane';

import './explore-view.scss';

// ---------------------------------------

interface QueryHistoryEntry {
  time: Date;
  sqlQuery: string;
}

const MAX_PAST_QUERIES = 10;
const QUERY_HISTORY: QueryHistoryEntry[] = [];

function addQueryToHistory(sqlQuery: string): void {
  QUERY_HISTORY.unshift({ time: new Date(), sqlQuery });
  while (QUERY_HISTORY.length > MAX_PAST_QUERIES) QUERY_HISTORY.pop();
}

function getFormattedQueryHistory(): string {
  return QUERY_HISTORY.map(
    ({ time, sqlQuery }) => `At ${time.toISOString()} ran query:\n\n${sqlQuery}`,
  ).join('\n\n-----------------------------------------------------\n\n');
}

// ---------------------------------------

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

  let maxTime = new Date(deepGet(d, '0.maxTime'));
  if (isNaN(maxTime.valueOf())) return;

  // Add 1ms to the maxTime date to allow filters like `"__time" < {maxTime}" to capture the last event which might also be the only event
  maxTime = new Date(maxTime.valueOf() + 1);

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
  executor: async (sqlQueryPayload, isSql, cancelToken) => {
    if (!isSql) throw new Error('should never get here');

    if (sqlQueryPayload.query.includes('MAX_DATA_TIME()')) {
      const parsed = SqlQuery.parse(sqlQueryPayload.query);
      const tableName = getFirstTableName(parsed);
      if (tableName) {
        const maxTime = await getMaxTimeForTable(tableName);
        if (maxTime) {
          sqlQueryPayload = {
            ...sqlQueryPayload,
            query: sqlQueryPayload.query.replace(/MAX_DATA_TIME\(\)/g, L(maxTime)),
          };
        }
      }
    }

    addQueryToHistory(sqlQueryPayload.query);
    console.debug(`Running query:\n${sqlQueryPayload.query}`);

    return Api.instance.post('/druid/v2/sql', sqlQueryPayload, { cancelToken });
  },
});

async function runSqlQuery(query: string | SqlQuery): Promise<QueryResult> {
  try {
    return await queryRunner.runQuery({
      query,
    });
  } catch (e) {
    throw new DruidError(e);
  }
}

async function introspect(source: string): Promise<QuerySource> {
  const r = await runSqlQuery(`SELECT * FROM (${source}) LIMIT 0`);

  return new QuerySource(
    SqlQuery.parse(source),
    r.header.map(c => {
      return {
        expression: C(c.name),
        name: c.name,
        sqlType: c.sqlType,
      };
    }),
  );
}

interface ExploreStoredState {
  moduleId: string;
  source: string;
  where: SqlExpression;
  parameterValues: Record<string, any>;
  showFullSource?: boolean;
}

export const ExploreView = React.memo(function ExploreView() {
  const [shownText, setShownText] = useState<string | undefined>();
  const filterPane = useRef<{ filterOn(column: ExpressionMeta): void }>();

  const [exploreState, setExploreState] = useLocalStorageState<ExploreStoredState>(
    LocalStorageKeys.EXPLORE_STATE,
    {
      moduleId: 'record-table',
      source: 'SELECT * FROM wikipedia',
      where: SqlLiteral.TRUE,
      parameterValues: {},
    },
    s => {
      const inflatedParameterValues = inflateParameterValues(
        s.parameterValues,
        ModuleRepository.getModule(s.moduleId)?.parameters || {},
      );
      return {
        ...s,
        where: SqlExpression.maybeParse(s.where) || SqlLiteral.TRUE,
        parameterValues: inflatedParameterValues,
      };
    },
  );

  // const { dropHighlight } = useStore(highlightStore);

  const { moduleId, source, where, parameterValues, showFullSource } = exploreState;
  const module = ModuleRepository.getModule(moduleId);

  let parsedSource: SqlQuery | undefined;
  let parsedError: string | undefined;
  try {
    parsedSource = SqlQuery.parse(source);
  } catch (e) {
    parsedError = e.message;
  }

  const [querySourceState] = useQueryManager<string, QuerySource>({
    query: parsedSource ? String(parsedSource) : undefined,
    processQuery: source => introspect(source),
  });

  useEffect(() => {
    const columns = querySourceState.data?.columns;
    if (!columns || !module) return;
    const newWhere = restrictWhereToColumns(where, columns);
    const newParameterValues = restrictParameterValuesToColumns(
      parameterValues,
      module.parameters,
      columns,
    );
    if (where !== newWhere && parameterValues !== newParameterValues) {
      setExploreState({ ...exploreState, where: newWhere, parameterValues: newParameterValues });
    }
  }, [module, parameterValues, querySourceState.data]);

  function setModuleId(moduleId: string) {
    if (exploreState.moduleId === moduleId) return;
    setExploreState({ ...exploreState, moduleId, parameterValues: {} });
  }

  function setParameterValues(newParameterValues: ParameterValues) {
    if (newParameterValues === parameterValues) return;
    setExploreState({ ...exploreState, parameterValues: newParameterValues });
  }

  function resetParameterValues() {
    setParameterValues({});
  }

  function updateParameterValues(newParameterValues: ParameterValues) {
    setParameterValues({ ...parameterValues, ...newParameterValues });
  }

  function setSource(source: SqlQuery | string) {
    setExploreState({ ...exploreState, source: String(source) });
  }

  function setWhere(where: SqlExpression) {
    setExploreState({ ...exploreState, where });
  }

  // const onShow = useMemo(() => {
  //   const currentShowTransfers =
  //     VISUAL_MODULES.find(vm => vm.moduleId === moduleId)?.transfer || [];
  //   if (currentShowTransfers.length) {
  //     const paramName = currentShowTransfers[0];
  //     const showControlType = module?.parameterDefinitions?.[paramName]?.type;
  //
  //     if (paramName && oneOf(showControlType, 'column', 'columns')) {
  //       return (column: ExpressionMeta) => {
  //         updateParameterValues({ [paramName]: showControlType === 'column' ? column : [column] });
  //       };
  //     }
  //   }
  //   return;
  // }, [updateParameterValues, moduleId, module?.parameterDefinitions]);

  const onShow = () => {
    console.log('on show!');
  };

  const querySource = querySourceState.getSomeData();

  const effectiveShowFullSource = showFullSource || parsedError;
  return (
    <div className={classNames('explore-view', { 'show-full-source': effectiveShowFullSource })}>
      {effectiveShowFullSource && (
        <FullSourcePane
          source={source}
          onSourceChange={setSource}
          onClose={() => setExploreState({ ...exploreState, showFullSource: false })}
        />
      )}
      {parsedError && <div className="source-error">{`Source error: ${parsedError}`}</div>}
      {parsedSource && (
        <div className="explore-container">
          <SourcePane
            selectedSource={parsedSource}
            onSelectedSourceChange={setSource}
            onShowFullSource={() => setExploreState({ ...exploreState, showFullSource: true })}
            disabled={Boolean(querySource && querySourceState.loading)}
          />
          <FilterPane
            ref={filterPane}
            querySource={querySource}
            filter={where}
            onFilterChange={setWhere}
            runSqlQuery={runSqlQuery}
          />
          <ModulePicker
            modules={[
              { id: 'overall', icon: IconNames.NUMERICAL, label: 'Overall' },
              { id: 'grouping-table', icon: IconNames.PANEL_TABLE, label: 'Grouping table' },
              { id: 'record-table', icon: IconNames.PIVOT_TABLE, label: 'Record table' },
              { id: 'bar-chart', icon: IconNames.VERTICAL_BAR_CHART_DESC, label: 'Bar chart' },
            ]}
            selectedModuleId={moduleId}
            onSelectedModuleIdChange={id => {
              setModuleId(id);
              // const currentParameterDefinitions = module?.parameterDefinitions || {};
              // const valuesToTransfer: TransferValue[] = filterMap(
              //   VISUAL_MODULES.find(vm => vm.moduleId === module?.moduleId)?.transfer || [],
              //   paramName => {
              //     const parameterDefinition = currentParameterDefinitions[paramName];
              //     if (!parameterDefinition) return;
              //     const parameterValue = parameterValues[paramName];
              //     if (typeof parameterValue === 'undefined') return;
              //     return [parameterDefinition.type, parameterValue];
              //   },
              // );
              //
              // dropHighlight();
              // setModuleId(m);
              // resetParameterValues();
              //
              // const newModuleDef = VISUAL_MODULES.find(vm => vm.moduleId === m);
              // if (newModuleDef) {
              //   const newParameters: any = newModuleDef.module?.parameters || {};
              //   const transferParameterValues: [name: string, value: any][] = filterMap(
              //     newModuleDef.transfer || [],
              //     t => {
              //       const p = newParameters[t];
              //       if (!p) return;
              //       const normalizedTargetType = normalizeType(p.type);
              //       const transferSource = valuesToTransfer.find(
              //         ([t]) => normalizeType(t) === normalizedTargetType,
              //       );
              //       if (!transferSource) return;
              //       const targetValue = adjustTransferValue(
              //         transferSource[1],
              //         transferSource[0],
              //         p.type,
              //       );
              //       if (typeof targetValue === 'undefined') return;
              //       return [t, targetValue];
              //     },
              //   );
              //
              //   if (transferParameterValues.length) {
              //     updateParameterValues(Object.fromEntries(transferParameterValues));
              //   }
              // }
            }}
            moreMenu={
              <Menu>
                <MenuItem
                  icon={IconNames.DUPLICATE}
                  text="Copy last query"
                  disabled={!QUERY_HISTORY.length}
                  onClick={() => {
                    copy(QUERY_HISTORY[0]?.sqlQuery, { format: 'text/plain' });
                    AppToaster.show({
                      message: `Copied query to clipboard`,
                      intent: Intent.SUCCESS,
                    });
                  }}
                />
                <MenuItem
                  icon={IconNames.HISTORY}
                  text="Show query history"
                  onClick={() => {
                    setShownText(getFormattedQueryHistory());
                  }}
                />
                <MenuItem
                  icon={IconNames.RESET}
                  text="Reset visualization state"
                  onClick={() => {
                    resetParameterValues();
                  }}
                />
              </Menu>
            }
          />
          <div className="resource-pane-cnt">
            {!querySource && querySourceState.loading && 'Loading...'}
            {querySource && (
              <ResourcePane
                querySource={querySource}
                onQueryChange={setSource}
                onFilter={c => {
                  filterPane.current?.filterOn(c);
                }}
                onShow={onShow}
              />
            )}
          </div>
          <DroppableContainer
            className="main-cnt"
            onDropColumn={column => {
              let nextModuleName: string;
              if (column.sqlType === 'TIMESTAMP') {
                nextModuleName = 'time-chart';
              } else {
                nextModuleName = 'grouping-table';
              }

              setModuleId(nextModuleName);

              if (column.sqlType === 'TIMESTAMP') {
                resetParameterValues();
              } else {
                updateParameterValues({ splitColumns: [column] });
              }
            }}
          >
            {querySourceState.error && (
              <div className="error-display">{querySourceState.getErrorMessage()}</div>
            )}
            {querySource && (
              <ModulePane
                moduleId={moduleId}
                moduleName="*"
                querySource={querySource}
                where={where}
                parameterValues={parameterValues}
                publicState={{}}
                setPublicState={() => null}
                runSqlQuery={runSqlQuery}
              />
            )}
          </DroppableContainer>
          <div className="control-pane-cnt">
            {querySource && module && (
              <ControlPane
                columns={querySource.columns}
                onUpdateParameterValues={updateParameterValues}
                parameters={module.parameters}
                parameterValues={parameterValues}
              />
            )}
          </div>
          {shownText && (
            <ShowValueDialog
              title="Query history"
              str={shownText}
              onClose={() => {
                setShownText(undefined);
              }}
            />
          )}
        </div>
      )}
      <HighlightBubble referenceContainer={null} />
    </div>
  );
});
