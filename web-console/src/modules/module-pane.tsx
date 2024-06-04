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

import { Button, Menu, MenuItem } from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { Popover2 } from '@blueprintjs/popover2';
import type { QueryResult, SqlExpression, SqlQuery } from '@druid-toolkit/query';
import React from 'react';

import { Issue } from '../components';

import type { ParameterDefinition, QuerySource } from './models';
import { ModuleRepository } from './module-repository/module-repository';

import './module-pane.scss';

function fillInDefaults(
  parameterValues: Record<string, any>,
  parameters: Record<string, ParameterDefinition>,
): Record<string, any> {
  const parameterValuesWithDefaults = { ...parameterValues };
  Object.entries(parameters).forEach(([propName, propDefinition]) => {
    if (typeof parameterValuesWithDefaults[propName] !== 'undefined') return;
    parameterValuesWithDefaults[propName] = propDefinition.default;
  });
  return parameterValuesWithDefaults;
}

export interface ModulePaneProps {
  moduleId: string;
  moduleName: string;
  querySource: QuerySource;
  where: SqlExpression;
  parameterValues: Record<string, any>;

  publicState: Readonly<Record<string, Readonly<Record<string, any>>>>;
  setPublicState(key: string, value: any): void;
  runSqlQuery(query: string | SqlQuery): Promise<QueryResult>;

  onEdit?: () => void;
}

export const ModulePane = function ModulePane(props: ModulePaneProps) {
  const {
    moduleId,
    moduleName,
    querySource,
    where,
    parameterValues,
    publicState,
    setPublicState,
    runSqlQuery,
    onEdit,
  } = props;

  const module = ModuleRepository.getModule(moduleId);

  let content: React.ReactNode;
  if (module) {
    const modelIssue = undefined; // AutoForm.issueWithModel(moduleTileConfig.config, module.configFields);
    if (modelIssue) {
      content = <Issue issue={modelIssue} />;
    } else {
      content = React.createElement(module.component, {
        querySource,
        where,
        parameterValues: fillInDefaults(parameterValues, module.parameters),
        publicState,
        myPublicState: publicState[moduleName] ?? {},
        setPublicState,
        runSqlQuery,
      });
    }
  } else {
    content = <Issue issue={`Unknown module id: ${moduleId}`} />;
  }

  return (
    <div className="module-pane">
      {content}
      {onEdit && (
        <Button className="edit-button" icon={IconNames.EDIT} onClick={onEdit} minimal small />
      )}
      <Popover2
        className="more-button"
        content={
          <Menu>
            <MenuItem text={moduleName} label="click to copy" />
          </Menu>
        }
      >
        <Button icon={IconNames.MORE} minimal small />
      </Popover2>
    </div>
  );
};
