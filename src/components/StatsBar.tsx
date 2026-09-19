import type { Plan } from '../types';
import {
  getTableStats,
  getSeatedIds,
  getTagStats,
  getChildSeatStats,
  getVegetarianStats,
  getClusterWarnings,
  sameStatsFilter,
} from '../utils';
import type { StatsFilter } from '../utils';

interface Props {
  plan: Plan;
  activeFilter: StatsFilter | null;
  onFilterChange: (f: StatsFilter | null) => void;
}

export default function StatsBar({ plan, activeFilter, onFilterChange }: Props) {
  const stats = getTableStats(plan);
  const seatedIds = getSeatedIds(plan);
  const tagStats = getTagStats(plan, seatedIds);
  const childSeat = getChildSeatStats(plan, seatedIds);
  const veg = getVegetarianStats(plan, seatedIds);
  const clusters = getClusterWarnings(plan);

  const toggle = (f: StatsFilter) => {
    onFilterChange(sameStatsFilter(activeFilter, f) ? null : f);
  };
  const itemCls = (f: StatsFilter, extra = '') =>
    `stat-item clickable ${sameStatsFilter(activeFilter, f) ? 'active' : ''} ${extra}`.trim();

  return (
    <div className="stats-bar">
      <div className={itemCls({ kind: 'all' })} onClick={() => toggle({ kind: 'all' })} title="点击筛选全部宾客">
        总宾客: <b>{stats.totalGuests}</b>
      </div>
      <div className={itemCls({ kind: 'seated' })} onClick={() => toggle({ kind: 'seated' })} title="点击筛选已入座的宾客">
        已入座: <b>{stats.seated}</b>
      </div>
      <div className="stat-item">空座位: <b>{stats.emptySeats}</b></div>
      <div className={itemCls({ kind: 'unassigned' })} onClick={() => toggle({ kind: 'unassigned' })} title="点击筛选还没安排的宾客">
        未分配: <b style={{ color: stats.unassignedCount > 0 ? '#c0392b' : 'inherit' }}>{stats.unassignedCount}</b>
      </div>
      <div className="stat-item">总容量: <b>{stats.capacity}</b></div>

      {tagStats.length > 0 && (
        <div className="stats-group">
          <span className="stats-group-label">按标签</span>
          {tagStats.map((ts) => (
            <div
              key={ts.tag}
              className={itemCls({ kind: 'tag', tag: ts.tag }, 'tag-stat')}
              onClick={() => toggle({ kind: 'tag', tag: ts.tag })}
              title={`${ts.tag}：共 ${ts.total} 人，已入座 ${ts.seated}，未安排 ${ts.unassigned}（点击筛选）`}
            >
              <span>{ts.tag}</span>
              <b>{ts.total}</b>
              <span className="tag-stat-sub">坐 {ts.seated}</span>
              <span className={`tag-stat-sub ${ts.unassigned > 0 ? 'warn' : ''}`}>未排 {ts.unassigned}</span>
            </div>
          ))}
        </div>
      )}

      {(childSeat.needed > 0 || veg.total > 0 || clusters.length > 0) && (
        <div className="stats-group">
          <span className="stats-group-label">提醒</span>
          {childSeat.needed > 0 && (
            <div
              className={itemCls({ kind: 'childSeat' }, `stat-alert ${childSeat.unseated > 0 ? 'danger' : 'ok'}`)}
              onClick={() => toggle({ kind: 'childSeat' })}
              title={`共 ${childSeat.needed} 人需要儿童椅，已分布到 ${childSeat.tables} 桌，${childSeat.unseated} 人还没座位（点击筛选）`}
            >
              儿童椅 需 {childSeat.needed} 把
              {childSeat.unseated > 0
                ? <span className="alert-detail">缺口 {childSeat.unseated}</span>
                : <span className="alert-detail">分布 {childSeat.tables} 桌</span>}
            </div>
          )}
          {veg.total > 0 && (
            <div
              className={itemCls({ kind: 'vegetarian' }, `stat-alert ${veg.unseated > 0 || veg.extra > 0 ? 'warn' : 'ok'}`)}
              onClick={() => toggle({ kind: 'vegetarian' })}
              title={`素食共 ${veg.total} 人，已入座 ${veg.seated} 人、分布 ${veg.tables} 桌（点击筛选）`}
            >
              素食 {veg.total} 人
              {veg.tables > 0 && <span className="alert-detail">{veg.tables} 桌</span>}
              {veg.extra > 0 && <span className="alert-detail">多 {veg.extra} 份</span>}
              {veg.unseated > 0 && <span className="alert-detail danger-text">{veg.unseated} 人未排</span>}
            </div>
          )}
          {clusters.map((w) => (
            <div
              key={`${w.tableId}-${w.tag}`}
              className={itemCls({ kind: 'cluster', tableId: w.tableId, tag: w.tag }, 'stat-alert warn')}
              onClick={() => toggle({ kind: 'cluster', tableId: w.tableId, tag: w.tag })}
              title="同一标签在这桌明显扎堆（点击筛选这桌上该标签的宾客）"
            >
              ⚠ {w.tableLabel}「{w.tag}」{w.count}/{w.seated} 扎堆，是不是漏了别家的人？
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
