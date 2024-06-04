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

import type { SqlExpression } from '@druid-toolkit/query';

/**
 * Represents a SQL expression and additional metadata.
 */
export interface ExpressionMeta {
  /**
   * The expression
   */
  expression: SqlExpression;

  /**
   * The expression name, will be used as a title in the UI.
   */
  name: string;

  /**
   * The expression SQL type
   *
   * @see {@link https://druid.apache.org/docs/latest/querying/sql-data-types.html|SQL data types}
   */
  sqlType?: string;

  /**
   * @todo Write the documentation
   */
  multiValue?: boolean;
}
