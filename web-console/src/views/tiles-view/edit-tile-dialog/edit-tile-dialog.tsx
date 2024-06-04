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

import { Button, Classes, Dialog, Intent } from '@blueprintjs/core';
import React, { useState } from 'react';

import type { FormJsonTabs } from '../../../components';
import { AutoForm, FormJsonSelector, JsonInput } from '../../../components';
import { ModuleRepository } from '../../../modules/module-repository/module-repository';
import type { ModuleTileConfig } from '../common';

export interface EditTileDialogProps {
  initTileConfig: ModuleTileConfig | undefined;
  onSave(tileConfig: ModuleTileConfig): void;
  onClose(): void;
}

export const EditTileDialog = React.memo(function EditTileDialog(props: EditTileDialogProps) {
  const { initTileConfig, onSave, onClose } = props;

  const [currentTab, setCurrentTab] = useState<FormJsonTabs>('form');
  const [currentModuleTileConfig, setCurrentModuleTileConfig] = useState<Partial<ModuleTileConfig>>(
    initTileConfig || { moduleName: `t${String(Math.random()).slice(2, 3)}}` },
  );
  const [jsonError, setJsonError] = useState<Error | undefined>();

  const moduleDefinition =
    typeof currentModuleTileConfig.moduleId === 'string'
      ? ModuleRepository.getModule(currentModuleTileConfig.moduleId)
      : undefined;

  // const issueWithCurrentTileConfig = moduleDefinition
  //   ? AutoForm.issueWithModel(currentModuleTileConfig.config, moduleDefinition.configFields)
  //   : 'no tile';

  const issueWithCurrentTileConfig = moduleDefinition ? undefined : 'no tile';

  console.log(jsonError, issueWithCurrentTileConfig);

  return (
    <Dialog
      className="edit-tile-dialog"
      isOpen
      onClose={onClose}
      canOutsideClickClose={false}
      title="Edit tile"
    >
      <div className={Classes.DIALOG_BODY}>
        <FormJsonSelector
          tab={currentTab}
          onChange={t => {
            setJsonError(undefined);
            setCurrentTab(t);
          }}
        />
        <div className="content">
          {currentTab === 'form' ? (
            <>
              <AutoForm
                fields={[
                  {
                    name: 'moduleName',
                    type: 'string',
                  },
                  {
                    name: 'moduleId',
                    type: 'string',
                    suggestions: ModuleRepository.getAllModuleIds(),
                    required: true,
                  },
                ]}
                model={currentModuleTileConfig}
                onChange={setCurrentModuleTileConfig}
              />
              ToDo: fill this in
            </>
          ) : (
            <JsonInput
              value={currentModuleTileConfig}
              onChange={setCurrentModuleTileConfig}
              setError={setJsonError}
              height="100%"
            />
          )}
        </div>
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button text="Close" onClick={onClose} />
          <Button
            text="Save"
            intent={Intent.PRIMARY}
            disabled={Boolean(jsonError || issueWithCurrentTileConfig)}
            onClick={() => {
              onSave(currentModuleTileConfig as any);
              onClose();
            }}
          />
        </div>
      </div>
    </Dialog>
  );
});
