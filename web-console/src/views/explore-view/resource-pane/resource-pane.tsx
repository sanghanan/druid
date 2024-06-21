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

import { Icon, Intent, Menu, MenuDivider, MenuItem } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { Popover2 } from '@blueprintjs/popover2';
import type { SqlExpression, SqlQuery } from '@druid-toolkit/query';
import React, { useState } from 'react';

import { ClearableInput } from '../../../components';
import type { ExpressionMeta, QuerySource } from '../../../modules';
import { caseInsensitiveContains, dataTypeToIcon, filterMap } from '../../../utils';
import { DragHelper } from '../drag-helper';
import { EditColumnDialog } from '../edit-column-dialog/edit-column-dialog';

import './resource-pane.scss';

export interface ResourcePaneProps {
  querySource: QuerySource;
  onQueryChange: (newQuery: SqlQuery) => void;
  onFilter?: (column: ExpressionMeta) => void;
  onShow?: (column: ExpressionMeta) => void;
}

export const ResourcePane = function ResourcePane(props: ResourcePaneProps) {
  const { querySource, onQueryChange, onFilter, onShow } = props;
  const [columnSearch, setColumnSearch] = useState('');

  const [editedExpression, setEditedExpression] = useState<SqlExpression | undefined>();

  return (
    <div className="resource-pane">
      <ClearableInput
        className="search-input"
        value={columnSearch}
        onChange={setColumnSearch}
        placeholder="Search"
      />
      <div className="resource-items">
        {filterMap(querySource.columns, (c, i) => {
          const columnName = c.name;
          if (!caseInsensitiveContains(columnName, columnSearch)) return;
          return (
            <Popover2
              className="resource-item"
              key={i}
              position="right"
              content={
                <Menu>
                  {onFilter && (
                    <MenuItem icon={IconNames.FILTER} text="Filter" onClick={() => onFilter(c)} />
                  )}
                  {onShow && (
                    <MenuItem icon={IconNames.EYE_OPEN} text="Show" onClick={() => onShow(c)} />
                  )}
                  <MenuDivider />
                  <MenuItem
                    icon={IconNames.EDIT}
                    text="Edit"
                    onClick={() =>
                      setEditedExpression(querySource.getSourceExpressionForColumn(columnName))
                    }
                  />
                  <MenuItem
                    icon={IconNames.TRASH}
                    text="Delete"
                    intent={Intent.DANGER}
                    onClick={() => onQueryChange(querySource.deleteColumn(columnName))}
                  />
                </Menu>
              }
            >
              <div
                className="bp4-menu-item"
                draggable
                onDragStart={e => {
                  e.dataTransfer.effectAllowed = 'all';
                  DragHelper.dragColumn = c;
                  DragHelper.createDragGhost(e.dataTransfer, c.name);
                }}
              >
                <Icon
                  className="bp4-menu-item-icon"
                  icon={c.sqlType ? dataTypeToIcon(c.sqlType) : IconNames.BLANK}
                />
                <div className="bp4-fill bp4-text-overflow-ellipsis">{c.name}</div>
              </div>
            </Popover2>
          );
        })}
      </div>
      {editedExpression && (
        <EditColumnDialog
          onApply={newExpression => onQueryChange(querySource.changeExpression(newExpression))}
          onClose={() => setEditedExpression(undefined)}
        />
      )}
    </div>
  );
};
