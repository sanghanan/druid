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

import { Button, Classes, Dialog, FormGroup, InputGroup, Intent } from '@blueprintjs/core';
import type { SqlExpression } from '@druid-toolkit/query';
import React, { useState } from 'react';

import { AppToaster } from '../../../singletons';
import { castBreakdownToExpression, expressionToCastBreakdown } from '../../../utils';
import { FlexibleQueryInput } from '../../workbench-view/flexible-query-input/flexible-query-input';

import './edit-column-dialog.scss';

export interface EditColumnDialogProps {
  initExpression: SqlExpression | undefined;
  onApply(expression: SqlExpression): void;
  onClose(): void;
}

export const EditColumnDialog = React.memo(function EditColumnDialog(props: EditColumnDialogProps) {
  const { initExpression, onApply, onClose } = props;

  const [currentBreakdown, setCurrentBreakdown] = useState(
    initExpression
      ? expressionToCastBreakdown(initExpression)
      : { formula: '', forceMultiValue: false, outputName: '' },
  );

  return (
    <Dialog className="edit-column-dialog" isOpen onClose={onClose} title="Edit column">
      <div className={Classes.DIALOG_BODY}>
        <div className="controls">
          <FormGroup label="Name">
            <InputGroup
              value={currentBreakdown.outputName}
              onChange={e => {
                setCurrentBreakdown({ ...currentBreakdown, outputName: e.target.value });
              }}
            />
          </FormGroup>
          <FormGroup label="SQL expression" className="sql-expression-form-group">
            <FlexibleQueryInput
              showGutter={false}
              placeholder="expression"
              queryString={currentBreakdown.formula}
              onQueryStringChange={formula => {
                setCurrentBreakdown({ ...currentBreakdown, formula });
              }}
              columnMetadata={undefined}
              leaveBackground
            />
          </FormGroup>
        </div>
        <div className="preview">
          <div className="label">Preview</div>
          <div className="preview-values">Xyz</div>
        </div>
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <div className="edit-column-dialog-buttons">
            <Button text="Close" onClick={onClose} />
            <Button
              text="Save"
              intent={Intent.PRIMARY}
              onClick={() => {
                let newExpression: SqlExpression;
                try {
                  newExpression = castBreakdownToExpression(currentBreakdown);
                } catch (e) {
                  AppToaster.show({
                    message: e.message,
                    intent: Intent.DANGER,
                  });
                  return;
                }

                onApply(newExpression);
                onClose();
              }}
            />
          </div>
        </div>
      </div>
    </Dialog>
  );
});
