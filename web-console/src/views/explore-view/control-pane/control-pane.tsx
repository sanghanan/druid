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

import {
  Button,
  ButtonGroup,
  InputGroup,
  Intent,
  Menu,
  MenuItem,
  NumericInput,
} from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import { Popover2 } from '@blueprintjs/popover2';
import type { JSX } from 'react';
import React from 'react';

import { AutoForm, FormGroupWithInfo, PopoverText } from '../../../components';
import type { ExpressionMeta, OptionValue, ParameterDefinition } from '../../../modules';
import { effectiveParameterDefault, evaluateFunctor, getModuleOptionLabel } from '../../../modules';
import { AppToaster } from '../../../singletons';
import { ColumnPickerMenu } from '../column-picker-menu/column-picker-menu';
import { DroppableContainer } from '../droppable-container/droppable-container';

import { AggregateMenu } from './aggregate-menu';
import { ColumnsInput } from './columns-input';
import { getPossibleAggregateForColumn } from './helpers';
import { OptionsInput } from './options-input';

import './control-pane.scss';

export interface ControlPaneProps {
  columns: ExpressionMeta[];
  onUpdateParameterValues(params: Record<string, unknown>): void;
  parameters: Record<string, ParameterDefinition>;
  parameterValues: Record<string, unknown>;
}

export const ControlPane = function ControlPane(props: ControlPaneProps) {
  const { columns, onUpdateParameterValues, parameters, parameterValues } = props;

  function renderOptionsPropInput(
    parameter: ParameterDefinition,
    value: any,
    onValueChange: (value: any) => void,
  ): {
    element: JSX.Element;
    onDropColumn?: (column: ExpressionMeta) => void;
  } {
    const effectiveValue = value ?? effectiveParameterDefault(parameter);
    switch (parameter.type) {
      case 'boolean': {
        return {
          element: (
            <ButtonGroup>
              <Button
                active={effectiveValue === false}
                onClick={() => {
                  onValueChange(false);
                }}
              >
                False
              </Button>
              <Button
                active={effectiveValue === true}
                onClick={() => {
                  onValueChange(true);
                }}
              >
                True
              </Button>
            </ButtonGroup>
          ),
        };
      }

      case 'number':
        return {
          element: (
            <NumericInput
              value={(effectiveValue as string) ?? ''}
              onValueChange={v => onValueChange(v)}
              placeholder={parameter.control?.placeholder}
              fill
              min={parameter.min}
              max={parameter.max}
            />
          ),
        };

      case 'string':
        return {
          element: (
            <InputGroup
              value={(effectiveValue as string) || ''}
              onChange={e => onValueChange(e.target.value)}
              placeholder={parameter.control?.placeholder}
              fill
            />
          ),
        };

      case 'option': {
        const controlOptions = parameter.options || [];
        const selectedOption: OptionValue | undefined = controlOptions.find(
          o => o === effectiveValue,
        );
        return {
          element: (
            <Popover2
              fill
              position="bottom-left"
              minimal
              content={
                <Menu>
                  {controlOptions.map((o, i) => (
                    <MenuItem
                      key={i}
                      text={getModuleOptionLabel(o, parameter)}
                      onClick={() => onValueChange(o)}
                    />
                  ))}
                </Menu>
              }
            >
              <InputGroup
                value={
                  typeof selectedOption === 'undefined'
                    ? String(effectiveValue)
                    : getModuleOptionLabel(selectedOption, parameter)
                }
                readOnly
                fill
                rightElement={<Button icon={IconNames.CARET_DOWN} minimal />}
              />
            </Popover2>
          ),
        };
      }

      case 'options': {
        return {
          element: (
            <OptionsInput
              options={parameter.options || []}
              value={(effectiveValue as OptionValue[]) || []}
              onValueChange={onValueChange}
              parameter={parameter}
            />
          ),
        };
      }

      case 'column':
        return {
          element: (
            <Popover2
              fill
              position="bottom-left"
              minimal
              content={
                <ColumnPickerMenu
                  columns={columns}
                  onSelectNone={
                    parameter.control?.required ? undefined : () => onValueChange(undefined)
                  }
                  onSelectColumn={onValueChange}
                />
              }
            >
              <InputGroup
                value={(effectiveValue as ExpressionMeta)?.name || 'None'}
                readOnly
                fill
                rightElement={<Button icon={IconNames.CARET_DOWN} minimal />}
              />
            </Popover2>
          ),
          onDropColumn: onValueChange,
        };

      case 'columns': {
        return {
          element: (
            <ColumnsInput
              columns={columns}
              allowReordering
              value={(effectiveValue as ExpressionMeta[]) || []}
              onValueChange={onValueChange}
              allowDuplicates={parameter.allowDuplicates}
            />
          ),
          onDropColumn: (column: ExpressionMeta) => {
            const columnName = column.name;
            if (
              !parameter.allowDuplicates &&
              effectiveValue.find((v: ExpressionMeta) => v.name === columnName)
            ) {
              AppToaster.show({
                intent: Intent.WARNING,
                message: `"${columnName}" already selected`,
              });
              return;
            }
            onValueChange(effectiveValue.concat(column));
          },
        };
      }

      case 'aggregate': {
        return {
          element: (
            <Popover2
              fill
              position="bottom-left"
              minimal
              content={
                <AggregateMenu
                  columns={columns}
                  onSelectAggregate={onValueChange}
                  onSelectNone={
                    parameter.control?.required ? undefined : () => onValueChange(undefined)
                  }
                />
              }
            >
              <InputGroup
                value={effectiveValue ? (effectiveValue as { name: string }).name : 'None'}
                readOnly
                fill
                rightElement={<Button icon={IconNames.CARET_DOWN} minimal />}
              />
            </Popover2>
          ),
          onDropColumn: column => {
            const aggregates = getPossibleAggregateForColumn(column);
            if (!aggregates.length) return;
            onValueChange(aggregates[0]);
          },
        };
      }

      case 'aggregates': {
        return {
          element: (
            <ColumnsInput
              columns={columns}
              value={effectiveValue}
              onValueChange={onValueChange}
              allowReordering
              pickerMenu={availableColumns => (
                <AggregateMenu
                  columns={availableColumns}
                  onSelectAggregate={c => onValueChange(effectiveValue.concat(c))}
                />
              )}
            />
          ),
          onDropColumn: column => {
            const aggregates = getPossibleAggregateForColumn(column).filter(
              p => !effectiveValue.some((v: ExpressionMeta) => v.name === p.name),
            );
            if (!aggregates.length) return;
            onValueChange(effectiveValue.concat(aggregates[0]));
          },
        };
      }

      default:
        return {
          element: (
            <Button
              icon={IconNames.ERROR}
              text={`Type not supported: ${(parameter as { type: string }).type}`}
              disabled
              fill
            />
          ),
        };
    }
  }

  const namedParameters = Object.entries(parameters ?? {});

  return (
    <div className="control-pane">
      {namedParameters.map(([name, parameter], i) => {
        const visible = evaluateFunctor(parameter.control?.visible, parameterValues);
        if (visible === false) return;

        const value = parameterValues[name];
        function onValueChange(newValue: unknown) {
          onUpdateParameterValues({ [name]: newValue });
        }

        const { element, onDropColumn } = renderOptionsPropInput(parameter, value, onValueChange);

        const description = evaluateFunctor(parameter.control?.description, parameterValues);
        const formGroup = (
          <FormGroupWithInfo
            key={i}
            label={
              evaluateFunctor(parameter.control?.label, parameterValues) ||
              AutoForm.makeLabelName(name)
            }
            info={description && <PopoverText>{description}</PopoverText>}
          >
            {element}
          </FormGroupWithInfo>
        );

        if (!onDropColumn) {
          return formGroup;
        }

        return (
          <DroppableContainer key={i} onDropColumn={onDropColumn}>
            {formGroup}
          </DroppableContainer>
        );
      })}
    </div>
  );
};
