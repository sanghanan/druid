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

import { Button, ButtonGroup, Menu, MenuDivider, MenuItem, Position } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { Popover2 } from '@blueprintjs/popover2';
import { SqlQuery, SqlTable } from '@druid-toolkit/query';
import React from 'react';

import { useQueryManager } from '../../../hooks';
import { queryDruidSql } from '../../../utils';

import './source-pane.scss';

function formatQuerySource(source: SqlQuery | undefined): string {
  if (!(source instanceof SqlQuery)) return 'No source selected';
  const fromExpressions = source.getFromExpressions();
  if (fromExpressions.length !== 1) return 'Multiple from expression';
  const fromExpression = fromExpressions[0];
  if (!(fromExpression instanceof SqlTable)) return 'Complex from';
  return `Source: ${fromExpression.getName()}`;
}

export interface SourcePaneProps {
  selectedSource: SqlQuery | undefined;
  onSelectedSourceChange(newSelectedSource: SqlQuery): void;
  onShowFullSource?: () => void;
  disabled?: boolean;
}

export const SourcePane = React.memo(function SourcePane(props: SourcePaneProps) {
  const { selectedSource, onSelectedSourceChange, onShowFullSource, disabled } = props;

  const [tables] = useQueryManager<string, string[]>({
    initQuery: '',
    processQuery: async () => {
      const tables = await queryDruidSql<{ TABLE_NAME: string }>({
        query: `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'TABLE'`,
      });

      return tables.map(d => d.TABLE_NAME);
    },
  });

  return (
    <ButtonGroup className="source-pane" fill>
      <Popover2
        disabled={disabled}
        minimal
        position={Position.BOTTOM_LEFT}
        content={
          <Menu className="source-menu">
            {onShowFullSource && <MenuItem text="Show full source..." onClick={onShowFullSource} />}
            {onShowFullSource && <MenuDivider />}
            {tables.loading && <MenuDivider title="Loading..." />}
            {tables.data?.map((table, i) => (
              <MenuItem
                key={i}
                text={table}
                onClick={() => onSelectedSourceChange(SqlQuery.create(table))}
              />
            ))}
            {!tables.data?.length && <MenuItem text="No tables" disabled />}
          </Menu>
        }
      >
        <Button
          text={formatQuerySource(selectedSource)}
          rightIcon={IconNames.CARET_DOWN}
          fill
          minimal
          disabled={disabled}
        />
      </Popover2>
    </ButtonGroup>
  );
});
