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

import { SqlExpression, SqlQuery } from '@druid-toolkit/query';
import * as echarts from 'echarts';
import React, { useEffect, useRef } from 'react';

import type { ExpressionMeta } from './models';
import { ModuleRepository } from './module-repository/module-repository';

import './record-table-module.scss';

const barChartFn = ({ container, runSqlQuery }: any) => {
  const myChart = echarts.init(container, 'dark');

  myChart.setOption({
    tooltip: {},
    dataset: {
      sourceHeader: false,
      dimensions: ['dim', 'met'],
      source: [],
    },
    xAxis: {
      type: 'category',
      axisLabel: { interval: 0, rotate: -30 },
    },
    yAxis: {},
    series: [
      {
        type: 'bar',
        encode: {
          x: 'dim',
          y: 'met',
        },
      },
    ],
  });

  return {
    async update({ source, parameterValues }: any) {
      const { splitColumn, metric, metricToSort, limit } = parameterValues;
      console.log('splitColumn', splitColumn);

      myChart.off('click');

      if (!splitColumn) return;

      const v = await runSqlQuery(
        SqlQuery.from(source)
          .addSelect(splitColumn.expression.as('dim'), { addToGroupBy: 'end' })
          .addSelect(metric.expression.as('met'), {
            addToOrderBy: metricToSort ? undefined : 'end',
            direction: 'DESC',
          })
          .applyIf(metricToSort, q =>
            q.addOrderBy(metricToSort.expression.toOrderByExpression('DESC')),
          )
          .changeLimitValue(limit),
      );
      myChart.setOption({
        dataset: {
          source: v.toObjectArray(),
        },
      });

      myChart.on('click', 'series', p => {
        const { dim, met } = p.data as any;

        const [x, y] = myChart.convertToPixel({ seriesIndex: 0 }, [dim, met]);

        console.log(x, y);
        // highlightStore.getState().setHighlight({
        //   label: p.name,
        //   x,
        //   y: y - 20,
        //   data: [dim, met],
        //   onDrop: () => {
        //     highlightStore.getState().dropHighlight();
        //   },
        //   onSave: () => {
        //     updateWhere(where.toggleClauseInWhere(C(splitColumn.name).equal(p.name)));
        //     highlightStore.getState().dropHighlight();
        //   },
        // });
      });
    },

    resize() {
      myChart.resize();

      // // if there is a highlight, update its x position
      // // by calculating new pixel position from the highlight's data
      // const highlight = highlightStore.getState().highlight;
      // if (highlight) {
      //   const [x, y] = myChart.convertToPixel({ seriesIndex: 0 }, highlight.data as number[]);
      //
      //   highlightStore.getState().updateHighlight({
      //     x,
      //     y: y - 20,
      //   });
      // }
    },

    destroy() {
      myChart.dispose();
    },
  };
};

interface RecordTableParameterValues {
  splitColumn: ExpressionMeta;
  metric: ExpressionMeta;
  metricToSort: ExpressionMeta;
  limit: number;
}

ModuleRepository.registerModule<RecordTableParameterValues>({
  id: 'bar-chart',
  title: 'Bar chart',
  description: 'An echarts bar chart',
  parameters: {
    splitColumn: {
      type: 'column',
      control: {
        label: 'Bar column',
        // transferGroup: 'show',
        required: true,
      },
    },
    metric: {
      type: 'aggregate',
      default: { expression: SqlExpression.parse('COUNT(*)'), name: 'Count', sqlType: 'BIGINT' },
      control: {
        label: 'Metric to show',
        // transferGroup: 'show-agg',
        required: true,
      },
    },
    metricToSort: {
      type: 'aggregate',
      control: {
        label: 'Metric to sort (default to shown)',
      },
    },
    limit: {
      type: 'number',
      default: 5,
      control: {
        label: 'Max bars to show',
        required: true,
      },
    },
  },
  component: function BarChartModule(props) {
    const updateFn = useRef<any>(null);
    const { querySource, parameterValues, runSqlQuery } = props;

    useEffect(() => {
      if (!updateFn.current) return;
      updateFn.current.update({ source: querySource.query, parameterValues });
    }, [updateFn.current, querySource, parameterValues]);

    return (
      <div
        className="bar-chart-module"
        ref={x => {
          updateFn.current = barChartFn({ container: x, runSqlQuery });
        }}
        style={{ height: '100%' }}
      />
    );
  },
});
