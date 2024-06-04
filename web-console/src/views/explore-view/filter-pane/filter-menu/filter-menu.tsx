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

import { Button, ButtonGroup, FormGroup, HTMLSelect } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import type {
  FilterPattern,
  FilterPatternType,
  QueryResult,
  SqlExpression,
  SqlQuery,
} from '@druid-toolkit/query';
import { changeFilterPatternType, FILTER_PATTERN_TYPES } from '@druid-toolkit/query';
import type { JSX } from 'react';
import React, { useState } from 'react';

import type { QuerySource } from '../../../../modules';
import { ColumnPickerMenu } from '../../column-picker-menu/column-picker-menu';
import { initPatternForColumn } from '../pattern-helpers';

import { ContainsFilterControl } from './contains-filter-control/contains-filter-control';
import { CustomFilterControl } from './custom-filter-control/custom-filter-control';
import { RegexpFilterControl } from './regexp-filter-control/regexp-filter-control';
import { TimeIntervalFilterControl } from './time-interval-filter-control/time-interval-filter-control';
import { TimeRelativeFilterControl } from './time-relative-filter-control/time-relative-filter-control';
import { ValuesFilterControl } from './values-filter-control/values-filter-control';

import './filter-menu.scss';

const PATTERN_TYPE_TO_NAME: Record<FilterPatternType, string> = {
  values: 'Values',
  contains: 'Contains',
  custom: 'Custom',
  mvContains: 'Multi-value contains',
  numberRange: 'Number range',
  regexp: 'Regular expression',
  timeInterval: 'Time interval',
  timeRelative: 'Time relative',
};

export interface FilterMenuProps {
  querySource: QuerySource;
  filter: SqlExpression;
  initPattern?: FilterPattern;
  onPatternChange(newPattern: FilterPattern): void;
  onClose(): void;
  runSqlQuery(query: string | SqlQuery): Promise<QueryResult>;
}

export const FilterMenu = React.memo(function FilterMenu(props: FilterMenuProps) {
  const { querySource, filter, initPattern, onPatternChange, onClose, runSqlQuery } = props;

  const [pattern, setPattern] = useState<FilterPattern | undefined>(initPattern);
  const [negated, setNegated] = useState(Boolean(pattern?.negated));

  const { columns } = querySource;

  if (!pattern) {
    return (
      <ColumnPickerMenu
        className="filter-menu"
        columns={columns}
        onSelectColumn={c => setPattern(initPatternForColumn(c))}
        iconForColumn={c => (filter.containsColumnName(c.name) ? IconNames.FILTER : undefined)}
        shouldDismissPopover={false}
      />
    );
  }

  function onAcceptPattern(pattern: FilterPattern) {
    onPatternChange({ ...pattern, negated });
    onClose();
  }

  let cont: JSX.Element;
  switch (pattern.type) {
    case 'values':
      cont = (
        <ValuesFilterControl
          querySource={querySource}
          filter={filter.removeColumnFromAnd(pattern.column)}
          initFilterPattern={pattern}
          negated={negated}
          setFilterPattern={onAcceptPattern}
          onClose={onClose}
          runSqlQuery={runSqlQuery}
        />
      );
      break;

    case 'contains':
      cont = (
        <ContainsFilterControl
          querySource={querySource}
          filter={filter.removeColumnFromAnd(pattern.column)}
          initFilterPattern={pattern}
          negated={negated}
          setFilterPattern={onAcceptPattern}
          runSqlQuery={runSqlQuery}
        />
      );
      break;

    case 'regexp':
      cont = (
        <RegexpFilterControl
          querySource={querySource}
          filter={filter.removeColumnFromAnd(pattern.column)}
          initFilterPattern={pattern}
          negated={negated}
          setFilterPattern={onAcceptPattern}
          runSqlQuery={runSqlQuery}
        />
      );
      break;

    case 'timeInterval':
      cont = (
        <TimeIntervalFilterControl
          querySource={querySource}
          initFilterPattern={pattern}
          negated={negated}
          setFilterPattern={onAcceptPattern}
        />
      );
      break;

    case 'timeRelative':
      cont = (
        <TimeRelativeFilterControl
          querySource={querySource}
          initFilterPattern={pattern}
          negated={negated}
          setFilterPattern={onAcceptPattern}
        />
      );
      break;

    case 'custom':
      cont = (
        <CustomFilterControl
          initFilterPattern={pattern}
          negated={negated}
          setFilterPattern={onAcceptPattern}
        />
      );
      break;

    default:
      cont = <div>{`Unknown pattern type: ${pattern.type}`}</div>;
      break;
  }

  return (
    <div className="filter-menu main">
      <FormGroup className="controls">
        <HTMLSelect
          className="type-selector"
          value={pattern.type}
          onChange={e =>
            setPattern(changeFilterPatternType(pattern, e.target.value as FilterPatternType))
          }
        >
          {FILTER_PATTERN_TYPES.map(type => (
            <option key={type} value={type}>
              {PATTERN_TYPE_TO_NAME[type]}
            </option>
          ))}
        </HTMLSelect>
        <ButtonGroup>
          <Button icon={IconNames.FILTER} active={!negated} onClick={() => setNegated(false)} />
          <Button
            icon={IconNames.FILTER_REMOVE}
            active={negated}
            onClick={() => setNegated(true)}
          />
        </ButtonGroup>
      </FormGroup>
      {cont}
    </div>
  );
});
