import type { Plan } from '../types';
import { getTableStats, getTagStats, getTableClusterWarnings } from '../utils';

export type StatFilter = { tag: string; status?: 'seated' | 'unassigned' };

interface Props {
  plan: Plan;
  statFilter: StatFilter | null;
  onSelectStat: (f: StatFilter | null) => void;
}

export default function StatsBar({ plan, statFilter, onSelectStat }: Props) {
  const stats = getTableStats(plan);
  const tagStats = getTagStats(plan);
  const clusters = getTableClusterWarnings(plan);
  const tableCount = plan.tables.length;
  const childSeatTotal = plan.guests.filter((g) => g.childSeat).length;
  const childGap = childSeatTotal - tableCount;
  const vegTotal = plan.guests.filter((g) => g.tags.includes('素食')).length;
  const vegGap = vegTotal - tableCount;

  const isActive = (tag: string, status?: 'seated' | 'unassigned') =>
    !!statFilter && statFilter.tag === tag && statFilter.status === status;

  const toggle = (tag: string, status?: 'seated' | 'unassigned') => {
    onSelectStat(isActive(tag, status) ? null : { tag, status });
  };

  return (
    <div className="stats-bar">
      <div className="stats-row">
        <div className="stat-item">总宾客: <b>{stats.totalGuests}</b></div>
        <div className="stat-item">已入座: <b>{stats.seated}</b></div>
        <div className="stat-item">空座位: <b>{stats.emptySeats}</b></div>
        <div className="stat-item">未分配: <b style={{ color: stats.unassignedCount > 0 ? '#c0392b' : 'inherit' }}>{stats.unassignedCount}</b></div>
        <div className="stat-item">总容量: <b>{stats.capacity}</b></div>
        <div className="stat-item">儿童椅: <b style={{ color: childGap > 0 ? '#c0392b' : 'inherit' }}>{childSeatTotal}</b></div>
      </div>
      {tagStats.length > 0 && (
        <div className="stats-row tag-stats">
          {tagStats.map((s) => (
            <div key={s.tag} className={`tag-stat ${isActive(s.tag) ? 'active' : ''}`}>
              <button className="tag-stat-name" title="点击筛选该标签" onClick={() => toggle(s.tag)}>
                {s.tag}
              </button>
              <span className="tag-stat-nums">
                共 {s.total}
                <button
                  className={`tag-stat-num ${isActive(s.tag, 'seated') ? 'active' : ''}`}
                  title="只看已入座"
                  onClick={() => toggle(s.tag, 'seated')}
                >
                  已坐 {s.seated}
                </button>
                <button
                  className={`tag-stat-num ${s.unassigned > 0 ? 'warn' : ''} ${isActive(s.tag, 'unassigned') ? 'active' : ''}`}
                  title="只看未安排"
                  onClick={() => toggle(s.tag, 'unassigned')}
                >
                  未安排 {s.unassigned}
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
      {(childGap > 0 || vegGap > 0 || clusters.length > 0) && (
        <div className="stats-row stats-alerts">
          {childGap > 0 && (
            <div className="stat-alert">⚠ 儿童椅缺口 {childGap} 个：共需 {childSeatTotal} 个，只有 {tableCount} 桌</div>
          )}
          {vegGap > 0 && (
            <div className="stat-alert">⚠ 素食 {vegTotal} 人，桌数只有 {tableCount}，多出 {vegGap} 人需同桌协调</div>
          )}
          {clusters.map((c, i) => (
            <div key={i} className="stat-alert">
              ⚠ {c.tableLabel}「{c.tag}」{c.seated} 人里占了 {c.count} 个，是不是漏了别家的人？
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
