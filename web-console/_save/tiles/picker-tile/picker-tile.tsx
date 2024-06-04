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
import React from 'react';

import { TileRepository } from '../../tile-repository';

import './picker-tile.scss';

interface OverallTileConfig {
  options: string[];
}

TileRepository.registerTile<OverallTileConfig>({
  type: 'picker',
  title: 'Picker',
  description: 'Shows the count',
  parameterDefinitions: {
    options: {
      type: 'json',
      defaultValue: [],
      required: true,
    },
  },
  component: function PickerModule(props) {
    const { config, myPublicState, setPublicState } = props;
    const { options } = config;

    return (
      <div className="picker-tile">
        <Popover2
          content={
            <Menu>
              {options.map((option, i) => (
                <MenuItem
                  key={i}
                  text={option}
                  onClick={() => setPublicState('selected', option)}
                />
              ))}
            </Menu>
          }
        >
          <Button
            text={`Pick: ${myPublicState['selected'] ?? '?'}`}
            rightIcon={IconNames.CARET_DOWN}
          />
        </Popover2>
      </div>
    );
  },
});
